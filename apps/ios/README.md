# apps/ios - iOS Native Shell

Architecture owner: **C - iOS Native**
Codex workstream: **Codex B**

主工程：`apps/ios/App/App.xcodeproj`
Shared scheme：`App`

本目录仅负责 iOS 平台能力：

- Xcode target/scheme、签名、Entitlements；
- Info.plist、iOS 权限和原生生命周期；
- Capacitor/native plugins、APNs、Apple 支付、Deep Link；
- iOS 构建、安装、归档与分发。

业务页面、React 组件、feature API 和 hooks 位于根目录 `src/`，由 iOS 与 Android 共用。不要在本目录复制业务状态机、Supabase 字段或 RPC contract。

契约冲突回 A - Backend & Shared Contract 仲裁。

## 构建架构

```text
src/ -> npm run build -> dist/ -> Capacitor sync -> apps/ios/
```

- `src/` 是 iOS 与 Android 共用的 Core App 源码。
- `dist/` 是 Vite 构建产物，不是 iOS 独立业务源码。
- `apps/ios/` 只维护 Xcode 工程和 iOS 原生壳。
- `App/App/public`、`App/App/capacitor.config.json` 和 `App/App/config.xml` 由 Capacitor 生成并被 Git 忽略。

## Prerequisites

- Node.js 和 npm 版本遵循仓库根目录配置。
- Xcode 26 或与当前 iOS SDK 兼容的版本。
- 至少安装一个 iOS Simulator runtime。
- 首次构建需要能够解析锁定的 Capacitor Swift Package 依赖。
- 运行 App 前需要在被 Git 忽略的 `.env.local` 中提供当前环境有效的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`；不要提交真实环境配置。

当前 App target 的 deployment target 是 iOS 15.0，Bundle identifier 来自 `PRODUCT_BUNDLE_IDENTIFIER`，并与根目录 `capacitor.config.ts` 的 `appId` 保持一致。

## Build Core App

在仓库根目录执行：

```sh
npm ci
# 首次本地运行时，从模板创建并填写当前环境的客户端配置。
cp .env.example .env.local
npm run build
```

## Sync iOS Shell

Core App 构建完成后执行：

```sh
npx cap sync ios
```

Capacitor sync 会刷新被忽略的 Web 资源和原生生成配置，也可能更新由 Capacitor 管理的 `CapApp-SPM/Package.swift`。提交前应检查 Git diff，只保留有意义的 source-controlled native config。

## Open Xcode

```sh
npx cap open ios
```

也可以直接打开 `apps/ios/App/App.xcodeproj`，选择 shared `App` scheme 和目标 Simulator。

## Simulator Build

```sh
xcodebuild \
  -project apps/ios/App/App.xcodeproj \
  -scheme App \
  -sdk iphonesimulator \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Simulator 构建不依赖发布签名。真机签名、APNs、Apple Sign In、Deep Link、Call Media 和 App Store 发布不属于本 baseline。

## 权限基线

当前 Native Shell 不预先声明 Camera、Microphone、Photo Library、Contacts、Location、Bluetooth 或 Tracking 权限。后续功能只有在安装的 plugin 或已批准的原生能力确实使用对应资源时，才单独添加用途说明并验证系统授权流程。
