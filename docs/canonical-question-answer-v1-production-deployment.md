# EC-2C2 Question / Answer Production 部署记录

状态：**PRODUCTION MIGRATION APPLIED / BACKEND DEPLOYED / CLIENT NOT CONSUMABLE**。

本记录只确认 Canonical Question / Answer / Reply v1 的 Production storage、RLS、RPC 与安全投影
已经部署和验证。它不解锁 `CLIENT_RPC_WHITELIST`，不把 RPC catalog 标记为普通客户端可消费，
不包含 UI cutover。正式 machine-readable runtime truth 与 consumer gate 对齐由 EC-2C3 处理。

## 一、部署身份与完整性

- Repository baseline：`a9836213f2d483ed6fdf2a46e7b055abacaacba6`。
- Production project：`fslpvtlavhrnxsygkpvi`，apply 前后均为 `ACTIVE_HEALTHY`。
- Production DB build：`17.6.1.063`，PostgreSQL 17.6，默认事务隔离为 `read committed`。
- Migration：`20260904174215_canonical_question_answer_v1.sql`。
- SHA-256：`46bdfa8ca8daea8950f98271013da782bc3fe9b9c75612919c8a92f1857557f7`。
- Linked dry-run 仅列出上述一个 pending migration；没有 history repair 或第二个 migration。
- Apply mechanism：Supabase CLI 标准 `db push --linked --yes`，没有 SQL Editor 手工执行、拆分 SQL
  或 migration history repair。
- Apply 后 remote history 包含且仅包含一次 `20260904174215 canonical_question_answer_v1`；目标之前
  的 repository/remote history 保持对齐。

## 二、Production 对象与安全边界

Production 已确认存在：

- private schema：`ec2_private`；
- relations：`questions_v1`、`answers_v1`、`answer_replies_v1`、
  `answer_helpful_marks_v1`、`answer_helpful_public_facts_v1`；
- 12 个已批准 RPC：Question 5 个、Answer 3 个、Helpful 1 个、Reply 3 个；
- 13 个 private helper/trigger function，EC-2 function 总数 25。

五张 relation 均启用并强制 RLS。远端 catalog 对 PK、FK、CHECK、UNIQUE、index、trigger 和
15 个 policy 的检查与 reviewed migration 一致；Helpful mark/fact 两个方向的 FK 均为
`DEFERRABLE INITIALLY DEFERRED`。

全部 25 个 EC-2 function 均为 `SECURITY INVOKER` 且 `search_path = ''`，没有
`SECURITY DEFINER`。`PUBLIC EXECUTE` 已撤销。四个 public read RPC 对 anon/authenticated
可执行；八个 write RPC 仅 authenticated 可执行。anon denial 只通过 `pg_proc`、ACL 与
`has_function_privilege` metadata 验证，没有主动调用无 EXECUTE 权限的函数。

新 relation 没有 anon/authenticated table-wide SELECT 或 `GRANT ALL`，仅使用 reviewed
column-level privileges。公开 Helpful fact 不公开 `mark_id`，Helpful owner relation不向 anon
公开 `person_id`。本 migration 没有新增或扩大 `profiles.phone` 权限；该 Direct Data API
Privacy Cutover 仍为 **REMAINS**。

## 三、真实 HTTP 与 rollback-contained SQL smoke

### Anon HTTP read

通过 Production PostgREST 真实调用并使用 approved runtime parser 验证：

- `get_question_detail_v1`；
- `list_questions_v1`；
- `list_question_answers_v1`；
- `list_answer_replies_v1`。

当前无业务 fixture，结果为 canonical null/empty payload；HTTP、JSON shape 与 parser 均通过。
公开 payload 不含 phone、email、raw profile、raw expert、Helpful owner/mark、payment 或内部
moderation/deletion metadata；anon `viewerHasMarkedHelpful` 保持 false。

没有可安全使用的隔离 Production Auth identity，因此 authenticated HTTP read/write smoke 均保持
**BLOCKED**。没有使用真实用户，也没有通过 Auth Admin 创建永久测试账号。该限制不阻塞 backend
部署，但继续阻塞 client consumable、write RPC whitelist 与 B 的 write consumer。

### Synthetic SQL smoke

在重新确认 `auth.users` 仅有事务内的 `on_auth_user_created_pack01` 业务 trigger，且其函数只写
`profiles`、`user_settings`、`point_accounts`、没有 HTTP/Edge/payment side effect 后，使用三个
固定 smoke UUID 与 `@example.invalid` 邮箱执行单一顶层 `BEGIN ... ROLLBACK`。

同一事务内验证通过：

- ordinary Person 没有 experts row 仍可创建 Question/Answer/Reply；
- Question create/update/detail/list/close/repeated close；closed 后 update、新 Answer、新 Reply
  返回已批准的稳定业务错误；
- Answer owner soft-delete、cross-user delete denial、closed Question 下已有 Answer 仍可由作者删除；
- Reply create/delete 与 Answer 删除后整支隐藏，同时底层 Answer/Reply 保留；
- Helpful add/remove 与重复调用幂等、self-helpful true 拒绝、self false no-op；
- Helpful mark/fact 一一对应、无 orphan、无同一 Person/Answer duplicate；
- viewer relationship 只反映 caller，其他 Person 和 anon 不继承状态；
- Question、综合/最新 Answer、Reply 的 deterministic ordering；
- Question/Answer/Reply moderation hidden projection；
- requester/author spoof、immutable parent、reopen、moderation write、cross-user soft-delete 和伪造
  Helpful fact 均被 RLS/constraint 拒绝；
- missing Public Person summary 返回 null，不制造 fallback；
- 公开 projection 不含 phone、email、profile row id、raw expert、payment、deletedAt、
  moderationVisibility、markId 或 Helpful voter identity。

没有在 Production 重跑 two-session committed concurrency suite；EC-2B 已对同一 migration checksum
完成真实双 session concurrency 验证，本次只验证实际部署的 lock function 与 sequential close
rejection。

事务 rollback 后再次独立按固定 UUID/fixture id 检查：`auth.users`、`profiles`、
`user_settings`、`point_accounts` 和五张 EC-2 relation 的 persistent synthetic rows 全部为 0。

## 四、Advisor 与运行健康

| Advisor | Pre | Post | EC-2 finding |
| --- | ---: | ---: | ---: |
| Security | 102 | 102 | 0 |
| Performance | 323 | 323 | 0 |

Existing Advisor debt 未在本阶段扩 scope 修复。部署后没有 EC-2 RLS、policy、function security、
search path、grant、unindexed FK、auth initplan 或 duplicate-index finding。

Postgres Logs Explorer 在部署时间窗口分别检索 `SIGSEGV`、`signal 11`、
`unexpected backend termination`、`database system recovery`，均无记录；没有执行 intentional
denied-EXECUTE crash probe。最终项目状态仍为 `ACTIVE_HEALTHY`，没有观察到 recovery cycle。

## 五、Production generated types

`src/integrations/supabase/types.ts` 已从真实 Production schema 重新生成。Production generator 的
默认输出只包含 `public` schema，而仓库既有文件还包含未变化的 `graphql_public` namespace；为避免
把 generator scope 差异误报成远端 schema 删除，保留既有 `graphql_public` generated block，只将
本次真实 Production `public` schema 输出对齐到仓库。最终 diff 仅新增五张 EC-2 relation 与 12 个
RPC 的 249 行 generated definitions，没有 unrelated schema deletion。

## 六、Consumer gate

- Contract：`contract-approved`。
- Production backend：deployed。
- Client consumable：false。
- `RPC_CATALOG` fully consumer-aligned：false。
- `CLIENT_RPC_WHITELIST` unlocked：false。
- Shared Core Question/Answer/Reply UI：未开始。

下一步必须是独立 EC-2C3 Runtime Truth + Consumer Gate；本阶段不得直接开始 UI。
