# Android Native Shell

## Ownership

- Architecture owner: `D - Android Native`
- Codex workstream: `Codex C`
- Native shell: `apps/android/`
- Shared Core App: `src/`（iOS 与 Android 共用，由 B - Core App 负责）
- Backend / Shared Contract: `packages/shared-types/`、`packages/shared-api/`、`supabase/`（冲突回 A 仲裁）

本目录只承载 Gradle、Manifest、权限、Capacitor/native plugins、系统行为、打包和安装能力。不要在 Native Shell 中复制 React 业务规则、RPC 白名单、共享状态机或后端字段。

## Build Flow

```text
src/
  -> npm run build
dist/
  -> npx cap sync android
apps/android/
  -> Gradle
debug APK
```

`capacitor.config.ts` 中必须保持 `webDir: 'dist'` 和 `android.path: 'apps/android'`。Android 不维护第二套 React App。

## Prerequisites

- Node.js 与 npm（版本以仓库 CI/package lock 为准）
- JDK 21
- Android SDK Platform 36
- Android SDK Build-Tools 35.0.0 或更高兼容版本
- Android Studio、Android Emulator 或启用 USB 调试的 Android 真机

Shared Core 启动时需要 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 和 `VITE_SUPABASE_PROJECT_ID`。通过本地忽略的环境文件或 CI 注入客户端配置，不要把真实环境值提交到仓库；staging 验收使用 `npm run build:staging`。

## Build

从仓库根目录执行：

```bash
npm ci
npm run build
npx cap sync android
cd apps/android
./gradlew tasks
./gradlew assembleDebug
```

Debug APK 输出：

```text
apps/android/app/build/outputs/apk/debug/app-debug.apk
```

## Install

```bash
adb devices -l
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -W -n app.lovable.bf11243b7233439588451aa876a26efd/.MainActivity
```

验收时确认 APK 安装成功、`MainActivity` 能启动、WebView 加载 Shared Core App，并检查 `adb logcat` 中没有 native crash、Web asset 404 或未捕获异常。

## Permissions

P0.6 baseline 只声明运行 WebView 所需的 `android.permission.INTERNET`。以下权限均推迟到对应功能任务，并在有真实用途时单独评审：

- `CAMERA`
- `RECORD_AUDIO`
- `POST_NOTIFICATIONS`
- `READ_MEDIA_*`
- `ACCESS_FINE_LOCATION`

## Generated Assets

`app/src/main/assets/public/` 是 `npm run build` 与 `npx cap sync android` 生成的 Web bundle，不是业务源码。

P0.6 不迁移历史 C 分支的 generated bundle，也不大规模删除 main 当前已跟踪的 generated assets。baseline 先验证 build/sync/Gradle 链路；是否彻底取消跟踪由风险项 `AR-012` 后续统一处理。

## Out Of Scope

- FCM Push
- Google Sign-In
- Deep Link / App Link
- Call Media / RTC
- Play Store signing 或发布
- Shared React UI 与业务逻辑
