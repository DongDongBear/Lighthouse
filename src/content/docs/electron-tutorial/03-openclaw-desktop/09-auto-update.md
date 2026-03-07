# 第九章：自动更新

## 本章目标

1. 理解 OpenClaw 的 Sparkle 集成方式及代码签名检查
2. 分析更新状态追踪和用户交互流程
3. 掌握 Electron `electron-updater` 的等价实现
4. 了解自动更新的安全考量

## 学习路线图

```
Sparkle 架构 → 代码签名检查 → 更新状态 → 用户体验 → Electron 实现
```

---

## 9.1 为什么需要自动更新？

桌面应用没有 App Store 的自动更新机制（除非通过 Mac App Store 分发）。OpenClaw 选择直接分发（Developer ID），所以需要自建更新系统。

```
更新流程:
  App 启动
    │
    ├─ 检查 appcast.xml（更新源）
    │   https://updates.openclaw.ai/appcast.xml
    │
    ├─ 有新版本？
    │   ├─ 自动下载
    │   ├─ 验证签名
    │   └─ 提示用户安装
    │
    └─ 无新版本 → 定期再检查
```

---

## 9.2 源码分析：Sparkle 集成

### 9.2.1 SparkleUpdaterController

```swift
#if canImport(Sparkle)
import Sparkle

@MainActor
final class SparkleUpdaterController: NSObject, UpdaterProviding {
    private lazy var controller = SPUStandardUpdaterController(
        startingUpdater: false,        // 延迟启动，等我们配置好再开始
        updaterDelegate: self,
        userDriverDelegate: nil)
    let updateStatus = UpdateStatus()

    init(savedAutoUpdate: Bool) {
        super.init()
        let updater = self.controller.updater
        updater.automaticallyChecksForUpdates = savedAutoUpdate
        updater.automaticallyDownloadsUpdates = savedAutoUpdate
        self.controller.startUpdater()
    }

    var automaticallyChecksForUpdates: Bool {
        get { self.controller.updater.automaticallyChecksForUpdates }
        set { self.controller.updater.automaticallyChecksForUpdates = newValue }
    }

    func checkForUpdates(_ sender: Any?) {
        self.controller.checkForUpdates(sender)
    }
}
```

### 9.2.2 代码签名检查

```swift
private func isDeveloperIDSigned(bundleURL: URL) -> Bool {
    var staticCode: SecStaticCode?
    guard SecStaticCodeCreateWithPath(bundleURL as CFURL, SecCSFlags(), &staticCode) == errSecSuccess,
          let code = staticCode
    else { return false }

    var infoCF: CFDictionary?
    guard SecCodeCopySigningInformation(code, SecCSFlags(rawValue: kSecCSSigningInformation), &infoCF) == errSecSuccess,
          let info = infoCF as? [String: Any],
          let certs = info[kSecCodeInfoCertificates as String] as? [SecCertificate],
          let leaf = certs.first
    else { return false }

    if let summary = SecCertificateCopySubjectSummary(leaf) as String? {
        return summary.hasPrefix("Developer ID Application:")
    }
    return false
}
```

**为什么检查签名？**

Sparkle 的更新差分（delta update）和安装过程需要验证签名。如果 App 没有 Developer ID 签名（开发版本），Sparkle 会弹出令人困惑的对话框。所以 OpenClaw 在创建 updater 之前先检查签名：

```swift
@MainActor
private func makeUpdaterController() -> UpdaterProviding {
    let bundleURL = Bundle.main.bundleURL
    let isBundledApp = bundleURL.pathExtension == "app"
    // 只有签名过的 .app 才启用 Sparkle
    guard isBundledApp, isDeveloperIDSigned(bundleURL: bundleURL) else {
        return DisabledUpdaterController()
    }
    return SparkleUpdaterController(savedAutoUpdate: savedAutoUpdate)
}
```

开发版本使用 `DisabledUpdaterController`（空操作），避免更新对话框干扰开发。

### 9.2.3 更新状态追踪

```swift
@MainActor
@Observable
final class UpdateStatus {
    var isUpdateReady: Bool = false
}

extension SparkleUpdaterController {
    func updater(_ updater: SPUUpdater, didDownloadUpdate item: SUAppcastItem) {
        self.updateStatus.isUpdateReady = true
    }

    func updater(_ updater: SPUUpdater, failedToDownloadUpdate item: SUAppcastItem, error: Error) {
        self.updateStatus.isUpdateReady = false
    }

    func userDidCancelDownload(_ updater: SPUUpdater) {
        self.updateStatus.isUpdateReady = false
    }

    func updater(_ updater: SPUUpdater, userDidMakeChoice choice: SPUUserUpdateChoice, ...) {
        switch choice {
        case .install, .skip:
            self.updateStatus.isUpdateReady = false
        case .dismiss:
            // 下载完成但用户暂时不安装
            self.updateStatus.isUpdateReady = (state.stage == .downloaded)
        }
    }
}
```

`isUpdateReady` 驱动 UI 显示更新提示（如菜单栏的角标）。

### 9.2.4 UpdaterProviding 协议

```swift
@MainActor
protocol UpdaterProviding: AnyObject {
    var automaticallyChecksForUpdates: Bool { get set }
    var automaticallyDownloadsUpdates: Bool { get set }
    var isAvailable: Bool { get }
    var updateStatus: UpdateStatus { get }
    func checkForUpdates(_ sender: Any?)
}
```

这个协议抽象了更新器，让 UI 代码不依赖 Sparkle 的具体实现。开发版用 `DisabledUpdaterController`，发布版用 `SparkleUpdaterController`，UI 代码不变。

---

## 9.3 Sparkle 的工作原理

```
┌── Sparkle 更新流程 ───────────────────────────────────────┐
│                                                            │
│  1. App 检查 appcast.xml                                   │
│     ├── URL 在 Info.plist 的 SUFeedURL 中配置              │
│     └── XML 包含版本号、下载 URL、签名等                    │
│                                                            │
│  2. 比较版本号                                              │
│     ├── CFBundleVersion (build number)                     │
│     └── CFBundleShortVersionString (display version)       │
│                                                            │
│  3. 下载更新包                                              │
│     ├── .dmg 或 .zip 格式                                  │
│     └── 验证 EdDSA 签名（Sparkle 2.x 默认）                │
│                                                            │
│  4. 安装                                                    │
│     ├── 替换 .app 目录                                      │
│     └── 重启应用                                            │
│                                                            │
│  appcast.xml 示例:                                         │
│  <rss>                                                     │
│    <channel>                                               │
│      <item>                                                │
│        <title>1.2.3</title>                                │
│        <sparkle:version>123</sparkle:version>              │
│        <sparkle:shortVersionString>1.2.3</sparkle:shortVersionString>│
│        <enclosure url="https://.../OpenClaw-1.2.3.dmg"    │
│                   sparkle:edSignature="..."                 │
│                   length="12345678"                         │
│                   type="application/octet-stream"/>         │
│      </item>                                               │
│    </channel>                                               │
│  </rss>                                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 9.4 Electron 实现

### 9.4.1 electron-updater 基础

```typescript
// src/main/updater.ts
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export class AppUpdater extends EventEmitter {
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor() {
    super();

    // 配置更新源
    autoUpdater.setFeedURL({
      provider: 'github',          // 或 'generic', 's3', 'spaces' 等
      owner: 'your-org',
      repo: 'ai-desktop',
    });

    // 对应 Sparkle 的 automaticallyChecksForUpdates
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.emit('status', 'checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.updateAvailable = true;
      this.emit('status', 'available');
      this.emit('update-available', info);
    });

    autoUpdater.on('update-not-available', () => {
      this.emit('status', 'up-to-date');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.emit('progress', progress);
    });

    // 对应 didDownloadUpdate
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.updateDownloaded = true;
      this.emit('status', 'ready');
      this.emit('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      this.updateAvailable = false;
      this.updateDownloaded = false;
      this.emit('status', 'error');
      this.emit('error', err);
    });
  }

  /**
   * 手动检查更新。
   * 对应 checkForUpdates。
   */
  checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch(() => {});
  }

  /**
   * 安装已下载的更新。
   */
  installUpdate(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
    }
  }

  get isUpdateReady(): boolean {
    return this.updateDownloaded;
  }

  /**
   * 启动定期检查（对应 Sparkle 的自动检查间隔）。
   */
  startPeriodicCheck(intervalHours = 4): void {
    // 首次延迟检查（启动后 30 秒）
    setTimeout(() => this.checkForUpdates(), 30_000);
    // 定期检查
    setInterval(() => this.checkForUpdates(), intervalHours * 3600_000);
  }

  /**
   * 在开发模式下禁用更新（对应 DisabledUpdaterController）。
   */
  static isUpdateEnabled(): boolean {
    // 开发模式不检查更新
    if (!app.isPackaged) return false;
    // macOS: 检查代码签名（可选）
    return true;
  }
}
```

### 9.4.2 用户交互

```typescript
// 更新提示
updater.on('update-downloaded', (info: UpdateInfo) => {
  // 方式 1: 在 Tray 菜单中添加提示
  tray.updateMenu([
    {
      label: `Update to ${info.version}`,
      click: () => updater.installUpdate(),
    },
  ]);

  // 方式 2: 弹出对话框
  const result = dialog.showMessageBoxSync({
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is ready to install.`,
    buttons: ['Install Now', 'Later'],
  });
  if (result === 0) {
    updater.installUpdate();
  }
});
```

### 9.4.3 发布配置（electron-builder）

```yaml
# electron-builder.yml
publish:
  - provider: github
    owner: your-org
    repo: ai-desktop

mac:
  category: public.app-category.developer-tools
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  notarize: true

win:
  certificateSubjectName: "Your Company"

linux:
  target:
    - AppImage
    - deb
```

---

## 9.5 设计决策

### 9.5.1 为什么 Sparkle 而非 Mac App Store？

| 特性 | Sparkle (直接分发) | Mac App Store |
|------|-------------------|--------------|
| 沙箱 | 不需要 | 必须沙箱 |
| 系统权限 | 完全访问 | 严格受限 |
| 审核 | 无 | Apple 审核 |
| 更新速度 | 即时 | 1-7 天 |
| 分成 | 0% | 15-30% |
| 代码签名 | Developer ID | App Store 签名 |
| 用户安装 | 拖拽到 Applications | App Store 一键 |

OpenClaw 需要 launchd、摄像头、屏幕录制等深度系统权限，沙箱限制太大。

### 9.5.2 为什么检查签名后才启用更新器？

1. **开发体验**：开发者运行未签名版本时不被更新对话框打扰
2. **安全**：未签名的 App 不应该执行自动更新（可能替换为恶意版本）
3. **Sparkle 要求**：Sparkle 需要验证更新包签名与当前 App 签名匹配

---

## 9.6 深入理解：代码签名与公证

```
macOS 安全层次:
│
├── 代码签名 (Code Signing)
│   ├── Developer ID Application: 开发者身份证明
│   ├── 编译时签名，运行时验证
│   └── Gatekeeper 首次启动检查
│
├── 公证 (Notarization)
│   ├── Apple 服务器扫描恶意软件
│   ├── 签发 "ticket"（安全通行证）
│   └── Gatekeeper 在线验证 ticket
│   └── 无公证 → "无法验证开发者" 警告
│
└── Sparkle EdDSA 签名
    ├── 独立于 Apple 代码签名
    ├── 用于验证更新包完整性
    └── 私钥在开发者手中，公钥在 App 中
```

### Electron 版的签名与公证

```bash
# macOS 签名 + 公证
npx electron-builder --mac \
  --config.mac.identity="Developer ID Application: Your Name" \
  --config.afterSign=scripts/notarize.js

# notarize.js
const { notarize } = require('@electron/notarize');
exports.default = async function notarizing(context) {
  await notarize({
    appBundleId: 'com.your-org.ai-desktop',
    appPath: context.appOutDir + '/AI Desktop.app',
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

---

## 9.7 常见问题与陷阱

### Q1: electron-updater 支持 delta 更新吗？
GitHub provider 支持。electron-builder 生成 `.blockmap` 文件用于计算差分。

### Q2: 如何测试自动更新？
```bash
# 本地搭建更新服务器
npx serve ./dist -l 8080

# App 指向本地
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080',
});
```

### Q3: Linux 上如何自动更新？
AppImage 支持自动更新（通过 electron-updater）。Snap 和 Flatpak 有各自的更新机制。deb/rpm 不支持自动更新，需要用户手动更新或配置 apt/yum 仓库。

### Q4: 更新失败怎么回滚？
Sparkle 和 electron-updater 都不提供自动回滚。最佳实践：
- 发布前充分测试
- 使用 staged rollout（分批发布）
- 保留旧版本下载链接

---

## 9.8 章节小结

| 功能 | OpenClaw (Sparkle) | Electron (electron-updater) |
|------|-------------------|---------------------------|
| 更新框架 | Sparkle 2.x | electron-updater |
| 更新源 | appcast.xml | GitHub/S3/generic |
| 签名验证 | EdDSA + Apple Code Signing | 代码签名 |
| 增量更新 | Sparkle delta | blockmap delta |
| 自动下载 | automaticallyDownloadsUpdates | autoDownload |
| 安装方式 | 替换 .app | quitAndInstall |
| 开发模式 | DisabledUpdaterController | !app.isPackaged |
| 公证 | xcrun notarytool | @electron/notarize |

下一章将讨论打包与发布的完整流程。
