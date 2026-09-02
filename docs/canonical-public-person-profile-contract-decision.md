# Canonical Public Person Profile Contract 架构决策

## 文档状态

- 架构负责人：A - Backend & Shared Contract
- 审计基线：`02b72c2c429c009cb761f7d454b014dc0c179a91`
- Production 激活基线：`5271f7f6bc31637735a612f776e3e78ccaa729ec`
- Production 项目：`fslpvtlavhrnxsygkpvi`
- 核心 Decision：review 通过
- 本次 Amendment：撤回默认 `SECURITY DEFINER`，改为优先并最终采用 `SECURITY INVOKER`
- Migration `20260901154746_canonical_public_person_profile_v1.sql`：已部署并验证
- 旧 `profiles` Data API 隐私风险：`REMAINS`

## Production 部署验证（2026-09-02）

- `public.get_public_person_profile_v1(uuid)` 已通过正常 migration history 部署。
- 函数为 `SECURITY INVOKER`、`STABLE`、空 `search_path`；无 `PUBLIC` EXECUTE。
- `anon`、`authenticated`、`service_role` 均具有预期 EXECUTE 权限。
- ordinary non-expert、无 expert 的 answer author、active expert、missing Person
  与 sensitive-field exclusion remote smoke 全部通过。
- Production Security Advisor 总量与部署前基线一致，且没有告警指向本 RPC。
- 上述 safe projection 不等于 direct `profiles` Data API 已收口；`profiles.phone`
  暴露继续按第八节 follow-up gate 管理。

## 一、不可变核心决策

Canonical Public Person identifier 为：

```text
PublicPersonId = auth.users.id = profiles.user_id
```

Canonical public route 为：

```text
/person/:userId
```

`profiles.id` 与 `experts.id` 都只是存储行 ID，不是 Person identity。
`experts` 是可选 capability/service extension。普通用户没有 expert row、服务、
收费能力或认证结果时，仍然拥有 Public Person Profile。

平台不存在永久的“提问者账号”或“回答者账号”。提问者、回答者、服务提供方与
服务购买方都只是一次 interaction/service 中的角色；同一 Auth Person 可以在不同
场景承担不同角色，不能据此拆成不同 public identity。

公开身份与平台内部账户身份分离。Public Person 使用 nickname、avatar、public bio
与已定义的公开经历语义，不要求公开法律姓名。手机号验证只属于账户登录/基础真实性
能力，绝不等价于公开实名，也不得使 `profiles.phone` 进入 Public Person contract。

现有 `/profile` 继续表示 authenticated self area，因此不采用
`/profile/:userId`。旧 `/expert-profile/:expertId` 与 `/expert/:expertId`
采用 additive compatibility，不在本阶段删除。

## 二、Production Schema Truth

### profiles

- `profiles.id` 是物理主键。
- `profiles.user_id` 唯一并引用 `auth.users(id) ON DELETE CASCADE`。
- Production 中不存在 `profiles.id = profiles.user_id` 的行。
- 当前 27 个 Auth user 均有且仅有一个 profile，没有 duplicate 或 orphan。
- 当前字段包括 `nickname`、`avatar_url`、`cover_url`、`bio`、`phone`、
  `city`、`city_code`、`gender`、`school`、`industry`、`is_expert`、
  `is_verified` 与时间戳。
- `profiles` 没有 canonical `profile_status` 或 visibility 字段。
- `user_settings.privacy_level` 单独存在，但当前 Core privacy UI 使用的是另一组
  legacy JSON 字段；`privacy_level` 尚未成为可执行的 Public Person visibility
  contract。现有与 profile 对应的 27 条设置全部为 `public`。
- RLS 已启用，但现有公开读 policy 为 `USING (true)`，anon/authenticated
  均有 table-level `SELECT`，因此 `phone` 当前可通过 Data API 直接读取。

### experts

- `experts.id` 是 expert extension row ID。
- `experts.user_id` 唯一，是当前 extension owner identity。
- 当前 3 个 expert 全部能映射现有 Auth user/profile，24 个 profile 没有 expert。
- Production 当前缺少直接的 `experts.user_id -> auth.users.id` FK。
- `headline`、`intro`、`expertise_summary` 是可选 enrichment。
- `profile_status` 与 legacy `is_active` 共同影响 extension 是否 active。
- `education` 与 `experience` 是无 schema 约束的 JSON array；当前 Production
  全部为空，不能作为跨端 Experience contract。
- `verification_status` 是 expert-profile review status；`is_verified` 是
  legacy compatibility boolean。
- `title`、`display_name`、`avatar_url`、`consultation_price`、rating、
  response/order/consultation metrics、available slots 等属于 marketplace-era
  字段或重复 presentation data，不定义 Person identity。

### 内容与关系

- `answers.author_id`、`questions.author_id`、`posts.author_id` 指向
  `auth.users.id`。
- `messages.sender_id/receiver_id` 指向 `auth.users.id`。
- `follows.follower_id/followee_id` 指向 `auth.users.id`。
- 当前 9 条 Production answer 全部存在对应 profile，但 9 条全部没有 expert
  extension。Expert-gated profile navigation 会排除所有当前真实回答者。

### skill_offers

- 物理字段继续是 legacy 名称 `skill_offers.expert_id`。
- 实际 FK 为 `skill_offers.expert_id -> experts.user_id`，不是 `experts.id`。
- Shared contract 中的真实语义为 `ownerUserId: PublicPersonId`。
- Paid service capability 属于 Person，不属于 Expert。当前物理 FK 是历史实现约束，
  不能成为未来 Person service capability 的 domain ownership。
- 本阶段不物理 rename，不扩展 Payment 或 consultation contract。
- 本 PR 不创建未来 Service Contract，只消除 Public Person V1 对该 legacy 关系的错误耦合。

## 三、字段归属

### Public Person 基础字段

V1 允许公开：

- `userId`
- `displayName`
- `avatarUrl`
- `coverUrl`
- `bio`
- `city`
- `school`，明确标注 self-reported
- `industry`，明确标注 self-reported
- `joinedAt`
- answer/post contribution count
- nullable `expertExtension`

`city` 当前已被同城内容和公开 profile readers 使用，Production RLS 也将其视为
公开字段，因此 V1 保持公开。未来如产品引入 location privacy，需要新 contract，
不能由端侧自行隐藏或解释。

V1 禁止返回：

- `phone`
- `profiles.id`
- `experts.id` 作为 Person identity
- `gender`
- `city_code`
- generic `is_verified`
- raw `experts.education`
- raw `experts.experience`
- Auth metadata/email
- private settings
- unavailable fake metrics

本阶段不定义 reputation、rating、helped-user count、completed-service count、booking、
payment 或 commission contract。`experts.rating`、`order_count`、
`consultation_count`、`followers_count` 等 legacy 字段即使物理存在，也不具备足够稳定
的产品语义，不能作为 V1 enrichment。

### Expert extension

`expertExtension` 仅在同一 `userId` 存在同时满足以下条件的 expert row 时返回：

```text
profile_status = active
is_active = true
```

Extension V1 只包含：

- `headline`
- `intro`
- `expertiseSummary`

没有 expert row、inactive row 或 malformed row 时返回 `null`，不得让 Person 404。
V1 不把 expert review status、consultation、payment 或 legacy metrics 伪装成可用能力。
`expertExtension` 只是 legacy optional enrichment，不得用于 gate Public Person、
paid service capability、Matching、Verification 或用户等级。未来 paid voice/video
experience exchange capability 必须以 Person 为 owner，并通过独立 contract 定义；
不得重新嵌套进 `expertExtension`。

## 四、SECURITY INVOKER Amendment

### 最终决策

`public.get_public_person_profile_v1(p_user_id uuid)` 使用：

```sql
SECURITY INVOKER
SET search_path = ''
```

原文档中默认建议 `SECURITY DEFINER` 的结论正式撤回。

### Invoker 读取关系与边界

| Relation | V1 用途 | 当前 RLS/grant truth | RPC 额外过滤 |
| --- | --- | --- | --- |
| `profiles` | safe public projection | RLS enabled；anon/authenticated 可 SELECT；public policy 当前允许全部行 | 仅 `p_user_id`，显式 allowlist 列 |
| `answers` | `answerCount` | RLS enabled；公开读 policy 存在，但有 legacy permissive policy | `author_id`、`is_hidden=false`、status active/accepted |
| `posts` | `postCount` | RLS enabled；`can_read_post` policy | 仅 `visibility=public`、`status=active` |
| `experts` | nullable active extension | RLS enabled；公开 active policy | 同时要求 `profile_status=active` 与 `is_active=true` |

这些关系均已具备 invoker 所需的 SELECT grants 与 RLS。函数不读取
`auth.users`、`user_settings`、verification evidence 或 private schema，因此不需要
绕过 RLS。

### 当前不可声称支持的状态

- Banned Auth user：invoker 无权读取 `auth.users`，当前 profile schema 也没有
  moderation status。本轮不能伪造 banned filtering。
- Private profile：`user_settings.privacy_level` 尚未接入公开 profile contract，
  friends/private 语义也未定义。本轮不能声称 private behavior 已完成。
- Deleted Auth user：`profiles.user_id` 使用 `ON DELETE CASCADE`，hard-deleted user
  会自然表现为 `{ person: null }`。
- Inactive Person：当前不存在 canonical Person inactive status；只有 expert extension
  有 active/inactive。

如果未来确实必须查询 Auth ban state 或 owner-only privacy data，应先评估将可公开
状态正规化到受 RLS 保护的 public projection。只有该方案无法满足安全要求时，才可
单独提出 `SECURITY DEFINER`，并必须附 threat model、非 exposed schema placement、
精确 EXECUTE grants、空 `search_path`、safe projection、无 dynamic SQL、caller/target
validation、enumeration/rate-limit 评估与 advisors 结果。

## 五、V1 Shared Contract

V1 保持小而稳定，不返回 answers/posts/services 的无限列表。

```ts
type PublicPersonId = Id;

interface PublicPersonSummary {
  userId: PublicPersonId;
  displayName: string | null;
  avatarUrl: string | null;
}

interface PublicPersonExpertExtension {
  headline: string | null;
  intro: string | null;
  expertiseSummary: string | null;
}

interface PublicPersonContributionSummary {
  answerCount: number;
  postCount: number;
}

interface PublicPersonProfile extends PublicPersonSummary {
  coverUrl: string | null;
  bio: string | null;
  city: string | null;
  school: string | null;
  industry: string | null;
  joinedAt: ISODateTime;
  contributionSummary: PublicPersonContributionSummary;
  expertExtension: PublicPersonExpertExtension | null;
}

interface GetPublicPersonProfileV1Params {
  p_user_id: PublicPersonId;
}

interface GetPublicPersonProfileV1Result {
  person: PublicPersonProfile | null;
}
```

`shared-api` 必须提供 runtime parser，拒绝 malformed object、错误类型、负数 count
以及任何返回层出现的 `phone`、generic verification 或 raw experience 字段。
`displayName` 原样来自 trimmed `profiles.nickname`；schema 未提供非空约束，因此缺失时
返回 `null`，backend 不用固定文案制造昵称。

## 六、Profile RPC Scope

V1 RPC 只负责：canonical identity、safe public profile projection、self-reported
school/industry、compact answer/post counts、nullable active expert extension，以及
canonical not-found `{ person: null }`。

V1 RPC 不负责 answers/posts 内容列表、follows/messages、verification evidence、
private settings、consultation/payment、recommendations 或 experience timeline。

贡献内容列表后续采用独立 paginated contract。优先评估复用已有公开 question/post
read contract；若无法稳定按 `author_id` 分页，再新增例如
`get_public_person_contributions_v1(p_user_id, p_kind, p_cursor, p_limit)`。
UI-1E V1 仅以 contribution count 和独立 empty state 开始，不把列表塞进 profile RPC。

## 七、profiles Reader Inventory

### Public profile readers

| Consumer | 用途 | 当前字段 |
| --- | --- | --- |
| `useLocalPosts` | 按公开 city 找动态作者 | `user_id,nickname,avatar_url` + city filter |
| `useQuestions` | 问题/回答作者展示 | `user_id,nickname,avatar_url` |
| `usePosts` / `useFollowingPosts` | 动态与评论作者展示 | `user_id,nickname,avatar_url` |
| `useMessages` / `ChatDetail` | 会话对方展示 | `user_id,nickname,avatar_url` |
| `useHotTopics` | 讨论作者展示 | `user_id,nickname,avatar_url` |
| `useSearch` | question/expert/post/skill owner enrichment | `user_id,nickname,avatar_url` |
| `useExperts` | expert display enrichment | `user_id,nickname,avatar_url` |
| `useProfileData` | following 列表 | `user_id,nickname,avatar_url,bio` |
| `useNotifications` | sender enrichment | `user_id,nickname,avatar_url` |

### Current-user private profile readers/writers

| Consumer | 用途 | 当前字段/行为 |
| --- | --- | --- |
| `AuthContext.fetchProfile` | 当前用户 session profile | `id,user_id,nickname,avatar_url,cover_url,bio,phone,city` |
| `useUpdateProfile` | owner update | update 后 `.select()`，会展开全部可返回列 |
| `useUserLocation` | owner legacy location write | 写入 legacy latitude/longitude，不是 public reader |
| `useUserSettings` | owner settings | `user_settings.select('*')`，不属于 Public Person contract |

### Internal/service profile readers

| Consumer | 用途 | 当前字段/边界 |
| --- | --- | --- |
| `wechat-auth` Edge Function | 登录响应 enrichment | `nickname,avatar_url`，service role server path |

### Legacy/dead code

- `useUserLocation` 是仍可触发的 legacy owner-only writer，不是 public reader，也不能在
  privacy cutover 时被误判为 dead code。
- 本次全仓搜索没有识别出可证明为 dead、可直接删除的 `.from('profiles')` reader。
- 同文件内多处 `.select('*')` 实际读取 questions、answers、posts、follows、messages、
  user settings 等其他 relation，不等价于 `profiles.select('*')`。

全仓没有显式 `profiles.select('*')` 的 public read，但 `useUpdateProfile` 的无参数
`.select()` 会在 owner update 后展开列。`AuthContext` 是当前唯一直接读取
`profiles.phone` 的 consumer。

## 八、Direct Profile Access Privacy Hardening Plan

新增 safe RPC 不等于旧 `profiles` Data API 已安全。当前 remaining exposure 为：

```text
anon 或任意 authenticated caller
-> public.profiles Data API
-> phone 可读
```

本 PR 不立即 revoke table-level SELECT，因为这会破坏上述公开 readers、
`AuthContext` owner phone read 和 update-returning 行为。

最终收口顺序：

1. 部署 `get_public_person_profile_v1`，新 Person 页面只使用 safe projection。
2. B 将公开 Person 入口迁移到 RPC；其他 author-avatar readers 保持现状但不得新增列。
3. A/B 单独迁移 current-user private profile read/write，提供 owner-only private contract，
   明确处理 `phone`，并移除 update 后 `.select()` 的全列返回。
4. 清点 Core、iOS/Android shared shell、Mini Program、Edge Function 与外部 consumer，
   确认不存在依赖直接 `profiles.phone` 或 `profiles.select('*')` 的公开调用。
5. 新建独立 privacy cutover migration：撤销 anon/authenticated 对 `profiles` 的
   table-level SELECT；只保留经过审核的 safe projection/API，并保留 service role
   所需权限。
6. 在 staging 验证公开资料、登录 self profile、编辑资料、消息、搜索、问题、动态，
   再应用 Production 并确认 direct phone request 返回 permission denied。

Exact follow-up gate：

```text
PUBLIC_PROFILE_READERS_MIGRATED = YES
OWNER_PRIVATE_PROFILE_CONTRACT_DEPLOYED = YES
DIRECT_PROFILE_STAR_READS = 0
ANON_PHONE_SELECT = NO
AUTHENTICATED_CROSS_USER_PHONE_SELECT = NO
```

在该 gate 完成前，`profiles.phone` exposure 必须保持 OPEN，不得写成已解决。

## 九、Route Migration

### Phase 1

- A 部署 shared contract 与 canonical RPC。
- B 新增 `/person/:userId`，但旧 route 保持不变。
- 新代码只接受命名为 `userId/PublicPersonId` 的值，不接收 generic `id`。

### Phase 2

- Home 使用 `experts.user_id` 导航 Person。
- Search expert result 使用已有 `user_id`；未来 ordinary person search 单独扩展。
- Channel expert item 使用 RPC 返回的 `user_id`。
- Answer/Question 使用 `author_id`。
- Discover 使用 `posts.author_id`。
- Messages 使用 `partner_id`。
- Following 使用 `followee_id`。
- Notification user target 使用 user ID。

### Phase 3

- `/expert-profile/:expertId` 仅作为 compatibility resolver。
- Resolver 执行 `expertId -> experts.user_id -> /person/:userId` 并 replace history。
- `/expert/:expertId` 暂时保留为 legacy service-extension route。
- 通过 static guard 与 telemetry 确认无新 legacy link 后，再单独评估删除。

## 十、experts.user_id FK 建议

建议未来补充：

```text
experts.user_id -> auth.users.id ON DELETE CASCADE
```

Expert 是 Auth Person 的可选 extension，Auth user hard delete 后 extension 应级联删除；
`skill_offers.expert_id -> experts.user_id ON DELETE CASCADE` 会继续清理下游 offer。

当前 Production 3 个 expert 均有有效 Auth/profile，技术上可加 FK。但该 FK 不属于
UI-1E Gate 必需条件：V1 RPC 只会从 profile 的 `user_id` 左连接 active expert，orphan
expert 不会创建 Person，也不会影响 ordinary Person。为避免把完整性变更与公开读
contract 混在一起，本轮不添加 FK；后续独立 migration 应先做 orphan precheck，
再添加并 validate constraint。

## 十一、Verification / Experience Boundary

Public Person verification 继续拆分为：identity verification、
education/employment claim verification、professional qualification verification、
expert/service profile review。

V1 不返回任何 generic verification。`profiles.is_verified`、
`experts.is_verified`、`experts.verification_status` 均不得翻译为“已核验经历”。

结构化 `PersonExperience` 与 typed claim/evidence contract 属于后续独立阶段。
当前 UI 可展示 bio、self-reported school/industry、真实 answers/posts 贡献和 active
expert enrichment；不得解析 legacy JSON 生成 verified timeline。

## 十二、最小 Migration 清单

本次 UI-1E Gate 只需要一条 additive migration：

- 创建 `public.get_public_person_profile_v1(uuid)`；
- `SECURITY INVOKER`、`STABLE`、空 `search_path`、fully-qualified relation；
- 明确撤销 `PUBLIC` EXECUTE；
- 仅授予 `anon`、`authenticated`、`service_role` EXECUTE；
- 不改业务数据、RLS、table grants、profile columns、expert FK 或 legacy route。

Direct Profile Access Privacy Hardening 与 expert FK 必须使用后续独立 migration。

## 十三、UI-1E Implementation Gate

B 开始 UI-1E production data wiring 前，A 必须完成：

1. shared-types 最小 Person contract；
2. shared-api params/result、runtime parser、RPC catalog/whitelist/page map；
3. SECURITY INVOKER migration 与 grants tests；
4. ordinary non-expert 返回 profile；
5. active expert 返回 nullable extension；
6. missing user 返回 `{ person: null }`；
7. inactive expert 不影响 Person，仅 extension 为 null；
8. response sensitive-field exclusion；
9. staging/remote smoke、security advisor、required CI；
10. 明确记录 direct `profiles.phone` remaining exposure 和后续 gate。

B 只能消费 A 定义的 `PublicPersonId` 与 RPC contract，不得自行重新定义 ID、
fallback 到 `experts.id`，也不得直接多 query 拼装 Public Person。

## 十四、风险与 Rollback

- ID drift：shared 类型、route helper 和 static guard 必须区分 Person user ID 与 legacy
  expert row ID。
- PII exposure：新 RPC 使用列 allowlist；旧 direct phone exposure 保持 OPEN 并进入
  强制 follow-up gate。
- RLS drift：Invoker 依赖底层 RLS/grants，migration tests 与 remote smoke 必须验证
  anon/authenticated 结果一致且敏感字段缺失。
- Legacy link：旧 route 不删除，Phase 3 仅做 resolver redirect。
- Expert enrichment：缺失/invalid/inactive 一律 `null`，Person 本体不受影响。
- Rollback：RPC 与 shared contract 均为 additive；客户端可停止调用新 route，且无需
  回滚任何业务数据。Privacy/FK 后续 migration 必须拥有独立 rollback plan。
