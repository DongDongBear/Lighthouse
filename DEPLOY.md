# Lighthouse 部署说明

## 当前线上部署形态

- **线上域名**：`https://lighthouse.hetaogomoku.uk/Lighthouse/`
- **部署目录**：默认 `/usr/share/nginx/html/Lighthouse`
- **Astro base**：`/Lighthouse/`

> 结论：这是 **子路径部署**，不是根路径部署。不要在未确认 nginx 配置前把 `astro.config.mjs` 改成 `base: '/'`。

---

## 一键部署

在服务器上执行：

```bash
cd /tmp/Lighthouse
bash scripts/deploy.sh
```

脚本会自动完成：

1. `npm run build`
2. 检查关键产物是否存在
3. 同步到 `/usr/share/nginx/html/Lighthouse`
4. `nginx -t`
5. `systemctl reload nginx`
6. 对首页、Pi 文章、bg-card 图片做 smoke test

---

## 可选环境变量

如果以后部署目录或域名变了，可以临时覆盖：

```bash
LIGHTHOUSE_DEPLOY_DIR=/some/path \
LIGHTHOUSE_SITE_URL=https://example.com/Lighthouse/ \
bash scripts/deploy.sh
```

---

## 部署前注意事项

### 1. 改文章 ≠ 改部署配置

大多数内容更新只需要：

- 改 markdown
- build
- deploy

**不要顺手动 `astro.config.mjs`。**

### 2. 先确认是根路径还是子路径

当前 Lighthouse 是：

- ✅ 子路径：`/Lighthouse/`
- ❌ 不是根路径：`/`

### 3. `rsync --delete` 前要确认资源是否真该删

如果 `public/` 里有大批静态资源变化：

- `card-bg/*`
- `unity-*`
- `electron-*`
- `logo.*`

先停下来查 diff，别直接 deploy。

---

## 常用核验地址

- 首页：
  - `https://lighthouse.hetaogomoku.uk/Lighthouse/`
- Agent 索引：
  - `https://lighthouse.hetaogomoku.uk/Lighthouse/ai-research/agent/`
- Pi 文章：
  - `https://lighthouse.hetaogomoku.uk/Lighthouse/ai-research/agent/engineering/pi-agent-framework-context/`
- 背景图抽样：
  - `https://lighthouse.hetaogomoku.uk/Lighthouse/card-bg/bg45.png`

---

## 事故复盘（2026-03-30）

这次问题的根因：

1. 写完文章后错误地把站点从 `/Lighthouse/` 改成根路径部署
2. 后续 `rsync --delete` 清掉了服务器上旧目录里的历史静态资源
3. 仓库里部分 `public/` 资源更早之前已被删掉，导致线上资源缺失被放大

后续原则：

> Lighthouse 写稿可以快，部署不能想当然。
