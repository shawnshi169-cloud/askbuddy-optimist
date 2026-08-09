# apps/ios - iOS Native Shell

主工程：`apps/ios/App/App.xcodeproj`

本目录仅负责 iOS 平台能力：

- Xcode target/scheme、签名、Entitlements；
- Info.plist、iOS 权限和原生生命周期；
- Capacitor/native plugins、APNs、Apple 支付、Deep Link；
- iOS 构建、安装、归档与分发。

业务页面、React 组件、feature API 和 hooks 位于根目录 `src/`，由 iOS 与 Android 共用。不要在本目录复制业务状态机、Supabase 字段或 RPC contract。

契约冲突回 A - Backend & Shared Contract 仲裁。
