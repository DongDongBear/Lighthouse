---
title: "Claude自主发现FreeBSD远程内核RCE漏洞：AI安全研究里程碑"
description: "CVE-2026-4747, FreeBSD, 远程代码执行, Claude, AI安全研究, 内核漏洞, RPCSEC_GSS"
---

# Claude Autonomously Discovers FreeBSD Remote Kernel RCE (CVE-2026-4747)

> 原文链接：https://github.com/califio/publications/blob/main/MADBugs/CVE-2026-4747/write-up.md
> 来源：Califio Security Research
> 发布日期：2026-03-31
> HN 热度：184 分 + 80 条评论

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Claude 自主发现并构建了 FreeBSD 内核远程代码执行的完整利用链 |
| 大白话版 | Claude 看了 FreeBSD 内核源码，自己找到一个缓冲区溢出漏洞，自己算出偏移量，自己写了完整的远程攻击代码——从发现到利用全链路自主完成 |
| 核心数字 | 128字节栈缓冲区 / 最大304字节溢出 / 15轮攻击 / 432字节shellcode / 影响FreeBSD 13.5-15.0 |
| 评级 | A — AI安全研究的标志性事件，证明前沿AI已具备内核级漏洞发现和利用能力 |
| 代码 | 完整write-up和exploit分析已在GitHub公开 |
| 关键词 | CVE-2026-4747, 远程内核RCE, 栈溢出, RPCSEC_GSS, NFS, ROP链, 内核shellcode |

## 事件全貌

### 发生了什么？

安全研究团队 Califio 公开了一份极其详细的 write-up，揭示 Claude 自主完成了以下全链路工作：

1. **源码审计：** 在 FreeBSD 内核源码 `sys/rpc/rpcsec_gss/svc_rpcsec_gss.c` 中发现 `svc_rpc_gss_validate()` 函数的栈缓冲区溢出漏洞
2. **漏洞分析：** 确定 128 字节栈缓冲区中 32 字节被固定头部占用，仅剩 96 字节给凭证体，但 XDR 层允许最大 400 字节
3. **栈布局逆向：** 通过反汇编分析函数 prologue，确定保存寄存器和返回地址在栈上的精确位置
4. **偏移校正：** 发现 GSS 凭证头部（含 16 字节 context handle）导致 32 字节偏移，用 De Bruijn pattern 验证 RIP 在凭证体字节 200
5. **ROP 链构造：** 使用 ROPgadget 找到 5 个关键 gadget，设计了 15 轮多阶段攻击
6. **Shellcode 编写：** 432 字节内核态 shellcode，通过 `kproc_create` 创建新进程，`kern_execve` 执行反向 shell
7. **利用验证：** 构建完整的远程 exploit，通过 NFS 端口 2049/TCP 实现内核级代码执行

### 漏洞的技术本质

漏洞位于 FreeBSD 的 RPCSEC_GSS 认证模块。核心代码极其简洁：

```c
static bool_t svc_rpc_gss_validate(...) {
    int32_t rpchdr[128 / sizeof(int32_t)]; // 128 字节栈缓冲区
    
    // 写入 8 个固定 RPC 头部字段（32 字节）
    buf = rpchdr;
    IXDR_PUT_LONG(buf, msg->rm_xid);
    // ... 共 8 个字段 = 32 字节
    
    if (oa->oa_length) {
        // BUG: 没有检查 oa_length！
        // 头部占了 32 字节，只剩 96 字节给凭证体
        // 如果 oa_length > 96，溢出！
        memcpy((caddr_t)buf, oa->oa_base, oa->oa_length);
    }
}
```

**修复方案？一行代码：**

```c
if (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {
    return (FALSE);
}
```

这是经典的"一行代码的漏洞"——发现它很难，修复它很简单。

### 栈布局详解

通过反汇编 `kgssapi.ko` 的函数 prologue 和 De Bruijn 模式验证，确定了精确的栈布局：

```
[rbp - 0xe0]  局部变量（栈底）
[rbp - 0xc0]  rpchdr[0]    ← memset 目标
[rbp - 0xa0]  rpchdr[32]   ← memcpy 起始位置（溢出从这里开始）
[rbp - 0x40]  rpchdr[128]  ← 缓冲区结束（距 memcpy 起始 96 字节）
   ... 以下为溢出区域 ...
凭证体字节 152 → saved RBX（被利用来预加载 kproc_create 地址）
凭证体字节 200 → RETURN ADDRESS（第一个 ROP gadget）
凭证体字节 208-399 → ROP 链继续区（192 字节 = 24 个 qword）
```

### 攻击的 15 轮结构

由于 XDR 层限制凭证体最大 400 字节，每轮只能携带约 200 字节的 ROP 链，因此 432 字节的 shellcode 需要分批写入：

| 轮次 | 操作 | 技术细节 |
|---|---|---|
| 第 1 轮 | 使内核 BSS 段可执行 | ROP：调用 `pmap_change_prot(BSS_addr, 0x2000, VM_PROT_ALL)` |
| 第 2-14 轮 | 写入 shellcode（每轮 32 字节） | ROP：`pop rdi→地址; pop rax→数据; mov [rdi],rax` × 4 |
| 第 15 轮 | 写最后 16 字节 + 跳转执行 | 写完后直接跳转到 BSS 上的 shellcode |

每轮结束时调用 `kthread_exit()` 干净地终止当前 NFS 工作线程（不触发 kernel panic）。

### Shellcode 架构（432 字节）

Shellcode 分为两个阶段：

**入口函数（在被劫持的 NFS 线程上运行）：**
- 栈切换到 BSS 区域（避免使用被破坏的 NFS 线程栈）
- 调用 `kproc_create()` 创建新内核进程
- 清除 DR7 调试寄存器（防止继承的硬件断点导致崩溃）
- 通过 `kthread_exit()` 退出当前线程

**工作函数（在新进程中运行）：**
- 初始化 `image_args` 结构体
- 调用 `exec_alloc_args()` 分配参数缓冲区
- 设置可执行路径：`/bin/sh`
- 添加参数：`-c`、反向 shell 命令
- 调用 `kern_execve()` 将进程替换为 `/bin/sh`
- 清除 `P_KPROC` 标志位（让 `fork_exit` 走正常 userret 路径而非 `kthread_exit`）
- 返回后通过 `iretq` 进入用户态，以 root 权限执行 shell

**为什么不能直接 execve？** NFS 工作线程是纯内核线程，没有用户地址空间（vmspace）、trapframe 和用户态转换机制。必须先用 `kproc_create()` 创建带完整进程结构的新进程。

**为什么要清除 P_KPROC？** `kern_execve()` 成功后进程结构上已经是用户进程了，但 `kproc_create()` 设置的 `P_KPROC` 标志会让 `fork_exit()` 调用 `kthread_exit()` 杀死进程。清除这个标志让 `fork_exit()` 走正常的 `userret` → `iretq` 路径。

### 攻击前提条件

| 条件 | 说明 |
|---|---|
| Kerberos ticket | 攻击者必须拥有有效的 Kerberos ticket（哪怕是非特权用户的） |
| NFS 服务 | 目标必须运行 NFS 服务器且加载了 `kgssapi.ko` |
| 网络访问 | 需要访问 NFS 端口 2049/TCP 和 KDC 端口 88/TCP |
| VM 配置 | 需要 ≥2 CPU（16 NFS 线程），因为 15 轮攻击各杀一个线程 |

**实际场景评估：** 在企业 NFS 环境（Active Directory / FreeIPA）中，任何非特权域用户都可以获取 Kerberos ticket 并触发此漏洞。

### 影响范围

- FreeBSD 13.5（< p11）
- FreeBSD 14.3（< p10）
- FreeBSD 14.4（< p1）
- FreeBSD 15.0（< p5）

## 技术解析

### Claude 的角色——全链路自主完成

这是 Claude 在此事件中展现的能力链条：

```
源码审计（静态分析）
  ├→ 识别 memcpy 缺少边界检查
  ├→ 计算缓冲区可用空间（128 - 32 = 96 字节）
  └→ 确认 XDR 层允许最大 400 字节（溢出上限 304 字节）
        ↓
栈布局逆向
  ├→ 反汇编函数 prologue
  ├→ 确定局部变量和保存寄存器的栈位置
  └→ 通过 De Bruijn pattern 校正实际偏移（发现 32 字节偏差）
        ↓
ROP 链设计
  ├→ 使用 ROPgadget 扫描内核符号
  ├→ 设计 15 轮渐进式攻击策略
  └→ 处理 400 字节凭证限制的空间优化
        ↓
Shellcode 编写
  ├→ 内核态 shellcode（kproc_create + kern_execve）
  ├→ 处理内核线程 vs 用户进程的架构差异
  └→ 清除 P_KPROC 标志 + DR7 调试寄存器
        ↓
利用验证
  ├→ Kerberos 认证流程（gssapi 模块）
  ├→ 处理 MIT vs Heimdal GSS-API 兼容性
  └→ 解决 DNS 反向查找导致的 principal 名称不匹配
```

### 与之前 AI 安全研究的对比

| 维度 | 之前的 AI 漏洞发现 | CVE-2026-4747 (Claude) |
|---|---|---|
| 漏洞类型 | 应用层/Web漏洞为主 | **内核级远程 RCE** |
| 利用完整度 | 发现漏洞 + PoC crash | **完整利用链 + root shell** |
| 技术深度 | 模式匹配 + fuzzing 辅助 | **栈布局分析 + ROP + 内核 shellcode** |
| 攻击复杂度 | 单阶段 | **15轮多阶段远程攻击** |
| 独立性 | 需要人工指导 | **高度自主** |

## 产业影响链

```
Claude 自主发现内核 RCE
  ├→ 防守方：AI 辅助安全审计将成为标配
  │    ├→ 开源项目受益（FreeBSD/Linux 内核审计加速）
  │    └→ 安全公司需要整合 AI 审计能力
  ├→ 攻击方：AI 武器化风险上升
  │    ├→ 脚本小子可能利用 AI 发现和构建高级利用
  │    └→ 国家级 APT 的攻击效率将大幅提升
  └→ 政策方：AI 安全能力的监管讨论将加速
       ├→ 模型能力评估需纳入漏洞发现维度
       └→ 负责任披露流程需要更新
```

## 批判性分析

### 双刃剑效应

**积极面：**
- AI 辅助安全审计可将漏洞发现时间从数月缩短到数小时
- 开源软件的安全性将显著受益
- 安全研究的门槛降低，更多代码库可以被审计

**消极面：**
- 同样的能力可被攻击者利用——这不是假设，而是必然
- FreeBSD 没有 KASLR（内核地址空间布局随机化），降低了利用难度——但 Claude 处理 ASLR 可能只是时间问题
- Anthropic 此前已报告中国 APT 组织使用 Claude Code 攻击 30+ 组织的事件

### 独立观察

- **这验证了 Anthropic 对 Mythos 模型网络安全风险的担忧。** 泄露的 Mythos 草案中明确提到 Anthropic 认为该模型"在网络安全能力方面远超任何其他 AI 模型"。CVE-2026-4747 事件表明，即使是当前的 Claude（Opus 4.6），其安全研究能力已经相当惊人。Mythos 如果真的实现了"阶跃式进步"，其网络安全影响不容小觑。
- **"一行修复"的悖论。** 128 字节缓冲区少了一行边界检查，就构成了远程内核级 RCE。这类漏洞在 C 代码中极为常见。AI 的大规模代码审计能力意味着这类"已存在多年但没人发现"的漏洞将被批量挖掘出来。
- **对动动的建议：** 这个案例应该纳入 Lighthouse 的长期追踪。AI 辅助安全研究正在从概念验证走向实际产出，2026 年预计会有更多 AI 发现的高危漏洞被披露。
