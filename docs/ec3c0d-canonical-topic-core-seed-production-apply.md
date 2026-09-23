# EC-3C0D Core Seed v1 Production Apply

## Status And Authorization

**PRODUCTION DATA APPLY COMPLETE / EXACT-STATE VERIFIED.** Repository closeout is pending Product Owner review. No Discovery runtime or Topic UI is authorized by this apply.

- Baseline main: `2ef90b1ed20a80efc2cce3a0101cba5f879abf5f` (PR #52 merge).
- Branch: `codex-a/ec3c0d-topic-core-seed-production-apply`.
- Project: `fslpvtlavhrnxsygkpvi`; independently checked **ACTIVE_HEALTHY** before and after apply; DB build metadata `17.6.1.063`.
- Manifest: `canonical-topics/core-v1.json`, schemaVersion `1`, manifestId `core-v1`.
- Exact manifest SHA-256: `fe1591a81323092d745e08cd9fa024808033c5c95dcc0ca89bd41f8739deda6f`.
- Approved and fresh pre-apply planHash: `9319fcf1ae9c7641927760f3a679cd5df74c9a5ab944460fa33dec350ed84cc2`.
- Manifest validator: **PASS**, 79 active roots, 113 aliases, 192 unique normalized terms, 0 collisions; exact frozen UUID v4 identities/content/order unchanged.
- Remote main was checked through the existing authenticated GitHub read path, including immediately before apply. Git HTTPS fetch timed out; no baseline drift was observed.

## Fresh Preflight

Fresh Production snapshot at `2026-09-23T13:05:25.615309Z`: roots `[]`, terms `[]`; all four counts below were zero. This was a new live read, not the historical C0C fixture.

| Relation | Fresh preflight | Independent post-commit |
| --- | ---: | ---: |
| canonical_topics_v1 | 0 | 79 |
| canonical_topic_terms_v1 | 0 | 192 |
| question_topics_v1 | 0 | 0 |
| experience_topics_v1 | 0 | 0 |

The existing pure `planManifest` returned 79 CREATE_TOPIC, 0 RENAME_TOPIC, ADD_ALIAS, REMOVE_ALIAS, DEPRECATE_TOPIC, REACTIVATE_TOPIC, NO_CHANGE or PRODUCTION_ONLY_UNMANAGED. Collision/high-risk/governance-sensitive counts were all 0; effectiveChangeCount was 79. Aliases remained embedded in CREATE payloads. Its planHash exactly matched the authorization; the informational planner itself still grants no apply permission.

Read-only catalog inspection confirmed the root/term source fields, generated normalized columns, default timestamps, enabled INSERT triggers, global normalized-term PK, root/term circular deferred FK, validated constraints and RLS/FORCE RLS. Deployed `normalize_term`, `guard_root` and `ensure_canonical_term` bodies were compared byte-for-byte after outer whitespace trimming with the approved migration bodies. They matched. The existing SQL execution context was `postgres` with BYPASSRLS and READ COMMITTED; no role/grant changes were made. Anonymous resolver EXECUTE was confirmed by metadata, not a denied-EXECUTE probe.

## Single Transaction

One temporary local payload was programmatically derived from the exact manifest bytes, after SHA, Core validator and pre-plan checks. No second manually maintained Topic list was used. It is not committed and no reusable apply command is introduced.

The single BEGIN/COMMIT transaction used transaction-scoped advisory key `hashtextextended('EC-3C0D/core-v1', 0)`, plus SHARE ROW EXCLUSIVE locks on the four Topic relations. These short transaction-only locks also exclude concurrent writers that do not participate in the new advisory key; ordinary reads remain available. Local transaction timeouts were 5 seconds for locks and 30 seconds for statements. No schema configuration was changed.

Inside that transaction, before the first INSERT, all four counts were rechecked as zero. It inserted exactly 79 roots using only topic_id/canonical_name/status; the existing trigger produced exactly 79 canonical terms. It then inserted exactly 113 aliases using only term/topic_id. Generated columns and timestamps were never supplied. There was no ON CONFLICT, UPSERT, skip, rename, reassignment or retry.

Before commit, row counts and active status were asserted; bidirectional EXCEPT comparisons proved exact root UUID/name/status equality and exact canonical-name-plus-alias term ownership. Both association counts remained 0. Forbidden normalized terms were absent. Deferred constraints were made immediate before COMMIT. Every assertion passed.

Commit confirmation: `2026-09-23T13:08:48.530945Z`, result `EC3C0D_COMMITTED`. One transaction committed; no rollback or second mutation attempt occurred. Temporary payload SHA-256: `768cac33bf4cfec761a4d99bf187004043eb50f53f8e6208e3d642fdc4518f1c` (audit identifier only, not a future apply authorization).

## Independent Exact-State And Resolver Evidence

Fresh independent read at `2026-09-23T13:09:38.036855Z` returned 79 roots / 192 terms / 0 Question associations / 0 Experience associations. Local comparison against the unchanged manifest proved:

- Exact 79 UUIDs, canonical names and active statuses; 0 deprecated roots.
- Exact 113 aliases and 192 complete terms, including normalized values and owning topicId.
- Zero extra roots/terms, missing roots/terms or ownership mismatch.
- 人像摄影, PM, 手冲咖啡, 旅行攻略, 海外硕士申请, Personal Statement, 学校面试, 路跑 and 自驾租车 absent.

All seven real SQL resolver results passed the existing shared request/result parser and expected identity checks:

| Input | Expected result | Result |
| --- | --- | --- |
| 美国研究生 | `f37d0823-6e81-4981-9e7b-84eb8012081a` | PASS |
| 美研 | `f37d0823-6e81-4981-9e7b-84eb8012081a` | PASS |
| toefl | `e90f5031-eff6-45e5-88a0-aab3f19107cf` | PASS |
| Product Manager | `354dee2b-1e7c-467f-b842-5b4fd30df22b` | PASS |
| management consulting | `1108cded-5504-4214-b4c2-f4aa9a8d1de7` | PASS |
| 人像摄影 | null | PASS |
| ec3c0d-unknown-resolver-20260923-1308 | null | PASS |

Anonymous Production PostgREST resolver reads for 美研, toefl and 人像摄影 each returned HTTP 200 and the expected parsed identity/null. Completed `2026-09-23T13:12:01.134Z`. Existing local publishable credentials were used without printing them; no Auth user was created. This was read-only resolver transport verification, not business mutation smoke.

## Desired-State Idempotency

The pure planner consumed the fresh post-commit governance snapshot. The INSERT transaction was not repeated.

- NO_CHANGE: **79**.
- CREATE_TOPIC / RENAME_TOPIC / ADD_ALIAS / REMOVE_ALIAS / DEPRECATE_TOPIC / REACTIVATE_TOPIC / PRODUCTION_ONLY_UNMANAGED: **0** each.
- effectiveChangeCount / collisionCount / highRiskCount / governanceSensitiveCount: **0** each.
- Post-apply productionStateHash: `71d9f4eb3638e6e7c2058b7176d8892fa4b1484741c78df583e4e7c957b60971`.
- Post-apply planHash: `0246219678657738b473d5ce15cf81c41e3439a4d85e6bdf0b8fcd823b88aa2d`.

Local guards recompute these semantic hashes using a manifest-derived matching fixture, with no live Production dependency. This guards the reviewed desired state; it is not continuous Production monitoring.

## Scope And Governance

Production writes were limited to the approved 79 roots and 113 aliases, plus the 79 canonical terms/timestamps generated by existing database behavior. No Auth users, profiles, Questions, Answers, Experiences, associations, bookings, messages or posts were created. No migration, DDL, RLS/grant, function/trigger, index/constraint, RPC or Edge deployment occurred. No apply SQL, seed script, service-role helper or `topic:manifest:apply` command enters the repository.

Core Seed v1 is a frozen initial curated set, **not a permanent 79-Topic namespace cap**. Future separately approved Topics may receive new stable UUID v4 identities once, without reusing Core identities or requiring a schema migration. Production-only Topics absent from core-v1 are not authorized for mutation. This phase does not implement a future governance/apply workflow.

The C0C preview document, empty snapshot and preview artifact remain untouched historical pre-apply evidence. `previewCoreV1` still requires empty Production; it is not a post-apply live-state check. The manifest bytes and UUIDs are unchanged.

Current Question UI still sends `p_topic_ids = []`. Topic picker, resolver UI, Experience Topic UI, Candidate runtime, AI suggestions, Home/Search/Matching and Editorial runtime remain NOT IMPLEMENTED. Discovery productionDeployed, clientConsumable, implementationStarted and rpcNamesFrozen all remain false. Existing Topic RPC authorization/parser semantics are unchanged; only seeded runtime descriptions and static truth guards are updated.

**DO NOT AUTO-MERGE. DO NOT START EC-3C DISCOVERY BACKEND.** Further Production writes require separate Product Owner authorization.
