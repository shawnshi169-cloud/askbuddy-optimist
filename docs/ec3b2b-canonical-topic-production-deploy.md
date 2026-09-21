# EC-3B2B Canonical Topic Production Deployment

Current: B2B approved/merged in PR #50. [B2C consumer gate](./ec3b2c-canonical-topic-consumer-gate.md)
is now verified; Topic UI remains unimplemented and taxonomy unseeded.
The remainder is the historical B2B deployment/review snapshot, including its then-closed client gate.

B2B snapshot status: **PRODUCTION DEPLOYED / VERIFIED; CLIENT NOT ENABLED; EC-3B2C PENDING**.
Repository baseline: `b7662dfed927873527ac1a31c719f8ea3fb12257` (PR #49 merge).
EC-3A frozen, EC-3B1 approved/merged, EC-3B2A preflight complete. This closeout needs Product Owner review;
it does not authorize B2C, consumer use, Topic seed or UI work.

## Deployment Evidence

- Project: `fslpvtlavhrnxsygkpvi`; before/after/final status `ACTIVE_HEALTHY`.
- Database: PostgreSQL 17.6 aarch64, build `17.6.1.063`, default isolation `read committed`.
- Migration: `20260915140330_canonical_topic_local_foundation_v1.sql`.
- SHA-256: `2d97c4944228e6bf0150b76c773855c6c1acc417dd8fd270d729adb70142c53a`.
- Final integrity check / apply window start: `2026-09-18T16:48:59.502Z` (September 19, China time).
- Existing Supabase CLI 2.91.3, standard linked `db push --dry-run`, then `db push --linked --yes`.
  Sole pending migration matched the approved file. Applied once, exit 0, no partial deployment or repair.
- History changed from 55 to 56 entries; target version/name recorded exactly once. Every remote
  version/name matched repository history; no extra migration. Migration file/checksum unchanged.
- Main and checksum were exact; Topic objects absent before apply; Question/Experience metadata matched
  reviewed assumptions. No relevant active DDL/migration/lock incident; database not in recovery.

Evidence below was captured during that deployment window, not a new smoke on later closeout resumes.
No second migration apply, Production write probe or synthetic transaction is required for this PR.

## Structural And Security Verification

Four public relations and `ec3_topic_private` exist. All four have RLS + FORCE RLS, reviewed column grants,
and eight exact policies. Constraints validated, indexes valid/ready, no uncovered FK. No taxonomy seed,
legacy backfill, polymorphic relation, hierarchy, Channel/Location assignment or ranking fields.
Root normalized name and global normalized term are generated; canonical/alias terms share one identity
space. Root-to-owned-term circular FK is DEFERRABLE INITIALLY DEFERRED.

| Child FK | Parent | DELETE action |
| --- | --- | --- |
| question_topics_v1.question_id | questions_v1 | RESTRICT |
| question_topics_v1.topic_id | canonical_topics_v1 | RESTRICT |
| experience_topics_v1.experience_id | person_experiences | CASCADE |
| experience_topics_v1.topic_id | canonical_topics_v1 | RESTRICT |

All 17 new/replaced function bodies/signatures matched the reviewed SQL. Combined EC-1/EC-2/Topic
inspection covered 51 expected functions, without overload drift. All new/replaced functions are
SECURITY INVOKER, empty search_path, no PUBLIC EXECUTE. Existing 13 Experience RPCs were unchanged.
Question create/update/close/detail/list signatures preserved, including bigint budget parameters.
Three new RPCs deployed: `resolve_canonical_topic_v1(text)`, `get_experience_topics_v1(uuid)`,
`set_experience_topics_v1(uuid,uuid[])`.

No PUBLIC broad table grants or ordinary root/alias mutation. Authenticated association mutation remains
minimal owner-only INSERT/DELETE; all SELECT grants enumerate columns. No new ordinary Experience
hard-delete permission. Root governance remains limited service/admin operations, not GRANT ALL.
ACL denial checked through metadata; no intentional denied-EXECUTE crash probe.

## Rollback-Contained Smoke

Safe anon reads first verified unknown resolver -> `{topic:null}` and existing Question topicIds -> `[]`.
Before inserting any identity, all auth.users trigger definitions and their transaction-local child
writes were rechecked: `on_auth_user_created_pack01` creates profiles/user_settings/point_accounts;
no external Auth, email, HTTP, Edge or payment action.

One top-level BEGIN/ROLLBACK transaction at `2026-09-18T16:57:22Z`, with statement/lock timeouts,
created exactly one synthetic auth identity (`@example.invalid`), Topic + alias, Question and Experience.
Ordinary paths used transaction-local authenticated role + auth.uid() JWT context, never service-role
as an ordinary user. A second absent synthetic UUID supplied the non-owner scope, not a real user/account.

All 25 assertions passed: normalized canonical/alias/unknown resolver; Question active IDs and desired-state
empty/restore; duplicate `PT400 / INVALID_INPUT`; unknown/new deprecated `PT422 / TOPIC_INVALID_OR_INACTIVE`;
failed update atomicity; closed update `PT409 / QUESTION_CLOSED`; Experience empty/linked reads; own private
visibility; non-owner read hidden/set PT404/direct DELETE zero; anon private hidden; public Question Topics;
deprecated Question/Experience historical retention; deprecated resolver unresolved; privileged physical
Experience parent cascade; Topic root retained; ordinary hard-delete ACL denial; no resolver side effects;
deferred integrity validated.

Direct parent Experience deletion with Topic link passed. Account-level deletion was **not repeated**:
the sole synthetic identity also owned a Question protected by the existing RESTRICT lifecycle. The B1
local account-cascade regression remains the account-level evidence; no additional Production user was
created to expand scope. No two-session committed Production fixture/concurrency suite was run.

ROLLBACK succeeded. Independent subsequent read verified zero synthetic auth.users, profiles,
user_settings, point_accounts, Questions and Experiences. All four Topic tables were also empty.
Real Question count remained 2, Experience count remained 0; no user content exported or altered.
**Persistent synthetic rows = 0**. No persistent seed, Auth session, fixture or Edge deployment.

## Advisor Delta

| Advisor | Before | After | New Topic findings |
| --- | --- | --- | --- |
| Security | 102 | 102 | 0 |
| Performance | 367 | 359 | 0 |

Post snapshots: Security `2026-09-18T16:58:45.674Z`, Performance `2026-09-18T16:58:47.609Z`.
No new finding in either category. Eight existing unused_index INFO entries were no longer reported:
experience_transitions_experience_owner_idx, experience_claims_experience_owner_idx,
questions_v1_requester_idx, questions_v1_channel_list_idx, answers_v1_question_order_idx,
idx_answers_author_created, person_experiences_owner_active_order_idx,
person_experiences_public_order_idx. No indexes were deleted/modified; this usage-sensitive Advisor
refresh is not claimed as an intentional debt fix. Topic has no unindexed FK, duplicate index,
RLS initplan regression, mutable search_path or security finding; not even unused_index INFO appeared.

## Types And Consumer Boundary

Actual Production CLI generation used `--schema public,graphql_public --lang typescript`. The only
generated diff is four Topic tables and three RPC definitions. AST comparison matched all seven against
the approved B1 local generated projection; existing generated schema/metadata is unchanged.
`canonical-topic-v1` now owns backend types/parsers/state; `canonical-topic-v1-local` re-exports QA
compatibility aliases, not a contradictory local-only deployment state. Parser validation semantics
are unchanged. The local generated snapshot remains local QA evidence and is not manually rewritten.

Backend: productionDeployed=true, productionGrantReview=aligned; Question accepts active canonical IDs
and retains existing deprecated links. CANONICAL_TOPIC_NOT_READY is historical EC-2 SQL behavior, not
the current backend Topic boundary. Stable current Topic errors live in the backend contract module.

Client: clientConsumable=false. New backend catalog entries are aligned but Blueprint consumer policy
is false; CLIENT_RPC_WHITELIST is unchanged. App-facing Question parser still rejects nonempty IDs;
EC-2's historical product-review record is retained with an explicit current EC-3B2C gate. No fallback
strips real IDs, no frontend imports this backend capability, no Topic UI or Experience UI hookup.
Governance must not persist Topic associations ahead of B2C: current client readers intentionally reject
such payloads. SQL smoke does not substitute for future consumer/parser/HTTP authorization.

Home/Search/Matching/Editorial runtime remains unimplemented. EC-3B2C requires separate review and
authorization after this closeout; no automatic consumer unlock. No UI/native changes or EC-4 work.

**DO NOT AUTO-MERGE. DO NOT OPEN CLIENT GATE. DO NOT START EC-3B2C.**
