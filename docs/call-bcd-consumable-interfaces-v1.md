# Call v1 给 B/C/D 的可消费接口清单（按页面）

更新时间：2026-05-15  
历史适用对象：B-iOS / C-Android / D-微信小程序

> 角色治理更新：当前职责映射为 B-Core App、C-iOS Native、D-Android Native、E-微信小程序。本文文件名保留历史标签，不再用于定义代码所有权。

---

## 1. 首页（通知入口 / 快速沟通入口）

可读表：

- `notifications`
- `call_sessions`（只读本人参与）

可调 RPC：

- `get_my_unread_notification_count`
- `create_call_session_v1`（从服务入口触发）

关键字段：

- `call_sessions.id/status/mode/caller_id/callee_id/created_at`
- `notifications.type/title/body/target_type/target_id/is_read`

---

## 2. 搜索页（专家/技能命中后发起沟通）

可读表：

- `experts`
- `skill_offers`

可调 RPC：

- `search_app_content_v2`
- `get_search_suggestions_v2`
- `upsert_search_history`
- `create_call_session_v1`

关键字段：

- `experts.user_id/headline/verification_status`
- `skill_offers.id/expert_id/title/status`

---

## 3. 详情页（问题详情/专家详情/技能详情）

可读表：

- `questions`
- `answers`
- `experts`
- `skill_offers`
- `call_sessions`

可调 RPC：

- `accept_answer_v2`（问题采纳）
- `create_call_session_v1`
- `accept_call_v1`
- `reject_call_v1`
- `end_call_v1`

关键字段：

- `questions.id/author_id/status/accepted_answer_id`
- `answers.id/question_id/author_id/status/is_accepted`
- `call_sessions.target_type/target_id/status/mode`

---

## 4. 发布页（提问/技能）

可读写表：

- `question_drafts`
- `questions`
- `skill_offers`

Call 相关：

- 本页不直接发起通话，保持清晰边界

---

## 5. 消息页（会话列表 / 聊天详情）

可读表：

- `conversations`
- `conversation_members`
- `messages`
- `call_sessions`

可调 RPC：

- `get_my_unread_message_count`
- `accept_call_v1`
- `reject_call_v1`
- `end_call_v1`

关键字段：

- `conversations.id/type/last_message_at`
- `messages.conversation_id/sender_id/content/status`
- `call_sessions.id/status/mode/caller_id/callee_id`

---

## 6. 我的（订单/收益/通知）

可读表：

- `orders`
- `point_accounts`
- `point_transactions`
- `earning_transactions`
- `call_sessions`（我的通话历史）

可调 RPC：

- `transition_order_status_v2`（server-side）
- `create_system_notification_v2`（server-side）
- `end_call_v1`

关键字段：

- `orders.id/status/order_type/buyer_id/seller_id`
- `point_accounts.available_balance`
- `call_sessions.order_id/status/ended_at/end_reason`

---

## 7. 强制约束（B/C/D 必须遵守）

1. 不得新增 Call 状态值
2. 不得新增 Call RPC 名称
3. 不得绕过 RPC 直接改 `call_sessions.status`（主路径）
4. 契约冲突必须回 A 提报：`docs/conflict-resolution-process.md`
