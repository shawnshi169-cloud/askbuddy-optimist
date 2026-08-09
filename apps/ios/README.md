# apps/ios（iOS 主工程路径）

当前仓库的 iOS 原生工程主路径为：

- `apps/ios/App/App.xcodeproj`

说明：

- iOS 开发请统一在 `apps/ios` 下进行。
- 多端目录采用同层级结构：`apps/ios`、`apps/android`、`apps/wechat-miniprogram`。
- 后端字段、状态机、RPC 命名冲突一律以 A 主线（后端契约与共享层）为准。

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
