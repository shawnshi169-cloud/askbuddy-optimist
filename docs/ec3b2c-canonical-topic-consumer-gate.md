# EC-3B2C Canonical Topic Consumer Gate

Status: **CONSUMER CONTRACT ENABLED / HTTP GATE VERIFIED / PRODUCT OWNER REVIEW PENDING**.
Baseline: `8e161ec15b43455aa2af4fa2fdf1121a8e4ed790` (PR #50 merge).
Branch: `codex-a/ec3b2c-topic-consumer-gate`. No auto-merge or EC-3C start.

## Scope And Current Truth

EC-3A frozen; EC-3B1, B2A and B2B complete. Canonical Topic storage, resolver and Question/Experience
associations are already Production deployed/verified. This phase enables consumer contracts, not UI.
`productionDeployed=true`, `productionGrantReview=aligned`, `clientConsumable=true`,
`consumerGateStatus=verified`, `consumerUnlockPhase=EC-3B2C`.

Question input accepts 0..N unique canonical UUIDs without a cardinality cap or caller sorting requirement.
UUID identity comparison is case-insensitive. The parser never strips, replaces or sorts submitted IDs.
Question output accepts 0..N unique UUIDs and rejects unsorted data: **topicId ASC** is a backend invariant.
UUID syntax does not prove existence; backend active/deprecated association rules remain authoritative.
Temporary B1/B2B Question QA helpers now delegate to the same app-facing parser, not a second contract.

Current Topic error: **PT422 / TOPIC_INVALID_OR_INACTIVE**. The Question adapter displays
“所选话题已不可用，请重新选择。” Exact SQLSTATE/message pairs are required; no mapping to generic INVALID_INPUT
or historical CANONICAL_TOPIC_NOT_READY. Historical EC-2/B1/B2B evidence is preserved as dated snapshots.

Exactly three additional CLIENT_RPC_WHITELIST entries use RPC_CATALOG qualified names:

| RPC | Minimum access | Consumer semantics |
| --- | --- | --- |
| resolve_canonical_topic_v1 | anon | Exact active resolver; unknown is null, no writes |
| get_experience_topics_v1 | anon | Caller-aware visibility; private/inaccessible is null |
| set_experience_topics_v1 | authenticated | Owner-only atomic desired-state replacement |

Public minimum access never forces an authenticated caller to anon. Strict response/request relationship
checks remain. No root/alias governance, private helper, or server mutation was added to client policy.
No networking was added to shared contract modules and no full Topic feature adapter was introduced.

## Evidence Provenance

Production project: `fslpvtlavhrnxsygkpvi`, ACTIVE_HEALTHY, PostgreSQL build `17.6.1.063`.
Migration remains `20260915140330_canonical_topic_local_foundation_v1.sql`, SHA-256
`2d97c4944228e6bf0150b76c773855c6c1acc417dd8fd270d729adb70142c53a`.
Read-only precheck matched all 17 B2B function body hashes/signatures and INVOKER/empty search_path metadata.
No migration, DDL, function, grant, RLS or generated-types changes occurred in B2C.

Three distinct evidence sources, not an invented positive HTTP association:

1. [B2B rollback-contained Production SQL smoke](./ec3b2b-canonical-topic-production-deploy.md) already
   proved active Topic Question create/update and Experience association success. It was not repeated.
2. B2C real Auth/PostgREST HTTP proved nonempty UUID transport reaches Production, which rejects a
   nonexistent Topic with PT422/TOPIC_INVALID_OR_INACTIVE. This is **not positive nonempty HTTP success**.
3. `scripts/fixtures/ec3b2b-question-with-topic.json` preserves the actual synthetic B2B Question detail
   payload captured during that rolled-back transaction (2026-09-18). The new app parser, detail/list RPC
   parsers and QA compatibility helper all accept it offline. Duplicate, malformed and unsorted responses
   are rejected. This is parser-side positive nonempty evidence, not a new database fixture.

## Real HTTP Verification

Executed 2026-09-21, 00:35:59.887Z to 00:36:25.889Z. Existing approved Auth Admin path created two
confirmed `@example.invalid` identities with random in-memory passwords, then ordinary clients obtained
real JWTs via signInWithPassword. No real user, email/OTP delivery, credential logging or repo secret.
Admin credentials were used only for isolated identity management, bounded cleanup and count assertions;
ordinary RPCs ran with anon or the real A/B JWT, never service_role.

| Check | Result |
| --- | --- |
| Anon exact resolver, unique unknown term, approved parser | PASS, topic=null |
| Question nonempty input through actual createQuestionAnswerClient and real PostgREST | PASS, exactly one request, PT422/TOPIC_INVALID_OR_INACTIVE |
| Failed Question request persistence | PASS, zero synthetic Questions |
| Existing approved RPC creates A private Experience | PASS |
| A get_experience_topics_v1 | PASS, [] |
| A set_experience_topics_v1 with [] | PASS, [] |
| A set with nonexistent UUID | PASS, PT422/TOPIC_INVALID_OR_INACTIVE |
| B get A private Experience | PASS, experience=null |
| B set A private Experience | PASS, PT404/TARGET_NOT_FOUND_OR_INACCESSIBLE |
| Strict current error/response parsing and caller preservation | PASS |
| Empty Question compatibility | Existing regression PASS; no unnecessary new Question |

No positive nonempty HTTP write was attempted because Production has no approved Topic taxonomy.
No persistent synthetic Topic was created, deprecated or deleted. No denied-EXECUTE crash probe.

## Cleanup

Read-only auth.users trigger recheck found the existing pack01 creation of profiles, user_settings and
point_accounts only; their relevant triggers had no external side effects. The two predetermined synthetic
UUIDs were collision-free. No trigger/constraint was disabled. Both sessions were signed out; cleanup ran
B then A. Exact-ID user_settings cleanup was necessary because that legacy table has no auth.users FK;
Auth deletion cascaded the synthetic profile, point account and private Experience.

Synthetic A: `e3b2c000-0000-4000-8000-000000000001`.
Synthetic B: `e3b2c000-0000-4000-8000-000000000002`.
Temporary Experience: `c063c648-997e-4e82-813d-d6b51af22602`.

Independent post-cleanup read-only SQL, separate from the HTTP harness:

| Relation/count | Remaining |
| --- | --- |
| synthetic auth.users / profiles / user_settings / point_accounts | 0 / 0 / 0 / 0 |
| synthetic Experiences / Questions / Experience Topic associations | 0 / 0 / 0 |
| canonical_topics_v1 / canonical_topic_terms_v1 (entire tables) | 0 / 0 |
| question_topics_v1 / experience_topics_v1 (entire tables) | 0 / 0 |
| existing questions_v1 (unchanged total) | 2 |
| person_experiences (unchanged total) | 0 |

**Persistent synthetic rows = 0.** Project remained ACTIVE_HEALTHY; migration head unchanged.
No Advisor rerun: optional in this no-DDL phase; B2B Advisor snapshot remains historical, not a new B2C run.

## Consumer Is Not UI

Current NewQuestion still sends `topicIds=[]`. Topic picker, resolver UI, chips, AI suggestions, automatic
associations and Experience Topic UI are **NOT IMPLEMENTED**. No Question Edit UI was added.
Home/Search/Matching/Editorial runtime remains **NOT IMPLEMENTED**; EC-3C **NOT STARTED**.
Need != Experience; Transition != Topic; Location remains independent; canShare is not Topic identity.
No backend semantics, taxonomy seed, UI/native/WeChat code or EC-4 behavior changed.
profiles.phone Privacy Cutover REMAINS.

## Validation

The first full-suite attempt stopped at a stale EC-3A static guard: it applied the same
`newCodePolicy != may-use-deployed-contract` assertion to Topic and all Discovery domains.
Product Owner reviewed this as a machine-truth scope refinement, not a product contract change or
Production/HTTP failure. The corrective resume preserves all prior HTTP evidence and performs no new
Production operations. Parser and transport semantics are unchanged by this correction.

**Canonical Topic consumer unlocked != Discovery runtime unlocked.** The guard now asserts exact
runtime/policy pairs rather than deleting policy protection:

| Domain | Runtime | New code policy |
| --- | --- | --- |
| homeSearchMatching | legacy-compatibility | blocked-until-phase |
| productChannels | partial | target-contract-only |
| canonicalTopic | production-ready | may-use-deployed-contract |
| editorialFeature | not-deployed | blocked-until-phase |
| location | partial | target-contract-only |
| dynamicNeedInterestSignals | not-deployed | blocked-until-phase |

`DISCOVERY_V1_CONTRACT` still covers `home-search-matching-editorial`; its `productionDeployed`,
`clientConsumable`, `implementationStarted` and `rpcNamesFrozen` remain **false**. Its Topic subsection
records the completed EC-3B2C shared-core-consumer contract, not implemented discovery ranking or UI.
Home/Search/Channel remain legacy pages; Editorial Feature Detail remains blocked. EC-3A historical
evidence is unchanged. Topic guards separately enforce the exact three approved client RPCs and
the 0..N input / deterministic ASC output contract, alongside these closed Discovery boundaries.

`test:canonical-topic-v1` includes `canonical-topic-consumer-check.mjs`: actual B2B payload replay,
separate input/output ordering, case-insensitive duplicates, malformed IDs, no arbitrary cap, exact errors,
request/result association and preserved caller identity. Existing EC-2D adapter/cache/UI boundaries remain
guarded; its nonempty request test now checks the approved B2C transport without claiming Topic UI.
Required repository checks and head CI results are recorded in the closeout PR. No local DB reset,
concurrency rerun, Production SQL write smoke or types regeneration is needed for this contract-only diff.

**DO NOT AUTO-MERGE. DO NOT START EC-3C.**
