# EC-2B Question / Answer 本地实现记录

基线：`6ec838e4893685375c06c7dcedba257fb3b12d22`。
分支：`codex-a/ec2b-question-answer-storage`。

状态：**LOCAL VALIDATED ONLY / NOT DEPLOYED / NOT CLIENT CONSUMABLE**。
EC-2A 产品合同仍为 `contract-approved`；Production deployed=false；client consumable=false。
本记录不替代[已批准的合同](./canonical-question-answer-v1-contract-decision.md)。

## 实现范围

Migration：`20260904174215_canonical_question_answer_v1.sql`，时间戳由本地 Supabase CLI 生成。
新增五张 canonical 表，所有 Person FK 指向 `auth.users.id`，所有历史内容 FK 使用 RESTRICT /
NO ACTION。不读取、修改或回填 legacy Question/Answer/Like 数据，不继承旧积分、采纳 trigger。
未修改既有 `get_public_person_profile_v1`；仅通过其安全结果投影
`userId/displayName/avatarUrl`，没有公开 profile 时 summary=null。

| 表 | 用途 |
| --- | --- |
| questions_v1 | Question + 必填 Context；一个既有 Primary Channel；CNY 分预算；open/closed 与 moderation 分离 |
| answers_v1 | Person 免费回答；作者 soft-delete；不含 accepted/price/Expert/service 依赖 |
| answer_replies_v1 | 直接属于 Answer 的单层 Reply；无递归、Helpful 或会话副作用 |
| answer_helpful_marks_v1 | owner-only Person/Answer Helpful 事实，唯一关系 |
| answer_helpful_public_facts_v1 | 不含 Person identity 的计数事实；公开 SELECT 仅 answer_id |

实现 EC-2A registry 中的 exact 12 RPC，不新增 reopen、Question delete、moderation capability。
完整参数/DTO 继续由 `PROPOSED_QUESTION_ANSWER_V1_RPCS` 和现有 parser 约束。
没有修改 Production-generated types、deployed RPC catalog 或 CLIENT_RPC_WHITELIST。

## 数据库边界

所有新表 ENABLE + FORCE RLS；所有新 RPC/helper/trigger function 使用
`SECURITY INVOKER SET search_path = ''`。helper 放在非 Data API schema `ec2_private`，撤销
PUBLIC EXECUTE；只授予调用所需 helper EXECUTE。trigger function 不授予普通 caller 直接执行权。

显式 column grants 固定当前可读字段，未来新增列不会继承 table-level SELECT。
普通客户端没有 identity/parent/created_at/moderation 写权限；DB trigger 同时约束 owner、初始
open/visible、不可变字段、close-only、soft-delete 不可恢复、DB-maintained timestamps。
Question 没有普通 delete capability。Answer/Reply 只能更新 deleted_at，不能借 direct DML 编辑正文。

Owner 底层可读自己的 Answer/Reply tombstone，前提是父链仍可见，用于 invoker soft-delete。
所有正常 read RPC 显式过滤 deleted/hidden；删除或隐藏 Answer 后整个 Reply 分支从产品 projection
消失，底层 Reply 不删除、不重挂、不生成公开 tombstone card。

Question 关闭后仅阻止新增 Answer/Reply、编辑 Question；既有可见 Answer 仍可 Helpful，作者仍可
删除自己的 Answer/Reply。预算 nullable 或 `1..9007199254740991` 的 bigint CNY 分；上界仅为
JS/JSON 无损技术边界，不是产品定价上限。Topic input 必须存在且严格为空数组，非空/NULL 明确拒绝。

## Helpful 物理候选与验证 Gate

保留私有 mark + 无身份 public fact 双关系候选。双向 `(mark_id,answer_id)` deferred FK 保证提交时
恰好一一对应，UNIQUE(answer_id,person_id) 保证最多一个关系。没有 counter column。
fact INSERT/DELETE policy 必须核对同一 caller-owned mark；self-helpful 在 mark INSERT trigger/RLS
同时阻止。取消时先删当前 caller 的 fact，再删 mark，整个事务提交前完整性必须恢复。

公开 fact 不授予 `SELECT(mark_id)`，DELETE 通过 answer_id 定位，由 RLS 限制实际可删行。
公开 RPC 不返回 markId/person_id 关系；auth viewer state 只查询 `auth.uid()` 自己的 mark；anon
在 helper 中直接返回 false，不执行 owner-only SELECT。真实 read payload 必须再次经过批准的 parser。

双关系候选已通过本地 PostgreSQL 执行 Gate：提交边界一一对应、Direct DML 伪造/单边提交失败、
幂等 add/remove 与多 viewer 并发均保持一致。该结论仍需 Architecture/Security Review，不等于
Production 验证；没有切换 definer、service-role 客户端或公开 voter identity。

## 序列化与重试

Question UUID 命名空间的 transaction advisory lock 串行化 parent validation 与写入；RPC 与
Direct DML trigger 采用同一机制，锁内用新 SQL statement 重查状态。

Question UPDATE 先由 PostgreSQL 获取 non-key tuple lock，BEFORE trigger 再取得 advisory lock；
close RPC 不在 UPDATE 前额外取 advisory lock。子 INSERT 的 FK KEY SHARE 与 parent non-key
UPDATE 不冲突，避免人为制造反向锁顺序。Helpful 在同一 Question 锁内查询当前 caller mark，
再执行显式 desired-state add/remove，避免 true/true retry 双计数。

业务写 guard 只接受 READ COMMITTED；其它 isolation 在等待后可能仍持有旧 snapshot，因此明确
拒绝，而不是宣称已验证所有隔离级别。任意多对象 direct DML 事务仍可能遇到 PostgreSQL deadlock
abort，不能吞错；只有真实并发 smoke 能证明指定路径安全，不能用单 session 顺序调用替代。

## 错误协议

采用 [PostgREST 自定义 PT SQLSTATE](https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes)。
adapter 按稳定的 `(code,message key)` 映射，不解析自然语言、detail 或 SQL context。

| SQLSTATE / HTTP | message key | 语义 |
| --- | --- | --- |
| PT404 / 404 | TARGET_NOT_FOUND_OR_INACCESSIBLE | 写目标 missing/不可见/非 owner 统一，不泄露存在性 |
| PT409 / 409 | QUESTION_CLOSED | closed 禁止新增 Answer/Reply 或编辑/reopen |
| PT403 / 403 | SELF_HELPFUL_FORBIDDEN | 作者不能 Helpful true；self false 无 mark 可 no-op |
| PT422 / 422 | CANONICAL_TOPIC_NOT_READY | 非空或 NULL topic 参数，绝不静默丢弃 |
| PT400 / 400 | INVALID_INPUT | 空正文、无效 Channel/budget/order/pagination/boolean |
| PT401 / 401 | AUTHENTICATION_REQUIRED | 需要真实 authenticated Person |
| PT403 / 403 | IMMUTABLE_FIELD | 尝试改变不可变字段或恢复 tombstone |
| PT409 / 409 | UNSUPPORTED_TRANSACTION_ISOLATION | 写路径只验证 READ COMMITTED |

缺失/隐藏 read 返回 null 或真实空列表；未知 DB error 必须传播，不伪装空结果。
直接越权列写与破坏约束仍由 PostgreSQL 42501/23514/23503 等拒绝，不作为产品成功响应。

## 本地验证入口

使用隔离 Colima profile/context `askbuddy-ec2b` / `colima-askbuddy-ec2b`，不挂载用户主目录，不开启
SSH agent forwarding，不修改 Production 连接配置。CLI 使用独立 LOCAL project id `askbuddy-ec2b`，
本地 migrations 指向本 worktree 的完整目录，不能跳过旧迁移伪称 clean reset 成功。
所有数据库命令必须显式 local；不得使用 `--linked`、远程 URL 或 `db push`。

`npm run test:question-answer-v1:db` 是静态合同检查，不是执行 SQL 的证据。
`npm run test:question-answer-v1:local` 固定验证本地 Docker socket/context/container，拒绝传入
任意 DB URL；通过容器内 Unix socket 连接，不继承 PG/Production credential。

SQL suite 使用 BEGIN/ROLLBACK；fixtures 为三个仅本地非 Expert Person。并发 suite 使用真实独立
PostgreSQL sessions，观察第二 session 的 `pg_stat_activity.wait_event='advisory'` 后才提交第一
session，记录 close/create 和 Helpful 竞争的真实结果。并发 fixtures 在 finally 中清理；测试
拒绝清空已有内容，运行前必须有独立 clean local reset。

实际覆盖：完整 12 RPC、Direct DML、owner/cross-user/anon、预算/Topic、close-only、tombstone、
moderation、排序分页、四个 read DTO allowlist、Helpful pairing/privacy/idempotency/concurrency、
ACL/RLS/function introspection、FK index coverage、rollback 零残留。

## 本地运行时事故与参考镜像

Supabase CLI 2.91.3 默认的 PostgreSQL `17.6.1.106`，以及 CLI 2.89.0 首次选择的
`17.6.1.105`，都在 anon 调用无 EXECUTE grant 的函数时触发 backend SIGSEGV。最小复现函数只有
`SELECT 1`，与本 migration 业务 SQL 无关；现象与 Supabase Postgres
[#2112](https://github.com/supabase/postgres/issues/2112) 一致。连接中止后确认五张 EC-2 表与测试
identity 残留为 0。

完整测试改在报告中已知能返回正常 `42501` 的官方参考镜像
`public.ecr.aws/supabase/postgres:17.6.1.095` 上运行；本次镜像 digest 为
`sha256:965e2dfb5a23a0d6541b6106541e777b303656ebabd4e878746b189d550c0a66`。参考镜像只通过独立
scratch project 的 `.temp/postgres-version` 固定，**没有提交到仓库，也不是 Production runtime
要求**。测试没有增加 anon EXECUTE、没有改用 SECURITY DEFINER、没有跳过权限拒绝场景。

## 当前执行证据与剩余 Gate

- 完整仓库 migration clean reset：PASS，latest=`20260904174215`。
- 五张 relation ENABLE/FORCE RLS、column grants、12 个 exact signature ACL、25 个 function
  INVOKER/empty search_path：PASS；PUBLIC EXECUTE 不存在，anon 只有四个 read RPC。
- rollback SQL + approved strict runtime parser：PASS。四个 read RPC 均验证 authenticated 与 anon
  真实 payload；missing profile summary 为 null，不制造 fallback。
- Direct DML / owner / cross-user / anon / self-helpful / moderation / soft-delete / ordering / pagination：PASS。
- 两个真实 PostgreSQL session 的 8 组并发：close vs RPC/direct Answer、close vs RPC/direct Reply、
  Helpful same viewer、多 viewer、add/remove、false retry 全部 PASS；第二 session 实际观察到 advisory
  lock wait 后才提交第一 session。
- Helpful mark/fact commit integrity 与 viewer relationship privacy：PASS；persistent smoke rows=0。
- Local Security Advisor：17 项，EC-2B 相关 0；Local Performance Advisor：318 项，EC-2B 相关 0。
- `db lint --fail-on error` 报 6 项既有 legacy function error：
  `accept_answer_and_transfer_points`、`is_admin_user`、`recharge_points`、
  `get_search_suggestions_v2`、`create_consultation_order`、`confirm_recharge_payment`；EC-2B function=0。

Static Contract 与 LOCAL PASS 都不是 Production apply/smoke 证据。Production DB mutation=NO；
remote migration apply=NO；Edge deployment=NO；UI changes=NO；generated Production types unchanged。
`profiles.phone direct Data API Privacy Cutover = REMAINS`。

只有本地验证全部通过并完成 Architecture/Security Review，才能申请后续单独 Production gate。
即使 LOCAL PASS，本轮也不会解锁普通客户端或把 EC-2 runtime 标为 production-ready。
