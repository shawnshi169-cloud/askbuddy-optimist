# EC-3D0 Discovery V0 Readiness Audit

Status: **AUDIT / PROPOSAL ONLY. Discovery NOT IMPLEMENTED / NOT DEPLOYED / NOT CLIENT CONSUMABLE.**

## 1. Baseline and evidence boundaries

- Repository: `shawnshi169-cloud/askbuddy-optimist`.
- Approved and independently fetched `origin/main`: `1bf47b081fe2ebf66119bbb43b6fe5216584f8c0`. Remote main was checked again when resuming closeout and still matched.
- Audit branch: `codex-a/ec3d0-discovery-readiness-audit-v1`.
- Source lineage: PR #57 merge `829731f9e2ac4df25d0f2a3e1ba0d3e545451cb0`; PR #58 merge `25e7ef2f67c11fbb221ead1e5fc264e47997f34a`; PR #59 merge is this baseline.
- Production inspection: 2026-10-11 UTC; initial catalog/count snapshot `02:35:29.704455+00:00`. Only project metadata, schema/function/privilege catalogs, migration names and aggregate counts were read. No personal content export, phone, email, access token or user identifier was collected.
- Local evidence: isolated Docker PostgreSQL, ordinary database roles/JWT claim context, synthetic fixtures inside one top-level `BEGIN ... ROLLBACK`. This is not HTTP, browser, native QA or Production positive-path evidence.
- Changes in this PR: this document and an endpoint-pinned local verification runner/SQL fixture. No existing runtime, migration, contract, whitelist, UI or historical evidence was changed.

Source precedence is merged code plus independently inspected deployed metadata, followed by frozen product semantics and historical phase evidence. Required source review included [Discovery decisions](ec3-discovery-contract-decision.md), [Blueprint decisions](product-blueprint-v1-contract-decision.md), shared-api [Discovery](../packages/shared-api/src/discovery-v1.ts), shared-types [Discovery](../packages/shared-types/src/discovery-v1.ts), [Blueprint](../packages/shared-api/src/product-blueprint-v1.ts), [page map](../packages/shared-api/src/page-contract-map.ts), [Topic](../packages/shared-api/src/canonical-topic-v1.ts) and [Question](../packages/shared-api/src/question-answer-v1.ts).

The EC-3A decision document contains an old statement that taxonomy is unseeded and Topic UI is unwired. Those statements are superseded by C0D and PRs #57-59, not by a new product decision in D0. Its historical audit is preserved. The Question contract also retains a pre-picker comment about UI sending `[]`; executable NewQuestion now accepts optional real selections. Neither stale prose overrides the merged implementation. No unrelated truth cleanup is included.

## 2. Production schema and data

| Observation | Independently read result |
| --- | --- |
| Project | `fslpvtlavhrnxsygkpvi`, `ACTIVE_HEALTHY` |
| Database | build `17.6.1.063`; PostgreSQL 17.6, aarch64, GCC 13.2.0 |
| Isolation | `read committed` |
| Migration lineage | 57 version/name pairs exactly match repository; latest `20261007005206_public_person_privacy_cutover` |
| Required foundations | `20260901154746` Public Person, `20260902145009` Experience, `20260903125354` soft-delete fix, `20260904174215` Q/A, `20260915140330` Topic present |
| Topics | 79 total, 79 active |
| Normalized resolver terms | 192 |
| Question-Topic / Experience-Topic rows | 0 / 0 |
| Canonical Questions / Experiences | 2 / 0 |
| Text-search capability | `pg_trgm` 1.6 installed; no canonical Q/Experience text-search index in inspected indexes |

These counts are a point-in-time observation, not permanent invariants or a global Topic cap. Core v1 contains 79 Topics; the namespace remains extensible. No seed, mutation probe, Auth user, migration, SQL DDL/DML, Edge deployment or grants change was performed on Production. No Production Discovery query/function was introduced.

Metadata sources: `pg_class`, `pg_attribute`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_proc` including actual `prosrc`, `proconfig`, `prosecdef`, `proacl`/`aclexplode`, `has_function_privilege`, `has_column_privilege`, `pg_extension`, and `supabase_migrations.schema_migrations`. Counts used `count(*)` only. The relevant deployed SQL matches the relationships described below; ten actual function body fingerprints were also matched against the isolated local database (section 8).

## 3. Current source and relation map

```text
questions_v1.id (QuestionId)
  -> question_topics_v1.question_id
  -> question_topics_v1.topic_id -> canonical_topics_v1.topic_id
                                    ^
person_experiences.id (ExperienceId)  |
  -> experience_topics_v1.experience_id
  -> experience_topics_v1.topic_id --+

person_experiences.person_id -> auth.users.id (PublicPersonId)
profiles.user_id             -> auth.users.id
get_public_person_profile_v1(PublicPersonId) -> safe Person projection or person:null

experience_transitions.(experience_id,person_id)
  -> person_experiences.(id,person_id)   [public directional facts, not Topics]
experience_claims.(experience_id,person_id)
  -> person_experiences.(id,person_id)   [OWNER PRIVATE, never discovery evidence]
```

All these storage relationships are deployed. Experience's user FK and Transition composite FK cascade; Experience-Topic parent deletion cascades; Topic-root deletion remains restricted. Question-Topic parent/root FKs remain restricted. Topic canonical and alias terms share one normalized collision domain with root/term integrity; associations have pair PKs and reverse Topic indexes. No polymorphic relation or Expert identity substitution is needed.

PublicPersonId is `auth.users.id = profiles.user_id`, never `profiles.id` or `experts.id`. A row owning an Experience does not guarantee an available public Person projection. Discovery must abstain if that projection/evidence is unavailable.

| Current consumer | Actual merged path | Boundary |
| --- | --- | --- |
| NewQuestion | `src/pages/NewQuestion.tsx`, `QuestionTopicPicker`, `features/topics/topicCatalog.ts`, canonical Question adapter -> `create_question_v1` | Optional 0..N actual Topic IDs; zero remains `[]`; no Question Edit picker or automatic association |
| Experience owner | `ExperienceEditor.tsx`, `features/experience/topics/topicApi.ts` -> get/set Topic RPCs | Existing-owner edit only; creation-time Topic UI not wired |
| Public Person | `PublicPerson.tsx`, `PublicExperienceTopics.tsx`, `publicTopicApi.ts` | Canonical public Experience list, then read-only Topic IDs and bounded label batches; never hydrates a guessed private Experience as public |
| Home | `Index.tsx`, `useQuestions`, `useExperts`, `useHotTopics` | Legacy `questions`, `answers`, `experts`, `hot_topics`; not canonical discovery |
| Search | `useSearch.ts` -> `search_app_content_v2` | Legacy question/expert/skill/post collections; Production has no legacy-read fallback; non-Production fallback uses safe profile enrichment |
| Channel | `useChannelFeed.ts` -> `get_channel_feed` | Legacy questions/experts result; not Person evidence discovery or stable Discovery snapshots |

Catalog UI paginates active names and resolves exact aliases; it is not a Question/Experience search engine. Public Experience display's per-card RPCs are reasonable for that bounded page but are not a server-side Discovery recall layer. Native verification of the new pickers/display and WeChat implementation are not claimed.

## 4. Existing RPC reuse and missing contracts

| Existing RPC / read | Approved reuse | Discovery limitation |
| --- | --- | --- |
| `resolve_canonical_topic_v1(text)` | Exact canonical/alias normalization to active Topic | No fuzzy, NLP, segmentation, autocomplete, ranking or entity retrieval; unknown/deprecated returns null; no write side effect |
| `get_question_detail_v1(uuid)` | Safe canonical detail, current Topic IDs and visible Answer count | Single known ID, no candidate recall |
| `list_questions_v1(text,text,integer,integer)` | Channel/status listing; visible open AND closed Questions; deterministic `created_at DESC,id ASC` | No Topic/query/city filter; offset is not a stable multi-request snapshot; full per-row detail enrichment |
| `create_question_v1(text,text,text,uuid[],bigint)` / `update_question_v1(uuid,text,text,text,uuid[],bigint)` | Existing 0..N Topic association semantics remain unchanged | Writes, never discovery recall; duplicate input rejects; deprecated new links reject |
| `get_public_person_experiences_v1(uuid,integer,integer)` | Public live Experiences + directional Transitions for known Person | Per-Person offset; no reverse Topic recall, cross-Person dedup, relevance or cursor |
| `get_experience_topics_v1(uuid)` | Visible Experience association IDs sorted ASC, historical deprecated IDs retained | Owner may access private Experience; not a public-only candidate query; per-ID N+1 at discovery scale |
| `set_experience_topics_v1(uuid,uuid[])` | Owner desired-state mutation only | Not used by Discovery read paths |
| `get_public_person_profile_v1(uuid)` | Safe public identity/projection, missing Person null, no mandatory Expert | Full detail is more than a card needs; contribution answerCount still queries legacy `answers`, not `answers_v1`; never use it as canonical Answer relevance/count |
| `list_question_answers_v1(uuid,text,integer,integer)` | Canonical visible Answers and correct caller-scoped Helpful state | Per-Question offset, not reverse Person recall; fallback needs actual relevant Answer + visible parent; no voter identity evidence |
| Direct canonical association/Topic reads | Grants support bounded joins/label hydration under RLS | No frozen Discovery DTO, ranking, limits, token verification, cursor or cache isolation |
| `search_app_content_v2`, `get_channel_feed`, nearby Expert reads | Preserve legacy consumers only | Wrong entity model/results and pagination; cannot relabel expert row/legacy question as canonical Person/Question |

| Missing read capability | Proposed owner | Required output / safety |
| --- | --- | --- |
| Topic -> public canonical Questions, scope filter | D1 / A | Question-only cards, real IDs/content/counts, stable snapshot |
| Topic/query -> public Experiences -> distinct Persons | D2 / A | One Person card per PublicPersonId, selected relevant public evidence, no private data |
| Relevant public Answer fallback | D2 / A | Only if no suitable public Experience; visible live Answer AND parent; correct author |
| Text search and independent all/person/question sections | D3 / A | Two independent rankings/cursors in all; no Expert/Skill/Post substitution |
| Snapshot issuance, paging, expiry, caller/query/scope binding | D1 foundation / A | Opaque cursor, explicit failure, live visibility recheck; not offset masquerading as snapshot |
| Channel-to-Person evidence eligibility | D2 / A + Product Owner | Experience has no primaryChannel; separately reviewed evidence rule, never Channel = Topic |
| Optional city semantics on Question candidates | D1 contract review / Product Owner | Question has NO city field; no requester/Topic/Experience location inference |
| Experience moderation suppression | D2 security review / Product Owner + A | Experience has NO moderation/hidden column; do not claim parity with Q/Answer moderation |

## 5. Visibility, RLS and grants

Twelve relevant canonical relations have RLS and FORCE RLS: Questions, Answers, Replies, Helpful marks/facts, four Topic relations, Experiences, Transitions and Claims. All 35 policies on these relations match the inspected local foundation policies. `profiles` separately has RLS but not FORCE RLS; public-row policies are intentionally permissive only within the narrowed column boundary.

| Subject | Production metadata/body rule | Discovery requirement |
| --- | --- | --- |
| Question | Public read requires `deleted_at IS NULL`, `moderation_visibility='visible'`; closed still readable | Include closed unless an explicit status filter says otherwise; do not confuse closed with hidden |
| Answer / Reply | Public projector filters own deletion/moderation and ancestors | Deleted/hidden child or hidden/deleted parent cannot supply evidence; author RLS access to an own tombstone is NOT public evidence |
| Public Experience | Public RPC explicitly requires public + not deleted, even for owner | Repeat this predicate in every candidate/hydration query |
| Owner Experience | Authenticated SELECT permits owner rows, including private/deleted rows | RLS alone is insufficient for public discovery; forbid promotion of owner-only rows into results |
| Experience-Topic | Parent live and (public OR owner) | Never use this RPC alone as proof that evidence is public |
| Non-owner / anon | No private/deleted Experience via public RPC; no private associations | Maintain caller role; no service-role hydration shortcut |
| Claim | Authenticated owner-only; anon has no column SELECT | Never join/project Claim, verification material or private source evidence |
| Helpful | Owner-only mark relationship; public fact exposes only answer_id, not mark_id | Counts may be real aggregate facts, never another viewer's relation or Service Reputation |
| Deprecated Topic | Existing links/labels readable; active resolver excludes; new attachment rejects PT422 | Preserve historical IDs; whether deprecated IDs participate in new discovery recall needs an explicit rule, not silent deletion or reactivation |
| Person projection | Safe allowlist; missing row returns null; ordinary non-expert supported | No raw profile/Expert, phone/email, fabricated display/evidence or service requirement |

Direct profile SELECT columns for BOTH anon/authenticated are exactly `user_id,nickname,avatar_url,cover_url,bio,city,school,industry,created_at`; table-wide SELECT is absent. `phone,id,updated_at,gender,city_code,is_verified,is_expert` are not directly selectable. Authenticated UPDATE is limited to `nickname,avatar_url,cover_url,bio,city`. This audit changes none of those grants.

Inspected public canonical read RPCs are SECURITY INVOKER, STABLE, empty search_path, no PUBLIC EXECUTE, with anon/authenticated EXECUTE. Canonical mutation RPCs inspected have authenticated EXECUTE, not anon. New public Discovery contracts must not authorize root/alias governance or owner-private calls. EXECUTE denials were checked as metadata, not by intentional denied-function crash probes.

Exceptions must not be copied: the existing owner-private profile RPC is a tightly scoped SECURITY DEFINER contract, not a discovery source. Legacy `get_channel_feed` is SECURITY DEFINER with public search_path; legacy Search V2 has public search_path and returns legacy entities. No new SECURITY DEFINER or broad grants are proposed to bypass canonical RLS.

No general private/friends/blocked-Person visibility contract exists. No Experience hidden-state rule exists in the inspected schema. D2 must either add separately reviewed moderation suppression or obtain an explicit release-scope decision; it must not claim that private visibility implements moderation. Existing Q/Answer moderation exclusions are already available.

## 6. Recall, indexes and scale

Existing deployed indexes:

| Relation | Useful index shape | Consequence |
| --- | --- | --- |
| `question_topics_v1` | PK `(question_id,topic_id)`, reverse `(topic_id,question_id)` | Exact Topic-to-Question join already supported; use EXISTS/semijoin to avoid duplicate Questions |
| `experience_topics_v1` | PK `(experience_id,topic_id)`, reverse `(topic_id,experience_id)` | Exact reverse Experience recall available; public filtering and Person grouping still needed |
| `canonical_topic_terms_v1` | PK normalized_term; unique `(topic_id,normalized_term)` | Exact resolver, shared alias collision domain |
| `questions_v1` | Partial `(created_at DESC,id)` and `(primary_channel,status,created_at DESC,id)` for live/visible rows; requester FK index | Useful recent listing; all-status Channel listing may need a different leading key/order after measured plans |
| `person_experiences` | Owner/live and public/live `(person_id,sort_order,created_at DESC,id)`; unique `(id,person_id)` | Good Person detail; not a Topic relevance ordering index |
| `experience_transitions` | `(experience_id,sort_order,id)` and owner composite index | Bounded hydration of real directionality |
| `answers_v1` | `(question_id,created_at DESC,id)`, author FK index | Visible fallback by selected Question/author; no canonical text index |

Proposed V0 recall is explainable, not vector/LLM ranking: resolve an explicit entire Topic/alias exactly; retrieve Topic-linked visible Questions and public Experiences; intersect/compare confirmed query context or directional evidence before choosing a Person reason. A broad Topic match is a candidate, not proof of suitable experience. A query expressing a Need must never be converted into a stored Experience. `canShare` is not Topic, Transition is not Topic, Channel is not Topic, and Experience city is not verified Person residence.

For text, literal title/context/description/Transition matching can be a reviewed first step, using bound parameters and escaped wildcard characters. Define Chinese and mixed-language test cases explicitly; an English stemming configuration or exact alias resolver does not establish Chinese Question recall. `pg_trgm` is installed and can support LIKE/ILIKE indexes, but short/nonselective queries need bounded behavior and local plan measurements; no index or latency PASS is inferred from installation. See [PostgreSQL pg_trgm](https://www.postgresql.org/docs/17/pgtrgm.html).

PROPOSED indexes, only if representative `EXPLAIN (ANALYZE, BUFFERS)` justifies them: live-visible Question title/context trigram/lexical index; public-live Experience title/description equivalent; possible live-visible `(primary_channel,created_at DESC,id)` for all-status feeds. Do not duplicate reverse association indexes. Check index operator/collation compatibility and write costs. V0 does not require embeddings or a vector service.

Bound input length, page limit, candidate window, statement time, snapshot lifetime and per-caller issuance rate in D1 review. A LIMIT does not itself bound a popular-Topic join/sort scan. Apply set-based visibility and dedup before page materialization, batch hydrate bounded IDs, and avoid one Person RPC plus one Experience RPC per candidate. Person profile's legacy contribution aggregates should not run for every rejected candidate. Measure skewed Topic fan-out and multiple Experiences per Person, not just the empty Production tables or this tiny local fixture.

## 7. Proposed Discovery V0 APIs and pagination

**Everything in this section is PROPOSED / NOT DEPLOYED. Operation labels below are semantic names, NOT frozen RPC names or whitelist additions.** Existing frozen DTOs are reused, not edited by this audit.

| Operation | Proposed input | Output |
| --- | --- | --- |
| Question discovery | Existing scope (home/channel), optional city, page; separately reviewed explicit Topic/context selector for reverse recall | `DiscoveryPageV1Target<QuestionDiscoveryCardV1Target>` |
| Person discovery | Same scope/page plus reviewed query/Question context; identity only from caller session | `DiscoveryPageV1Target<PersonDiscoveryCardV1Target>` |
| Search questions / persons | Existing query, optional city, page | Corresponding entity page |
| Search all | Query/city plus independent questions/persons page requests | `SearchAllSectionsV1Target`, two separately ranked sections |

The current feed target has no explicit Topic filter. Adding one or a public Question context selector is an additive proposal requiring contract review; it is not already authorized by B2C. Validating a supplied Question context must use its public projection, not privileged access. Suggested first D1 scope is city=null and home/exact Channel with approved Topic filtering. A non-null city cannot silently be ignored or mapped to requester city: Product Owner must approve staged support with an explicit unsupported-filter error, or define and implement the canonical source before that filter ships.

Question cards preserve canonical ID/title/channel/topicIds/status/createdAt/budget and a faithful context excerpt; answerCount counts only currently visible canonical Answers. Person cards expose safe PublicPersonSummary plus one genuinely relevant public Experience (with owned Transitions), or the permitted visible public Answer fallback only when no suitable Experience exists. No numeric match score, invented heat/views/verification/urgency, Expert gate, Service price or fake relevance reason. Reputation/service optional fields remain omitted until real authorized contracts exist. CTA ends at `/person/:userId`.

### Stable snapshot proposal

Simplest feasible design for review: a short-lived bounded server-side ordered entity-ID snapshot, with opaque authenticated cursor tokens and live RLS hydration. This is operational snapshot/cache state, NOT a long-lived database transaction and NOT new user business data. Its server/cache, transport and permission model do not exist yet; D1 must implement/review them explicitly, not hide cache writes inside a supposedly STABLE SQL function.

1. Validate caller JWT or anon context server-side. Initial `cursor=null` obtains a bounded, deterministically ranked ID set from a single read-consistent candidate statement; for Persons select/dedup one evidence ID per Person before paging. Freeze entity order and evidence references, not private payloads or mutable access rights.
2. Store snapshot ID, ordered IDs/ordinals, evidence references, issued/expiry times, ranking version and normalized binding digest. Bind viewer identity (from JWT, never request userId) or anon scope, query, mode/section, home/channel, city, Topic selector and snapshot. Optional per-anon session nonce strengthens isolation without tracking personal data. Authenticate token integrity; expose no raw SQL offset/rank or caller secrets.
3. Subsequent pages validate all bindings, token integrity, TTL and version. Query only snapshot members under the current caller/anon role; explicitly recheck public/live/visible parents, Person availability and evidence still suitable for the same query. A removed/private/hidden/now-unrelated item is skipped; never replace it with a new entity or reorder the remaining snapshot.
4. Cursor advances the last scanned ordinal, not the number returned; bounded scanning may return a short/empty page with a nextCursor. No duplicate entity across distinct advancing pages of one section; retrying the same token retries the same ordinal window subject to current visibility, not a new ranked page. Terminal cursor is null. New content joins only on explicit refresh/new snapshot.
5. Expiry, tampering, missing snapshot, changed account/query/scope/section or rank version fail explicitly with reviewed stable errors. No silent reseed, offset fallback or mixed result sets. Search all uses independent Question and Person snapshot/cursor state.

For service orchestration, carry the real JWT into caller-scoped read RPCs; never use service-role reads to bypass privacy. Private cache access is server-only, capped and TTL-cleaned, with no stored phone/Claim/private result payload. If a database-backed snapshot store is selected instead, its write path/RLS and cleanup need separate design review. No such table, endpoint or function is added here.

Offset pagination, a createdAt cutoff plus live ranking, or READ COMMITTED calls alone cannot freeze mutable Topic/rank membership across HTTP pages. A transaction snapshot exists within a database transaction, not automatically across unrelated calls; this motivates the application snapshot proposal, not an open transaction per browsing session. See [PostgreSQL transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html). All numeric limits/TTL and exact error/RPC names remain review decisions, not new product invariants.

## 8. Isolated local evidence

Command: `node scripts/ec3d0-discovery-local-check.mjs --local`.

The runner accepts no remote URL, CLI target, credentials or arbitrary Docker context. It pins `colima-askbuddy-ec2b`, container `supabase_db_askbuddy-ec2b`, Unix socket and image `public.ecr.aws/supabase/postgres:17.6.1.095`. It refuses nonempty fixture tables, requires the known local migration head, has timeouts and uses ON_ERROR_STOP. One transaction rolls back even when psql disconnects on failure. It creates no table/function/schema, applies no migration, resets nothing and uses no committed fixtures.

Local migration head is `20260915140330`, NOT Production's later privacy migration. All 35 canonical policies matched; the following actual function bodies also matched Production (MD5 is evidence fingerprinting, not a security signature):

| Function | `md5(prosrc)` |
| --- | --- |
| create_person_experience_v1 | `2bb54cf05bd865bd61fc5d947ec67d1f` |
| delete_person_experience_v1 | `c638966a5c6c239148dfb7dae86f4a5c` |
| get_public_person_experiences_v1 | `26e364bb21f16112f463c018885b9bc0` |
| get_public_person_profile_v1 | `a7adfe471f5dcbcbd2a0f8e159665840` |
| get_experience_topics_v1 | `4f1cabf79566135ef1d603e08176595b` |
| set_experience_topics_v1 | `27a0f6a536674232f542d10c53a37a30` |
| resolve_canonical_topic_v1 | `a7aa5f6795c9fa8b57fed04f9bdd257d` |
| create_question_v1 | `252f5348742aa5772dd2f33a448c1e32` |
| get_question_detail_v1 | `7dfda78254842a705e6a7af16a97a2fe` |
| list_question_answers_v1 | `67d29221db1e20d520142f9be2281859` |

The local Auth trigger was inspected before fixtures; it inserts profiles/user_settings/point_accounts in the same transaction. Three local-only users use `@example.invalid`; no Auth Admin API, session, login, OTP or email. Ordinary RPC calls run as authenticated A/B/C or anon, never service_role as a user. Privileged local setup is limited to synthetic root Topics, a missing-profile case, Claim/Transition and moderation states.

| Local assertion | Result |
| --- | --- |
| Question created by A with active Topic T; public Experience created by B linked to T; public Person B returned without Expert | PASS |
| Exact normalized alias resolution; unknown term null | PASS |
| Anon and authenticated non-owner positive Q -> T -> E -> P reads | PASS |
| Private/deleted Experience and private links excluded from public reads | PASS |
| Owner can see own private/deleted rows via RLS, but public projector still excludes them | PASS |
| Unrelated Topic excluded; missing safe Person projection excluded | PASS |
| Two related public Experiences for B collapse to one Person in inline relational proof | PASS |
| Owner Claim retained; other viewer sees zero; no Claim in public Experience output | PASS |
| Non-owner association mutation rejects PT404; caller identity unchanged | PASS |
| Public Person excludes forbidden private fields; public Transition keeps correct parent/person | PASS |
| Deleted/hidden Answers excluded; visible Answer belongs to correct Person; viewer Helpful false without marks | PASS |
| Closed Question remains readable; new Answer rejects PT409 | PASS |
| Hidden/deleted Question and its public Answer/Topic branch excluded | PASS |
| Deprecated Topic removed from resolver, historical Q/E links retained; repeat retained link allowed; new link rejects PT422 atomically | PASS |
| Constraint check, ROLLBACK and post-transaction counts | PASS; 16 relevant tables all zero, equal to pre-test counts |

The inline semijoin/dedup assertion proves relational feasibility only. It is not a deployed Discovery query, relevance quality test, API parser, cursor implementation or ranking test. No tests claim Experience moderation works: that state is absent. Production narrowed profile ACLs were independently verified by metadata, not by pretending this older local DB has them.

## 9. Production verification limitations

Nonempty real Production Question-Topic/Experience-Topic/Experience/Person traversal is **UNVERIFIED** because there are no stored associations or Experiences. No synthetic Production records were created to fill this gap. No Production authenticated HTTP transport, new native/emulator QA, matching quality evaluation, concurrency suite or representative load benchmark was run. No public Person content or real private fields were exported. Schema/grant/body evidence is not a claim of those missing checks.

The prior EC-1/EC-2/Topic deployment evidence remains historical evidence. This audit separately establishes current schema/counts and local role behavior. A future authorized deployment/consumer phase must use a safe approved identity/data plan for transport evidence; it must not treat this document as write authorization.

## 10. Proposed implementation sequence

All slices below are **PROPOSED / NOT DEPLOYED**, independently reviewable, not pre-authorized.

| Slice / owner | Purpose and I/O | Reuse and new capabilities | Index/performance | Privacy and acceptance | Dependencies / rollback |
| --- | --- | --- | --- | --- | --- |
| D1 / Codex A, PO contract approval | Question-only discovery: scope + reviewed Topic/context filter + city contract + page -> canonical Question card snapshot page | Reuse Question/Topic identity, visibility and DTOs; add bounded set-based recall, true canonical Answer counts, snapshot transport/token/TTL | Reuse reverse Topic and partial Question indexes; measure broad Topic/Channel queries, batch hydration; new index only after plans | Anonymous/authenticated parity for public data; hidden/deleted excluded, closed retained; duplicate Topic paths dedup; [] valid; tampered/expired/cross-viewer/filter cursors fail; mid-page hide/update/insertion tests | Resolve city staging, selector, snapshot infrastructure and limits before coding; no Person ranking dependency. Gate consumer off; expire snapshot version/disable new endpoint on failure, no rewrite of applied migrations or delete of user content |
| D2 / Codex A, PO evidence/security review | Person candidates with public Experience preferred, permitted Answer fallback -> distinct Person cards | Reuse public Person summary, public Experience/Transition shape, associations and canonical Answers; add evidence suitability selection, per-Person dedup, channel evidence rule and moderation suppression decision | Topic reverse joins, bounded evidence per candidate; evaluate public text/Answer indexes; no per-candidate full profile RPC fan-out | Private/deleted/hidden evidence excluded even for owner; missing Person abstains; broad Topic not automatic match; evidence PersonId exact; no Expert requirement, Claim or private Helpful/search state; revoke visibility between pages removes result | Depends on D1 snapshot primitives, not Question ranking scores; block D2 release on moderation/evidence decisions. Disable Person endpoint independently, preserve Question endpoint and existing Person detail |
| D3 / Codex A | Search all/person/question with real query -> independent relevant Question and Person sections | Reuse D1/D2 candidate and evidence gates; add bounded Chinese/mixed text recall and explicit query normalization/error contract | Benchmark literal/trigram/lexical alternatives locally; minimum-query/selectivity budgets and safe escaping; no vectors required | Need != Experience; no invented biography/reason; all has separate snapshots/rankings; no legacy expert/skill/post fallback; no private query explanation | D1/D2 complete plus search language rules reviewed. Disable canonical Search rollout separately; preserve explicitly legacy route until consumer authorization, not a silent fallback |
| D4 / Codex B; A reviews shared contract, C handles separate native QA | Home/Channel Shared Core cutover, Question and Person modes -> existing frozen page structure | Consume authorized D1/D2 (D3 for Search navigation); viewer-scoped caches, last-used light mode preference, four Channels; real loading/empty/error; no Home editorial fixtures | Cancel stale requests, separate section caches, no UI N+1 candidate discovery; client page limits | No mixed Question/Person ranking; no fabricated counts; Person CTA only profile; auth/scope switch and cursor-expiry tests | Requires deployed/verified consumer contracts and Product Owner UI authorization. Feature gate off reverts only to explicit existing legacy surface, never fabricate canonical success. Editorial runtime separate; hide absent module |
| D5 / Codex A backend with PO ranking review; B only if separately authorized | Refine deterministic V0 relevance from confirmed Need/query, public evidence and approved signals | Reuse D1-D3 safety/snapshot layer; add versioned explainable relevance and separately governed signal/decay model, not inferred Experience facts | Offline relevance fixtures, fan-out/skew, latency budgets, versioned ranking; no opaque LLM score requirement | Experience relevance first; no public numeric score; no private behavior exposure, fake trust/service rating, paid override or mandatory Service | Needs sufficient genuine data and separate signal/privacy approval. Revert ranking version for new snapshots; reject/expire incompatible tokens explicitly; never silently rerank in-flight pages |

D1 and D2 can share **internal visibility predicates, normalized Topic/query context, bounded candidate-ID utilities, batch-safe Person summary projection and snapshot/token mechanics**. They must retain separate entity candidate sets, evidence filters, dedup keys, rank versions and section cursors. A shared service does not justify a mixed Question/Person ranking or a public generic polymorphic endpoint. No shared helper is implemented in this PR.

## 11. Risks, blockers and recommendation

| Risk / gap | Severity and gate | Required response |
| --- | --- | --- |
| RLS includes own private/deleted Experience and own Answer tombstones | HIGH, D1/D2 public-query security gate | Explicit public/live/visible filtering and ancestor checks plus owner tests; never service-role bypass |
| No stable snapshot runtime; mutable membership/ranking | HIGH, D1 contract/backend gate | Review and implement bounded snapshot/token design; offset/cutoff alone rejected |
| Question city absent; Experience has no channel | MEDIUM, input/semantic gate | PO decides city support/staging and Person Channel rule; reject unsupported filters, do not infer false facts |
| Experience moderation field absent | HIGH, D2 release blocker | Separate moderation/suppression contract or explicit reviewed scope resolution before claiming full frozen safety |
| Equal Topic IDs insufficient relevance; no corpus of real Experiences | MEDIUM, D2/D5 evidence-quality gate | Public concrete evidence plus query/directional suitability, abstention, reviewed real-data evaluation |
| Production positive associations empty | MEDIUM, future verification limitation | Local proof only now; separately authorized real-data/HTTP validation before broader release |
| No canonical text indexes/language strategy or scale measurements | MEDIUM, D1/D3 performance gate | Representative local plans incl. broad/short Chinese queries and fan-out; bounded work, measured indexes |
| Public Person contribution answerCount remains legacy | MEDIUM, D1/D2 projection trap | Derive canonical visible counts from answers_v1; reuse safe summary fields only; no unrelated Person redesign |
| Local DB lacks later privacy migration | MEDIUM, evidence limitation | Keep local function/policy parity scoped; use Production ACL catalogs for privacy, no full-stack parity claim |
| Historical prose and legacy Home/Search/Channel may imply obsolete truth | LOW, review risk | Use current code as authority, keep history intact, do not promote legacy contracts |

**D1 recommendation: GO for Product Owner consideration of a separately authorized D1 contract + local implementation slice; NO-GO for deploying or enabling Discovery now.** The deployed relation model and public Question rules do not require a product redesign to begin D1. Before D1 implementation, freeze its Topic/context selector, city-null staging or supported city source, snapshot infrastructure/binding, bounded limits/TTL, errors and acceptance matrix. If those cannot be approved without changing frozen semantics, STOP for product review. D2 moderation and evidence suitability are explicit later gates, not silently waived by D1 GO.

EC-3A stays frozen. Topic capability and the merged Topic consumers are complete at their documented scopes; Discovery's `productionDeployed`, `clientConsumable`, `implementationStarted`, `rpcNamesFrozen` remain **false**. Editorial, Matching and new Home/Search/Channel discovery remain NOT IMPLEMENTED. No Booking/Payment/Conversation/RTC/EC-4 action is included.

## 12. Verification and closeout

Local focused check above: PASS, no persistent fixtures. Repository results:

| Check | Result |
| --- | --- |
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run typecheck:baseline` | PASS, zero diagnostics |
| `npm run test:contracts` | PASS, entire suite, including engineering/platform readiness and privacy guards |
| `npm run test:canonical-topic-v1` | PASS |
| `npm run test:question-topic-picker` | PASS |
| `npm run test:experience-topic-owner` | PASS |
| `npm run test:public-experience-topics` | PASS |
| `npm run test:production-writes` | PASS |
| `npm run test:fixture-isolation` | PASS |
| `npm run test:runtime-mode` | PASS |
| `npm run lint:changed` | PASS; no changed Core/shared TypeScript files |
| `npm run build` | PASS; non-blocking old Browserslist data warning, no dependency changes |
| `git diff --check` | PASS |
| `node --check scripts/ec3d0-discovery-local-check.mjs` | PASS |

Production mutation: **NO**. Production DDL/DML/migration/Auth users/synthetic content/Edge/grants: **NO**. No consumer, native or WeChat changes. Draft PR only; do not merge, deploy, or initiate D1 without separate Product Owner authorization.
