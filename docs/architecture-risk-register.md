# Architecture Risk Register

状态：Active
维护人：A - Backend & Shared Contract + Release Owner
范围：当前 Phase 1 Freeze 基线及多端协作结构。

## 1. Risk Register

| Risk ID | 风险说明 | 当前影响模块 | Severity | 影响当前开发 | Production Blocker | 阶段 | 推荐处理方式 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR-001 | `src/` 曾被所有权规则归入 iOS，导致 iOS/Android 同时修改共享 React 页面 | `src/`, CODEOWNERS, B/C 分支 | High | 是 | 否 | P0 | 本批次修正文档/CODEOWNERS；新任务启用 B Core App 角色 |
| AR-002 | shared contract 采用不完整，Questions/Search/Messages/Admin 等仍在 hook 内声明业务类型或直接写 RPC 字符串 | `src/hooks`, `packages/shared-*` | High | 是 | 否 | P1 | 按模块渐进迁移；新功能强制 Contract First |
| AR-003 | `packages/shared-api` 重复声明 `SearchObjectType`、`ContentTargetType`，shared 目录也尚无独立 package manifest | shared API、miniapp 消费 | Medium | 是 | 否 | P1 | 统一从 shared-types 导入；之后再决定 workspace/package 构建方式 |
| AR-004 | 前端与 Supabase 具体表/legacy 列耦合较深，存在 `user_id/content/bounty_points` 与新契约 `author_id/description/reward_points` 并行 | Questions、Answers、Posts、Profile | High | 是 | 条件性 | P1 | 先增加 mapper/feature API，再按一个域逐步切换，暂不删兼容列 |
| AR-005 | RPC 缺失/schema cache 时自动直写表或走 legacy RPC，可能掩盖 staging/prod 契约缺失 | Questions、Messages、Notifications、Topics、Payments | Critical | 是 | 是 | P0 | production 禁止写 fallback；开发环境显式开关；按模块逐项退役 |
| AR-006 | 微信小程序仍 `useMock=true` 且登录写入 `mock_token_*`，真实 JWT/微信身份交换未落地 | Mini Program Auth/API/Call | Critical | 是 | 是 | P0 | A 定版 WeChat Auth v1 + Edge Function；E 仅消费，不存 AppSecret |
| AR-007 | 支付路径存在 mock gateway、legacy `recharge_points` 和 development manual confirm | PointsRecharge、Payments、Admin recharge | Critical | 是 | 是 | P0 | 正式支付只能 Edge Function/回调/service role；生产构建禁用 legacy/manual 路径 |
| AR-008 | Search/Channel/Home 会把 demo 数据合并或作为 fallback，后端异常时可能展示演示内容 | Search、频道首页、Discover | High | 是 | 是 | P1 | mock 仅显式 development mode；production 错误态不得静默返回 demo |
| AR-009 | 业务规则在多处重复：订单/Call/技能状态映射、target/item type，moderation 仍使用 `discussion/profile` 等非当前白名单值 | Core App、Mini Program、Admin | High | 是 | 条件性 | P1 | 共享枚举为唯一输入；UI-only label map 可本地保留；冲突回 A 仲裁 |
| AR-010 | 状态机和关键系统字段仍存在客户端直写尝试，例如 view count、部分内容状态/计数 | Questions、Posts、Messages | High | 是 | 条件性 | P1 | 计数和受控状态迁移到 RPC；普通 owner 内容字段可继续 RLS 写入 |
| AR-011 | `main` 尚未整合 Native Shell 可构建修复；候选修复已分别存在于历史 `worktree/b-ios`（iOS scheme）和 `worktree/c-android`（完整 Gradle shell） | Native Shell / UAT / branch integration | Critical | 是 | 是（对应端发布） | P0 | 按新所有权选择性整合到 C/D 平台分支，完成原生构建、安装和签名 UAT 后再进入发布 |
| AR-012 | Android `app/src/main/assets/public/` 跟踪大量构建产物，PR 容易包含噪音并产生跨端冲突 | Android PR/merge | Medium | 是 | 否 | P2 | 观察现有发布流程；后续改为 CI/Capacitor sync 生成或独立构建 commit |
| AR-013 | Supabase generated types 与 legacy 兼容列同时存在，局部大量 `(supabase as any)` 绕过类型检查 | Hooks、Admin、Payments | Medium | 是 | 否 | P2 | schema 稳定后再生成 types；按高风险写路径优先消除 `any` |
| AR-014 | 客户端调用的 RPC 数量明显多于 shared-api 白名单，admin/支付/消息/频道契约未纳入统一目录 | Core App API surface | High | 是 | 条件性 | P1 | 建立 client-callable/server-only/deprecated 三类 RPC 清单 |
| AR-015 | `.env` 当前被 Git 跟踪，虽仅应含 publishable 配置，但容易导致多人环境漂移 | local/staging/prod 配置 | Medium | 是 | 条件性 | P1 | 改用 `.env.example` + 本地/CI 注入；迁移前确认无秘密并制定兼容步骤 |
| AR-016 | GitHub CODEOWNERS 目前只有单一组织账号，无法真正强制 A-E 分角色审批 | 所有 PR | Medium | 是 | 否 | P1 | 建立 GitHub teams 后替换占位 owner，并为 `main` 开启 branch protection |

## 1.1 P0.5 Status Update

历史风险不删除；以下状态记录本轮治理结果：

| Risk ID | Status | P0.5 result |
| --- | --- | --- |
| AR-001 | Controlled | `src/` 已明确为 Shared Core App，CODEOWNERS 与职责文档一致 |
| AR-003 | Controlled / Partial | `SearchObjectType`、`ContentTargetType` 已由 shared-api 改为消费 shared-types；package/workspace 化延后 |
| AR-015 | Controlled | `.env` 停止跟踪，建立 `.env.example`、Secret 分类和轮换规则 |
| AR-016 | Open | 已提供 `quality-gate` 与人工配置清单；GitHub ruleset 尚需管理员真实确认 |
| AR-017 | Controlled | 五个 Architecture Roles 与四个 Codex Workstreams 的命名歧义已由 mapping 文档收口 |
| AR-018 | Controlled / Open debt | CI 已阻止新增 typecheck/lint 回归；历史 30 个 TypeScript diagnostics 和 74 个 lint errors 仍需渐进清理 |
| AR-019 | Controlled / Migration pending | 历史 worktree 混合所有权已完成 inventory；Native candidate 尚未选择性迁移 |

新增风险定义：

- **AR-017**：Codex 对话字母与 Architecture Role 字母不一一对应，可能导致错误派单。
- **AR-018**：历史全量 typecheck/lint 尚未清零，若无增量 gate 会继续累积。
- **AR-019**：历史 worktree 同时包含 Core、Native、shared 或生成物，整分支 merge 会破坏当前职责边界。

## 2. Shared Contract Classification

### 可继续保留的 UI-only 类型

- `src/lib/adapters/contentAdapters.ts` 中 `UIExpertCardModel`、`UIQuestionModel`、`UIConversationModel`。
- 组件 Props、本地表单状态、页面 tab/filter、Call UI 状态和中文 label map。
- `RechargePaymentIntent` 中纯页面展示字段可以保留，但其持久化状态不能覆盖后端 `payments.status`。

### 应未来迁移到 `shared-types`

- `src/hooks/useQuestions.ts` 的 `Question`、`Answer` legacy 业务模型。
- `src/hooks/useMessages.ts`、`useNotifications.ts` 的持久化实体类型。
- `src/hooks/useProfileData.ts` 的订单、积分、收益记录类型。
- `src/hooks/usePosts.ts` 的 Post/Comment 持久化字段。
- `src/hooks/useModeration.ts`、`useAdmin.ts` 的 target/status 白名单。

### 应未来迁移到 `shared-api`

- `create_question_secure`、`create_answer_secure`、`get_channel_feed`。
- `get_user_conversations`、`send_direct_message`、`mark_notifications_read`。
- `create_recharge_payment_order` 与可公开客户端调用的支付 intent contract。
- Admin RPC 应单列为 admin-only contract，不与普通客户端白名单混用。

## 3. Direct Supabase Access Classification

### 普通读取

可继续使用但应集中到 feature API：profiles、公开 questions/answers/posts/experts、owner settings/history、hot keywords。

### 普通写入

在 RLS 明确时可保留：profile/settings、draft、favorites/follows/likes/comments。后续优先去掉页面内直写。

### 权限敏感写入

messages、content reports、moderation、admin configs、notification creation。应优先 RPC/Edge Function；普通用户只能执行其明确 owner 动作。

### 状态机写入

accepted answer、order/payment/call status、审核状态、系统计数。必须通过受控 RPC，不允许客户端直接更新系统字段。

### 金额与账务写入

`point_accounts`、`point_transactions`、`earning_transactions`、支付确认与充值到账只能由 service-role/server-side 维护。

## 4. RPC Fallback Inventory

| Module | Current fallback | Development | Production | Action |
| --- | --- | --- | --- | --- |
| `useQuestions` | secure RPC 缺失后直接 insert questions/answers | 临时可接受 | 不可接受 | future removal required |
| `useMessages` | conversations/messages RPC 缺失后直接查询/insert | 只读 fallback 可观察；写入需限制 | 写 fallback 不可接受 | future removal required |
| `useNotifications` | mark RPC 缺失后 owner direct update | 可接受 | 应在契约完整后移除 | future removal required |
| `useHotTopics` | discussion RPC 缺失后 direct insert | 临时可接受 | 不可接受 | future removal required |
| `usePayments` | Edge Function/RPC 缺失后 `recharge_points` legacy direct | 不建议 | 严禁 | Production Blocker |
| `useSearch` | v2 -> legacy RPC -> direct tables/demo | 可用于开发 | production 仅允许明确错误态/受控兼容 | future removal required |
| `useChannelFeed` | RPC 缺失或空数据时合并 demo | 可用于设计验收 | 不可静默展示 demo | Production Blocker |

## 5. Mock / Demo / Legacy Inventory

| Path | Current purpose | Production status |
| --- | --- | --- |
| `src/lib/demoData.ts` | 首页/频道/搜索演示内容 | 必须由显式 development flag 隔离 |
| `apps/wechat-miniprogram/utils/mock.js` | 小程序全链路 mock | Production Blocker |
| `apps/wechat-miniprogram/app.js -> useMock` | 小程序请求总开关 | Production Blocker，生产必须 false |
| `pages/profile/index.js -> mock_token_*` | 小程序登录占位 | Production Blocker |
| `wechat-prepay` mock gateway / payment payload | 支付联调占位 | Production Blocker |
| `recharge_points` legacy fallback | 旧充值兼容 | Production Blocker |
| legacy search RPC / posts/follows fields | 已登记兼容层 | 观察一版后渐进退役 |
| development manual payment callback | 本地/测试补单 | Production 禁用，保留运维受控路径需另行设计 |

## 6. Duplicated Business Rules

- Questions/Answers：shared contract 使用 `author_id/description/reward_points`，Core App 仍大量使用 `user_id/content/bounty_points`。
- Moderation：shared target whitelist 与 `discussion/profile` 客户端值不一致。
- Payments：UI intent 的 `completed` 与后端 payment `paid` 容易混淆，必须明确 UI-only 与持久化状态边界。
- Orders：Core App 与小程序各自保留状态 label/map；label 可本地，允许值必须来自 shared-types。
- Call：A 公共 RPC/Realtime 已收口；平台仅保留权限、生命周期和媒体 adapter。
- Search types：shared-api 与 shared-types 重复声明，应统一来源。

## 7. Top 5 Risks

1. AR-005：生产环境 RPC fallback 可能绕过契约和受控写路径。
2. AR-006：小程序真实登录/JWT 尚未落地。
3. AR-007：支付仍含 mock/legacy/manual confirm 路径。
4. AR-011：iOS/Android Native Shell 尚未形成稳定可构建基线。
5. AR-002/AR-009：共享契约采用不完整并存在跨端规则重复。

## 8. Action Decision

### 必须现在解决

- 已在本批次解决 AR-001：`src/` 所有权与角色边界。
- 在继续双端 Call UAT 前，选择性整合 AR-011 已有的 Native Shell 修复并完成原生构建/安装 UAT。
- 在小程序真实联调前，由 A 先解决 AR-006 的 WeChat Auth v1 契约和服务端交换链路。

### 只登记，暂不修改

- Questions/Search/Messages 类型批量迁移。
- legacy posts/follows 字段和兼容 trigger。
- generated assets 退役。
- 全站 `(supabase as any)` 清理。

### Production Blockers

- 小程序 `useMock=true` / `mock_token_*`。
- 支付 mock gateway、legacy recharge fallback、development manual confirm。
- production 中写型 RPC fallback。
- Search/Home/Channel 静默 demo fallback。
- 对应平台 Native Shell 无法稳定构建、签名或安装。

## 9. Recommended Contract First Pilots

1. **WeChat Auth v1**：最明确的服务端敏感边界，可验证 Edge Function + shared API + 小程序消费流程。
2. **Questions/Answers publish path**：统一 legacy/new 字段并移除 secure RPC 缺失后的直写 fallback。
3. **Messages/Notifications**：统一 client-callable RPC、实体类型和未读/已读动作，减少页面直连。

Call v1 已作为参考实现，不再作为下一轮大改对象。
