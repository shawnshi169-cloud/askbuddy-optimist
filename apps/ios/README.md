# apps/ios - iOS Native Shell

主工程：`apps/ios/App/App.xcodeproj`

本目录仅负责 iOS 平台能力：

- Xcode target/scheme、签名、Entitlements；
- Info.plist、iOS 权限和原生生命周期；
- Capacitor/native plugins、APNs、Apple 支付、Deep Link；
- iOS 构建、安装、归档与分发。

业务页面、React 组件、feature API 和 hooks 位于根目录 `src/`，由 iOS 与 Android 共用。不要在本目录复制业务状态机、Supabase 字段或 RPC contract。

契约冲突回 A - Backend & Shared Contract 仲裁。

## Call UAT 模拟器准备

原生工程引用的 `App/App/public`、`capacitor.config.json` 和 `config.xml` 是忽略提交的
Capacitor 生成物。首次构建或 Web 代码更新后，先在仓库根目录执行：

```sh
npm run build
npx cap sync ios
```

然后可使用共享的 `App` scheme 构建 iPhone 17 Pro 模拟器版本：

```sh
xcodebuild -project apps/ios/App/App.xcodeproj \
  -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
```

当前 App target 支持 `iphoneos` 与 `iphonesimulator`，deployment target 为 iOS 15.0。
