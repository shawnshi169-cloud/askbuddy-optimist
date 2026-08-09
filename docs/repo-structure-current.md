# 当前仓库结构说明

状态：Phase 1 Freeze，多端目录已归一，所有权规则已收口。

## Source of Truth

```text
src/                         iOS + Android Shared Core App
apps/ios/                    iOS Native Shell
apps/android/                Android Native Shell
apps/wechat-miniprogram/     WeChat Mini Program
packages/shared-types/       Business types and state machines
packages/shared-api/         API/RPC contracts
supabase/                    Backend schema, RLS, RPC and functions
```

## 关键说明

1. `src/` 是 iOS 与 Android 共用的 React 业务前端，不属于 iOS Native。
2. `apps/ios/`、`apps/android/` 只承载对应平台的 Native Shell。
3. 小程序有独立 UI，但后端业务规则必须遵循 shared contract。
4. `dist/` 与 Native Shell 内的 Web bundle 属于生成物，不是业务源码。
5. A - Backend & Shared Contract 负责契约仲裁；Git `main` 是受保护的集成/发布主干。

## 当前过渡状态

- 现有 worktree/branch 名称保留历史标签，不据此判断长期代码所有权。
- `worktree/b-ios` 与 `worktree/c-android` 仍可能同时包含 `src/` 和 native shell 修改，合并时必须按职责选择性整合。
- Android 生成 Web assets 当前仍被 Git 跟踪，本轮不删除。

完整说明见 `docs/architecture-repository-ownership.md`。
