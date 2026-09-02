# Product Blueprint v1 Legacy / Canonical Matrix

本矩阵是 EC-0 的依赖裁决表。`Current Runtime Usage` 记录真实运行事实；
`Canonical Replacement` 记录目标，不表示已经部署。

| Legacy Entity / Field / Enum / RPC / Route | Current Runtime Usage | Canonical Replacement | Compatibility Strategy | Migration Phase | Owner | Can new code depend on it? |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles.user_id` | Public Person RPC 与内容 author identity | `PublicPersonId` | 继续使用 | EC-1 | A | YES |
| `profiles.id` | legacy physical row id，部分旧 schema 存在 | `PublicPersonId` | 不进入 public route/contract | EC-1 | A/B | NO |
| `experts.id` | 旧 expert route/search identity | `PublicPersonId = experts.user_id` | resolver/adapter only | EC-1/EC-3 | A/B | NO |
| `experts.user_id` | expert extension owner | `PublicPersonId` | 可用于 legacy row 到 Person 的映射 | EC-1 | A | YES，仅作为 Person ID |
| `profiles.is_expert` | 旧 profile flag | optional extension/capability lookup | compatibility read only | EC-1 | A/B | NO |
| `experts` | headline/intro/expertise enrichment + marketplace fields | Person optional legacy enrichment；Service 独立 | 保留表，不作为 gate | EC-1/EC-4 | A | NO，除 compatibility adapter |
| `experts.education` / `experts.experience` | 无稳定 schema 的 JSON | Person-owned Experience | 不自动视为 verified；先审计迁移 | EC-1 | A | NO |
| `person_experiences` / Experience v1 RPC | EC-1A additive migration 已准备，Production 尚未部署 | Person-owned durable Experience | review、受控部署和 remote smoke 后才允许 consumer 使用 | EC-1 | A | NO，直到部署验证 |
| `experience_transitions` | EC-1A directed transition migration 已准备，Production 尚未部署 | Experience 内有方向的 Transition | 不降级为 Topic/string tag；部署验证前不可消费 | EC-1/EC-3 | A | NO，直到部署验证 |
| `experience_claims` | EC-1A owner-only claim reference migration 已准备，Production 尚未部署 | EC-5 typed Verification 的稳定 Claim identity | 不公开、不含 verified/evidence；部署验证前不可消费 | EC-1/EC-5 | A | NO，直到部署验证 |
| `profiles.is_verified` | legacy generic flag | typed verification claims | 不展示通用认证 | EC-5 | A/B | NO |
| `experts.is_verified` / `verification_status` | expert profile review | typed verification + optional service review | compatibility/admin only | EC-5 | A | NO |
| `user_verifications(talent/real_name)` | legacy owner/admin workflow | identity / education-employment / professional claim types | 保留历史，不扩展旧 vocabulary | EC-5 | A | NO |
| `/person/:userId` | canonical target route；Shared Core consumer 尚未接线 | `/person/:userId` | EC-1 additive consumer cutover | EC-1 | B | NO，直到 consumer 实现 |
| `/expert-profile/:id` | 旧 expert profile link | expert ID -> user ID -> Person route | compatibility resolver | EC-1/EC-3 | B | NO |
| `/expert/:id` | 旧 service/expert detail | Person route + Service module | 暂不删除 | EC-4 | B | NO |
| `/skill-publish` | 写 legacy skill offer，要求 expert row | optional Person Service Settings | fail closed/compatibility only | EC-4 | A/B | NO |
| `skill_offers` | marketplace-era skill SKU storage | optional Person Service Settings | 保留旧 consumer，禁止扩展为新模型 | EC-4 | A | NO |
| `skill_offers.expert_id` | 实际 FK 指向 `experts.user_id` | `ownerUserId: PublicPersonId` | 仅在 adapter 语义重命名，不物理 rename | EC-4 | A | NO，除 compatibility adapter |
| `SKILL_OFFER_STATUS` | legacy storage enum | Service Settings lifecycle（待定） | `@deprecated` | EC-4 | A | NO |
| `SKILL_PRICING_MODE` | per_question/session/hour/negotiable | 一个 Person 基础按次价 | `@deprecated` | EC-4 | A | NO |
| `questions.reward_points` / `bounty_points` | 提问页、搜索、RPC payload | optional CNY `deepExchangeBudgetIntent` | 历史字段保留；单值/区间/preset 留给 EC-2 | EC-2 | A/B | NO |
| `questions.accepted_answer_id` | 旧采纳状态 | 无；Answer 可多条 | historical compatibility | EC-2 | A/B | NO |
| `answers.is_accepted` | 旧展示/结算 | Helpful + Reply | historical compatibility | EC-2 | A/B | NO |
| `ANSWER_STATUS.accepted` | persisted old status | visibility/moderation 与 helpful 分离 | `@deprecated` | EC-2 | A | NO |
| `QUESTION_STATUS.solved/paid/pending_payment` | 当前 persisted/runtime status | public question lifecycle（待 EC-2 定义） | `@deprecated` product semantics | EC-2 | A | NO |
| `accept_answer_v2` | 当前客户端采纳动作 | Helpful / Reply actions | current runtime compatibility | EC-2 | A/B | NO |
| `accept_answer_and_transfer_points` | server-only deprecated path | 无 | 保留 forensic/history，最终 retire | EC-2 | A | NO |
| `create_question_secure(p_bounty_points)` | 当前问题发布 RPC | Question Context + optional deep-exchange budget | 保留现有 consumer，新 contract additive | EC-2 | A/B | NO |
| `create_answer_secure` | 当前免费回答发布 | Public Answer publish vNext | 可评估复用 action，不能继承 accepted 语义 | EC-2 | A | NO，待 EC-2 审核 |
| `answer_accepted` notification | 旧通知事件 | Helpful/Reply/Ask/Booking events | 历史兼容，不新增 | EC-2/EC-5 | A | NO |
| `search_app_content_v2` | question/expert/skill/post result | all/person/question | current runtime compatibility | EC-3 | A/B | NO |
| `SEARCH_OBJECT_TYPE` | old Home Search vocabulary | `HOME_SEARCH_DOMAIN_V1` | `@deprecated` | EC-3 | A/B/C/D | NO |
| `get_nearby_experts` | expert-centric discovery | Person discovery + Experience match reason | compatibility only | EC-3 | A | NO |
| `get_channel_feed.experts` | 四频道当前 expert collection | Person/Question channel discovery | channel slug 保留，payload additive replacement | EC-3 | A/B | NO |
| `PRODUCT_CHANNEL_CATALOG` | 四个稳定一级导航频道 | Channel navigation/coarse organization | 保留 catalog；不得作为 Person identity 或 Matching profile | EC-3 | A/B/C/D | YES，限导航 |
| legacy question category/tag | 多套 category/tag string | Primary Channel + Canonical Topic associations | 不直接改名冒充 canonical | EC-2/EC-3 | A | NO |
| Discover hashtag / `hot_topics` | 用户侧 social topic 内容 | Discover Social Topic mapped to Canonical Topic | 两者不等同，保留 social entity | EC-3 | A/B | YES，限 Discover |
| Canonical Topic | 当前不存在跨模块 storage/API | shared Question/Experience/Matching/Discover/Community semantic layer | additive design，不复用 hashtag ID | EC-3 | A | NO，直到部署 |
| Transition string/tag | 当前无 canonical directed relation | directed Experience transition | 不得降级成普通 Topic/string tag即视为完成 | EC-1/EC-3 | A | NO |
| city/city_code | 多 relation 的 legacy location 字段 | independent city-level Location dimension | 与 Topic 分离，不扩展精确实时附近定位 | EC-3 | A | NO，待统一 contract |
| permanent `user_type` | 不应成为 Blueprint identity | Dynamic Person model | 明确禁止 student/expert/asker/provider 永久类型 | EC-1/EC-3 | A/B/C/D | NO |
| onboarding persona/provider choice | Blueprint target 未部署 | lightweight initial Person/Need/Interest seeds | 不强制 Expert/Provider/Experience/Verification/Service | EC-1 | A/B | NO |
| Current Need / Interest | 无 canonical dynamic signal model | decaying behavioral/current-state signals | 不写入 durable Experience | EC-3 | A | NO，直到部署 |
| Accumulated Experience | 无 canonical storage/API | durable Person history | 不因兴趣衰减而删除 | EC-1 | A | NO，直到部署 |
| Discover `posts/topics` | 当前 social content | Post/Topic/Person | 可继续，但不进入 Home Search Tab | EC-3 | A/B | YES，限 Discover |
| Post Like/follower count | social popularity | `SocialPopularitySummary` | 与 Service Reputation 分离 | EC-3/EC-5 | A | NO，作为 Reputation |
| `send_direct_message` | 当前消息发送 | Conversation message under chat/booking entry | compatibility only | EC-4 | A/B | NO |
| `get_user_conversations` | current direct conversation list | Person Conversation contract | compatibility only | EC-4 | A/B | NO |
| “私信”一级用语 | 当前 UI copy | “会话” | copy/route 分阶段迁移 | EC-4 | B/C/D | NO |
| Follow/Like/Comment/Answer 自动开会话 | 当前 target 未允许 | only chat/booking entry | 明确禁止 | EC-4 | A/B | NO |
| `create_consultation_order` | blocked service-role legacy RPC | Booking Request | 保留 blocked/forensic | EC-4 | A | NO |
| `orders.question_reward` | Pack06 runtime | 无 canonical replacement | 历史兼容 | EC-2/EC-4 | A | NO |
| `orders.skill_service` | Pack06 runtime | Person Booking/RMB transaction | 历史兼容 | EC-4 | A | NO |
| `orders.points_recharge` | Pack06 runtime | 无，真实 Service 使用 RMB | 历史兼容 | EC-4 | A | NO |
| `buyer_id/seller_id` | Pack06 order roles | requesterPersonId/providerPersonId（每次 booking role） | adapter only，非账号类型 | EC-4 | A | NO |
| `PointAccount` / `PointTransaction` | legacy points ledger | RMB payment/settlement ledger | `@deprecated` for new service | EC-4 | A | NO |
| `recharge_points` | deprecated service-role path | 无 | 不开放 client，最终 retire | EC-4 | A | NO |
| wechat-prepay mock | Production 已 fail closed | real RMB provider | 未接 provider 前 unavailable | EC-4 | A | NO |
| hard-coded commission | 不应存在 target | versioned fee policy | 禁止写死百分比 | EC-4 | A/Product | NO |
| Booking Request charge | legacy consultation/order 行为不可作为依据 | no charge before terms and payment stage | Request 阶段禁止扣款 | EC-4 | A | NO |
| Payment/Completion/Settlement/Rating | legacy order status/callback 语义混杂 | four independent facts | Payment Success 后 Confirmed；完成+争议窗口后 Settlement | EC-4/EC-5 | A | NO，直到部署 |
| fixed booking timeout/cancel/dispute | 尚未锁定 | configurable policy（待决策） | 不发明值 | EC-4 | Product/A | NO |
| `create_call_session_v1` | call lifecycle，RTC/recording/billing 不完整 | confirmed Booking Exchange session | compatibility only | EC-4 | A/B/C/D | NO |
| legacy rating/order/service/follower counters | 字段存在但语义混杂 | completed/helped/rating facts | 不映射、不展示 fake metrics | EC-5 | A | NO |
| Answer Helpful | target answer feedback | answer helpful count | 与 service reputation 分离 | EC-2/EC-5 | A | YES，目标 contract 部署后 |
| `notifications.is_read` | unread history | read state | 保留 | EC-5 | A | YES，限 history |
| unread notification count | 当前 Bell/message 使用 | action-required attention count | current compatibility，不能冒充 target Bell | EC-5 | A/B | NO |
| `hot_topics/topic_discussions` | social topic/discussion | Discover Topic | 不解释为 Community | EC-3/EC-5 | A/B | YES，限 Topic compatibility |
| Community | 无 current entity | many-to-many ongoing exchange | EC-5 独立 domain；unavailable until deployed | EC-5 | A | NO |
| paid Voice/Video recording lifecycle | 尚未部署 | Exchange association + explicit informed consent | EC-4 基础设施；不伪装 RTC/recording 可用 | EC-4 | A/Product/Legal | NO |
| recording governance | 尚未部署 | dispute/T&S/admin access、audit、retention、policy | EC-5 独立治理，不与 Community 合并 | EC-5 | A/Product/Legal | NO |
| direct `profiles` Data API | 多个公开 reader；phone 暴露风险 | safe projections + owner-private contract | Privacy Cutover 独立进行 | 独立安全任务 | A/B | NO，禁止新增字段依赖 |

## Current / Target 使用规则

1. `RPC_CATALOG.status = canonical` 只说明当前 P1.4 runtime/grant contract，不自动等于
   Blueprint v1 product canonical。
2. 新代码必须同时检查 `PRODUCT_BLUEPRINT_V1_RPC_POLICY`。标记
   `newBlueprintCodeMayDepend = false` 的 RPC 不得进入新 feature contract。
3. `PAGE_CONTRACT_MAP.readContracts/writeContracts` 是 target；`currentReadContracts/
   currentWriteContracts` 是现行实现。未部署 target 使用 `capability:*`，不得写成已存在 RPC。
4. Legacy code 可以维护、修安全漏洞和 fail closed，但不能扩展旧产品语义。
5. 删除旧字段/RPC/route 前必须完成 consumer inventory、跨端 cutover、Production telemetry、
   data migration/reconciliation 和 rollback review。

## Production Mutation

EC-0 不包含 migration、DDL、DML、RLS/grant 修改、Edge deploy 或 Production 数据写入。
