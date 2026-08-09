# Contract Snapshot v1（A - Backend & Shared Contract 唯一事实来源）

更新时间：2026-04-24  
适用范围：B Core App / C iOS Native / D Android Native / E 微信小程序
仲裁规则：字段、状态机、RPC 命名冲突一律以 A - Backend & Shared Contract 为准。

---

## 1. 基线与来源

- 后端 migration 基线：Pack 01 ~ Pack 08-A、08-B(搜索 v2)
- 共享契约包：
  - `packages/shared-types/src/contracts.ts`
  - `packages/shared-api/src/rpc-whitelist.ts`
  - `packages/shared-api/src/page-contract-map.ts`

---

## 2. 核心实体类型（v1）

覆盖域：

1. 用户：`profiles`, `user_settings`, `user_verifications`
2. 问题：`questions`, `question_drafts`, `question_tags`
3. 回答：`answers`
4. 专家：`experts`
5. 技能：`skill_categories`, `skill_offers`
6. 消息：`conversations`, `conversation_members`, `messages`
7. 通知：`notifications`
8. 订单：`orders`, `payments`
9. 积分：`point_accounts`, `point_transactions`
10. 收益：`earning_transactions`
11. 通话：`call_sessions`（Call v1 规划白名单）

类型定义以 `packages/shared-types/src/contracts.ts` 为准。

---

## 3. 统一枚举白名单（状态机）

> 新状态值必须先由 A Role 仲裁通过，再允许进入 B/C/D/E。

### 3.1 问答域

- `questions.status`：`draft | open | matched | solved | closed | hidden`
- `answers.status`：`active | accepted | hidden | rejected`

### 3.2 专家/技能域

- `experts.verification_status`：`unverified | pending | verified | rejected`
- `experts.profile_status`：`active | inactive`
- `skill_offers.status`：`draft | pending_review | published | offline`
- `skill_offers.pricing_mode`：`per_question | per_session | per_hour | negotiable`
- `skill_offers.delivery_mode`：`online | offline | hybrid`

### 3.3 发现/搜索域

- `posts.visibility`：`public | followers | private`
- `posts.status`：`active | hidden | deleted`
- `search_history.query_type`：`all | question | expert | skill | post`
- `hot_keywords.keyword_type`：`all | question | expert | skill | post`

### 3.4 消息/通知域

- `conversations.type`：`direct | system | service`
- `messages.status`：`active | deleted`
- 通知读取主语义：`notifications.is_read`（布尔）

### 3.5 通话域（Call v1）

- `call_sessions.mode`：`voice | video`
- `call_sessions.status`：`initiated | ringing | answered | ended | cancelled | timeout | failed`

### 3.5 订单/账务域

- `orders.order_type`：`question_reward | skill_service | points_recharge | system_adjustment`
- `orders.status`：`pending_payment | paid | in_service | completed | refunded | closed`
- `payments.status`：`pending | paid | failed | refunded`
- `point_transactions.direction`：`credit | debit`
- `point_transactions.status`：`pending | completed | failed | reversed`
- `earning_transactions.direction`：`income | expense | adjustment`
- `earning_transactions.status`：`pending | available | settled | reversed`

---

## 4. target_type / item_type 统一白名单

用于：`notifications.target_type`, `messages.target_type`, `content_reports.target_type`, `moderation_queue.item_type`。

白名单：

- `question`
- `answer`
- `post`
- `skill_offer`
- `expert`
- `message`
- `order`
- `user_verification`
- `manual`
- `call_session`

---

## 5. RPC 白名单（v1）

> 端侧只允许消费白名单 RPC；新增 RPC 必须先回 A Role。

### 5.1 业务收口 RPC（Pack 08-A）

- `accept_answer_v2(p_question_id, p_answer_id)`
- `create_system_notification_v2(p_user_id, p_type, p_title, p_body, p_target_type?, p_target_id?)`
- `transition_order_status_v2(p_order_id, p_to_status, p_reason?)`

### 5.2 搜索 RPC（Pack 08-B）

- `search_app_content_v2(p_query, p_limit?)`
- `get_search_suggestions_v2(p_query?, p_limit?, p_type?)`
- `upsert_search_history(p_query_text, p_query_type?)`

### 5.3 Call v1 RPC（规划白名单）

- `create_call_session_v1(p_callee_id, p_mode, p_target_type, p_target_id, p_order_id?)`
- `accept_call_v1(p_call_session_id)`
- `reject_call_v1(p_call_session_id, p_reason?)`
- `end_call_v1(p_call_session_id, p_reason?)`
- `heartbeat_call_v1(p_call_session_id)`（保留名称，尚未实现，端侧不得调用）
- `mark_call_timeout_v1(p_call_session_id)`（保留名称，尚未实现，端侧不得调用）

### 5.4 未读数 RPC（Pack 05）

- `get_my_unread_message_count()`
- `get_my_unread_notification_count()`

---

## 6. Core App / Native adapters / Mini Program 按页面可消费接口清单

## 6.1 首页

- 表：`questions`, `profiles`, `experts`, `skill_offers`, `recommendation_slots`, `notifications`
- RPC：`search_app_content_v2`, `get_my_unread_notification_count`
- 重点字段：
  - 问题：`id/title/status/reward_points/answer_count/view_count`
  - 专家：`user_id/headline/verification_status/service_count`
  - 技能：`id/expert_id/title/status/price_amount`

## 6.2 搜索

- 表：`search_history`, `hot_keywords`, `questions`, `experts`, `skill_offers`, `posts`
- RPC：`search_app_content_v2`, `get_search_suggestions_v2`, `upsert_search_history`
- 重点字段：
  - 历史：`user_id/query_text/query_type/last_used_at`
  - 热词：`keyword/keyword_type/score/is_active`

## 6.3 详情（问题/专家/技能）

- 表：`questions`, `answers`, `profiles`, `experts`, `skill_offers`
- RPC：`accept_answer_v2`
- 重点字段：
  - 采纳链路：`questions.accepted_answer_id`, `questions.status`, `answers.is_accepted`, `answers.status`

## 6.4 发布（提问/技能）

- 表：`question_drafts`, `questions`, `skill_offers`, `skill_categories`
- RPC：无强制；写入以表权限与后端约束为准
- 重点字段：
  - 草稿：`draft_payload`, `updated_at`
  - 技能：`pricing_mode/status/category_id`

## 6.5 消息

- 表：`conversations`, `conversation_members`, `messages`, `notifications`
- RPC：`get_my_unread_message_count`, `get_my_unread_notification_count`
- 重点字段：
  - 会话：`id/type/last_message_at`
  - 消息：`conversation_id/sender_id/content/status`
  - 通知：`type/title/body/is_read`

## 6.6 我的（订单/积分/收益/资料）

- 表：`profiles`, `user_settings`, `orders`, `payments`, `point_accounts`, `point_transactions`, `earning_transactions`, `user_verifications`
- RPC：`transition_order_status_v2`, `create_system_notification_v2`（仅 server-side）
- 重点字段：
  - 订单：`buyer_id/seller_id/order_type/status/amount/point_amount`
  - 余额：`point_accounts.available_balance`
  - 积分流水：`point_transactions.direction/amount/status`
  - 收益流水：`earning_transactions.direction/amount/status`
  - 通话：`call_sessions.id/status/mode/caller_id/callee_id/order_id`

---

## 7. 最小守护（Freeze 生效）

1. 端侧禁止新增后端字段语义（含“同名不同义”）。
2. 端侧禁止新增状态值、target/item 类型值。
3. 端侧禁止新增非白名单 RPC 作为主路径。
4. 出现冲突必须回 A Role 提报，按 `docs/conflict-resolution-process.md` 执行。

---

## 8. 变更策略

- 本文档是 v1 冻结快照；变更只接受：
  - bugfix
  - 小 patch
  - cleanup
- 任何涉及 schema 语义变化，必须由 A Role 先更新 shared-types/shared-api，再通知 B/C/D/E 同步。
