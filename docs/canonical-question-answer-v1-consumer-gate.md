# EC-2C3 Question / Answer Consumer Gate 记录

状态：**AUTHENTICATED HTTP CONSUMER GATE PASSED / CLIENT CONTRACT ALIGNED / UI NOT IMPLEMENTED**。

本阶段基于 PR #41 merge commit
`469120e27d9dd3d39cc3e619b36abb37a6667cd8`，只对齐已部署 backend 的应用层消费真值。
没有新增或重跑 migration，没有 DDL、RLS/grant、function、Edge 或 generated types 变更。

## 一、Production backend 复核

- Project：`fslpvtlavhrnxsygkpvi`，最终状态 `ACTIVE_HEALTHY`。
- Latest migration：`20260904174215 canonical_question_answer_v1`。
- `ec2_private` 与五张 canonical relation 存在。
- 12 个 public RPC 与 13 个 private helper/trigger function 存在；25 个 EC-2 function 全部
  `SECURITY INVOKER` 且 `search_path = ''`。
- 五表均启用并强制 RLS；`PUBLIC EXECUTE` 为 0。
- 四个 read RPC 对 anon/authenticated 可执行；八个 write RPC 仅 authenticated 可执行。
- Production generated types 与 remote 12 RPC signature 对齐，本阶段未重新生成或手改。
- Security Advisor 102、Performance Advisor 323；EC-2 新 finding 均为 0。

## 二、真实 authenticated HTTP smoke

在创建用户前重新确认 `auth.users` 只有 `on_auth_user_created_pack01` trigger，其函数只在数据库内
写 `profiles`、`user_settings`、`point_accounts`，没有 HTTP、pg_net、Edge、payment、notification
或 webhook side effect。

通过 Supabase Auth Admin API 创建两个唯一 `@example.invalid` 临时用户，`email_confirm=true`，
metadata 仅包含 `purpose=ec2c3-consumer-gate-smoke`。随机密码、service credential 与真实 JWT
只存在单进程内存，没有打印、写文件或提交；没有发送 email/OTP，也没有使用真实用户。

两个用户均通过 publishable key + `signInWithPassword` 获得真实 authenticated JWT，并通过 Production
PostgREST 调用 exact 12 RPC。所有 request/response 均通过 `QUESTION_ANSWER_V1_RPCS` approved runtime
parser，而不是只检查 HTTP success。

验证结果：

- Question create/update/detail/list/close/repeated close 通过；requester 来自真实 caller。
- Person B 创建、列出并删除免费 Answer 通过；无需 Expert/Service/Verification。
- Person A 创建、列出并删除一级 Reply 通过。
- Helpful true/false 重复调用均幂等；A 看到自己的 viewer state，B 不继承 A 的关系。
- Answer 作者 self-helpful true 返回 `PT403 / SELF_HELPFUL_FORBIDDEN`。
- closed 后 update Question、create Answer、create Reply 均返回 `PT409 / QUESTION_CLOSED`。
- closed 后已有 Reply/Answer 仍可由作者删除，public projection 隐藏整个 Answer/Reply branch。
- DTO parser 与 public/authenticated projection 均未出现 phone、email、raw profile/expert、payment、
  markId/voter identity、deletedAt、moderationVisibility 或内部审计字段。

稳定业务错误只按 SQLSTATE + exact message key 映射：

| SQLSTATE | message key |
| --- | --- |
| PT404 | TARGET_NOT_FOUND_OR_INACCESSIBLE |
| PT409 | QUESTION_CLOSED |
| PT403 | SELF_HELPFUL_FORBIDDEN |
| PT422 | CANONICAL_TOPIC_NOT_READY |
| PT400 | INVALID_INPUT |
| PT401 | AUTHENTICATION_REQUIRED |
| PT403 | IMMUTABLE_FIELD |
| PT409 | UNSUPPORTED_TRANSACTION_ISOLATION |

Consumer 不得依赖 `detail`、`context` 或 raw backend text。

## 三、定向清理与残留核验

HTTP smoke 后按内存中记录的 exact Question/Answer/Reply/user ID，依 FK 顺序清理 Helpful facts/marks、
Replies、Answers、Questions 和 `user_settings`，再通过 Auth Admin `deleteUser` 删除两个用户。
没有范围删除或模糊 email 删除。

脚本内检查与独立 read-only SQL 复核均确认：

`Persistent synthetic rows = 0`。

| 对象 | 残留 |
| --- | ---: |
| auth.users / synthetic emails | 0 |
| profiles | 0 |
| user_settings | 0 |
| point_accounts | 0 |
| questions_v1 | 0 |
| answers_v1 | 0 |
| answer_replies_v1 | 0 |
| answer_helpful_marks_v1 | 0 |
| answer_helpful_public_facts_v1 | 0 |

另外按两个 temporary Person ID 检查所有带用户 identity 列的现有 public relation，合计残留 0；
未观察到 Conversation、Order、Payment、Point transaction、Notification、Rating、Experience、
Expert、Post 或其它业务 side effect。

## 四、Consumer 与 UI 边界

Exact 12 canonical RPC 已满足：Production deployed、grant review aligned、approved parser、authenticated
HTTP read/write、viewer isolation、stable errors、隐私、清理与 Advisor gate。因此：

- `RPC_CATALOG`：12 RPC 为 canonical/aligned；
- `CLIENT_RPC_WHITELIST`：只解锁上述 12 RPC，不包含 private helper 或 legacy fallback；
- `productionDeployed=true`；
- `productionGrantReview=aligned`；
- `clientConsumable=true`；
- Product contract 仍为 `contract-approved`。

这只表示 Shared Core 可以在本 PR merge 后消费 canonical backend contract。Ask、Question Detail、
Question Card 当前实现仍是 legacy；本阶段没有 React hook、页面、导航或 cache 实现。后续 B 必须按
`questionId + order + viewerPersonId|anon + pagination` 隔离 Answer list cache，禁止 canonical RPC
失败后 fallback 到 legacy Question/Answer/accepted/bounty/like 路径。

`profiles.phone` Direct Data API Privacy Cutover 继续为 **REMAINS**。
