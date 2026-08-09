# Architecture & Repository Ownership

状态：Normative
适用范围：所有新开发、PR 审查、多人协作与跨端契约仲裁
原则：先明确职责边界，再做渐进重构。

## 1. Architecture Baseline

```text
src/                         iOS + Android Shared Core App
apps/ios/                    iOS Native Shell
apps/android/                Android Native Shell
apps/wechat-miniprogram/     WeChat Mini Program Client
packages/shared-types/       Cross-platform Business Types
packages/shared-api/         Cross-platform API/RPC Contracts
supabase/                    Backend Source of Truth
```

### `src/` - Shared Core App

`src/` 是 iOS 与 Android 共用的 React 核心前端，不属于任何单一原生平台。包含：

- 页面、组件和设计系统；
- feature API、hooks、query/cache；
- 跨 iOS/Android 一致的业务 UI 和导航；
- Supabase 客户端读取及已批准的客户端写入。

若一段逻辑只对 iOS 或只对 Android 成立，必须通过平台 adapter 注入，不能在共享业务组件中散布平台分支。

### Native Shells

- `apps/ios/`：Xcode 工程、签名、Entitlements、Info.plist、iOS 权限、原生插件、APNs、Apple 支付、Deep Link 和原生生命周期。
- `apps/android/`：Gradle 工程、Manifest、签名、Android 权限、原生插件、FCM、Android 支付、Deep Link 和原生生命周期。
- Native Shell 不承载主要业务页面、状态机或后端字段定义。

### WeChat Mini Program

`apps/wechat-miniprogram/` 是独立前端实现，可以有自己的页面、组件、请求适配和生命周期，但必须消费 A 定版的字段、枚举、状态机、RPC 和错误码。微信 AppSecret、Supabase service-role key 不得进入客户端。

### Shared Contracts and Backend

- `packages/shared-types/`：业务实体、枚举、状态机、target/item type 的唯一跨端类型来源。
- `packages/shared-api/`：公开 API/RPC 名称、参数、返回值和页面数据契约。
- `supabase/`：Schema、Migration、RLS、RPC、Edge Functions 与关键业务规则的后端唯一来源。
- `src/integrations/supabase/types.ts` 是 Supabase 生成类型，不替代业务契约，也不应手工创造业务语义。

## 2. Responsibility Model

| Role | Responsibility | Primary paths |
| --- | --- | --- |
| A - Backend & Shared Contract | 后端、RLS、RPC、Edge Functions、共享类型与契约仲裁 | `supabase/`, `packages/shared-types/`, `packages/shared-api/` |
| B - Core App | iOS/Android 共用 React 页面、组件、feature API、hooks | `src/`, `public/`, Core App build config |
| C - iOS Native | iOS 原生壳、权限、插件、签名、构建与分发 | `apps/ios/` |
| D - Android Native | Android 原生壳、权限、插件、签名、构建与分发 | `apps/android/` |
| E - WeChat Mini Program | 小程序页面、组件、请求适配、微信平台能力 | `apps/wechat-miniprogram/` |

人员不足时可以兼任角色，但每个 commit 和 PR 仍必须标明责任域。

### Existing task/branch name transition

现有 worktree 名称是历史协作标签，不在本批次强制改名：

| Existing name | Historical meaning | New ownership meaning |
| --- | --- | --- |
| `worktree/a-main` | A 后端与契约 | A - Backend & Shared Contract |
| `worktree/b-ios` | B iOS | B Core App + C iOS Native 的临时混合分支，后续提交必须拆分责任 |
| `worktree/c-android` | C Android | B Core App + D Android Native 的临时混合分支，后续提交必须拆分责任 |
| `worktree/d-miniapp` | D 小程序 | E - WeChat Mini Program |

不要为改名而重写历史；新任务和新分支采用当前角色模型。

## 3. A Role vs Git `main`

- A - Backend & Shared Contract：业务职责，维护后端与共享契约并作最终仲裁。
- Git `main`：受保护的集成和发布主干，不属于某个开发者，也不是普通工作分支。
- 所有角色通过短生命周期分支和 PR 进入 `main`；`main` 只接收已审查、可构建、契约一致的提交。
- 推荐启用 GitHub branch protection：禁止直接 push、至少一名 reviewer、必需状态检查、禁止 force push。

## 4. Branch and Commit Convention

推荐分支：

- A 后端：`feat/backend-<topic>`、`fix/backend-<topic>`
- A 契约：`feat/contracts-<topic>`、`chore/contracts-<topic>`
- B Core App：`feat/core-<topic>`、`fix/core-<topic>`
- C iOS Native：`feat/ios-native-<topic>`、`fix/ios-native-<topic>`
- D Android Native：`feat/android-native-<topic>`、`fix/android-native-<topic>`
- E 小程序：`feat/miniapp-<topic>`、`fix/miniapp-<topic>`

一个 commit 不应同时修改无关平台。确实跨层的功能按以下顺序拆分：契约 -> Core App/小程序消费 -> Native Shell。

## 5. Contract First Delivery

新功能参考 Call v1：

```text
1. A: migration / RLS / controlled RPC
2. A: packages/shared-types
3. A: packages/shared-api
4. B/E: feature API or request adapter
5. B/E: hooks / state orchestration
6. B/C/D/E: UI and platform integration
7. staging contract test + platform UAT
```

本规则不要求立即批量重构 Questions、Search、Messages 等既有模块，但新代码不得继续复制后端业务 Contract。

## 6. Where a New Feature Should Change

| Change | Required paths | Usually not required |
| --- | --- | --- |
| 新字段/状态/RPC | `supabase/` -> `packages/shared-types/` -> `packages/shared-api/` | 端侧先定义字段 |
| iOS/Android 共用页面 | `src/` | 在两个 native shell 重复页面 |
| iOS 权限/插件 | `apps/ios/` | 在共享 hook 硬编码 iOS 规则 |
| Android 权限/插件 | `apps/android/` | 在共享 hook 硬编码 Android 规则 |
| 小程序页面/微信 API | `apps/wechat-miniprogram/` | 修改 Core App UI |
| 关键状态流转/账务动作 | `supabase/` RPC/Edge Function + shared contracts | 客户端直接 update |

## 7. Supabase Access Risk Classes

| Class | Examples | Rule |
| --- | --- | --- |
| 普通读取 | 公开 questions/profiles/posts，owner-only settings/history | 可直接查询，但字段必须来自契约并依赖 RLS |
| 普通写入 | owner profile/settings、草稿、收藏/关注 | RLS 明确时可直写；优先集中在 feature API |
| 权限敏感写入 | messages、reports、moderation、system config | 优先受控 RPC；后台动作必须 server-side/admin guard |
| 状态机写入 | accept answer、order/call/payment status | 必须 RPC/Edge Function，不允许直接 update |
| 金额/积分/收益 | payments、point/earning transactions、余额 | 只能受控 server-side 路径，客户端只读或创建受限 intent |

## 8. Generated Assets

- `dist/`、iOS Web bundle、Android `app/src/main/assets/public/` 属于构建产物，不是业务源码。
- 业务审查以 `src/` 为准；构建产物如因当前打包流程需要提交，应由平台构建 commit 单独更新。
- 当前 Android Web assets 已被跟踪，暂不删除；退役方案登记在风险清单。

## 9. Merge Gate

每个 PR 至少满足：

1. 职责域明确，未混入无关平台。
2. Contract Check 完成，无端侧私创字段/状态/RPC。
3. `npm run test:contracts` 通过。
4. Core App 变更执行 `npm run build`。
5. Native Shell 变更执行对应原生构建。
6. 小程序变更执行 JavaScript 语法检查和微信开发者工具抽查。
7. 涉及后端时附 migration、RLS、回滚和 staging 验证结果。

## 10. Current Ownership Gaps

- GitHub 暂时只有 `@Devs-hub-pro` 一个可用 CODEOWNER，角色边界目前依赖评论和流程，后续应创建真实 GitHub teams。
- `worktree/b-ios` 与 `worktree/c-android` 仍混合 Core App 和 Native Shell 修改，不能整分支同时合并。
- shared directories 尚不是独立发布 package，非 React 端的消费仍依赖人工同步/适配。
- Android 跟踪大量生成 Web assets，容易造成 PR 噪音和冲突。

以上缺口在 `docs/architecture-risk-register.md` 跟踪；不得通过一次性大重构解决。
