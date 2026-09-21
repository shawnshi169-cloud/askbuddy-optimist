# EC-3 Discovery Contract Decision

当前：**EC-3A PRODUCT DECISIONS LOCKED / CONTRACT FROZEN**；Home/Search/Matching/Editorial **NOT DEPLOYED / NOT CLIENT CONSUMABLE**。
EC-3B2B Canonical Topic backend 已部署验证；[EC-3B2C consumer gate](./ec3b2c-canonical-topic-consumer-gate.md) 已验证，Shared Core contract 支持 0..N canonical Topic IDs，当前 UI 仍发送 `[]`。
Topic picker / Experience Topic UI 均未接入，taxonomy 未 seed。这不代表 Discovery pipeline 已实现。

以下为 EC-3A 冻结时的历史审计、产品语义及 gate snapshot；其中“本轮/当前/未部署”指 EC-3A 当时，
Topic 后续部署及 consumer 事实以上述 B2B/B2C 记录为准，不改写当时无 SQL/RPC/consumer 授权的证据。
Architecture owner：A。Baseline：`fa6acd091468e730991df855f519b82ad6848a01`，PR #47 merge。
本 PR 仍需 Product Owner review；`approved-frozen` 表达本指令已锁定的产品语义，不是 merge 或 runtime 授权。
EC-3 implementation **NOT STARTED**；本轮没有 SQL、RPC、网络 adapter、CMS、UI 或 Production 变更。

## 一、冻结范围与既有证据

EC-2 Contract、Backend、Shared Core Question/Answer/Helpful/Reply UI、Android platform verification、
A+B+C APP core vertical slice 已完成。Android 证据仍是 LOCAL ISOLATED QA；EC-2C3 consumer gate
是独立 Production 证据。Cross-platform rollout **NOT COMPLETE**，iOS real keyboard QA
**BLOCKED BY ENVIRONMENT**，WeChat EC-2 follow-up **PENDING**。不重跑、不重写这些证据。

本决策承接 [Product Blueprint](./product-blueprint-v1-contract-decision.md)、
[Question/Answer](./canonical-question-answer-v1-contract-decision.md)、
[Public Person](./canonical-public-person-profile-contract-decision.md)、
[Experience](./canonical-experience-v1-contract-decision.md)。未发现与本轮锁定原则直接冲突的
既有 canonical 规则；旧 UI/adapter 的不同语义属于明确的 legacy compatibility，不是本轮实现依据。

| 审计对象 | 可复用 / Gap / 处理 |
| --- | --- |
| shared-types `public-person.ts` | 复用 PublicPersonId、PublicPersonSummary；不复制 profile row / Expert JSON |
| `question-answer-v1.ts` | 复用 CanonicalQuestionIdV1、CanonicalAnswerIdV1、CanonicalTopicIdV1 与 Question 字段；现有 parser 仍只接受 topicIds=[] |
| `experience-v1.ts` | 复用 public Experience / directional Transition / city 字段；不读 private Experience 或 Claim |
| `product-channels.ts` | 精确复用四个 slug/catalog，不创建第二套 Channel enum |
| shared-types `product-blueprint-v1.ts` | 复用 HomeSearchDomainV1、ServiceReputationSummaryV1Target 和 Service modes；后两者不是 deployed evidence |
| `useSearch.ts` / shared-api `search-v2.ts` / `contentAdapters.ts` | question/expert/skill/post、legacy bounty 与 marketplace card；仅兼容，不能作为新的 Discovery payload |
| `useChannelFeed.ts` / `get_channel_feed` contract | 当前 questions/experts collection + next_cursor；保留 current，不把 JsonObject/Expert collection 复用为 canonical feed |
| `useHotTopics.ts` / `TopicDetail.tsx` / `HomeHotRank.tsx` | hot_topics、description 分段、topic_discussions 和讨论计数排序；不是 Canonical Topic，也不是新的 Editorial Article |
| `useAdmin.ts` / `useIsAdmin` | 已有 role/moderation/config/legacy 内容入口；无可直接宣称已验证的 canonical Editorial publishing API |
| 当前内容 / comment patterns | 未发现可复用的 shared structured Editorial ContentBlock；旧 Post/Topic comment 身份与父实体不同，Editorial comments = planned/not-runtime |
| 当前 pagination | EC-2 是确定性 offset，不保证跨页 snapshot；Channel 有 legacy next_cursor。EC-3 复用 items/cursor 心智，不声称已有稳定 snapshot 实现 |

历史文档中的 Home/Search/Channel deferred to EC-3 继续成立。Public Person stale truth、legacy Expert、
Android generated assets、legacy lint debt 不在本轮修复；`profiles.phone` Privacy Cutover **REMAINS**。

## 二、Home / Channel / Search

首页固定：Brand Header + 城市 + 待办铃铛 → Home Search → 四大 Channel → 问问热榜 →
大家都在问｜找TA问问 → 对应独立 Feed → 首页｜发现｜＋｜消息｜我的 Bottom Navigation。
首页是 Discovery / utility，不是 social plaza、专家商城或交易大厅。

- 城市是可选 city-level location dimension，不要求 GPS，不写入 Topic 或用户 Experience 事实。
- Bell 仅聚合 priority/actionable items；普通消息未读、点赞和互动通知归 Messages。
  现有 unread RPC 不等于 actionable attention backend，本轮不实现 Bell API。
- 四大 Channel 精确为：教育学习 `education-learning`、职业发展 `career-development`、
  生活服务 `lifestyle-services`、兴趣技能 `hobbies-skills`。不是 Person/Experience taxonomy。
- 大家都在问仅 Question；找TA问问仅 Person，禁止卡片混排。首次默认 Questions，后续记忆
  last-used mode，仅 light interaction preference，不产生永久 persona。具体存储方式由 consumer 阶段决定。
- Channel Detail 保持双 mode。Question 按 primaryChannel 精确过滤；Person 按该领域真实公开
  Experience/contribution relevance 召回，不要求给 Person/Experience 永久分配 Channel。
  Channel 只是 temporary domain focus，退出恢复全局 Home personalization。
- Search placeholder：**搜问题、找经历过的人**。Tab 复用 `all/person/question`：**综合｜人｜问题**。
  综合为顺序明确的 **相关问题 + 相关的人** 两个 section，各自排序和分页，不用单一分数强制交叉。
  人 tab 只有 Person；问题 tab 只有 Question。排除 Discover Post、Community、standalone Experience。
- 无结果显示真实 empty state；可用 **去问一个问题** 进入中央 + 的我有问题路径。
  query 只能作为 draft/idea，不自动创造用户未说过的 Context。没有 fixture 或 AI fabricated result fallback。
- 中央 + 仅 **我有问题 / 我有经验 / 技能**，普通 Person 不可发布 Editorial Article。
- Discover 保持独立 social plaza（推荐｜关注｜同城）；Post 不进入 Home feed，Community 不进入 Home V1。

专题打开话题 → Question 提供免费经验 → Person 承接真实经历。EC-3 到发现 Question/Person 和
进入 `/person/:userId` 为止。CTA **问问TA** 不是 Conversation、Chat、Service、Booking、Payment、
Voice/Video 或 Settlement 操作；这些是 EC-4，当前缺失能力不可伪装成可用。

## 三、Editorial Feature / Article

**问问热榜 = Admin-managed Editorial Feature / Article 栏目，不是 ranking list。Article != Topic。**
例如一篇“第一份工作如何选择”的真实发布文章可关联职业选择等 Canonical Topics；两者有独立 identity。
首页为横向小海报卡，约露出 1.15–1.3 张；这是设计意图，不是本轮 UI 实现。

最小 target：featureId、title、cover、dek、publication state、publishedAt、placement/sortOrder、
structured body、真实相关 Topic/Question/Person IDs、comments capability、public-link share capability。
生命周期只保留 draft/published/unpublished。公开 summary/detail 只允许 published；无真实 published
内容时整个问问热榜模块 **HIDE**，不显示 fake ranking/count，不 fallback legacy 热榜或 fixtures。
首页顺序由 editorial sortOrder ASC → featureId ASC 确定，不按 views/Topic popularity 算排名。

授权 Admin/editorial operator 才能 create/edit/publish/unpublish/place；普通 Person 不可执行。
完整 Admin Control Plane 非本轮范围。后续可 review 最小发布能力，但不能将客户端 role 判断当服务端授权。
遗留 hot_topics 不自动变成 Editorial Article，旧 description/计数不能自动成为新内容事实。

正文是最小 discriminated union：heading、paragraph、image、quote；heading 表达 section，
文本 runs 支持 emphasis/strong。无任意 raw HTML、脚本、iframe、widget、video CMS、poll 或 commerce。
文字按文本呈现；未来 parser/rendering 必须拒绝危险 URL scheme/不受治理媒体，不用 innerHTML。
本轮不决定富文本 editor/CMS 存储或图片上传实现。

相关内容在正文外使用 typed IDs；后续解析必须检查 canonical entity 存在且仍可公开展示。
quote 的 editorial-emphasis 只突出编辑正文，不冒充用户证言；public-answer quote 必须绑定真实
answerId/questionId/authorPersonId，文本来自该公开 Answer，删除/隐藏后移除引用展示。
不能编造 Person、Question、Answer 或把 AI 文本冒充真实 quote。

评论是 product planned capability，**planned-not-runtime**。当前没有可安全直接复用的 Editorial
comment runtime，不借用 topic_discussions/post_comments 伪装完成；没有真实 commentCount 就不返回。
分享仅为未来 published public-link 语义，不是分享调用已接线或分享次数事实。

## 四、Topic / Location / Person Facts

Canonical Topic 是平台维护的规范语义实体：topicId、canonicalName、aliases/normalized terms、
status（active/deprecated）。新关联只解析 active root；deprecated root 保留历史可追溯引用，
具体 replacement/merge 治理由 EC-3B review，不能把任意字符串变为新 root。
共享于 Question、Experience、Editorial、Search、Matching；未来可接 Community 与 Discover mapping。
它不是 hashtag、hot_topics ID、Location、Channel、Transition 或 Article。

AI 可 query rewrite、alias normalization、topic mapping、retrieval assistance；AI建议 → 解析已有
Canonical Topic → 用户确认或真实系统映射。无法解析可为 0 个；不静默创建 root，不用随机 UUID 占位。

Question target Topic = **0..N**，Primary Channel 仍 exactly one。Experience target Topic = **0..N**，
不要求 Channel。Topic 不是发布硬要求，不要求历史 Question 强制 backfill；不转换 legacy tags。
**Production EC-2 topicIds=[] remains locked**：本轮不修改 create/update/read parser、SQL 或 consumer。
真实 Topic root/resolver/FK/association runtime 由 EC-3B 单独 review/deploy 后 additive 解锁。
现有 `canShare` 仍是用户确认的描述文本，不能自动当 Topic identity。

Transition 是一等 directional structure，不降级成 string tag。Location 只 city-level，独立用于 local
relevance；城市不会自动成为 Experience、Topic 或 verification claim，也不要求精确实时定位。

## 五、Card 与可信事实

QuestionDiscoveryCard 复用 canonical Question identity/title/channel/topicIds/budget/status/time；
contextExcerpt 是确认背景的忠实摘要，answerCount 来源当前公开 active Answer，requester 如需显示
只用 PublicPersonSummary。预算依然 null 或正 safe integer CNY 分，是后续深入交流意向，不是 bounty、
reward 或 Answer payment。无 accepted/best、fake view/heat/urgency/answerer count/match score。

PersonDiscoveryCard 复用 PublicPersonSummary（userId = PublicPersonId），必须携带真实 relevance evidence。
优先适合的公开 canonical Experience；确实没有 suitable Experience 时允许该 Person 的真实公开 Answer
作为 contribution fallback。禁止随意选第一条/最新 Experience、legacy headline 或 AI invented reason。
没有安全公开 evidence 时不制造 Person card。证据 parent/owner 必须与 Person 一致，private、deleted、
moderation-hidden Experience/Answer/Question/Claim、phone、email、raw profile/expert、viewer 行为不得输出。
Missing nickname/avatar 保留既有 nullable semantics，不虚构 identity。

Person 不需要 Expert、Service 或 Verification 就能发现。Reputation/Service 的 optional target 复用已有
类型，只有真实 canonical public facts 且相应模块批准可展示后才返回；现在不可从 legacy counters 填充。
1–2 条真实评价不显示平均星级，合适位置可写“2次真实评价”；至少 3 条才允许平均星级与 count。
0/未知评价不提供默认 5.0；Helpful、Social popularity 绝不成为 Service Reputation。
Service target 仅真实 modes capability，不加入价格促销/availability/交易 CTA。Verification 尚无适合
Discovery 的 canonical public DTO，当前 target 不新增 generic verified 字段；以后必须按真实具体事实
经独立 contract review additive 接入，绝不暴露 owner Claim/evidence 或 legacy is_verified。
TypeScript target 不替代未来 runtime parser 的金额、计数、权限、URL、source 一致性验证。

## 六、Personalization / Matching V0

输入分开保存：Current State、Accumulated Experiences、Current Needs/Interests、Recent behavior。
过去经历解释别人为何找 TA；当前需求解释 TA 此刻应该看到什么。Search“想转产品经理”只是 Need，
不是“做过产品经理”的 Experience。浏览/兴趣不能生成 Experience；Need → Experience 必须用户明确事实确认。

| Signal tier | 真实信号 |
| --- | --- |
| Strong | own Question、active Search、repeated Topic viewing、ask Person、未来 Booking、真实 Experience-related action |
| Medium | save、deep Answer read、follow relevant Person、explicit interests、未来相关 Community action |
| Weak | incidental like、one-off impression |

动态 Need/Interest/行为必须 time decay；不是让 durable Experience 随兴趣衰减删除。
不锁数值 weights/half-life，不以读取动作执行未来 Booking/Community 功能。行为是 viewer-private 输入，
不可在结果中解释他人的私密搜索。冷启动用轻量兴趣 onboarding、明确 Experience、真实广泛有用内容和探索；
无足够证据时不宣称“为你精准推荐”。Home mode/Channel focus 不产生永久用户类别。

Person 优先级：**Experience relevance > Reputation/Trust > Service fit > Social/Activity**。
V0 pipeline：Need/query → Topic/semantic intent → public Experience/Transition/contribution → Person →
Verification/Trust → Reputation → Service fit → Social/Activity。未部署因素可省略，不补 fake trust/price。
禁止 paid placement、service price、follower count 凌驾 Experience relevance；不输出公开匹配百分比。

Question relevance 独立：semantic、Topic、Channel、recency、真实 Answer/Helpful engagement、viewer Need/behavior。
不借用 Person 数值强制混排，不修改 EC-2 Answer detail 已冻结的排序；不使用 fake popularity 或 urgency。
AI 帮助找到真实经验，不能用 generic generated answer 替换真实 Question/Person results。

## 七、Semantic API 与分页

唯一 target types：`packages/shared-types/src/discovery-v1.ts`；机器不变量和语义 operations：
`packages/shared-api/src/discovery-v1.ts`。所有新 DTO/request/response 均 `V1Target`，无 RPC 名、无 transport、
无 deployed parser，不修改 RPC_CATALOG、CLIENT_RPC_WHITELIST 或 EC-2 contract。

| Semantic operation | Request | Response |
| --- | --- | --- |
| questionDiscovery | Home/Channel scope + optional city + page | Question-only page |
| personDiscovery | Home/Channel scope + optional city + page | Person-only page |
| searchAll | query + optional city + independent questions/persons page requests | 两个独立 Question/Person section |
| searchPeople | query + optional city + page | Person-only page |
| searchQuestions | query + optional city + page | Question-only page |
| editorialList | page | published Editorial summary page |
| editorialDetail | featureId | published Editorial detail 或真实 null |

这不是 endpoint/RPC signature freeze。EC-3C 决定 transport、strict runtime parsers、SQL signature 和安全访问。
未来公开 read 允许 anon；authenticated 保留 caller identity 做合法个性化。请求不允许任意 viewerPersonId
冒充别人，身份取 authenticated context。缓存必须隔离 viewer|anon、mode/section、query、Channel、city、snapshot。
Editorial 管理不在普通客户端 operation map 内，comments 尚无 write operation。

Pagination 使用 opaque server-issued cursor 和 stable snapshot；初次 cursor=null；limit 为正 safe integer，
上限及过期时长由 EC-3C review。response = items + snapshotId + nextCursor，结束时 nextCursor=null。
绑定 viewer|anon、mode/section、query、Channel/city、ranking version、snapshot，不能跨账号或过滤条件复用。
同一 snapshot 内 order 固定且以 canonical entity ID ASC 最终 tie-break；不随机重排，不重复实体。
Search 综合各 section 独立 cursor/snapshot，不发明跨实体全局排名；刷新用新 snapshot 并清理旧分页缓存。
cursor 无效/过期/不匹配明确 failure，不能静默 reseed 或 fallback offset。Snapshot 不固化访问权限：每页
重新过滤 deleted/private/hidden/unpublished 内容；允许因此变短，不回填早页实体或重新公开撤回内容。
不保证永恒 snapshot retention，也不在本轮决定 index、cursor 编码或 ranking storage。

## 八、Machine / Page Truth 与后续 Gate

Blueprint 仅增加 optional `contractStatus=approved-frozen`，保持 runtimeStatus 独立；无大规模状态重构。
Home/Search/Channel 的 existing current read/write 和 legacy implementationStatus 不变。
新 Editorial Feature Detail 是 blocked target-only page；旧 TopicDetail 不是该页面。

| Runtime | EC-3A 后状态 |
| --- | --- |
| Canonical Topic | NOT DEPLOYED |
| Question nonempty topic association | BLOCKED |
| Home Question / Person discovery backend | NOT IMPLEMENTED |
| Canonical Search / Matching V0 | NOT IMPLEMENTED |
| Editorial Feature / comments | NOT IMPLEMENTED / planned-not-runtime |
| Shared Core Home/Search/Channel | legacy compatibility / NOT CUT OVER |
| EC-3 client consumer authorization | false |

下一阶段必须独立指令：EC-3B Topic foundation → EC-3C Discovery/Search/Matching backend → EC-3D Shared Core
Home/Search/Channel UI → EC-3E Android verification → EC-3F WeChat follow-up。B/C/D 不自行实现未部署 contract。
部署、真实 security/parser/smoke evidence 与 consumer authorization 是不同 Gate，不因本 PR 冻结而越过。
Review/merge 前 **DO NOT START EC-3B**；后续也不得隐含开启 EC-4。

未冻结的 implementation decisions：Topic replacement/alias resolution mechanics、Editorial storage/editor/comment
implementation、ranking weights/decay policy、snapshot/cursor encoding/TTL、具体 RPC 与权限、未来 public Verification
DTO。它们不得改变本文件已锁定的产品不变量；需要实现或新能力时单独 Product/Architecture review。

回退本合同只影响文档/target types/guards；没有 DB 或数据回滚。当前既有 consumer/runtime 保持原样。
**DO NOT MERGE. DO NOT DEPLOY. DO NOT START EC-3B.**
