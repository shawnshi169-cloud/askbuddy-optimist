# Canonical Experience v1 Contract Decision

状态：EC-1A 基础 migration 与 corrective migration 均已部署并完成 Production 验证。
Experience backend storage/API contract 已解除 consumer dependency 阻塞；`/person/:userId`
Shared Core UI 仍未实现。

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

Production migrations：

- Base：`20260902145009_canonical_experience_v1.sql`；
- Corrective：`20260903125354_ec1a_experience_soft_delete_rls_fix.sql`。

Base migration 部署后的隔离 smoke 发现，`SECURITY INVOKER` soft-delete 会因 tombstone row
不再满足原 owner SELECT policy 而被 RLS 拒绝。Corrective migration 以 additive policy
修复 owner-only tombstone 可见性，并保留原 migration history；不得改写已应用的 base migration。

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

### Claim consumer gate

Claim storage 与 create/update/delete RPC 是已部署、已验证的 Canonical backend infrastructure，
但不是 EC-1B 普通 Experience 编辑能力。三个 Claim mutation RPC 不进入
`CLIENT_RPC_WHITELIST`，且 `newBlueprintCodeMayDepend = false`；只有后续 Verification/Claim
workflow 明确授权后，普通 Blueprint feature consumer 才能依赖。Backend deployed/aligned
不等于当前 client-consumable。

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

- `20260902145009` 与 `20260903125354` 均已进入 Production migration history。
- 13 个 Experience RPC 已验证为 `SECURITY INVOKER` 且 `search_path = ''`；catalog grant review
  为 `aligned`，允许 Blueprint consumer 使用已部署 contract。
- 完整 rollback smoke 已通过：普通 non-expert Person owner CRUD、public/private isolation、
  cross-user denial、Transition create/update/delete、Claim create/update/soft-delete、full-set
  reorder、Experience soft-delete、parent-delete child hiding 与 public projection privacy。
- Owner 可在底层 RLS 范围读取自己的 Experience/Claim tombstone，但 normal Owner/Public RPC
  均隐藏 deleted data。Production persistent smoke data = `0`。
- Base migration 部署后新增的 2 条 composite FK Performance Advisor finding 已由 corrective
  migration 的 covering indexes 修复：`experience_transitions(experience_id, person_id)` 与
  `experience_claims(experience_id, person_id)`；原 order/active lookup indexes 保留。
- Advisor：Security `102 -> 102`，Performance `325 -> 323`；新增 Experience Security finding =
  `NO`，两条目标 `unindexed_foreign_keys` finding 均已消失。
- `PRODUCT_BLUEPRINT_V1_DOMAIN_MAP.experience.runtimeStatus = production-ready`，仅表示
  Experience backend storage/API ready，不表示 Shared Core UI 已实现。
- `src/integrations/supabase/types.ts` 已从真实 Production remote schema 重新生成。该生成同时
  reconciled 了此前已存在于 remote、但本地 generated types 尚未同步的 `wechat_identities`、
  `claim_wechat_identity_v1` 及 generator/PostgREST `14.1 -> 14.5` 差异；这些对象不是本
  closeout PR 新增的 Production schema，本 PR 没有 migration、DDL 或微信登录 schema mutation。
- `get_public_person_profile_v1` 的既有 safe projection不改写、不扩字段。
- `/person/:userId` Shared Core consumer 与 Experience UI 仍为 **NOT IMPLEMENTED**。
- `profiles.phone` direct Data API privacy exposure = **REMAINS**。新 Experience safe projection
  不等于旧 `profiles` Data API 已完成 Privacy Cutover。

## 七、Deployment Closeout

Production gate 已按以下顺序完成：

1. linked dry-run 确认 `20260903125354` 为唯一 pending migration；
2. 通过标准 migration mechanism apply corrective migration；
3. 验证 migration history、RLS、column grants、RPC grants、`SECURITY INVOKER` 与空
   `search_path`；
4. 使用 rollback 隔离测试 identity 完成 owner/public/cross-user/reorder/soft-delete smoke；
5. 确认 public payload 不含 Claim、phone、private/deleted metadata 或 legacy Expert JSON；
6. 确认 rollback 后 persistent smoke rows 为 `0`；
7. 对比 Security/Performance Advisor 并确认无新增 Experience Security finding。

Experience backend contract 现已 production-ready；Shared Core 可以在 closeout review 后消费
该 contract，但 UI 自身仍是单独的未实现工作，不得由 backend readiness 冒充完成。

## 八、Rollback 原则

Migration 为 additive，不改变旧 consumer。若部署后、consumer cutover 前出现安全或正确性问题，
优先撤销新 RPC 的 anon/authenticated EXECUTE 并停止新写入；在确认没有业务数据后才可通过新的
reviewed migration 删除对象。若已产生用户 Experience，不得直接 drop table，应保留数据并以
后续 migration 修复。任何 rollback 都不得改写既有 migration history。
