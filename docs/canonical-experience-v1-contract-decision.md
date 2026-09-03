# Canonical Experience v1 Contract Decision

状态：EC-1A 基础 migration 已部署；Production 回滚 smoke 发现 owner soft-delete RLS
阻塞，corrective migration 已准备但**尚未部署**。Consumer rollout 继续停止。

本决策继承 `Product Blueprint v1`：Person 是唯一公共主体，Experience 是 Person
拥有的持久经历，不是 Expert、Service、Verification、Current Need 或 Current Interest。

## 一、Canonical Identity 与边界

- `personId = PublicPersonId = auth.users.id = profiles.user_id`。
- `profiles.id`、`experts.id` 不得成为 Experience owner identity。
- Person 不需要 `experts` row、Service capability 或 Verification 即可创建 Experience。
- `experts.education`、`experts.experience` 仅为 legacy candidate source，不自动迁移、不自动
  公开、不自动认证；未来只能由用户确认后生成 Canonical Experience。
- `canShare` 是用户确认的描述性文本，不是 `canonicalTopicIds`。EC-1A 不创建 Topic taxonomy。
- Current Need、Current Interest、recent search 和 temporary intent 属于 EC-3 Dynamic Person，
  不进入 durable Experience storage。

## 二、Storage

Migration：`20260902145009_canonical_experience_v1.sql`。

Production 已记录该 migration。隔离 smoke 随后确认 `SECURITY INVOKER` soft-delete
会因新 tombstone row 不再满足 owner SELECT policy 而被 RLS 拒绝。已新增、尚未部署的
corrective migration：
`20260903125354_ec1a_experience_soft_delete_rls_fix.sql`。不得改写已应用的原 migration。

### `public.person_experiences`

| 字段 | 语义 |
| --- | --- |
| `id` | 稳定 `PersonExperienceId` |
| `person_id` | Canonical `PublicPersonId`，FK 到 `auth.users(id) ON DELETE CASCADE` |
| `title` / `description` | 用户确认的完整经历文本 |
| `experience_kind` | `education/work/project/life/skill/journey/other`，只做粗分类 |
| `start_year/start_month/end_year/end_month/is_current` | 保留用户真实精度，不伪造日期 |
| `location_label/city/city_code` | 可选安全位置文本；不要求 GPS，不是 Topic |
| `can_share` | 用户确认的可分享内容文本数组 |
| `visibility` | V1 仅 `public/private` |
| `sort_order` | Owner 排序 |
| `deleted_at` | soft delete；非空后从正常 owner/public projection 立即消失 |

### `public.experience_transitions`

Transition 属于一条 Experience，同时冗余保存同一个 `person_id` 并通过组合 FK 保证 owner
一致。`from_label -> to_label` 保留方向，可选记录年月。它不要求连接两条 Experience，也不是
普通 Topic/string tag。EC-3 可 additive 增加 canonical semantic mapping，本轮不实现。

### `public.experience_claims`

Claim 为未来 EC-5 Verification 提供稳定 `claimId`，V1 只允许有限类型：教育机构、学位、
专业、雇主、职位、职业资格。Claim 是 owner-only reference，不包含 `verified`、evidence blob
或通用认证状态，也不默认进入 Public projection。普通生活 Experience 可以没有 Claim。

## 三、Projection 与 API

### Public projection

`get_public_person_experiences_v1(p_person_id, p_limit, p_offset)`：

- `SECURITY INVOKER`、`STABLE`、`search_path = ''`；
- anon/authenticated 可执行，读取由 RLS 限制为 `public + deleted_at IS NULL`；
- 只返回安全 Experience 字段与公开 Transition；
- 不返回 Claim、evidence、phone、private metadata、legacy Expert JSON；
- 空列表不自行制造 fallback。Person 是否存在由已部署的
  `get_public_person_profile_v1` canonical base read 判断。

### Owner projection

`get_my_person_experiences_v1` 返回当前 `auth.uid()` 的 public/private 未删除 Experience，
并包含 owner-only Claim reference。Owner 与 Public DTO 在 shared contract 中分离。

### Owner mutations

Experience：create、update、visibility、reorder、soft delete。

`reorder_person_experiences_v1` 必须收到 Owner 全部 active/non-deleted Experience ID，且每个
ID 恰好出现一次；Owner 没有 active Experience 时，空数组是合法 no-op。该约束避免对子集从
`0` 重排后产生重复 `sort_order`。

Transition：create、update、delete。

Claim：create、update、soft delete。

所有 owner mutation 从 `auth.uid()` 推导 `person_id`；请求参数不接受代填 owner，不能替其他
Person 创建、修改、排序或删除。RPC 全部使用 `SECURITY INVOKER`，不通过 service role 绕过
普通客户端权限。

## 四、RLS 与 Grants

- 三张新表从第一天启用并强制 RLS。
- Experience public policy 只允许 `public + non-deleted`；authenticated owner 可在 Direct
  Data API 下读取自己的 tombstone row，以满足 `SECURITY INVOKER` soft-delete 的 PostgreSQL
  RLS SELECT 可见性要求。正常 Owner RPC 仍显式过滤 deleted row，其他用户与 anon 不可见。
- Transition public policy 必须同时确认父 Experience 为 public/non-deleted；owner 写 policy
  必须确认父 Experience 属于当前用户且未删除。
- Claim 没有 public/anon SELECT policy；owner 只能读写自己的 Claim 与 active parent。为支持
  owner soft-delete，owner 可读取自己已删除 Claim 的 tombstone；正常 Owner RPC 仍以
  `deleted_at IS NULL` 过滤，且父 Experience 删除后所有子 Claim 均不可见。
- 上述 owner-only tombstone 可见性属于 Storage retention，不是 Product visibility。产品/API
  删除语义仍是立即从正常 Owner/Public projection 消失；anon 和其他 authenticated Person
  不能读取 owner tombstone。
- 默认 `PUBLIC` table/function 权限被显式撤销。
- Experience v1 从第一天使用 least-privilege column grants，不授予 anon/authenticated
  table-level `SELECT`；未来新增内部字段不会自动扩大 Direct Data API 可读范围。
- Public read RPC 目标 EXECUTE：`anon + authenticated + service_role`。
- Owner read/write RPC 目标 EXECUTE：`authenticated + service_role`；函数内部仍要求有效
  `auth.uid()`，service role grant 不是普通客户端路径，也不构成 owner impersonation API。
- 不使用 `SELECT *` public projection，不使用动态 SQL。

## 五、Lifecycle 与 AI 边界

- Delete 对用户立即生效，底层 soft delete 保留未来 audit/verification reference 完整性。
- Transition 当前物理删除；Claim soft delete以保留稳定 claim identity。
- 修改已核验 Claim 后的 verification invalidation 由 EC-5 决定，本轮不实现。
- AI 未来可建议 title、description、kind、canShare、Transition 或 Claim extraction；AI 输出
  只能是 draft/suggestion，必须由用户确认后才可通过 owner RPC persist。

## 六、Current Runtime Truth

- `20260902145009` 已部署，但完整 remote smoke 因 owner soft-delete RLS 阻塞未通过；因此
  `productionGrantReview = pending-deployment` 继续保持，不能进入 deployed client whitelist。
- Corrective migration `20260903125354` 仅存在于当前修复 branch，尚未部署。
- 基础 migration 部署后的 Performance Advisor 新增 2 条 composite FK finding：
  `experience_transitions(experience_id, person_id)` 与
  `experience_claims(experience_id, person_id)`。Corrective migration 增加对应 covering index，
  不删除已有 order/active lookup index，也不扩展到既有全库 performance debt。
- `PRODUCT_BLUEPRINT_V1_DOMAIN_MAP.experience.runtimeStatus = not-deployed`。
- Production-generated `src/integrations/supabase/types.ts` 不提前加入未部署 relation；部署后再从
  remote schema 重新生成，避免 generated types 冒充 Current Runtime Truth。
- `get_public_person_profile_v1` 的既有 safe projection不改写、不扩字段。
- `/person/:userId` Shared Core consumer 与 Experience UI 不在 EC-1A 范围。
- `profiles.phone` direct Data API privacy exposure = **REMAINS**。新 Experience safe projection
  不等于旧 `profiles` Data API 已完成 Privacy Cutover。

## 七、Deployment Gate

Architecture Review 与 merge 后，必须通过受控 Production gate：

1. review corrective migration，并 dry-run 确认其为唯一待部署 migration；
2. apply `20260903125354`；
3. 验证 anon/authenticated/service_role grants 与 RLS；
4. 使用隔离测试用户验证 public/private、owner、soft delete、Transition/Claim 边界；
5. 确认 public payload 不含 Claim/phone/private/deleted 字段；
6. 运行 Security Advisor 并区分新增问题与既有 debt；
7. 完成 remote smoke 后才能把 catalog/domain truth 改为 deployed/aligned。

在上述 gate 完成前，EC-1B Shared Core Public Person + Experience UI 状态为 **BLOCKED**。

## 八、Rollback 原则

Migration 为 additive，不改变旧 consumer。若部署后、consumer cutover 前出现安全或正确性问题，
优先撤销新 RPC 的 anon/authenticated EXECUTE 并停止新写入；在确认没有业务数据后才可通过新的
reviewed migration 删除对象。若已产生用户 Experience，不得直接 drop table，应保留数据并以
后续 migration 修复。任何 rollback 都不得改写既有 migration history。
