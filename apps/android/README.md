# apps/android - Android Native Shell

主路径：`apps/android/`

本目录仅负责 Android 平台能力：

- Gradle 工程、Manifest、签名；
- Android 权限和原生生命周期；
- Capacitor/native plugins、FCM、Android 支付、Deep Link；
- Android 构建、安装、打包与分发。

## 责任边界

- Android Native 开发统一在 `apps/android/` 下进行。
- 业务页面、React 组件、feature API 和 hooks 位于根目录 `src/`，是 iOS 与 Android 共用的 Shared Core，由 B 负责。
- 不在本目录复制业务状态机、Supabase 字段或 RPC contract；契约冲突回 A - Backend & Shared Contract 仲裁。
- `app/src/main/assets/public/` 是 Capacitor 生成的 Web bundle，不是业务源码。

## Android 工程现状

当前目录已按 Capacitor 8 恢复完整 Android Gradle 工程，包括根工程、`app` module、Gradle Wrapper、Manifest、资源和 `MainActivity`。Capacitor 配置中的 Android 唯一路径为 `apps/android`。

生成的 Web assets 和 Cordova bridge 文件已被 Git 忽略，由根目录 Web build 和 Capacitor sync 恢复；不要直接修改或提交其中的哈希资源文件。

## 本地运行要求

- JDK 21（Capacitor 8 的 Android 模块使用 Java 21 编译）。
- Android SDK Platform 36 与 Android SDK Build-Tools 35.0.0 或更高版本。
- Android Studio 可直接导入 `apps/android`，不要另建 Android 工程目录。

## 构建与同步

从仓库根目录执行：

```bash
npm run build
npx cap sync android
```

然后执行 Debug 构建：

```bash
cd apps/android
./gradlew assembleDebug
```

Debug APK 输出到 `apps/android/app/build/outputs/apk/debug/app-debug.apk`。

## 模拟器或真机验证

在 Android Studio 中直接导入 `apps/android`，启动 API 36 模拟器，或连接已开启 USB 调试的 Android 真机。设备可用后执行：

```bash
adb devices -l
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -W -n app.lovable.bf11243b7233439588451aa876a26efd/.MainActivity
```

验收时确认安装成功、`MainActivity` 冷启动成功、登录页可进入，并检查 `adb logcat` 中没有应用崩溃、Web asset 404 或未捕获异常。

## Deep Link / Call UAT 路径

Web 前端使用 `HashRouter`，原生 WebView 中的路由格式为：

- 登录：`https://localhost/#/auth`
- Call：`https://localhost/#/call/<call-session-id>`

以上是 WebView 内部 UAT 路径；Android App Link 或自定义 scheme 的外部映射应通过 Manifest/Native Plugin 接入，不在 Shared React 页面散布平台判断。

当前 Call UAT 只验证会话页面和本地媒体占位，不包含真实 RTC 供应商能力。
