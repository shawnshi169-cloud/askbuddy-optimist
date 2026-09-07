# Canonical Question / Answer / Reply v1 合同决策

状态：**EC-2 CONTRACT APPROVED / PRODUCTION BACKEND DEPLOYED / CLIENT CONSUMER GATE PASSED / SHARED CORE UI IMPLEMENTED / MERGED**。

Product + Architecture 已确认下述产品决策，EC-2A 已合入 main。
批准产品语义不等于 Production 部署或 UI consumer cutover。
EC-2B 的独立本地实现与执行证据见[本地实现记录](./canonical-question-answer-v1-local-implementation.md)。
EC-2C1 的 Production 只读证据与部署计划见[Production 预检](./canonical-question-answer-v1-production-preflight.md)。
EC-2C2 已应用并验证 backend storage/RPC；完整证据见[Production 部署记录](./canonical-question-answer-v1-production-deployment.md)。
EC-2C3 已使用两个临时隔离 Auth user 完成真实 authenticated PostgREST read/write smoke，且定向清理后
所有 synthetic row 为 0；证据见[Consumer Gate 记录](./canonical-question-answer-v1-consumer-gate.md)。
12 个 canonical RPC 的 catalog、普通客户端白名单和 Production consumer truth 已对齐。
EC-2D 由 B 完成 Shared Core NewQuestion、QuestionDetail、Answer、Helpful、一级 Reply 和 owner close，
已通过 PR #43 合并：`4f6c04d218b2ed68991e8de8110a23d0d2f63dd8`。
Approved UI head：`00a2af935e25b30010b52e91458d33ed013cfe96`；merge parents 为
`c7f635992a76dce67d3ea9b267a31d5fcbbcae0d` 与该 UI head，merge tree 与 UI head tree 一致。
EC-2E 基于此 main 同步 A-owned page contract、machine truth 和当前状态；不重跑 Production 验证。

当前完成范围为 **EC-2 Backend + Consumer Contract、Shared Core UI、A+B Core Vertical Slice**。
Home/Search/Channel feed cutover 不属于 EC-2D，继续等待 EC-3；Canonical Topic 非空关联仍被阻断。
`list_questions_v1` 虽已部署且可消费，Home canonical feed 尚未接线；Ask 的四频道选择也不代表
Channel feed 已切换。Question Edit UI 尚未实现，即使 adapter 已暴露 `update_question_v1`。

平台范围：Shared Core（含 iOS React shared core）已实现；real iOS keyboard interaction =
**BLOCKED BY ENVIRONMENT**，compact browser viewport QA 不等于真实 iOS 键盘验证。
Android native verification = **PENDING**；WeChat EC-2 canonical flow = **NOT IMPLEMENTED / follow-up PENDING**。
PR #43 没有完成 Android / WeChat 平台工作；EC-2 Cross-platform Rollout 尚未完成。

当前页面依赖与证据：

- Ask：`canonical-question-draft-v2` 的 viewer-scoped 本地草稿、Auth viewer、`PRODUCT_CHANNEL_CATALOG`；
  title/context 必填、一个频道、topicIds=[]、可选正整数 CNY 分预算。仅 `create_question_v1` 成功后
  清草稿并导航 `/question/:questionId`；无 bounty、fake AI tags、Expert consultation 或附件能力。
- QuestionDetail：经 `useQuestionAnswerV1` / `questionAnswerV1` adapter 读取 `get_question_detail_v1`、
  `list_question_answers_v1`、`list_answer_replies_v1`，不直读 legacy 表或 fallback fixture。
  页面 mutation 为 Answer create/delete、Helpful add/remove、Reply create/delete、Question close。
- 通用举报仍调用 `useSubmitContentReport` → `submit_content_report`：仓库中的实现将 UUID
  `target_id` 和 `target_type=question` 写入 `content_reports`，无 legacy Question FK 或旧表查找，
  可接收 canonical questionId。该事实只表示 report intake，不宣称 moderation 管理流程已切换。
- Answer CTA **问问TA** 仅导航 `/person/:authorPersonId`；不会创建 Conversation/Chat/Booking，
  也不执行 Service/Payment。Accepted Answer、bounty、Expert gate 均不属于当前 canonical flow。

独立文档债务：Public Person/Experience 的旧 page/domain/current-status 文案仍需单独同步；
本 EC-2E 不修改这些 domain。EC-2 Person navigation 以实际 `/person/:userId` route 为证据。

审计 baseline：`57d092166b4165ff27787c4f828281d040c36c84`（PR #37 merge）。
EC-2A 当时只审计仓库 migration、Production-generated types 和真实 consumer；未重新查询远端数据库，
不把仓库审计表述成新的 Production smoke。EC-2A 未新增 migration，未部署 RPC，未改 UI。

## 一、已锁定的产品事实

Question ≠ Order；Answer ≠ Service；Budget ≠ Bounty；Helpful ≠ Reputation；Reply ≠ Conversation。

所有 requester/author 都是 Person：`PublicPersonId = auth.users.id = profiles.user_id`。
Question 中的 requester 和 Answer/Reply 中的 author 是本次关系角色，不是永久账号类型。
`experts.id`、`profiles.id` 均不能当 Person identity；没有 Expert、Service、Verification
不影响 Person 提问、回答或回复。

Question 必须同时有非空 `title` 与非空 `context`，且只有一个 `primaryChannel`。
多个 Answer 免费、持续公开；不存在 accepted、best、unique correct answer。
Reply 直接属于 Answer，仅一层，不产生 Conversation，也没有 Helpful/Like/Rating。

## 二、Legacy → Canonical Gap Map

以下保留 EC-2A baseline 的历史审计证据，表内“当前/本轮”均指当时；不是 EC-2E 当前页面状态。
EC-2D 已完成的 NewQuestion/QuestionDetail cutover 见顶部 Current Status，旧 discovery consumers 仍保留。

| 现有对象与证据 | Current Runtime Usage | 分类 | Canonical 方向 / 兼容约束 |
| --- | --- | --- | --- |
| `questions.user_id/author_id`；Pack02 + generated types | 最初 `user_id`，Pack02 回填 `author_id`；hook 列表用 user_id，详情用 author_id 或 user_id | 需兼容 | 新 requester 只取 auth.uid()；不复制双身份字段。迁移候选若两者不同必须隔离审查，禁止猜测 |
| `answers.user_id/author_id`；Pack02 + `useQuestions.ts` | 同样双字段；详情会查询 active experts enrichment | 可复用 Person 原则、需兼容旧 reader | 新 authorPersonId 为 auth user id，不依赖 experts；既有 create_answer_secure 源码无 Expert gate，但不是 EC-2 create contract |
| `questions.content/description` | 可为空；当前 create_question_secure 仅要求标题 | 需要新增约束 | canonical context 必填；旧空背景数据不能被 fake context 自动补齐 |
| `category/category_slug/channel/subcategory/tags` | 多套字符串；channel constraint 已含四个 Product slug | 可复用四频道、弃用分类歧义 | 复用 PRODUCT_CHANNEL_CATALOG；新写入仅接受四个精确 slug，不做隐式归一化 |
| `question_tags(tag text)` | Pack02 从 questions.tags 文本回填 | 不能迁移为 Topic ID | 文本标签不等于 Canonical Topic identity |
| `hot_topics/topic_discussions`、`posts.topics` | Discover/editorial/social 话题及 hashtags | 需兼容、不能跨域冒充 | 无 Canonical Topic registry/resolver，不把 hot_topics.id 传入 topicIds |
| `bounty_points/reward_points`；NewQuestion | 积分推荐档、发布 RPC 的 p_bounty_points、奖励审计 | 不能迁移 | deepExchangeBudgetMaxCents 默认 null；禁止 points 换算 CNY 或把 bounty 改名为预算 |
| `accepted_answer_id/is_accepted/status=accepted/solved` | 详情 accepted 优先；useAcceptAnswer 调用 accept_answer_v2；Pack08a 结算与通知 | 需弃用、继续兼容旧消费者 | 新 DTO/RPC 没有采纳；不得映射为 Helpful、Closed 或 Best |
| `status/is_hidden`；Pack02/Pack07 | mixed legacy lifecycle + moderation；现有读策略与系统字段 trigger 叠加 | 需新边界 | business status open/closed；moderation 与 author deletion 独立 |
| `answer_likes`；20260131180320 migration + useAnswerLikes | UNIQUE(answer_id,user_id)，直接 insert/delete，维护 likes_count；无禁止 self-like | 不能直接复用为 Helpful | 新关系每 Person/Answer 唯一、禁止 self-helpful；旧 likes/count 不自动导入 |
| `answers.like_count/likes_count`、question answer_count | 重复 counter 与多代 trigger；旧 count 口径含 accepted | 不能当新事实 | 新 helpfulCount/replyCount/answerCount 从可见且有效事实计算，不带 fake 初值 |
| `favorites` | Question 收藏；useToggleFavorite 为直接表写 | 继续兼容 | 不等于 Helpful，本轮不新增 canonical 收藏 API |
| `post_comments` | 属于 Post，Pack04 active/hidden/deleted | 不可复用 | 新建 Answer Reply 关系；不能通过改名制造 Answer foreign key |
| Answer Reply | migrations/generated types 未发现 answer_replies；QuestionDetail 未消费 Reply RPC | 需要新增 | 一层 answerId 关系，不引入 parentReplyId |
| `useQuestions.ts` | table reads + select('*') + profiles/experts 聚合 | 需 consumer cutover | 新 UI 只消费安全 RPC，禁止自己拼 business semantics |
| `NewQuestion.tsx` | 背景、自由标签、积分奖励和 legacy create RPC | 需兼容 | 本轮不改；新 create 必填 context 且预算与奖励分离 |
| `QuestionDetail.tsx` / `QuestionCard.tsx` | 旧 bounty/status/accepted 展示；详情仍以 expertId 导航旧兼容路由 | 需兼容 | 新 Answer 可直接 authorPersonId → /person/:userId；不修本轮 UI |
| Pack02/Pack08a triggers、notify_new_answer、answer_accepted | 当前维护 accepted、计数、积分/通知事实 | 不能继承为新 canonical side effect | 新存储不挂旧 trigger，不写积分、订单、会话或旧采纳通知 |

主要证据：

- `supabase/migrations/20260131170504_746b1fb4-f0e2-4b56-b573-2f8df311f0b7.sql`
- `supabase/migrations/20260131180320_e7c3f98f-5e00-4cbf-a0f0-278266f6528a.sql`
- `supabase/migrations/20260228150000_productize_backend_stack.sql`
- `supabase/migrations/20260416091000_channel_feed_contract.sql`
- `supabase/migrations/20260416170000_pack_02_questions_and_answers.sql`
- `supabase/migrations/20260416173000_pack_02_patch_visibility_and_guards.sql`
- `supabase/migrations/20260416223000_pack_04_search_and_discover_base.sql`
- `supabase/migrations/20260419001000_pack_08a_rpc_accept_answer_v2.sql`
- `src/integrations/supabase/types.ts`、`src/hooks/useQuestions.ts`、`useAnswerLikes.ts`、`useAcceptAnswer.ts`
- `src/pages/NewQuestion.tsx`、`src/pages/QuestionDetail.tsx`、`src/components/QuestionCard.tsx`

## 三、DTO 与预算

唯一新目标类型在 `packages/shared-types/src/question-answer-v1.ts`；EC-0 的旧目标类型名
仅保留 deprecated alias，不形成第二套 Question shape。正在运行的 legacy `QuestionStatus`
与 `Question/Answer` 类型不变。

| DTO | 字段 |
| --- | --- |
| CanonicalQuestionV1 | questionId、requesterPersonId、title、context、primaryChannel、topicIds、deepExchangeBudgetMaxCents、status、createdAt、updatedAt |
| CanonicalQuestionDetailV1 | 上述字段 + nullable requester（PublicPersonSummary）+ answerCount |
| CanonicalAnswerV1 | answerId、questionId、authorPersonId、nullable author、body、helpfulCount、viewerHasMarkedHelpful、replyCount、createdAt、updatedAt |
| CanonicalAnswerReplyV1 | replyId、answerId、authorPersonId、nullable author、body、createdAt、updatedAt |

Person summary 仅 `userId/displayName/avatarUrl`，summary.userId 必须匹配对应 author/requester。
缺少公开资料时 summary=null；不能虚构匿名人物或退回 experts，不改变 canonical Person ID。
公开读取不返回 hidden/deleted row，也不返回内部 moderation/deletion metadata。
Relevant Experience 字段**暂不返回**：EC-3 尚未提供真实选择规则，UI 应 HIDE，不选第一条经历。

`deepExchangeBudgetMaxCents` 已由 Product 锁定为 `integer | null`，CNY/RMB 分。
null=未提供预算信号；6900=¥69；10000=¥100；非空值必须 >0。0、负数、小数、金额字符串
均非法。建议存储为 `bigint NULL`，约束仅为空或正数；不增加产品最大预算。
JSON/JavaScript 边界使用 safe integer 检查避免精度损失，它是序列化类型限制而不是产品定价
上限；实现必须在写入前同样拒绝不可无损序列化的整数，不能先入库再截断。超出该表示范围的
需求必须版本化升级 money serialization，不能静默换算为元浮点。

Budget 是后续一次 1:1 交流的最高意愿，不是 reward、订单、已付或 escrow；不会被领取、
结算、瓜分或消耗。Question 可对应多个独立 Exchange，每次实际价格来自被选 Person 的
Service Price 和后续独立 Booking Price。三者永不复用字段，不自动降价/议价/成交。
Budget 不进入 Answer 排序、Helpful 排序或曝光；有预算也不改变公开 Answer 免费性质。

## 四、Channel / Topic

Primary Channel 精确复用 education-learning、career-development、lifestyle-services、
hobbies-skills，一个且必填；不新增 categories 或 taxonomy。

Question 目标支持 0..N Canonical Topic ID，但 baseline 没有可信跨模块 Topic backend。
本 PR 只预留 `CanonicalTopicIdV1` identity 语义，不发号、不实现存储、不创建标签体系。
EC-2 已锁定 parser 的 `topicIds/p_topic_ids` **仅接受 []**；Create/Update 非空值明确失败，
不截断成空值、不静默 drop，也不接受 legacy tags、hot_topics.id 或随机 UUID 占位。
UUID 的格式合法不证明它属于 Canonical Topic。EC-3 resolver + FK + 用户确认机制经过审查后，
须先建立 Canonical Topic root，AI suggestion → user confirmation，再 additive 解锁非空关联。
空数组不阻塞免费提问能力的后续实现；EC-2 不自行实现该 taxonomy。

## 五、已锁定的生命周期与排序

已锁定：business `status=open/closed` 与 `moderation_visibility=visible/hidden`、
`deleted_at` 独立。普通 create 初始化 open；普通 update 不接收 status/moderation 字段。
open 才可新建 Answer/Reply；closed 保留已有公开内容，只要父链未删除或隐藏。
关闭不表示 solved、accepted、paid 或 completed。

| Product Decision | V1 已锁定行为 | 在本 PR 中的状态 |
| --- | --- | --- |
| Question reopen | CLOSE ONLY，owner close、重复 close 幂等；不提供 reopen_question_v1，未来 reopen 需新版本 contract | locked，Production 已部署验证 |
| 删除有 Reply 的 Answer | HIDE ENTIRE ANSWER BRANCH；底层保留 Answer/Reply，不显示 Public tombstone card；moderation hidden 同样隐藏整个分支 | locked，Production 已部署验证 |
| 综合 Answer 排序 | helpfulCount DESC → createdAt DESC → answerId ASC；只统计真实 Helpful | locked，Production 已部署验证 |
| Topic 接入 | EC-2 只接受 []，非空关联等 EC-3 Canonical root/resolver/FK 后解锁 | locked / 非空关联 BLOCKED |

最新排序锁定 `createdAt DESC, answerId ASC`；Reply 固定 `createdAt ASC, replyId ASC`。
基础 `list_questions_v1` 固定 `createdAt DESC, questionId ASC`，不新增 order 参数；这是基础
canonical listing，不是 hot score 或个性化推荐。EC-3 Home Feed/Matching 使用独立 contract。
四种顺序由 `QUESTION_ANSWER_V1_ORDERING`、RPC metadata 与 guard 共同保护。
分页 p_limit=1..100、p_offset>=0 为技术响应边界；offset 在并发增删/Helpful 变化时不承诺稳定
跨页快照，客户端须按 ID 去重/刷新，后续如有稳定快照需求再版本化 cursor。
综合排序不得使用 deepExchangeBudgetMaxCents、Expert score、legacy accepted、bounty、price、
fake match score、fake views 或 replyCount。确定的 tie-breaker 不等于并发分页快照。

Answer/Reply 作者 soft-delete 与平台 moderation hide 为不同事实。内容审计留存不代表产品
可见，普通用户不能 hard-delete 内容、复活 tombstone 或修改审计字段。父 Question hidden/
deleted 时整个分支不公开；父 Answer hidden/deleted 时 Reply 不公开。正常 DTO 不返回孤儿。
不得 hard-delete Reply、将 Reply 改挂 Question，或显示“该回答已删除”后继续展示其 Replies。
Answer/Reply storage 留存用于审计、安全、争议与未来治理；author delete 和 moderation hide
仍是不同 business fact，不能通过同一个状态值合并原因。
是否允许 Question 作者删除本身不在本轮产品授权内，因此不提出普通 delete_question RPC。

## 六、Canonical Additive Storage

以下关系已由 additive migration `20260904174215_canonical_question_answer_v1.sql` 部署；没有在有
积分/采纳/通知 trigger 的 legacy questions/answers 上直接切换语义：

| 提议关系 | 最小存储及约束 |
| --- | --- |
| public.questions_v1 | id UUID PK；requester_person_id → auth.users.id；非空 title/context；primary_channel 四值 CHECK；deep_exchange_budget_max_cents bigint NULL/正数；status open/closed；moderation_visibility；deleted_at；created_at/updated_at |
| public.answers_v1 | id UUID PK；question_id FK；author_person_id → auth.users.id；非空 body；moderation_visibility；deleted_at；真实 timestamps |
| public.answer_replies_v1 | id UUID PK；answer_id FK；author_person_id → auth.users.id；非空 body；moderation_visibility；deleted_at；timestamps；没有 parent_reply_id |
| public.answer_helpful_marks_v1 | mark_id UUID PK；answer_id FK；person_id → auth.users.id；created_at；UNIQUE(answer_id,person_id)；owner-only 关系事实 |
| public.answer_helpful_public_facts_v1 | mark_id、answer_id；不含 person_id；用于公开可见 Answer 的真实 COUNT，而非客户端可写 counter |

Topic mapping table/FK 需等 Canonical Topic root 设计后再建；当前不存任意 UUID[] 冒充已验证
关联。DTO 返回 []。FK 默认保留审计引用（NO ACTION/RESTRICT），不对 Account deletion 自行
引入级联删除历史的产品决策；账号删除/匿名化属于后续明确 lifecycle gate。
索引覆盖所有 parent/author FK、Question 时间列表、Answer question+createdAt、Reply
answer+createdAt 及 Helpful unique key；不得为本提案新增任意全站索引。

### Helpful 逻辑与物理实现已验证

逻辑不变量：同一 Person/Answer 最多一个 Helpful、禁止 self-helpful、helpfulCount 来自真实
事实、viewer relationship private、add/remove 幂等、Helpful 不进入 Reputation。这些不可由
后续 consumer 改写。

直接让 anon 读取带 person_id 的 Helpful 关系，或让 invoker 在 owner-only RLS 上 COUNT
却宣称得到总数，均不正确。Production 已采用并验证双关系实现：分离私有 ownership mark 与
无身份公开 fact。该事实不代表未来物理结构永不可版本化，但任何替代方案必须保持全部逻辑不变量
并重新经过 Architecture / Security Review。

1. mark 与 public fact 以 `(mark_id,answer_id)` 建立双向、延迟校验的完整性引用，保证提交时
   一一对应；不能通过只插入 fact 伪造 Helpful，也不能只插入 mark 产生计数漂移。
2. 同一事务先插入 owner mark，再插入无身份 fact；取消时先删除 fact，再删除 owner mark。
   fact INSERT/DELETE 的 RLS 必须核对 caller 拥有同一 mark；mark 的 unique/parent/self
   检查在数据库约束/trigger/RLS 中执行，不仅是 RPC if 判断。
3. 公共 COUNT 仅读可见父链下的无身份 fact；viewerHasMarkedHelpful 仅读 caller 自己的
   owner mark。公开 projection 不返回 markId、投票人列表或 Person 私有关系。
4. set_answer_helpful_v1 使用显式 boolean，幂等 add/remove，而非容易被 retry 翻转的 toggle。
   作者不能添加 self Helpful；self false 可安全 no-op，不继承旧 self-like。

双向 FK、RLS、grants、invoker 事务完整性、取消/并发、直接表写和 rollback smoke 已在 EC-2B/C2/C3
逐层验证；不得用宽松 definer 或公开 person_id 替代。B 不得自行改变 Helpful storage semantics
或自行拼计数。机器状态见 `ANSWER_HELPFUL_STORAGE_REVIEW_V1`：逻辑 locked，物理
production-verified，`productionVerified=true`。

## 七、RLS、grants 与并发安全

所有新 exposed relations 启用并强制 RLS。RPC 计划 `SECURITY INVOKER SET search_path = ''`，
所有 relation/function 引用 schema-qualified，无动态 SQL。最小 explicit column grants，
禁止 anon/authenticated table-level SELECT；PUBLIC EXECUTE 默认授权必须逐 signature revoke。
依据 [Supabase Functions](https://supabase.com/docs/guides/database/functions) 与
[RLS 文档](https://supabase.com/docs/guides/database/postgres/row-level-security)，不能为了
绕过 RLS 改用 SECURITY DEFINER，UPDATE/soft-delete 必须同时验证所需 SELECT 可见性。

| 边界 | 计划规则 |
| --- | --- |
| Public read | anon/authenticated 仅读 visible + non-deleted 完整父链；closed 内容仍可读；使用 safe column projection |
| Owner storage read | 可为 invoker soft-delete 保留自己的 tombstone 可见性；非 owner/anon 仍不可见；正常 API显式过滤 deleted/hidden，不能因 owner 身份泄漏 tombstone |
| Question create | authenticated + auth.uid() 非空；requester 从 auth.uid() 派生；column grants/trigger 禁止 identity、moderation、计数、初始 status 注入 |
| Question update/close | USING/WITH CHECK 都核对 requester；只在 open 编辑；close 单独 operation；不可替其他 Person 改预算/状态；不可 reopen 或恢复删除 |
| Answer/Reply create | auth.uid() 为 author；数据库同时检查 parent open、visible、non-deleted；无需 experts/Service/Verification |
| Answer/Reply delete | 仅 author；soft-delete；固定 identity/parent/createdAt 不可改；保留子记录但正常 projection 隐藏 |
| Helpful | 仅 caller 自己的关系可增删；父链可见；唯一关系；禁止 self；不写任何 service/reputation relation |
| Moderation | 普通 RPC 参数、column writes、whitelist 均不开放 moderation mutation；后续专门 admin policy/审计方案单独 review，不信任 user_metadata |

RPC 的 owner 检查不能替代 Direct Data API 的约束：所有不可变字段、初始 open/visible、
时间戳、soft-delete 状态转换以及 parent 检查都必须在数据库侧覆盖直接 DML。禁止可伪造的
client GUC 当作“RPC 内部调用”凭据。ordinary client 不使用 service_role。

Close vs create Answer/Reply 必须串行化：建议以 Question UUID 为 key 的事务级 advisory lock，
所有相关 RPC 和直接写 guard trigger 走相同 lock order（Question → Answer），锁内重查父状态。
不要为了 SELECT FOR UPDATE 锁别人的 Question 而开放其他用户 UPDATE grant；READ COMMITTED
并发 close/create、Helpful unique、delete/read race 都列入后续数据库验证 gate。
rate-limit/content moderation 需审计现有 helper 权限与 vocabulary 后接入；本轮不复用旧 definer
write RPC，也不擅自锁定新产品限额。实现与部署前必须证明 abuse path fail closed。

## 八、Exact Production RPC Contract

12 个 RPC contract 已获产品批准、Production 部署和 authenticated HTTP consumer smoke 验证。
签名、参数及 response parser 的机器定义为 `QUESTION_ANSWER_V1_RPCS`；历史
`PROPOSED_QUESTION_ANSWER_V1_RPCS` 仅保留 deprecated alias。Product contract 继续是
contract-approved；runtime 是 production-ready，grant review=aligned，client consumable=true。
12 个 RPC 已加入 `RPC_CATALOG` 与 `CLIENT_RPC_WHITELIST`，不包含 private helper 或 legacy fallback。
以下所有参数显式必填；可选业务值传 null/[]，不靠 silent fallback。

`authentication=anon` / `anon/public-read` 表示**最低访问要求**：anonymous 和 authenticated
均可调用，不表示 authenticated 也必须取 anon 视图。所有请求保留真实 caller identity；
不得为复用公共缓存而丢弃 authenticated session、强制匿名请求或把 viewer state 清为 false。

| RPC / signature 参数类型 | Input 字段 | Result | Auth / 未来 consumer |
| --- | --- | --- | --- |
| create_question_v1(text,text,text,uuid[],bigint) | p_title,p_context,p_primary_channel,p_topic_ids,p_deep_exchange_budget_max_cents | {questionId} | authenticated Person |
| update_question_v1(uuid,text,text,text,uuid[],bigint) | p_question_id + 上述 create 字段 | {questionId} | authenticated owner |
| close_question_v1(uuid) | p_question_id | {questionId,status:closed} | authenticated owner |
| get_question_detail_v1(uuid) | p_question_id | {question:CanonicalQuestionDetailV1 或 null} | anon/public read |
| list_questions_v1(text,text,integer,integer) | p_primary_channel 或 null,p_status 或 null,p_limit,p_offset；无 order 参数 | {questions,nextOffset}，createdAt DESC → questionId ASC | anon/public read |
| create_answer_v1(uuid,text) | p_question_id,p_body | {answerId} | authenticated Person |
| delete_answer_v1(uuid) | p_answer_id | {answerId} | authenticated author |
| list_question_answers_v1(uuid,text,integer,integer) | p_question_id,p_order,p_limit,p_offset | {answers,nextOffset}，包含 viewer-scoped state | public-readable，保留 authenticated caller |
| set_answer_helpful_v1(uuid,boolean) | p_answer_id,p_is_helpful | {answerId,helpfulCount,viewerHasMarkedHelpful} | authenticated Person |
| create_answer_reply_v1(uuid,text) | p_answer_id,p_body | {replyId} | authenticated Person |
| delete_answer_reply_v1(uuid) | p_reply_id | {replyId} | authenticated author |
| list_answer_replies_v1(uuid,integer,integer) | p_answer_id,p_limit,p_offset | {replies,nextOffset} | anon/public read |

RPC SQL 计划返回 jsonb 与上述 camelCase envelope 一致。Public detail missing/hidden/deleted
统一 null，不泄露存在性；不可见 parent 的 list 返回真实 []/nextOffset=null。查询失败应传播错误，
不能伪装 []。write not-found/无权访问统一不可见目标错误；closed/self-helpful/input validation
使用 `QUESTION_ANSWER_V1_STABLE_ERRORS` 与 `parseQuestionAnswerV1StableError` 按 SQLSTATE + exact
message key 映射，不依赖或向 consumer 传播 detail/context/raw backend text。
anon viewerHasMarkedHelpful=false；authenticated 必须查询真实关系。分页各 list 必须校验 parent
identity 一致，不能拼入其他 Question/Answer 的记录。Reply list 不内嵌到 Answer 大数组中。

### Helpful viewer projection 与后续 consumer cache

`CanonicalAnswerV1.viewerHasMarkedHelpful` 是 **viewer-scoped**，不是 public-global fact。
`helpfulCount` 是可见回答的公开聚合；`viewerHasMarkedHelpful` 则由 `auth.uid()` 决定：
anon 固定 false，authenticated 只反映当前 caller 自己的真实 Helpful relation，不能查询
其他 Person 的 viewer state。因此 `list_question_answers_v1` 是 public-readable，但包含
viewer-scoped personalized projection，不能跨账号复用完整响应。

未来 B 的 React Query / equivalent cache key 至少包含：
`question-answers + questionId + order + viewerScope`，其中 viewerScope 为
`viewerPersonId | anon`；同时纳入实际分页参数（普通分页 key 或 infinite-query pageParam）。
Person A logout → anon → Person B login 时必须切换 scope，不能复用 A 的数据、placeholder
或异步请求结果来展示 B 的 Helpful 状态。网络请求的 caller session 与缓存 viewer scope
必须一致；不能从用户可控 RPC 参数指定另一个 viewer。对 HTTP/SSR/equivalent cache 同样
不得跨 viewer 共享完整 Answer list。这是关系状态正确性边界，不是 Service Reputation。

此要求由 `ANSWER_HELPFUL_VIEWER_SCOPE_V1`、Page Contract consumer note 和 EC-2 guard
保护。EC-2D 的 `questionAnswerV1Cache.ts` 已采用 viewer-scoped key、page size 与 offset pageParams，
切换账号时取消并移除其他 viewer 的 cache，adapter 在请求前后检查 caller；本 EC-2E 只同步 truth。

## 九、隐私与 Legacy Cutover

Public payload 严格 allowlist，不含 phone/email/private profile metadata/Claim/payment/raw expert
JSON/deletedAt/moderation evidence。Parser 拒绝未知字段、缺字段、错误 ID、非整数计数、空 Context、
非法 Channel/Topic；不采用 blind cast、any、fallback 或“第一个 Expert”补齐。
`profiles.phone direct Data API Privacy Cutover = REMAINS`。新 safe projection不代表旧表已安全。

已完成路径：新 canonical storage → 新 safe RPC → local/remote 验证 → explicit consumer
whitelist → B Shared Core vertical slice。旧 discovery consumers 与其表/RPC 保留；当前 canonical
页面不跨写新旧两套事实，也不恢复旧路由行为。
新旧 Question ID 来源必须显式区分；不能通过新 RPC 报错再 fallback legacy，也不能把任意旧
UUID 当新 Question。旧内容导入是单独 reviewed job：核对作者、非空 Context、频道、moderation
及原始时间；预算默认 null，采纳/点赞绝不转换为 Helpful/Closed。旧 reward/order reconciliation
仍由旧链路处理。没有自动 legacy migration。

## 十、实施与 Production Gate 结果

1. EC-2A 产品合同已合并冻结，Question listing、viewer scope 和稳定错误语义保持不变。
2. EC-2B 对 reviewed migration 完成 local PostgreSQL、RLS、grants、并发和 rollback 验证；
   Static Contract PASS ≠ Database Apply PASS 的边界继续成立。
3. EC-2C1 只读预检锁定 migration checksum、Production dependency 和 apply/smoke 方案。
4. EC-2C2 已应用唯一 migration，完成 remote schema/security/rollback smoke、Advisor 与 generated types 对齐。
5. EC-2C3 已完成真实 authenticated PostgREST read/write、shared parser、viewer scope、stable error 与隐私验证；
   两个临时 Auth user 及全部内容已定向清理，persistent synthetic rows=0。
6. EC-2D 的 Shared Core publish/detail/Answer/Helpful/Reply/owner close 已由 PR #43 合入 main；
   EC-2E 对齐当前 page/runtime truth，Home/Search/Channel 与 Canonical Topic 保持 EC-3 边界。

回滚先关闭新的 consumer gate，不破坏 legacy；已应用 migration 不改写，不删除用户内容；需要
修复时新建 reviewed corrective migration。A 负责 schema/API/security，B 只消费 contract，
C/D 复用同一 identity/DTO。不得提前开始 EC-3 Matching 或 EC-4 Conversation/Payment。

EC-2C3 没有新 migration、DDL、RLS/grant mutation 或 Edge deployment。仅按授权创建两个临时 Auth
user 和 synthetic Question/Answer/Reply/Helpful，通过真实 HTTP 验证后定向清理，持久残留为 0。
Production backend 与 shared consumer contract **READY**；canonical Question/Answer/Reply Shared Core UI
**IMPLEMENTED / MERGED**，平台验证边界见顶部。`profiles.phone` Direct Data API Privacy Cutover 继续为 **REMAINS**。
