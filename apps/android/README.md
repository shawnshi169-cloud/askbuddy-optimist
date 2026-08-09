# apps/android（Android 主工程路径）

当前仓库的 Android 原生工程主路径为：

- `apps/android`

说明：

- Android 开发请统一在 `apps/android` 下进行。
- 多端目录采用同层级结构：`apps/ios`、`apps/android`、`apps/wechat-miniprogram`。
- 后端字段、状态机、RPC 命名冲突一律以 A 主线（后端契约与共享层）为准。

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

`app/src/main/assets/public` 由 Capacitor 从根目录 `dist` 同步生成，已被 Git 忽略；不要直接修改或提交其中的哈希资源文件。

## Call UAT 路由

Web 前端使用 `HashRouter`，原生 WebView 中的路由格式为：

- 登录：`https://localhost/#/auth`
- Call：`https://localhost/#/call/<call-session-id>`

本轮只验证 Call 会话页面与本地媒体占位，不包含真实 RTC 供应商能力。
