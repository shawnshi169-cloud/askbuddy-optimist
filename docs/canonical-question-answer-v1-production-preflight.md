# EC-2C1 Question / Answer Production 只读预检

基线：`0a879d61bb63f61ba9349b84f9ae92399fbfc8a0`。

状态：**READ-ONLY PREFLIGHT COMPLETE / DO NOT APPLY / NOT CLIENT CONSUMABLE**。

本记录只包含 Production catalog、migration history、Advisor 与项目管理元数据的只读证据，以及
EC-2C2 的部署计划。EC-2C1 没有执行 DDL、DML、RPC mutation、Auth mutation、migration apply、
Edge deploy 或 generated types 更新。

## 一、Production 身份与运行时

- Project ref：`fslpvtlavhrnxsygkpvi`。
- Project status：`ACTIVE_HEALTHY`。
- 管理面 DB build metadata：`17.6.1.063`；Postgres engine：`17`；release channel：`ga`。
- SQL runtime：`PostgreSQL 17.6`，`aarch64-unknown-linux-gnu`，GCC `13.2.0`。
- `default_transaction_isolation` 与当前 `transaction_isolation` 均为 `read committed`。
- `session_preload_libraries = supautils`。
- `supautils.hint_roles = anon, authenticated, service_role`。

`supautils` 作为 preload library 使用，但不以可查询的 `pg_extension` entry 暴露版本。因此不能把
管理面 `.063` build metadata 直接解释为当前项目实际加载的 `supautils` package version。

## 二、Migration history 与 collision

Repository 有 55 个 migration，Production 有 54 个。双方在目标 migration 之前逐项同名对齐：

- 最新 remote migration：`20260903125354_ec1a_experience_soft_delete_rls_fix`。
- 唯一 local-only migration：`20260904174215_canonical_question_answer_v1.sql`。
- target 已应用：**NO**。
- remote-only migration：**0**。
- name mismatch：**0**。
- target checksum：`46bdfa8ca8daea8950f98271013da782bc3fe9b9c75612919c8a92f1857557f7`。

Production 当前不存在 `ec2_private`、`questions_v1`、`answers_v1`、`answer_replies_v1`、
`answer_helpful_marks_v1`、`answer_helpful_public_facts_v1`，12 个目标 RPC 命中数为 0。
因此没有 target object collision 或 partial deployment 证据。

Supabase CLI `2.91.3` 的 `db push --help` 明确说明 `--dry-run` 只打印待应用 migration、不执行。
linked dry-run 成功，唯一计划项为 `20260904174215_canonical_question_answer_v1.sql`；dry-run 没有
修改 remote migration history 或 schema。

## 三、依赖与兼容性审计

Production 已只读确认以下依赖存在：

- `auth.users`。
- roles `anon`、`authenticated`、`service_role`。
- `auth.uid()`。
- `gen_random_uuid()`。
- `pg_advisory_xact_lock(bigint)`。
- `hashtextextended(text,bigint)`。
- migration role 的 schema/public create capability。
- `public.get_public_person_profile_v1(p_user_id uuid)`。

`get_public_person_profile_v1(uuid)` 当前为 `SECURITY INVOKER`、`search_path = ''`；PUBLIC 无
EXECUTE，`anon`、`authenticated`、`service_role` 有 EXECUTE。EC-2 migration 不修改该函数，只从
其 safe result 投影 `userId`、`displayName`、`avatarUrl`。

目标 migration 的静态与 Production metadata 兼容性检查结果为 PASS：

- 单 transaction additive migration，只有目标 schema、五表、RLS、trigger/helper、12 RPC、index、grant。
- 五表全部 `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`。
- 函数全部 `SECURITY INVOKER SET search_path = ''`。
- 采用 explicit column grants，没有 `GRANT ALL` 或 table-wide public SELECT。
- Person FK 指向 `auth.users(id)` 并使用 `ON DELETE RESTRICT`。
- Helpful 的 deferred circular FK、唯一关系与 mark/fact commit integrity 已通过 EC-2B local PostgreSQL gate。
- Question close/create serialization 使用 transaction advisory lock；Production isolation 满足批准的
  `READ COMMITTED` 前提。
- stable `PTxxx` SQLSTATE 与 message key 保持 EC-2B 已批准错误协议。
- 不读取、更新或迁移 legacy Question、Answer、accepted、bounty、points、Expert 数据。
- 不包含 `public.profiles` grant/policy/DDL，未扩大 `profiles.phone` exposure。

## 四、permission-denial SIGSEGV 风险

公开 upstream 证据：

- [supabase/postgres #2112](https://github.com/supabase/postgres/issues/2112) 已于 2026-08-03 以
  `completed` 关闭。维护者确认根因是 `supautils 3.2.0/3.2.1`，`3.2.2+` 已修复；并明确说明
  hosted fleet 已独立升级到 patched version。
- [supabase/supautils #214](https://github.com/supabase/supautils/issues/214) 已于 2026-08-14 以
  `completed` 关闭；后续说明 `v3.2.3`/Postgres image `.155+` 包含修复。

已知 affected local image 证据跨架构/构建并不完全一致，说明 image tag 不能可靠替代实际 bundled
`supautils` version。EC-2B 在本机 `.105/.106` 复现，`.095` 完整 suite PASS；upstream 另记录
`.099-.112` 与部分架构更早 tag 的 affected 情况。

风险分类：

- KNOWN：当前 hosted 项目启用 `supautils` 和三类 hint roles；upstream issue 已关闭并声明 hosted fleet patched。
- KNOWN：Production hosted runtime 与 CLI local Docker image 不是已证明相同的部署 artifact。
- UNKNOWN：当前项目加载的精确 `supautils` version 无法从 `pg_extension` metadata 读取。
- UNKNOWN：在不主动触发危险 error path 的前提下，无法对该项目给出 100% 排除证明。
- INFERENCE：没有证据表明 hosted `.063` 必须阻塞 additive migration；migration apply 本身也不调用
  denied-EXECUTE RPC。

综合风险：**MEDIUM（可进入受控 EC-2C2，不以 crash probe 验证）**。EC-2C2 禁止让 `anon` 或
`authenticated` 主动调用无 EXECUTE 的 write RPC；ACL denial 仅使用 `pg_proc`、`proacl`、
`aclexplode`、`has_function_privilege` 做 metadata assertion。

## 五、Advisor 与 Privacy baseline

Pre-EC-2 Security Advisor：102 条，其中 INFO 1、WARN 101：

- `rls_enabled_no_policy`：1。
- `function_search_path_mutable`：14。
- `extension_in_public`：1。
- `anon_security_definer_function_executable`：35。
- `authenticated_security_definer_function_executable`：50。
- `auth_leaked_password_protection`：1。

Pre-EC-2 Performance Advisor：323 条，其中 INFO 127、WARN 196：

- `unindexed_foreign_keys`：17。
- `auth_rls_initplan`：120。
- `unused_index`：110。
- `multiple_permissive_policies`：74。
- `duplicate_index`：2。

目标 EC-2 schema/table/RPC 名称在两类 Advisor 中命中均为 0。以上是 existing debt，不是尚未部署的
EC-2 finding。参考修复说明见 Supabase Database Linter：
[security lints](https://supabase.com/docs/guides/database/database-linter) 与
[performance lints](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)。

`profiles.phone direct Data API Privacy Cutover = REMAINS`。只读 metadata 仍显示 `anon` 与
`authenticated` 具有 `profiles.phone` SELECT capability。EC-2 safe projection 不解决该债务，
EC-2 migration 也不得修改 `profiles` grants/RLS。

## 六、EC-2C2 Apply Gate

以下步骤必须按顺序执行；任一前置条件变化即停止，EC-2C1 不执行其中任何写步骤：

1. 重新 fetch main，确认批准的 main SHA、migration path 与上述 SHA-256 checksum。
2. 重新确认 project ref、ACTIVE_HEALTHY、`read committed`、remote migration head 和 sole pending target。
3. 再次 linked dry-run，确认只应用 `20260904174215_canonical_question_answer_v1.sql`。
4. 记录 apply 前 Security/Performance Advisor baseline。
5. 使用标准 migration mechanism 一次性 apply exact target；禁止 SQL Editor、拆分 SQL、history repair。
6. 立即验证 history、`ec2_private`、五表、12 exact signatures、trigger/index/FK。
7. 验证 ENABLE/FORCE RLS、column grants、PUBLIC revoke、25 functions INVOKER/empty search path。
8. 执行只读 public RPC smoke，再执行 rollback-contained authenticated SQL/RLS smoke。
9. 执行 Helpful privacy/integrity、viewer scope、ordering、close/create、soft-delete branch smoke。
10. 运行 post-deploy Advisor delta，并确认 EC-2 security finding 为 0。
11. 确认所有 synthetic rows 为 0，再从真实 remote schema regenerate Supabase types。
12. 单独 Runtime Truth closeout；部署成功不自动解锁 ordinary client consumer。

## 七、EC-2C2 Smoke 设计

### Database transaction smoke

使用预先批准的隔离 identity，在一个明确 `BEGIN`/`ROLLBACK` session 中设置真实等价的 authenticated
role/JWT claim；不得复用普通真实用户。覆盖：

- Person A create/update/list/close Question；close 重复调用幂等。
- Person B create/list/delete Answer；Person C create/list/delete Reply。
- Helpful add/remove/idempotency、self-helpful rejection、不同 viewer state 隔离。
- close 与 create Answer/Reply 的串行化结果；closed 后 create 必须 `QUESTION_CLOSED`。
- `comprehensive`、`latest`、Question list、Reply 的确定排序。
- Answer delete/moderation 后整个 Reply branch 从正常 projection 隐藏。
- cross-user update/delete 拒绝；Direct DML/RLS 边界保持。
- safe Person summary 与所有 read payload allowlist。
- rollback 后五表 persistent smoke rows delta = 0。

`anon`/`authenticated` 无 write EXECUTE 的事实通过 ACL metadata 验证，不调用被拒绝函数。

### PostgREST smoke

四个 public read RPC 必须分别使用 anon 与 authenticated HTTP caller 验证：

- `get_question_detail_v1`
- `list_questions_v1`
- `list_question_answers_v1`
- `list_answer_replies_v1`

验证 authenticated answer list 的 `viewerHasMarkedHelpful` 只反映 caller relation；anon 固定 false。
HTTP cache key 必须区分 `questionId`、order、`viewerPersonId | anon`。

当前仓库和已授权环境没有可确认的 Production isolated authenticated HTTP write identity，因此：
**AUTHENTICATED HTTP WRITE SMOKE IDENTITY REQUIRED**。EC-2C2 不得自行创建 Auth user，也不得使用真实
普通用户。若 Product Owner 未提供既有隔离 identity，则数据库 rollback smoke可以完成写路径验证，
但 authenticated HTTP write smoke必须诚实标记 BLOCKED，client gate继续关闭。

## 八、Failure containment

- apply 前任何 history drift、collision、checksum变化、额外 pending migration或 Advisor异常：停止，不 apply。
- apply 失败：先只读确认 remote history/object state；不重复盲目执行，不 repair history。
- apply 后发现问题：保持 `clientConsumable=false`、不更新 whitelist、不启动 Shared Core UI。
- 已记录 migration 不改写；修复必须新增 reviewed corrective migration。
- 不通过 DROP canonical tables、删除 migration history或清理真实用户内容回滚。
- 只有 schema/ACL/RLS/smoke/Advisor/types 全部对齐后，才能创建独立 Runtime Truth closeout PR。

Production deploy 与 client consumer authorization 是两个独立 gate。即使 EC-2C2 部署成功，仍需完成
Production-generated types、RPC_CATALOG review、CLIENT_RPC_WHITELIST review 和 runtime truth closeout，
之后才能请求 B 开始 EC-2 UI。
