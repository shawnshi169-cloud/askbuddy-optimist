# 多端协作规则（Architecture Governance 版）

## 1. 角色与唯一事实来源

- A - Backend & Shared Contract：后端、共享类型、API/RPC 契约与仲裁。
- B - Core App：iOS + Android 共用 React 核心前端。
- C - iOS Native：iOS 原生壳、权限、插件、签名与构建。
- D - Android Native：Android 原生壳、权限、插件、签名与构建。
- E - WeChat Mini Program：小程序独立前端与微信平台能力。

人员可以兼任角色，代码责任边界不能合并。字段、状态机、RPC 和 target/item type 冲突一律回 A 仲裁。

## 2. 目录边界（严格执行）

- Shared Core App：`src/`（同时服务 iOS 与 Android，不是 iOS 专属）。
- iOS Native Shell：`apps/ios/`。
- Android Native Shell：`apps/android/`。
- 微信小程序：`apps/wechat-miniprogram/`。
- 后端：`supabase/`。
- 共享契约：`packages/shared-types/`、`packages/shared-api/`。

## 3. A Role 与 Git `main`

- A - Backend & Shared Contract 是后端和契约职责。
- Git `main` 是受保护的集成/发布主干，不是 A 的日常开发分支。
- 普通开发通过短生命周期分支和 PR 进入 `main`。

## 4. 分支规范

- 后端：`feat/backend-*` / `fix/backend-*`
- 契约：`feat/contracts-*` / `chore/contracts-*`
- Core App：`feat/core-*` / `fix/core-*`
- iOS Native：`feat/ios-native-*` / `fix/ios-native-*`
- Android Native：`feat/android-native-*` / `fix/android-native-*`
- 小程序：`feat/miniapp-*` / `fix/miniapp-*`

禁止一个 commit 混合无关端。现有 `worktree/b-ios`、`worktree/c-android`、`worktree/d-miniapp` 为历史命名，暂不强制重命名。

## 5. Contract First

新功能顺序：`supabase` -> `shared-types` -> `shared-api` -> feature API -> hooks/request adapter -> UI。端侧不得先创造后端字段或状态。

本规则不要求本轮批量重构既有 Questions/Search/Messages，也不删除现有 mock/fallback/legacy。

## 6. 环境规范

- 各自 local 开发，不共享日常 dev。
- 联调统一使用 staging。
- 真机测试/内测优先 staging 或 prod-like。
- service-role key、微信 AppSecret 不得进入客户端或 Git。

## 7. Freeze 约束

当前只接受 bugfix、小 patch、cleanup 和已仲裁契约变更；不允许新大 Pack 或大规模重构。

详细规则见 `docs/architecture-repository-ownership.md`，风险见 `docs/architecture-risk-register.md`。
