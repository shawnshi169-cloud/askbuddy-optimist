# apps/android - Android Native Shell

主路径：`apps/android/`

本目录仅负责 Android 平台能力：

- Gradle 工程、Manifest、签名；
- Android 权限和原生生命周期；
- Capacitor/native plugins、FCM、Android 支付、Deep Link；
- Android 构建、安装、打包与分发。

业务页面、React 组件、feature API 和 hooks 位于根目录 `src/`，由 iOS 与 Android 共用。不要在本目录复制业务状态机、Supabase 字段或 RPC contract。

`app/src/main/assets/public/` 是生成 Web bundle，不是业务源码。当前生成物仍被跟踪，本轮不删除，后续按风险清单治理。

契约冲突回 A - Backend & Shared Contract 仲裁。
