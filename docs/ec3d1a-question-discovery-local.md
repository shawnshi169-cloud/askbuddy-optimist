# EC-3D1A Canonical Question Discovery: Local Implementation V1

**PROPOSED / NOT DEPLOYED.** This is a local backend implementation, not an activated Discovery runtime. No endpoint, RPC name, infrastructure choice, deployment or client authorization is frozen here.

## 1. Baseline and Lineage

- Approved main: `b7600945736c3a4475bdf0c95aae827ce8b00920` (PR #60, merged D0 audit).
- Branch: `codex-a/ec3d1a-question-discovery-local-v1`.
- Sources: `docs/ec3d0-discovery-readiness-audit.md`, `docs/ec3-discovery-contract-decision.md`, `docs/product-blueprint-v1-contract-decision.md`, existing shared Discovery types/API, Product Blueprint, page map, canonical Question and Topic contracts.
- Database definitions: unchanged `20260904174215_canonical_question_answer_v1.sql` and `20260915140330_canonical_topic_local_foundation_v1.sql`.
- D0 proposed APIs were not deployed or automatically approved. This implements only the subsequently authorized D1A Question HOME/CHANNEL subset.
- Historical evidence, frozen product semantics, migrations, generated types, RPC catalog/whitelist and current user-facing flows remain unchanged.

## 2. Proposed Input

The strict, separate D1 parser in `local-backend/question-discovery-v1/contract.ts` accepts:

```ts
{
  scope: { kind: "home" } | { kind: "channel"; primaryChannel: ProductChannelSlug };
  topicId: CanonicalTopicIdV1 | null;
  city: null;
  page: { cursor: string | null; limit: number };
}
```

All fields are required. Unknown fields, including viewer IDs, text queries and ranking inputs, are rejected. UUID syntax is checked and filter UUIDs normalized to lowercase; existence/status is checked in PostgreSQL. Neither the existing generic Discovery DTO nor Question write contracts change.

## 3. Output Mapping

The response implements `DiscoveryPageV1Target<QuestionDiscoveryCardV1Target>`: `items`, `snapshotId`, `nextCursor`. Each strict card contains exactly:

| Field | Source |
| --- | --- |
| questionId | `questions_v1.id` |
| title / primaryChannel | Stored canonical title / exact Product Channel |
| topicIds | Current canonical associations, unique UUIDs ASC, including historical deprecated links |
| deepExchangeBudgetMaxCents | Stored nullable budget, not bounty/reward |
| createdAt / status | Live canonical timestamp / open or closed state |
| contextExcerpt | First 240 PostgreSQL characters of stored context, not generated text |
| answerCount | Real visible, nondeleted canonical Answers on the eligible parent |

Optional requester enrichment is deliberately omitted. Missing profiles do not drop Questions or generate fake identities. No profile or Expert table, phone, email, internal profile ID, accepted answer, score, heat, views or fabricated urgency is read/projected.

## 4. Topic and Channel Semantics

HOME includes every eligible Question, including zero-Topic records. CHANNEL matches `primary_channel` exactly against the existing four `PRODUCT_CHANNEL_SLUGS`; no new taxonomy or Topic-to-Channel inference exists.

Null Topic means no filter. Non-null requires an existing active root. Missing/deprecated roots yield `TOPIC_INVALID_OR_INACTIVE`, never an unfiltered fallback. Membership uses `EXISTS`, preventing duplicates. Every hydration rechecks active filter status and current membership. Historical deprecated links are untouched and remain in unfiltered cards. Deprecation of the requested filter between pages fails explicitly.

## 5. City Boundary

Only `city=null` is supported. Any non-null value yields `UNSUPPORTED_CITY_FILTER`. No Question city field, location inference, IP/GPS use or silent filter omission is introduced. Future city support needs independent review.

## 6. Set-Based SQL Recall

`repository.ts` supplies fixed `CANDIDATE_SQL` and `HYDRATE_SQL` to an injected bound-query adapter. Channel, Topic, candidate bound, identity window and expected role/subject are parameters, never concatenated user SQL.

Recall captures a complete ordered identity set in one statement: `created_at DESC, id ASC`, with explicit `deleted_at IS NULL` and `moderation_visibility='visible'`. Cap+1 distinguishes overflow from completeness. No OFFSET, silent truncation or partial-result claim exists.

Hydration joins an at-most-20-ID `unnest(... WITH ORDINALITY)` window, rechecks public predicates and filters, and returns original snapshot order. New Questions never enter an issued snapshot. Live title/context/status/Topics/counts may change: the snapshot freezes identities/order, not historical payloads or visibility.

Queries run under ordinary `anon`/`authenticated`, existing RLS and column grants. `identity()` reads `current_user` and `auth.uid()` and rejects privileged roles. Each statement also binds/checks the expected trusted role/subject. A changed caller fails explicitly. No SECURITY DEFINER, grants, policy or existing RPC modification is involved.

## 7. Answer Count Truth

A grouped canonical Answer query joins eligible parents and filters child `deleted_at IS NULL` and `moderation_visibility='visible'`. Owner-readable tombstones do not count. Hidden/deleted parents produce no card or count. Open and closed Questions are both eligible; public visibility does not imply write permission.

## 8. Snapshot Abstraction

`QuestionRepository` separates identity, recall and hydration. `SnapshotStore` separates `put/get/remove`. `MemorySnapshotStore` is explicitly process-local, not durable/shared Production infrastructure.

Stored state contains snapshot UUID, hashed caller key, filter binding, rank version, expiry and ordered Question IDs only. Copies prevent mutation through aliased arrays. Count/byte/caller checks and insertion have no intervening await in this single-process implementation. Capacity rejects rather than silently evicting live snapshots; expired entries are reclaimed.

The service keeps no database transaction open across requests. The test runner's outer transaction exists only to contain local fixtures. READ COMMITTED is not claimed to stabilize independent pages; the ordered-ID snapshot provides that property.

## 9. Cursor Integrity and Progression

Opaque format: `v1.<nonce>.<ciphertext>.<tag>`, canonical base64url. AES-256-GCM uses a server-supplied 32-byte key, random 12-byte nonce and fixed protocol AAD. Authentication precedes plaintext parsing. Version, encoding, length, tag, ciphertext and schema are checked. The encrypted record holds snapshot ID, next scanned position, binding hash, rank version and expiry.

Binding includes Question mode, explicit no-text-query version, trusted caller/anonymous scope, HOME/CHANNEL scope, exact Topic, null city and page limit. Rank is independently checked. Store state must match token metadata. No client-supplied viewer identity is trusted.

Short/empty pages can have a next cursor: advancement uses the last **scanned** position, not returned count. Terminal cursor is null. Replay scans the same positions with live visibility rechecks, not guaranteed byte-identical payload/token bytes. Following next cursors has no duplicate identities. Skipped positions are not revisited if later made eligible.

## 10. Caller / Anonymous Isolation

The public method accepts only the strict request. Identity comes from an exclusively leased, trusted caller-scoped SQL connection. Authenticated snapshots bind to its subject; anonymous snapshots bind to a server-generated 256-bit scope. Different users/scopes cannot reuse cursors.

The local harness simulates roles/claims; it does **not** verify JWT authenticity or HTTP cookies. A future transport must validate sessions/JWTs, isolate pooled connections, retain a protected anonymous scope, safely set ordinary role/claims and enforce timeout. Passing unverified claims to this adapter is forbidden. Session revocation, key management and anonymous scope lifecycle remain deployment gates.

`handleLocalJson` is an in-process serialization/parser boundary only, not an HTTP server, Edge function, RPC or authentication adapter. Unexpected backend errors are redacted. Nothing imports this backend into `src` or shared runtime consumers.

## 11. Proposed Stable Errors

| Code | Condition |
| --- | --- |
| INVALID_INPUT | Malformed/extra fields, UUID syntax, oversized JSON |
| INVALID_CHANNEL | Unknown exact Channel |
| INVALID_PAGE_LIMIT | Non-integer/out-of-range limit |
| UNSUPPORTED_CITY_FILTER | Non-null city |
| TOPIC_INVALID_OR_INACTIVE | Missing/inactive filter, including between pages |
| INVALID_CURSOR | Tampering, malformed token, inconsistent position/metadata |
| CURSOR_CONTEXT_MISMATCH | Caller/anonymous scope/scope/Topic/limit mismatch |
| CURSOR_RANK_MISMATCH | Rank version changed |
| SNAPSHOT_EXPIRED | TTL elapsed, including during hydration |
| SNAPSHOT_UNAVAILABLE | Valid cursor, missing backing state |
| SNAPSHOT_CAPACITY_EXCEEDED | Candidate/count/caller/byte limit |
| UNTRUSTED_CALLER_CONTEXT | Privileged, invalid or changed DB role/subject |
| DATA_INTEGRITY_ERROR | Invalid projection, duplicate/reordered/foreign IDs or state |
| RESPONSE_CAPACITY_EXCEEDED | Local response byte limit exceeded |
| BACKEND_UNAVAILABLE | Redacted unexpected SQL/adapter error at JSON boundary |

These are local application codes, not deployed SQLSTATEs/frozen HTTP statuses. An oversized cursor may fail input validation before decoding. Future wire/status mapping needs review.

## 12. Resource Limits

| Parameter | Prototype value / rationale |
| --- | --- |
| Page size | 1..20, bounded hydration window |
| Complete candidate set | 500 IDs; cap+1 detection; all 500 verified over 25 pages |
| TTL | 10 minutes, no long-lived DB transaction |
| Cursor | At most 512 characters |
| JSON request / response | 2 KiB / 256 KiB, explicit rejection |
| Store | At most 128 records, 4 per caller/scope, 8 MiB accounted bytes |
| Query timeout | 2 seconds, enforced by the local adapter's PostgreSQL session |

Accounting charges twice serialized bytes, 64 bytes per ID and 4 KiB overhead per record. Byte capacity binds before count for full snapshots. This is deterministic conservative accounting, **not a proven V8 heap ceiling**. In-flight query/JSON allocations, heap overhead and concurrency still need load testing. Response bytes are checked after hydration, not before PostgreSQL/driver allocation. Timeout bounds duration, not all memory/work independently.

The 500-candidate limit is a deliberately restrictive local operational parameter, not a permanent product cap. A busier HOME feed explicitly fails rather than truncates. D1B must approve larger capacity or another complete-snapshot design before broad use.

## 13. Performance / EXPLAIN

Local observation, 2026-10-11 UTC: PostgreSQL image `17.6.1.095`, 2,012 synthetic Questions, 2,010 eligible, sparse Topic links, five Answers, one connection. Warm-cache `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)`:

| Query | anon execution ms | authenticated execution ms | Shared hit blocks |
| --- | ---: | ---: | ---: |
| HOME cap+1 recall | 0.404 | 0.317 | 555 |
| CHANNEL cap+1 recall | 0.391 | 0.379 | 558 |
| Topic recall | 1.843 | 1.605 | 4,217 |
| 20-ID Topic hydration | 2.999 | 2.721 | 5,363 |

Observed indexes: `questions_v1_list_idx`, `question_topics_v1_topic_question_idx`, `questions_v1_channel_list_idx`, canonical root identity/name index. No new index is justified by this small test; none is added. The channel index places status between channel/timestamp while both statuses are eligible; this plan preferred the public list index.

Topic recall exhibited up to 2,010 inner membership/RLS plan loops. One set-based round trip is **not** constant CPU independent of corpus size. Statistics are from the isolated database, not an analyzed Production-scale corpus; no persistent ANALYZE/DDL change was made. Concurrent load, cold cache, large Answer fan-out and multi-instance performance were not tested. D1B must evaluate realistic selectivity/statistics, including Topic-driven alternatives, without bypassing RLS. Add an index only after separate EXPLAIN evidence/review.

A second final-tree run also passed and rolled back all 16 table counts to zero. Its execution range was 0.306..2.470 ms; Topic recall used a different plan (maximum node loops 1, 2,159 shared hits). This plan variability reinforces the need for realistic scale/statistics review rather than treating one local timing as a Production guarantee.

First page uses identity + recall + hydration (3 queries); continuation identity + hydration (2), independent of item count. No detail-RPC N+1 loop.

## 14. Local Evidence

`npm run test:question-discovery-v1` strictly compiles the backend and tests contracts, cursor security and storage/snapshot algorithms. `npm run test:question-discovery-v1:local` already supplies its required `--local` flag.

The runner pins Docker context `colima-askbuddy-ec2b`, image/container, loopback port 54322, PostgreSQL system identifier and migration head `20260915140330`. It refuses nonempty local data, never resets the database, and rechecks the local auth trigger (transactional profiles/user_settings/point_accounts only). Three fixed synthetic users/content stay inside one BEGIN/ROLLBACK; savepoints contain negative cases. Constraints are checked before rollback. All 16 tracked table counts returned to zero.

| Matrix | Evidence |
| --- | --- |
| anon, owner/non-owner parity, correct auth.uid | Actual ordinary PostgreSQL roles |
| open/closed included; hidden/deleted parents excluded, including owner | SQL |
| zero/one/multiple Topics, dedup, exact/unrelated/missing/deprecated filters | SQL + input parser |
| deprecated history retained, new association rejected | Existing write contract in local savepoint |
| four Channels, invalid Channel, null/non-null city | SQL + service parser |
| visible Answer counts; child and parent hidden/deleted branches | SQL |
| missing requester profile; no private/fabricated fields | SQL strict projection |
| equal timestamps, first/subsequent/terminal/replayed pages | SQL + snapshot algorithms |
| insert/delete/moderation/Topic/channel/timestamp/status changes | Local SQL fixture changes + snapshots |
| empty page advances scanned position; duplicate-free progression | SQL + algorithms |
| expiry/missing state, nonce/ciphertext/tag tampering, wrong key/encoding | In-process security tests |
| viewer/anon/channel/Topic/limit/rank binding | In-process security tests + SQL role drift check |
| 500 complete / 25 pages, overflow, quotas, concurrent store inserts | SQL + in-memory tests |
| JSON parser round trip, backend error redaction | In-process, NOT HTTP |

No Production operation or HTTP smoke occurred in D1A. Local schema predates the later profile privacy migration: this is scoped Question/Topic evidence, **not full Production schema/grant parity**. New queries do not read profiles. Real JWT/HTTP transport, multi-connection mutation timing and deployed endpoint authorization remain unverified.

## 15. Existing Guards and Checks

All four `DISCOVERY_V1_CONTRACT` flags remain false. The new test asserts this and forbids frontend/shared imports of the isolated backend. It is appended to the complete `test:contracts` chain; no existing assertion is removed/weakened. Local SQL tests require the pinned environment and are not mislabeled as CI/Production tests.

Final required gate results (2026-10-11 UTC):

| Check | Result |
| --- | --- |
| npm ci | PASS |
| typecheck / typecheck:baseline | PASS / PASS; zero baseline diagnostics |
| complete test:contracts (including new D1 tests) | PASS |
| test:canonical-topic-v1 / test:canonical-topic-manifest-v1 | PASS / PASS |
| test:question-topic-picker / test:experience-topic-owner / test:public-experience-topics | PASS / PASS / PASS |
| test:production-writes / test:fixture-isolation / test:runtime-mode | PASS / PASS / PASS |
| test:ui-engineering-readiness / test:ui-platform-readiness | PASS / PASS |
| lint:changed | PASS; no changed Core/shared TypeScript in this script's scope |
| build / git diff --check | PASS / PASS |
| test:question-discovery-v1 | PASS; strict local compilation, contract/JSON/cursor/snapshot/security/budgets |
| test:question-discovery-v1:local | PASS; actual isolated PostgreSQL, EXPLAIN, rollback/count verification |

The full-store budget test retained 110 realistic 500-ID records (8,321,280 accounted bytes) before rejecting capacity; the separate count test retained exactly 128 empty records. No required gate was waived. Local-backend TypeScript is not covered by the existing `lint:changed` path filter; its strict compilation and focused tests run inside `test:contracts`.

`npm ci` reported 44 dependency advisories (2 low, 7 moderate, 32 high, 3 critical); unrelated upgrades/audit fixes are out of scope. `pg@8.23.1` is pinned, dev-only and used by the local test driver; backend code accepts a structural query adapter.

## 16. Production Architecture Gaps

1. Approve durable/shared ordered-ID storage, atomic quotas, TTL, recovery and multi-instance access. The local map cannot satisfy this gate.
2. Approve trusted transport, JWT/anonymous sessions, endpoint authorization, caller-scoped connection isolation and timeout/cancellation.
3. Approve cursor key custody/rotation, rank/version rollout, rate/concurrency limits and abuse handling.
4. Validate realistic Topic selectivity, RLS cost, Answer fan-out, heap/driver memory and the 500-candidate overflow policy.
5. Fresh Production schema/grant/health compatibility preflight and actual transport/security tests require a separately authorized phase.
6. Independently review additive D1 input/errors and operational design. No RPC name or client gate is authorized here.

## 17. Deployment / Rollback Proposal

**PROPOSED ONLY:** after D1B architecture approval, implement reviewed shared storage/transport behind a disabled consumer gate; verify ordinary-role behavior and production-equivalent integration locally/staging, then seek explicit deployment authorization. No infrastructure vendor/table is selected. Existing Question/Topic writes stay unchanged.

This local PR can be removed without database rollback: it adds isolated modules, test scripts, dev dependency and documentation only. Future deployment must allow disabling the new read endpoint/consumer, expiring its short-lived snapshots and retaining existing canonical APIs. Do not reopen privacy grants or introduce legacy Question fallback.

## 18. Recommendation and Boundaries

**GO for Product Owner review and separately authorized D1B architecture/transport/storage work; NO-GO for Production deployment or consumer activation now.** D1A is a real local query/snapshot/parser implementation, not a Production-ready multi-instance service.

Person discovery, Experience candidate retrieval, text Search, Home/Channel cutover, Matching, Editorial, AI, native/WeChat and EC-4 were not started. Existing Topic UI flows are untouched. Production mutation, DDL/DML, migrations, Auth users/content, RLS/grants, existing RPC changes and Edge deployment: **NO**.

Technical references: [node-postgres parameter binding](https://node-postgres.com/features/queries), [Node authenticated encryption](https://nodejs.org/api/crypto.html). These support implementation mechanics, not deployment authorization.
