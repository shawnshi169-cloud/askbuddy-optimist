# Product Blueprint v1 Contract Decision

状态：EC-0 Architecture Cutover

本决策负责把目标产品模型写入仓库级 Canonical Product Contract。它不删除旧数据库
对象，也不表示 EC-1 至 EC-5 的 storage、RPC、UI、支付、RTC、AI 或录制能力已经部署。

## 一、核心结论

| 问题 | Canonical 结论 |
| --- | --- |
| 一个普通用户是不是 Person | 是。所有正常 Auth user 都是 Person，不存在永久提问者/回答者/专家账号类型。 |
| Public Person ID 是什么 | `auth.users.id = profiles.user_id = PublicPersonId`。`profiles.id`、`experts.id` 不是 Person ID。 |
| 必须成为 Expert 才能有 Experience 吗 | 否。Experience 属于 Person，Expert 只保留 legacy optional enrichment。 |
| Answer 必须属于 Expert 吗 | 否。`answers.author_id` 必须按 `PublicPersonId` 解释。 |
| Question 是否有 canonical accepted answer | 否。Public Answer 免费、可多条、持续公开；Helpful 是回答反馈。 |
| Question budget 是回答悬赏吗 | 否。它是后续一对一深入交流的可选预算意向，成交价以对方 Service Price 为准。 |
| Service 交易币种 | 人民币 `CNY`，金额按分表达。Points 只保留 legacy compatibility。 |
| Experience、Verification、Service 是否相同 | 否。三者必须独立建模、授权和展示。 |
| Home Search 一级域 | `all / person / question`，即综合 / 人 / 问题。 |
| Discover 与 Home Search | Discover 的 Post/Topic/Person 使用独立 Social Search，不进入 Home Search V1 一级域。 |
| 旧 Expert/Skill/Points 能否被新功能依赖 | 不能。只允许维护明确的现有 consumer 和 additive compatibility adapter。 |

## 二、当前 Runtime Truth 审计

### Person 与 Expert

- 已部署 `get_public_person_profile_v1(uuid)`，返回以 `profiles.user_id` 为 identity 的
  safe public projection。
- `experts` 是以 `user_id` 关联 Person 的旧扩展；`experts.id` 仍被旧 route/search
  使用，但不能进入 Blueprint v1 identity。
- `/person/:userId` 是 canonical public route；`/expert/:id`、
  `/expert-profile/:id` 是 legacy compatibility route。
- `skill_offers.expert_id` 的物理 FK 目标是 `experts.user_id`，Shared 语义只能解释为
  legacy `ownerUserId`，不能证明 Expert 是 Service owner root。

### Question 与 Answer

当前 storage/RPC 仍明确包含旧模型：

- `questions.reward_points`
- `questions.accepted_answer_id`
- `questions.status` 中的 `pending_payment / paid / solved`
- `answers.is_accepted`
- `answers.status = accepted`
- `accept_answer_v2`
- `accept_answer_and_transfer_points`
- `create_question_secure(p_bounty_points)`
- `answer_accepted` notification

这些是 Current Runtime Truth，不是 Blueprint v1 Target Truth。本轮不删字段、不改函数，
但新 Blueprint 代码不得新增依赖。

当前不存在 canonical Answer Reply storage。`post_comments` 只属于 Discover Post，不能
重命名或复用为 Answer Reply。

### Search / Home / Channel

- `search_app_content_v2` 当前返回 `question/expert/skill/post`。
- `SEARCH_OBJECT_TYPE` 当前为 `all/question/expert/skill/post`。
- `get_nearby_experts` 仍返回 expert-centric result。
- `get_channel_feed` 的四个 Product Channel slug 保持稳定，但当前 payload 含
  `experts` collection，属于 Blueprint v1 compatibility output。
- Blueprint v1 Home Search 尚无 `all/person/question` 的 deployed RPC。

### Discover / Conversation / Notification

- `posts`、`hot_topics` 与 social interactions 已存在；Community storage/API 不存在。
- `conversations/messages/send_direct_message` 已存在，但“只有先聊聊/预约交流才能创建
  Conversation”的 entry-reason contract 尚未部署。
- 当前 notification 主要表达 `is_read` 和 unread count；Home Bell 所需的
  `action_required/resolved` contract 尚不存在。

### Service / Booking / Payment / Reputation

- `experts + skill_offers` 是 marketplace-era compatibility model；当前 Skill Publish
  仍受 expert row 约束。
- `orders` 当前 vocabulary 为 `question_reward/skill_service/points_recharge`，并使用
  `buyer_id/seller_id`；这不是 Blueprint v1 Person Booking/Exchange contract。
- `point_accounts/point_transactions/recharge_points` 是 legacy compatibility，不是
  Service 的真实交易货币。
- `wechat-prepay` Production 已 fail closed；没有真实 provider 时不得模拟 Paid。
- Booking negotiation、RMB transaction、settlement、dispute 与 service reputation
  均未部署。
- legacy rating/follower/service/order counters 语义不足，不能生成
  `completedServiceCount/helpedUserCount/ratingCount/averageRating`。

### Verification / Privacy / Recording

- `profiles.is_verified`、`experts.is_verified`、`experts.verification_status`、legacy
  `user_verifications(talent/real_name)` 不能解释成通用“已核验 Person/Experience”。
- Public Person RPC 不返回 `phone`，但旧 `profiles` Data API 的直接敏感字段暴露风险
  仍为 **REMAINS**。Safe RPC 不等于 Privacy Cutover 已完成。
- Paid Voice/Video 的默认录制、显式知情同意、用途和 retention/access policy 尚未实现；
  Agreement/Privacy Policy 必须真实披露，不能以友好文案缩减实际用途。

## 三、Canonical Domain Boundaries

### Universal Person

`PublicPersonId` 是所有跨域关系的 public identity。Question author、Answer author、Post
author、Conversation participant、Service owner/provider/requester 都使用 Person ID。
Expert extension 不得 gate Person、Experience、Service、Matching、Verification 或等级。

### Experience

Experience 描述 Person 真实经历过什么。它独立于：

- Verification：对具体 claim/evidence 的核验结果；
- Service Settings：Person 是否愿意接受深入交流；
- Reputation：已完成服务事实及服务评价。

EC-0 只锁定 `PersonExperienceId` 与 `personId` ownership。Experience kind、字段、公开范围、
排序、编辑历史和 evidence 引用必须在 EC-1 migration 前完成 schema decision，不能从
`experts.education/experience` JSON 猜测。

### Question / Answer / Reply

- Question = title + context + optional deep-exchange budget intent。
- Public Answer 免费、可多条、无 accepted/unique-best contract。
- Helpful 只评价该 Answer，不产生 service reputation，也不增加 `helpedUserCount`。
- Reply 是 Answer 下的一层业务结构，可携带 `replyToPersonId` 显示“回复 @Person”，但
  不提供 `parentReplyId` 形成无限嵌套。

### Home Search / Discover / Community

- Home Search 一级域固定为 `all/person/question`。
- Experience 是 Person match reason/index input，不是一级 Tab。
- Answer 可参与 Question recall，不是一级 Tab。
- Discover 是 `Post + Topic + Person` 的社交域；Like 是 Social Popularity。
- Community 是长期多人群聊空间，与 Topic/Question/Conversation 均不同；未部署前保持
  unavailable，不使用 topic discussion 假装 Community。

### Conversation / Service / Booking

- Canonical 一级用语是 Conversation（会话），不是“私信”产品根概念。
- 只有 `chat` 或 `booking` entry point 可以创建/进入 Person-to-Person Conversation。
- Follow、Like、Comment、Answer、Invite Answer 不自动创建 Conversation。
- Service 属于 Person：一个基础人民币价格，Voice/Video 共用，至少开启一种。
- Booking Request 不立即收费；协商时间/方式/价格后才进入 `awaiting_payment`。
- timeout、取消阈值、争议窗口尚未锁定，本 contract 不包含固定数值。

### RMB Payment / Reputation

- Service transaction 使用 `CNY`，采用 `gross/platformFee/net` 透明金额。
- 平台费由 versioned policy/config 决定，禁止写死百分比。
- 无真实 provider 时 fail closed；不得创建 fake paid/order/transaction。
- `completedServiceCount` 统计服务次数；`helpedUserCount` 对 requester/provider 去重。
- `ratingCount/averageRating` 只来自明确的 completed service evaluation。
- Follow/Like 属于 Social Graph/Popularity，不直接成为 Service Reputation。

### Notification / Recording

- `isRead` 与 `actionRequired/resolvedAt` 是正交状态。
- Home Bell 只聚合需要处理的高优先级 attention，不等于全部 unread history。
- Paid media 首次使用/进入前必须显式同意录制。原始媒体初期不向用户提供下载/回放；
  具体 retention、access、dispute 与 model-improvement policy 在 EC-4/EC-5 单独落地。

## 四、Shared Contract 策略

新增 `packages/shared-types/src/product-blueprint-v1.ts`，只定义已确认的 target invariants：

- `HOME_SEARCH_DOMAIN_V1 = all/person/question`
- `CnyAmount` 与 `SERVICE_CURRENCY_V1 = CNY`
- Person-owned Experience ownership
- 无 accepted 字段的 Question/Answer target shape
- 一层 Answer Reply target shape
- Person-owned Service settings，Voice/Video 至少一种
- configurable fee policy reference
- Conversation entry point `chat/booking`
- Service Reputation 与 Social Popularity 分离
- Notification read/action state 分离
- Question/Conversation/Community 三种 connection
- explicit paid-media recording consent requirement

新增 `packages/shared-api/src/product-blueprint-v1.ts`：

- `PRODUCT_BLUEPRINT_V1_DOMAIN_MAP` 明确 current runtime 与 target readiness；
- `PRODUCT_BLUEPRINT_V1_RPC_POLICY` 标记 deployed RPC 能否被新 Blueprint 代码依赖；
- `LEGACY_CONTRACT_DEPENDENCY_POLICY` 对 expert identity、skill SKU、accepted answer、
  reward points、point transaction、generic verification 一律为 `false`。

旧类型不删除，增加 `@deprecated` 或 compatibility note。`RPC_CATALOG.status` 继续描述
P1.4 当前 runtime/grant truth，Blueprint eligibility 必须查新的 policy map，不能混用。

## 五、Current Runtime Truth 与 Target Truth

| Domain | Current Runtime | Target | Readiness |
| --- | --- | --- | --- |
| Person | safe Public Person RPC 已部署；旧 expert route 仍在 | Universal Person | Production ready |
| Experience | 无 canonical storage/API | Person-owned Experience | Not deployed |
| Question/Answer | reward/accepted/status/RPC 仍运行 | free multi-answer + Helpful + one-level Reply | Legacy compatibility |
| Home Search | question/expert/skill/post | all/person/question | Legacy compatibility |
| Channel | 固定四频道 + expert collection | fixed channels + Person/Question discovery | Legacy compatibility |
| Discover | Post/Topic/social interactions 部分可用 | independent Social domain | Partial |
| Conversation | direct message compatibility | chat/booking entry only | Legacy compatibility |
| Service | expert-gated skill offers | Person-owned voice/video settings | Not deployed target |
| Booking/RMB | legacy order/points，real payment unavailable | negotiated Booking + RMB settlement | Not deployed |
| Reputation | legacy ambiguous counters | service facts + evaluations | Not deployed |
| Verification | generic legacy flags | typed experience/qualification claims | Not deployed |
| Community | 无 canonical entity | long-running many-to-many space | Not deployed |
| Recording | call session 不含完整媒体治理 | explicit consent + policy-governed recording | Not deployed |

## 六、Additive Migration Plan

### EC-1 Person + Experience

- 新 Contract：Experience identity/ownership、公开字段、visibility、ordered timeline、typed
  claim reference；继续复用 `PublicPersonId`。
- 新 Storage/RPC：additive Person Experience table 与 paginated safe read/write contract；
  优先 `SECURITY INVOKER` + explicit grants/RLS。
- Legacy Compatibility：只读解析 `experts.education/experience` 需单独迁移审计，不直接
  自动导入为 verified Experience。
- Consumer Cutover：B 先使用 `/person/:userId`，再接 Experience；C/D 只消费 shared contract。
- 删除前置：无 consumer 依赖 Expert 作为 Person/Experience gate。

### EC-2 Question + Answer + Reply

- 新 Contract：Question Context、deep-exchange budget、free Answer、Helpful、一层 Reply。
- 新 Storage/RPC：additive vNext projection/action；不得复用 bounty/accepted 字段承载新语义。
- Legacy Compatibility：现有 question/answer pages 和 accept RPC 暂时可运行。
- Consumer Cutover：移除 accepted UI/notification/reward path，迁移 Question status。
- 删除前置：Web/iOS/Android/Mini Program 及后台任务均不再读写 accepted/reward 语义。

### EC-3 Home / Search / Matching

- 新 Contract：`all/person/question`，Person result 使用 `PublicPersonId`；Experience 仅作
  match reason。
- 新 Storage/RPC：typed search response 和 explainable match reason；不承诺 AI 已可用。
- Legacy Compatibility：`search_app_content_v2`、`get_nearby_experts`、当前 channel feed 保留。
- Consumer Cutover：Home/Search/Channel 全部导航 `/person/:userId`。
- 删除前置：无新入口消费 expert/skill/post 作为 Home Search 一级 result。

### EC-4 Conversation / Booking / RMB Payment

- 新 Contract：Conversation entry reason、Person Service Settings、Booking negotiation、
  RMB transaction、configurable fee、Voice/Video exchange 与 recording consent。
- 新 Storage/RPC：独立 Booking/Service/Payment/Settlement state machine；真实 provider 前
  全部 fail closed。
- Legacy Compatibility：direct message、skill offers、Pack06 orders/points 仅维护旧 consumer。
- Consumer Cutover：先聊聊/预约交流成为唯一 Conversation entry；Booking Request 不扣款。
- 删除前置：真实 provider/reconciliation/ledger/dispute/consent UAT 完成，且无旧 points
  service consumer。

### EC-5 Reputation / Verification / Admin

- 新 Contract：service facts/evaluation、unique helped person、typed verification claim/evidence、
  action-required notification、Community 和运营审核。
- 新 Storage/RPC：可审计 aggregation、claim review、admin guard 与 attention queue。
- Legacy Compatibility：generic verified flags、legacy counters 和 unread notification 保留只读。
- Consumer Cutover：UI 不再展示通用“已认证专家”或把 follower/Helpful 当 Reputation。
- 删除前置：历史数据迁移、advisor、abuse model 和 admin UAT 完成。

## 七、Ownership

| Owner | 职责 |
| --- | --- |
| A / Codex A | domain contract、migration/RPC/RLS/grants、truth guard、privacy/payment boundary |
| B / Codex B | Shared Core adapter/orchestration/UI；只能消费 A contract，不自定义 Person/Service 语义 |
| C / Codex C | Android Native shell/integration，消费相同 shared contract |
| D / Codex D | WeChat Mini Program adapter/UI，禁止复制 legacy enum 作为 Blueprint truth |

## 八、风险、回滚与开放问题

已知风险：

- 双 contract 期间，旧 `canonical` 标签可能被误解为 Blueprint target；必须使用
  `PRODUCT_BLUEPRINT_V1_RPC_POLICY` 与 page target/current 分栏。
- `profiles.phone` direct Data API exposure = **REMAINS**；独立 Privacy Cutover 前不关闭。
- 旧 answer/reward/order 数据不能直接丢弃，需要历史展示与 reconciliation 策略。
- service/payment/recording 在 provider、政策、协议未完成前必须保持 unavailable。

开放问题（不在 EC-0 自行决定）：

- Experience kind、visibility、排序、编辑历史和 claim/evidence 结构；
- deep-exchange budget 是单值、区间还是 preset；
- Booking timeout、取消阈值、争议窗口；
- 平台费率与版本化配置来源；
- Rating eligibility、评分尺度与申诉；
- 录制 retention、访问审批、数据用途 opt-out/consent versioning；
- Community 首发时机、成员角色和治理方式。

所有 EC-0 变更均为 additive contract/documentation/test；回滚只需停止消费新 target 类型，
不涉及 Production schema 或业务数据回滚。

## 九、EC-1 Gate

EC-1 **READY** 开始 Architecture/Storage 设计，原因：Universal Person、canonical ID、
Experience/Verification/Service 边界和 legacy 禁止依赖已锁定。EC-1 在生成 migration 前仍需
单独锁定 Experience 字段、visibility、lifecycle 与 claim reference；READY 不表示这些
storage/API 已经 Production ready，也不授权 B/C/D 自行发明字段。
