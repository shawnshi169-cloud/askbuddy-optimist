# 找人问问（AskBuddy）

面向中国年轻用户的实用咨询与经验连接产品。当前仓库同时承载 iOS、Android、微信小程序、共享业务契约和 Supabase 后端。

当前状态：Phase 1 Freeze。默认只接受 bugfix、小 patch、cleanup 和已仲裁的跨端契约变更。

## Repository Architecture

```text
src/                         iOS + Android Shared Core App（React）
apps/ios/                    iOS Native Shell（Capacitor / Xcode）
apps/android/                Android Native Shell（Capacitor / Gradle）
apps/wechat-miniprogram/     微信小程序独立前端
packages/shared-types/       跨端业务类型、枚举、状态机唯一来源
packages/shared-api/         跨端 API / RPC 输入输出契约
supabase/                    Schema、Migration、RLS、RPC、Edge Functions
docs/                        架构、契约、联调与发布文档
```

`src/` 不是 iOS 专属目录。iOS 和 Android 共用其中的 React 页面、组件、feature API、hooks 和业务 UI；平台原生能力只能进入对应的 `apps/ios/` 或 `apps/android/`。

详细边界见 [Architecture & Repository Ownership](docs/architecture-repository-ownership.md)，已知风险见 [Architecture Risk Register](docs/architecture-risk-register.md)。

## Ownership Roles

- A - Backend & Shared Contract：`supabase/`、`packages/shared-types/`、`packages/shared-api/`
- B - Core App：根目录 `src/` 及共享 React 前端
- C - iOS Native：`apps/ios/`
- D - Android Native：`apps/android/`
- E - WeChat Mini Program：`apps/wechat-miniprogram/`

角色可以由同一人兼任，但代码边界不随人员变化。A - Backend & Shared Contract 是职责角色，不等于 Git `main` branch；`main` 是受保护的集成和发布主干。

现有 `worktree/b-ios`、`worktree/c-android`、`worktree/d-miniapp` 保留历史命名，不在治理批次中强制改名。新任务按当前角色与分支规范执行。

## Contract First

新功能默认按以下顺序推进：

```text
Supabase migration/RLS/RPC（如需要）
  -> packages/shared-types
  -> packages/shared-api
  -> src/features/<feature>/API
  -> src/hooks 或平台请求适配层
  -> UI
```

Call v1 是当前参考实现。端侧不得自行新增后端字段语义、状态值、target/item type 或非白名单 RPC。

## Local Development

```bash
npm install
npm run dev
npm run test:contracts
npm run build
```

远端 smoke 需要真实 staging 环境变量：

```bash
npm run test:smoke
```

平台工程路径：

- iOS：`apps/ios/App/App.xcodeproj`
- Android：`apps/android/`
- 微信开发者工具导入：`apps/wechat-miniprogram/`

## Collaboration Rules

1. 普通开发不得直接提交到 `main`。
2. 一个 commit/PR 只处理一个职责域；跨层变更需在 PR 中拆分并列出依赖顺序。
3. 字段、状态机、RPC 冲突统一走 [Conflict Resolution Process](docs/conflict-resolution-process.md)。
4. 各开发者使用自己的 local 环境，团队联调统一连接 staging。
5. mock、fallback、legacy 只能作为已登记兼容层，不能无期限成为 production 主路径。

## Key Documents

- [Architecture & Repository Ownership](docs/architecture-repository-ownership.md)
- [Architecture Risk Register](docs/architecture-risk-register.md)
- [Contract Snapshot v1](docs/contracts-snapshot-v1.md)
- [Contracts Guardrails](docs/contracts-guardrails.md)
- [Multi-platform Collaboration Rules](docs/multi-end-collaboration-rules.md)
- [Staging Integration SOP](docs/multi-end-staging-integration-sop.md)
