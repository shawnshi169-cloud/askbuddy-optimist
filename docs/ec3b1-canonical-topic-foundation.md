# EC-3B1 Canonical Topic Local Foundation

Current: B1 approved/merged in PR #49; B2B backend **PRODUCTION DEPLOYED / VERIFIED**,
client still gated until EC-3B2C. See [Production deployment evidence](./ec3b2b-canonical-topic-production-deploy.md).

The remainder preserves the **historical B1 local implementation/review snapshot**, including its
then-current Production gate and local test evidence; it is not current deployment status.
Historical baseline: `2fc4c575299c590bc7da521150d95c3ce9fe9a35` (PR #48).
Historical status: **LOCAL IMPLEMENTED / REVIEW PENDING / PRODUCTION NOT DEPLOYED / CLIENT NOT ENABLED**.
At that time EC-3A was approved-frozen and EC-3B2 had not started.

## Storage And Governance

One additive migration: `20260915140330_canonical_topic_local_foundation_v1.sql`.
SHA-256: `2d97c4944228e6bf0150b76c773855c6c1acc417dd8fd270d729adb70142c53a`.
Historical migrations and all EC-1/EC-2 non-Topic contracts are unchanged. No taxonomy seed, legacy data
backfill, mandatory association, Topic hierarchy, analytics, Editorial placeholder or polymorphic mapping.

| Relation | Integrity / purpose |
| --- | --- |
| `canonical_topics_v1` | UUID identity, canonical name, generated normalized name, active/deprecated, timestamps |
| `canonical_topic_terms_v1` | One globally unique normalized-term PK for both canonical names and aliases; real root FK |
| `question_topics_v1` | Question/Topic typed RESTRICT FKs; composite PK `(question_id, topic_id)` |
| `experience_topics_v1` | Experience FK CASCADE preserves EC-1 parent lifecycle; Topic FK RESTRICT; composite PK `(experience_id, topic_id)` |

Root `(topic_id, normalized_name)` also references its owned resolver term through a deferred composite FK.
An AFTER root trigger establishes the canonical term. Canonical/alias and alias/alias collisions fail with
`23505`, including same-root duplicate normalized terms. Deleting the owned canonical term fails with
`23503`. Governed root writes use the default deferred constraint mode and validate at commit; they must
not force that circular FK immediate before creating the matching term. A rename retains the previous
term as an alias; it does not redirect IDs or reassign associations. No ordinary root/alias mutation RPC.
Server governance has explicit root INSERT/name/status UPDATE and term INSERT/DELETE, not GRANT ALL.
Root hard-delete is rejected even on the governed path; V1 lifecycle is deprecation, not deletion.

## Normalization And Resolver

Deterministic V1 identity normalization: C-locale ASCII whitespace collapse to one space, trim, and
ASCII A-Z folding to a-z. Chinese and other non-ASCII text, accents and punctuation are preserved.
No locale-dependent Unicode folding, transliteration, unaccent, translation, fuzzy search or embeddings.
The future local parser uses the identical ASCII whitespace/case rule.

`resolve_canonical_topic_v1(text)` does exact normalized name/alias lookup, returns `{topic:null}` for
unknown or deprecated terms, and never writes. Safe summary: topicId, canonicalName, aliases, status.
Historical root/alias records remain readable, including deprecated roots. Admin metadata is not exposed.

## Association Semantics

0..N is the product cardinality, with no arbitrary Topic-count cap. Empty arrays always legal. Input
NULL, NULL elements, multidimensional arrays, nonstandard array bounds and duplicate UUIDs are invalid.
Duplicate policy: **reject INVALID_INPUT**, consistently on Question and Experience mutations.
Read order: **topicId ASC**, independent of input order. No chip-order column or unstable SQL row order.

Desired-state replacement retains unchanged links, deletes omitted links and inserts only new links.
Existing deprecated associations can remain during unrelated content edits or replacement. Removing one
does not permit later re-adding that deprecated Topic. There is no automatic merge/replacement/backfill.
Topic status is checked in database guards for every new link, including direct Data API INSERT.
Deprecation takes an exclusive Topic transaction advisory lock; new associations take the shared lock and
recheck status in a fresh statement. New links serialized before deprecation become historical links;
new links serialized after deprecation fail. Root writes never need to acquire parent locks.

## RPC Compatibility And Projection

| Function | LOCAL change / authorization |
| --- | --- |
| `create_question_v1(text,text,text,uuid[],bigint)` | Exact existing signature/result `{questionId}`; atomic row + Topic associations; authenticated |
| `update_question_v1(uuid,text,text,text,uuid[],bigint)` | Exact existing signature/result `{questionId}`; atomic content + desired-state Topic replacement; owner/open only |
| `close_question_v1(uuid)` | Unchanged; response is ID/status, not a Question DTO |
| `get_question_detail_v1(uuid)` | Unchanged signature; replaced internal `ec2_private.question_detail` now serializes real sorted IDs |
| `list_questions_v1(text,text,integer,integer)` | Unchanged signature/order/pagination; same internal projector gives real sorted IDs |
| `resolve_canonical_topic_v1(text)` | New local exact active resolver; minimum access anon, caller identity preserved |
| `get_experience_topics_v1(uuid)` | New dedicated local read; `{experience:null}` when inaccessible, otherwise ID/topicIds; public or own active private parent |
| `set_experience_topics_v1(uuid,uuid[])` | New dedicated local desired-state mutation; authenticated owner only; returns ID/topicIds |

Existing Question create/update/close responses do not embed Question objects. Answer/Reply projections
contain parent IDs, not nested Questions. Detail/list are the only Question DTO serializers; old Questions
without associations return `[]`, never null. Every existing EC-1 Experience RPC and DTO remains unchanged.
Dedicated Experience association transport avoids new overloads and preserves its deployed consumers.
Topic never substitutes for canShare, Claim or directional Transition; Experience still has no Channel.

## RLS / Grants / Concurrency

All four public relations ENABLE/FORCE RLS; PUBLIC and inherited client/server table grants are revoked
before minimal explicit column grants. Root/terms have public SELECT and no ordinary write policies.
Associations inherit parent visibility; deleted/hidden Questions and private/deleted Experiences do not
leak through link tables. Owners see eligible private Experience links, not tombstone links.
Association INSERT/DELETE require owner + eligible parent; no UPDATE grant can change immutable parents.
Closed Questions reject Topic changes. Direct DELETE on ineligible rows can affect zero rows under RLS;
mutation RPCs return the stable inaccessible/closed error rather than reporting success.

### Experience Parent Lifecycle

EC-1 already cascades `auth.users` deletion to `person_experiences`, and physical Experience deletion to
its dependent Transition/Claim facts. The unmerged B1 Experience-parent FK follows that same CASCADE
lifecycle; Question-parent and every Topic-root FK remain RESTRICT. No historical migration is changed.
Topic root hard delete remains forbidden. Normal `delete_person_experience_v1` remains soft delete:
parent/link storage is retained, but normal Topic reads/mutations cannot access that deleted parent.

Local rollback-contained execution-context audit found child DELETE `CURRENT_USER=postgres` (the child
table owner), `auth.uid()=NULL`, and the parent already physically absent for postgres hard parent delete,
service_role hard parent delete, and privileged auth.users account cascade. PostgreSQL fires the child
trigger for referential-action DELETE too; changing the FK alone reproduced PT401 in the old owner guard.
See [PostgreSQL trigger behavior](https://www.postgresql.org/docs/17/trigger-definition.html).

Only the child trigger's DELETE branch permits an already-absent parent when CURRENT_USER is one of the
repository's existing trusted roles (`postgres`, `supabase_admin`, `service_role`). Both conditions are
required. An existing parent still invokes the unchanged owner/active-parent lock, even for privileged
direct child DELETE. Ordinary callers cannot obtain this exception from parent RLS invisibility: their
CURRENT_USER is not trusted. No SESSION_USER check, trigger-depth shortcut, client flag, GUC bypass,
SECURITY DEFINER, RLS change or privilege expansion is used. Ordinary parent hard DELETE remains denied.

### Unchanged Function Security

Every added/replaced function is SECURITY INVOKER with empty search_path and no PUBLIC EXECUTE.
Only required helpers are executable by client roles; trigger functions are not direct client APIs.
No viewer/owner/requester identity is supplied by the client: actors come from auth.uid().

Question replacement acquires the parent row via an owner-checked no-op title UPDATE, reusing EC-2's
row -> advisory lock order and edit guard. Content and topics therefore commit as one serialized state.
Direct link writes use the same parent gate. Experience replacements use owner-checked non-key parent
row locks, which serialize with soft-delete. Only READ COMMITTED write paths are supported.
Concurrent desired-state replacements use serialized last-lock-winner semantics, not merged/partial sets.
Arbitrary multi-parent direct DML can still be deadlock-aborted by PostgreSQL; callers must roll back/retry
the complete transaction on 40P01, never treat partial work as successful.

## Stable Error Vocabulary

Match exact SQLSTATE + message key, not natural-language detail/context. No private existence disclosure.

| SQLSTATE | Message key |
| --- | --- |
| PT401 | AUTHENTICATION_REQUIRED |
| PT400 | INVALID_INPUT |
| PT404 | TARGET_NOT_FOUND_OR_INACCESSIBLE |
| PT409 | QUESTION_CLOSED |
| PT422 | TOPIC_INVALID_OR_INACTIVE |
| PT409 | UNSUPPORTED_TRANSACTION_ISOLATION |

Direct ACL/constraint failures remain PostgreSQL 42501/23505/23503. Root governance also rejects hard
delete with PT403/TOPIC_HARD_DELETE_FORBIDDEN and immutable identity edits with PT403/IMMUTABLE_FIELD.
Production still uses the deployed empty-only contract, including CANONICAL_TOPIC_NOT_READY.

## Local Evidence And Production Freeze

Local environment: existing isolated Colima context `colima-askbuddy-ec2b`, database container
`supabase_db_askbuddy-ec2b`, Unix socket only; PostgreSQL reference image `17.6.1.095`.
The reference image is local QA evidence, not a Product/Production runtime requirement. No runtime pin
or credentials are committed. See the historical EC-2B image incident record for .105/.106 denial crashes.

- Full repository migration clean reset, including this migration: PASS.
- Root/alias canonical collision, duplicate-term rejection, Chinese/ASCII normalization, unknown resolver
  no side effects, ordinary mutation denial: PASS.
- Question atomic create/update, real sorted read IDs, deprecated retention/new-link rejection,
  closed/hidden/deleted/cross-user checks: PASS.
- Experience owner/private/public/tombstone boundaries and deprecated retention: PASS.
- Corrective lifecycle regression after a fresh full clean reset: postgres and service_role hard parent
  delete remove both Topic links and existing Transitions, retaining the Topic root: PASS. Privileged
  deletion of a dedicated synthetic auth.users parent cascades through Experience and both child types:
  PASS. No unrelated account FK blocked this fixture. Ordinary owner/non-owner hard parent DELETE is
  denied; non-owner link DELETE changes zero rows; privileged direct child DELETE with a live parent still
  requires an owner JWT. Soft delete retains parent/link/Transition storage while hiding normal Topic
  projections from owner, other user and anon: PASS. No Production account deletion was attempted.
- RLS, column grants, FK index coverage, INVOKER/empty path/PUBLIC ACL metadata: PASS.
- Actual SQL resolver/Question/private Experience payloads through local-only strict parsers: PASS.
- Full EC-2 rollback SQL regression: PASS, with only the two obsolete local Topic-error expectations
  substituted in memory; deployed EC-2 scripts/parsers remain unchanged.
- Five real independent-session races: desired-state vs desired-state; content vs Topic replacement;
  close first; Topic replacement first; deprecation vs new association. All PASS; actual lock waits observed.
- Transactional SQL fixtures rolled back; committed concurrency fixtures removed by final isolated clean
  reset, without disabling guards or granting root hard delete. Persistent local synthetic rows = 0.
- Local Advisor (`all`, `level=info`): Security 17 / Performance 356. Topic Security findings = 0.
  Only Topic performance findings are `unused_index` INFO for the two reverse FK indexes on empty
  association tables; expected/non-blocking, retained for FK/reverse lookup coverage. No Topic unindexed
  FK, duplicate-index or RLS-initplan finding. These are LOCAL counts, not Production evidence.
- Required repository typecheck, baseline, Discovery/Blueprint/Question/UI/contracts, production-write
  and fixture-isolation guards, runtime/readiness checks, changed-file lint and build: PASS.
  `npm ci` used the existing lockfile; its audit reports 28 pre-existing dependency findings
  (3 low / 5 moderate / 19 high / 1 critical). No dependency upgrades or audit fixes are in this scope.

Run `npm run test:canonical-topic-v1` for static/parser guards. For real DB tests, set
`SUPABASE_LOCAL_CLI` to an existing CLI binary and run `npm run test:canonical-topic-v1:local` after an
isolated clean reset. The runner rejects nonlocal Docker endpoints and nonempty fixture stores; its
finally cleanup resets only the fixed local project. It never accepts a DB URL or inherits access tokens.

Current production-generated Database types, RPC catalog and CLIENT_RPC_WHITELIST are not authorization
for these new local contracts. Current Shared Core and Production Question parser still reject nonempty
Topic IDs. No Home/Search/Matching/Editorial runtime, UI/native changes or Production access occurred.
`profiles.phone direct Data API Privacy Cutover = REMAINS`.

### Local Generated Types

Supabase CLI `gen types --local --schema public` generated a real local snapshot. The offline
`scripts/canonical-topic-v1-local-types.mjs` checks every existing public table/function/view/enum against
the Production-generated baseline and fails on unrelated schema drift, then mechanically extracts exactly
the four new tables and three new RPC definitions into
`packages/shared-types/src/generated/canonical-topic-v1-local.ts`. Columns and relationships are taken
verbatim structurally from generator output, not manually inferred from SQL. This local-only projection
avoids duplicating the full database snapshot or deleting remote PostgREST/GraphQL metadata merely because
the local CLI output differs. `src/integrations/supabase/types.ts` remains untouched Production truth.
Re-generated after the lifecycle correction: PASS, no generated TypeScript structural/semantic diff;
changing the FK delete action does not change the generated relation/type shape.

## EC-3B2 Gate (Not Started)

Architecture/Security review first, then a separately authorized Production preflight, exact migration
checksum/history checks, deployment, schema/security/rollback smoke and Advisor delta. Production type
regeneration and consumer authorization require their own verified gate. Local success alone never changes
productionDeployed/clientConsumable. No Topic taxonomy is seeded during this foundation phase.
