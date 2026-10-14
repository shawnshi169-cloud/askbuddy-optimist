# EC-3D1B trusted transport and shared snapshot storage

All new transport, storage, and schema artifacts are **PROPOSED / NOT DEPLOYED**.
Local implementation and required repository gates: **COMPLETE**.
This is not Production readiness or deployment approval. Independent review is required.

## Lineage

- Approved main and branch base: `30c4b04f0d627a3c1cbba0c61876c74ac35566ab`.
- Branch: `codex-a/ec3d1b-question-discovery-transport-v1`.
- Worktree: `/private/tmp/askbuddy-ec3d1b-question-discovery-transport-v1`.
- Resume authorizations #1-#12 retain the original D1B implementation; #11 permits
  the exact local pg_trgm ACL difference, #12 the exact profiles physical layout.
- Evidence window: 2026-10-13 to 2026-10-14, final repository suite on October 14
  (Asia/Shanghai). An approval-quota interruption executed no integration command;
  the interrupted D1B command and full suite subsequently ran successfully.
- Fresh GitHub main read matched the approved baseline. Existing dirty work retained.
- Delivery is one focused commit and a Draft PR; no merge, Production access,
  deployment, client activation, or automatic D1C work.

Sources: merged `docs/ec3d0-discovery-readiness-audit.md`,
`docs/ec3d1a-question-discovery-local.md`, frozen
`docs/ec3-discovery-contract-decision.md`, D1A implementation and Canonical
migrations. No frozen product contract or deployed Canonical RPC was changed.

### Historical resume #11 stop (resolved by #12)

Under #11, `node scripts/question-discovery-bootstrap-check.mjs --local`
failed at `verifyRegressionBootstrap` in `scripts/lib/d1a-regression-bootstrap.mjs`, with:

```text
D1A additional security/catalog parity failed
public.profiles.created_at: source attnum=8, restored attnum=7
public.profiles.city_code: source attnum=14, restored attnum=11
public.profiles.is_verified: source attnum=19, restored attnum=16
```

Read-only source catalog inspection confirmed dropped column slots 7, 12 and
13 in `public.profiles`. The schema-only restore has consecutive live-column
numbers. `canonicalCatalog` compares raw `attnum` for live columns, so its exact
comparison failed. Work correctly stopped without bypassing that assertion.
The additional Auth/signup behavior and D1A regression were not reached in #11.
The separately authorized #12 repair and successful reruns below supersede
that checkpoint without rewriting it as a historical PASS.

## Architecture decision (local prototype only)

| Option | Fit and tradeoffs | Decision |
| --- | --- | --- |
| Supabase Edge + shared Postgres state | Existing repository Edge Functions use Deno; reuses the backend vendor, but Node crypto/pg, connection leases and limits cannot be assumed Edge-compatible. Requires a separately verified runtime/SQL adapter and connection budget. | Viable deployment candidate, not proven or deployed here. |
| Server-side Node API + existing Supabase Postgres | Directly exercises D1A's Node/pg implementation, ordinary caller RLS and shared transactional storage; no new cache vendor. Requires approved API hosting, TLS/ingress, managed secrets and safe database connectivity. | Selected isolated implementation; conditional recommendation, no hosting procured or irreversible vendor dependency. |
| PostgREST RPC-only or separate KV/Redis | Existing RPC surface has no private snapshot/session store or this transport contract. New public RPCs or an external store add contracts/infrastructure not approved here. | Not selected; no vendor purchase, new public RPC or client whitelist entry. |

Repository evidence: the app is Vite/React, with existing
`supabase/functions/wechat-auth`, `wechat-prepay` and `payment-webhook`, not an
approved generic Node API deployment. Local workers are test-only loopback
HTTP processes, not production routes. Existing Supabase Auth issuer/JWKS is
the intended trust source; no new identity provider is introduced.

Ongoing costs remain unpriced: API instances, database connections/IO/storage,
TLS/ingress and monitoring require owner approval and real workload sizing.
The prototype prefers explainable bounded SQL over another paid service.

## Trust flow and contract

`DiscoveryHttpAdapter` explicitly accepts a Web Request and a trusted ingress
fingerprint. No app route registers it. The test worker derives ingress from
its socket, not arbitrary forwarded headers. The adapter requires POST, an
exact allowed Origin, JSON, and bounded request bytes. Responses are no-store
and use `{ok:true,page}` or `{ok:false,error}`; SQL/token/private errors are not
returned verbatim.

Input remains D1A: HOME or exact catalog CHANNEL, optional exact active Topic
UUID, `city=null`, opaque cursor and limit 1..20. Invalid/inactive Topic and
non-null city fail explicitly. No free text, Person, Experience, Expert or
legacy fallback. Cards retain the frozen Question target fields, real visible
canonical Answer counts and faithful stored-context excerpts. Recall uses a
complete ordered ID set (`created_at DESC, id ASC`), and hydration rechecks
visibility, Topic and Channel on each page. No profile identity is fabricated.

JWT verification uses jose, fixed issuer/audience, ES256/RS256 signatures,
exp/iat, UUID sub/session_id and authenticated role. Malformed/forged/expired
tokens and wrong issuer/audience are rejected. Principals have a private
process brand; arbitrary client claims or viewer UUIDs cannot enter the caller
adapter. The optional network implementation uses publishable-key
`/auth/v1/user`, not Auth-table SELECT or service_role. Deleted-account/session
revocation behavior and a genuine local Supabase session are deployment gates;
this does not promise immediate global token revocation.

Anonymous callers receive an AEAD-protected `__Host-d1b-scope` cookie with
Secure/HttpOnly/SameSite=Strict/Path=/. Its server-generated UUID, nonce and
epoch are backed by shared storage. Login/logout/account switch rotates the
epoch/nonce atomically; stale cookies/cursors fail, not silently restart.
Bearer identity and anonymous session are not accepted from the JSON body.
TLS/browser Secure-cookie enforcement was not tested by loopback Node fetch;
only the emitted flags and actual isolated HTTP protocol were verified.

### Two SQL trust domains

- Caller pool directly logs in as local `authenticator`; an exclusively leased
  READ ONLY transaction installs verified anon/authenticated role/JWT context
  with transaction-local settings. Canonical recall/hydration never use the
  operational role, service_role or privileged projections. Identity is checked
  before/after; failed/cancelled leases are destroyed, successful leases checked
  clean before reuse. SQL values are bound parameters.
- Operational pool directly logs in as task-created `d1b_operations`, with no
  SET SESSION AUTHORIZATION impersonation. LOGIN, NOSUPERUSER, NOBYPASSRLS,
  NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOINHERIT; no memberships or table
  ownership; connection limit 8 and 30-minute validity. Random credentials stay
  in memory/private child IPC, not files/arguments/logs.
- Exact storage grants: schema USAGE, gate SELECT/UPDATE, and
  snapshots/sessions/rates SELECT/INSERT/UPDATE/DELETE; disposable DB CONNECT.
  Actual Canonical/Auth/pg_authid reads and SET ROLE to application/setup roles
  are denied. Authenticator/anon/authenticated cannot use operational schema.
- Existing local PUBLIC CONNECT/TEMP on the source database is inherited and
  explicitly recorded, not newly granted. No source login or business grants
  were given to the operations role. It cannot CREATE in source DB/public,
  access the extension owner role or manage pg_trgm. No cluster auth changes.

## Shared storage, keys and budgets

`operational.proposed.sql` is outside migrations and creates private operational
gate/snapshot/session/rate relations only inside the disposable database.
`window_bucket = floor(now / 60000)` replaces the reserved identifier without
changing quota semantics. `FOR UPDATE` on the singleton gate serializes quota
checks and creation in short transactions. Only expired state is reclaimed;
live snapshots are never silently evicted. State stores encrypted ordered IDs,
hashed caller/query bindings and bounded session/rate metadata, not Question
payloads or profiles. Separate committed connections/processes read the same
snapshots. No open transaction spans pages.

AES-256-GCM protects cursor, session and stored snapshot state with purpose and
key ID in authenticated data. Cursor includes snapshot ID, scan position,
binding, rank and expiration; no plaintext private identity. A maximum-three
key configuration is injected explicitly, never discovered from VITE settings
or given default secrets. Keys have notBefore/encryptUntil/decryptUntil with
at least a 30-minute decrypt overlap; tests cover active keys shared across
instances, overlap, retirement, wrong purpose and tampering. Hosts must share
the active/overlap keyset and have synchronized clocks before deployment.

| Prototype limit | Value |
| --- | --- |
| Page / snapshot TTL / cursor | 1..20 / 10 minutes / 512 bytes |
| D1B complete candidates | 2000; 2001 explicitly rejected, never truncated |
| Shared snapshots | 128 globally / 4 per subject |
| Accounted snapshot storage | 16 MiB; measured 104931 bytes for 2000 IDs |
| Anonymous sessions | 1024, 30-minute lifetime |
| Rate keys | 4096 minute buckets |
| Minute rates | global 600, ingress 120, subject 60, new session 10/ingress, snapshot issuance 4/subject |
| Inflight / body / response | 4 per instance / 2048 bytes / 262144 bytes |
| Acquisition / statement / lock / idle / request timeout | 1s / 2s / 1s / 5s / 5s |

These are local operational parameters, not permanent product cardinalities.
D1A's default 500-ID memory implementation stays available for its own
regression; D1B injects a 2000-ID budget and shared store. At maximum measured
payload size 128 snapshots account for about 12.81 MiB, leaving snapshot-budget
headroom, not a promise of total PostgreSQL memory/disk usage. Index/WAL/session
overhead and popular Topic/Channel fan-out need production-sized measurement.
The singleton quota lock is deliberately simple and can become a contention
bottleneck. Fixed-window limits are not comprehensive distributed abuse defense.

Errors are explicit: existing INVALID_INPUT/CHANNEL/PAGE_LIMIT,
UNSUPPORTED_CITY_FILTER, TOPIC_INVALID_OR_INACTIVE, cursor/context/rank errors,
snapshot expired/unavailable/capacity and data-integrity errors remain.
Transport adds invalid token/session, AUTH_UNAVAILABLE, rate/capacity,
untrusted ingress/database, storage corruption, request timeout/abort and
key-configuration/unavailable errors. Invalid cursors do not restart a feed;
unavailable/corrupted state fails closed. HTTP tests exercise the error envelope
separately from database behavior.

## Local target and isolation

Verified local pins:

| Property | Value |
| --- | --- |
| Docker context | `colima-askbuddy-ec2b` |
| Container | `supabase_db_askbuddy-ec2b`, ID prefix `5c5fce8e58be` |
| Image | `public.ecr.aws/supabase/postgres:17.6.1.095` |
| PostgreSQL system identifier | `7686149510228885542` |
| Connection endpoint | `127.0.0.1:54322`, local only |
| Source database | `postgres`, inspection session read-only |
| Local source migration head | `20260915140330` |

The local foundation predates Production profile privacy changes; it is not
current Production profile-security parity. No real user data enters fixtures.
The harness checks actual database name/OID/system ID against a private
capability issued only after creation. No arbitrary database URL or fallback
to fixture writes in source `postgres` is accepted.

The source's whole-schema dump is used only for an integrity hash, never as a
restore artifact. Managed Realtime (`realtime.list_changes` and its restricted
logging setting), Storage, Messaging, Payment and legacy Search are excluded.
Their definitions are not modified. The reviewed Canonical/Auth dependency
manifests remain explicit in `scripts/lib/d1b-canonical-bootstrap.mjs` and
`scripts/lib/d1a-regression-bootstrap.mjs`.

## pg_trgm structural parity

The fresh disposable pg_trgm gate passed:

- Exact extension: `pg_trgm`, version `1.6`, namespace `public`.
- Source and target owner: `supabase_admin`, same cluster role OID `10` and
  role attributes. Installation used existing nonsuperuser `postgres`, not
  an owner login, role impersonation, or new membership.
- All 47 extension member identities match, including 31 function signatures,
  definitions, owners, security properties, configuration and membership.
- Functions remain SECURITY INVOKER, with `proconfig=NULL`.
- `public.gin_trgm_ops` has the same GIN access method and extension membership.
- `idx_profiles_nickname_trgm` and `idx_profiles_bio_trgm` were restored with
  exact definitions, owners, validity/readiness/liveness, expression, collation
  and operator-class metadata. Neither index was excluded.

Installation is disposable-only, without CASCADE, source extension changes,
new role privileges, or a fuzzy Discovery Search implementation.

## Exact raw-ACL exception

```text
PG_TRGM_RAW_ACL_PARITY = NOT IDENTICAL
PG_TRGM_RAW_ACL_EXCEPTION = REVIEWED LOCAL ONLY
```

For each of the following 31 exact signatures, normalized source ACLs contain
non-grantable EXECUTE from grantor `supabase_admin` to `PUBLIC`,
`supabase_admin`, `postgres`, `anon`, `authenticated`, and `service_role`.
Target normalized ACLs retain `PUBLIC` and `supabase_admin`; the four other
explicit entries are absent. There are exactly 124 reviewed missing entries.
Raw ACL/null metadata and normalized explicit grants remain separately
inspected. The comparison does not assert that the raw catalogs are identical.

```text
public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal)
public.gin_extract_value_trgm(text,internal)
public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal)
public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal)
public.gtrgm_compress(internal)
public.gtrgm_consistent(internal,text,smallint,oid,internal)
public.gtrgm_decompress(internal)
public.gtrgm_distance(internal,text,smallint,oid,internal)
public.gtrgm_in(cstring)
public.gtrgm_options(internal)
public.gtrgm_out(public.gtrgm)
public.gtrgm_penalty(internal,internal,internal)
public.gtrgm_picksplit(internal,internal)
public.gtrgm_same(public.gtrgm,public.gtrgm,internal)
public.gtrgm_union(internal,internal)
public.set_limit(real)
public.show_limit()
public.show_trgm(text)
public.similarity_dist(text,text)
public.similarity_op(text,text)
public.similarity(text,text)
public.strict_word_similarity_commutator_op(text,text)
public.strict_word_similarity_dist_commutator_op(text,text)
public.strict_word_similarity_dist_op(text,text)
public.strict_word_similarity_op(text,text)
public.strict_word_similarity(text,text)
public.word_similarity_commutator_op(text,text)
public.word_similarity_dist_commutator_op(text,text)
public.word_similarity_dist_op(text,text)
public.word_similarity_op(text,text)
public.word_similarity(text,text)
```

`scripts/lib/d1a-pg-trgm-acl.mjs` enforces this deterministic signature and
grant set. It rejects extra/missing members, unrelated/Canonical functions,
changed signatures/owners/security/configuration/definitions, unexpected
grantors/grantees/privileges/options, and loss of PUBLIC EXECUTE. It is not a
prefix or public-schema wildcard. Canonical/Auth/operational ACL checks do
not use this exception and remain strict.

The approved bootstrap role lacks the grant authority needed for exact
extension function restoration. No GRANT restoration was attempted under
resume #11, and no escalation/default-privilege/system-catalog change is
permitted. Ownership metadata is not treated as proof of caller permissions.

Both source and target have no corresponding function `pg_init_privs` entries.
The source currently has public-schema function default ACLs for creating roles
`postgres` and `supabase_admin`, granting non-grantable EXECUTE to `postgres`,
`anon`, `authenticated`, and `service_role`. These defaults are consistent
with the observed explicit entries, but current catalogs alone do not prove
whether those entries arose at creation or through later grants. No historical
provenance beyond this observation is claimed.

Future removal of PUBLIC EXECUTE can make this explicit-grant difference
operationally significant. The exception is not transferable to Production;
deployment requires fresh privilege/default-ACL/member inspection.

## Effective permission matrix

Fresh source/target comparison passed for all 31 functions and seven persistent
role identities (217 rows), then eight including the actually created
operational role (248 rows), with all three permissions checked:

| Role | Schema USAGE | EXECUTE | EXECUTE WITH GRANT OPTION |
| --- | --- | --- | --- |
| PUBLIC (catalog role OID 0) | YES | YES | NO |
| postgres | YES | YES | NO |
| anon | YES | YES | NO |
| authenticated | YES | YES | NO |
| authenticator | YES | YES | NO |
| service_role | YES | YES | NO |
| supabase_admin | YES | YES | YES |
| d1b_operations (actually created and removed) | YES | YES | NO |

The owner/superuser's effective grant authority is distinct from the explicit
ACL grantable flags. PostgreSQL's supported privilege-check functions are
used, not an inferred result from PUBLIC alone.

`d1b_operations` was tested through actual direct login and source/target
catalog checks, with no extension-owner-role access or DB/schema CREATE.
This completes the earlier #11 missing-role verification; it is not based on
controlled metadata alone.

## Reviewed profiles physical layout

```text
PROFILES_PHYSICAL_ATTNUM_PARITY: NOT IDENTICAL / REVIEWED LOCAL EXCEPTION
PROFILES_LOGICAL_COLUMN_PARITY: VERIFIED
```

Only `public.profiles` receives this exception. The source must have exactly
three dropped slots (7, 12, 13); target must have none. The approved historical
`20260416143000_pack_01_user_and_accounts.sql` contains DROP COLUMN operations
for points_balance, latitude and longitude. Dropped catalog placeholders do
not retain original column names; the physical observation and migration
provenance are recorded separately.

| Surviving column | Source attnum | Disposable attnum |
| --- | --- | --- |
| id | 1 | 1 |
| user_id | 2 | 2 |
| nickname | 3 | 3 |
| avatar_url | 4 | 4 |
| bio | 5 | 5 |
| phone | 6 | 6 |
| created_at | 8 | 7 |
| updated_at | 9 | 8 |
| city | 10 | 9 |
| cover_url | 11 | 10 |
| city_code | 14 | 11 |
| gender | 15 | 12 |
| school | 16 | 13 |
| industry | 17 | 14 |
| is_expert | 18 | 15 |
| is_verified | 19 | 16 |

`d1a-profile-column-parity.mjs` retains raw relation/name/attnum/dropped rows,
requires the exact 16-column live sequence, then compares type/typmod,
collation, nullability/defaults, identity/generation, storage/compression,
column options, ACL/null metadata and effective role privileges. Every other
table retains strict physical comparison. The five-table Canonical catalog
comparator is unchanged. No fake dropped columns or system catalog edits.

Each database independently resolves conkey/confkey/indkey/tgattr to named
columns before comparison. All 37 restored constraint/index/trigger reference
groups and 133 scoped pg_depend edges match; missing/dropped references fail.
Expression indexes retain their exact meaningful SQL, predicates and metadata.
PK/FK/unique/check definitions and trigger enabled states/arguments remain
strict. No dependent object is removed to make parity pass.

Positional review: all scoped fixture/signup INSERTs name their columns;
the signup function inserts only user_id/nickname, settings user_id and point
account user_id. Updated-at triggers address NEW.updated_at by name. Reviewed
function bodies contain no positional SELECT star, profile ROWTYPE/ordinal
access or dynamic SQL; D1A runtime SQL reads no profiles at all. Auth ID FKs
resolve to `auth.users.id` in each database. Full signup and Question regression
behavior passed without changing business function bodies.

Pure comparison tests reject 30 scenarios, including extra dropped slots,
missing/extra/renamed/reordered live columns, semantic attributes, raw ACL or
effective privilege drift, changed constraints/indexes/triggers, wrong or
unmappable column references, and unapproved-table attnum differences.
Reference: PostgreSQL 17 [pg_attribute](https://www.postgresql.org/docs/17/catalog-pg-attribute.html)
and [pg_depend](https://www.postgresql.org/docs/17/catalog-pg-depend.html).

## Scoped Canonical and Auth evidence

The unchanged five-table Canonical gate passed on the final tree:
5 tables, 10 functions, 11 policies, 25 constraints, 13 indexes and
6 triggers. Owners, ACLs, function bodies/proconfig, RLS/FORCE RLS and ordinary
role behavior were checked. The 10 function fingerprints were emitted by the
runner. This is the exact audited subset, not all Canonical database objects.

Auth support is TEST ONLY: minimal `auth.users`, source-equivalent `auth.uid`
body/observable behavior, with the documented Auth-helper owner difference
(`supabase_auth_admin` source versus `postgres` fixture). No credentials,
session service, or genuine Supabase-issued JWT is implied. The additive D1A
manifest adds email/metadata fields and the source signup trigger/projection
chain. Its 3 additional tables, 6 functions, 14 policies, 14 constraints,
16 indexes and 6 triggers (including Auth signup) passed owner/security/ACL/RLS,
body fingerprint and signup/PT422 behavior checks. Nine disposable tables are
tracked, not the original 16; no fabricated migration history is inserted.
No expanded Auth ownership exception was introduced. Every restored object is
enumerated by the manifests plus captured catalogs; unrelated managed objects
remain excluded.

Additional functions are update_updated_at_column, handle_new_user_pack01,
validate_ids, validate_question, replace_question_topics and update_question_v1.
They are needed for signup projections, field timestamps and rejecting new
deprecated associations. The SECURITY DEFINER signup helper retains original
postgres ownership, search_path and ACL, rather than acquiring a new security
mode. Profile/settings/point table ACLs intentionally reproduce the reviewed
old local source, not present Production privacy grants.

The earlier nullable-column ACL regression also passed: all 34 columns in
profiles/user_settings/point_accounts retained, 680 column/role/privilege rows,
table/schema/effective privilege and grant-option checks. NULL and empty raw
ACL state remain distinct. Nonempty malformed ACL arrays still fail.

## Historical checks in resume #11

| Gate | Historical result |
| --- | --- |
| pg_trgm exception unit tests | PASS, exact difference plus function/ACL/effective/member negatives |
| pg_trgm owner unit tests | PASS |
| `question-discovery-pg-trgm-check.mjs --local` | PASS, extension/index parity and cleanup |
| `question-discovery-acl-check.mjs --local` | PASS |
| `question-discovery-bootstrap-check.mjs --local` | FAIL, additional D1A `profiles.attnum` comparison |
| `test:question-discovery-v1:local` | NOT RUN after mandatory STOP |
| `test:question-discovery-transport-v1` | NOT RUN after mandatory STOP |
| `test:question-discovery-transport-v1:local` | NOT RUN after mandatory STOP |
| Complete repository suite | NOT RUN after mandatory STOP |

The original D1A evidence remains historical; this document does not claim
those earlier runs used disposable databases.

## Final verification after resume #12

All commands below passed, including a complete post-`npm ci` regression run:

| Command | Result |
| --- | --- |
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run typecheck:baseline` | PASS, zero diagnostics |
| `npm run test:contracts` | PASS, complete unchanged chain |
| `npm run test:canonical-topic-v1` | PASS |
| `npm run test:canonical-topic-manifest-v1` | PASS |
| `npm run test:question-topic-picker` | PASS |
| `npm run test:experience-topic-owner` | PASS |
| `npm run test:public-experience-topics` | PASS |
| `npm run test:question-discovery-v1` | PASS |
| `npm run test:question-discovery-v1:local` | PASS, real disposable PostgreSQL |
| `npm run test:question-discovery-transport-v1` | PASS, strict TS + signed-test-issuer/crypto/adapter |
| `npm run test:question-discovery-transport-v1:local` | PASS, two OS processes + HTTP + PostgreSQL |
| `npm run test:production-writes` | PASS |
| `npm run test:fixture-isolation` | PASS |
| `npm run test:runtime-mode` | PASS |
| `npm run test:ui-engineering-readiness` | PASS |
| `npm run test:ui-platform-readiness` | PASS |
| `npm run lint:changed` | PASS, no changed Core/shared TS; local backend strict TS tested separately |
| `npm run build` | PASS, production-mode build |
| `git diff --check` | PASS |

Also passed: profile-column (30 negatives), pg_trgm owner/exception, SQL
dependency scanner focused tests; real local pg_trgm/index, nullable ACL,
complete Canonical/Auth bootstrap, and operational schema/direct-login gates.
No failed assertion was removed or skipped. No test mocks replace required
real PostgreSQL assertions. No existing global Discovery flags were activated.

`npm ci` reported 44 dependency vulnerabilities (2 low, 7 moderate, 32 high,
3 critical). The lockfile is unchanged; no audit remediation was attempted.
The build warned that browsers data is old. Both remain documented follow-up
risks, not hidden clean-security claims.

### PR #62 review fix: required offline CI coverage

Independent review of `fa9fafe0cad9bc28c2e345b5a67430c6f3fd3aaa` found
that the D1B offline transport/security test passed locally but was absent
from the required CI path. `test:contracts` now invokes
`npm run test:question-discovery-transport-v1` exactly once, after D1A's
offline check. The existing GitHub `quality-gate` runs this complete chain.
The Docker/PostgreSQL `:local` integration commands remain opt-in and are
not added to GitHub-hosted CI. Test implementations and security assertions
are unchanged; offline evidence still does not verify real Supabase Auth.

Security backlog remains open: the previously recorded 44 dependency audit
findings (2 low, 7 moderate, 32 high, 3 critical) require separate triage and
remediation. This CI-only fix does not upgrade dependencies or change the
lockfile. Historical optional legacy lint debt is reported separately from
the required quality gate, not suppressed.

### Functional, security and performance evidence

D1A regression retains anonymous/owner/non-owner parity, open/closed inclusion,
hidden/deleted exclusion, zero/one/multiple Topics, exact Topic/Channel filters,
historical deprecated retention and PT422 rejection, real visible Answer
counts, missing profile, safe cards, identity/role-drift rejection, stable order,
live insert/delete/moderation/Topic/Channel churn, replay/terminal/dedup, full
500-ID/25-page traversal and explicit overflow. Nine fixture tables return to
zero by rollback before disposable teardown. All fixture writes target the
harness-owned DB, never shared postgres.

Post-install EXPLAIN (2012 fixture Questions): anon home 0.440ms, Channel
0.536ms, Topic 2.371ms, hydration-20 3.718ms; authenticated 0.593/0.695/2.490/
3.531ms respectively. Existing list and reverse Topic indexes are used; the
Topic plan has up to 2010 node loops. These are small local measurements, not
a scale claim. No new business index was added.

D1B real PostgreSQL/HTTP evidence:

- Independent committed pools read the same sealed 2000-ID snapshot (104931
  accounted bytes). With one existing caller snapshot, 8 concurrent issuances
  admit exactly 3 and reject 5; no quota overshoot. Global cap, rate minute
  bucket, TTL, missing/corrupt snapshot and session epoch checks pass.
- Two independently spawned OS worker processes use separate pools and shared
  storage/keys. Cross-user/session/account-switch replay, fixation, oversized
  input, filter/page mismatch and cursor tampering fail. No fake viewer ID.
- Full 2000-ID/100-page traversal returns 1998 after live hidden/deleted changes;
  current canonical Answer counts rechecked. 2001 IDs produce explicit overflow.
  Load tests advance a controlled test clock across rate windows; they do not
  establish an unthrottled Production throughput figure.
- 18 concurrent A/B/anon ordinary-role requests reuse two backends without
  role/claim leakage. Rollback, statement timeout, abort and replacement
  connections pass. Operations direct LOGIN, exact grants, denied Canonical/
  Auth reads, denied role escalation and ordinary caller separation pass.
- Latest 124 loopback HTTP requests: p50 27.9ms, p95 67.0ms, max 209.7ms;
  concurrent storage issuance measurement 123.9ms. Local, not Production SLOs.
- Cursor AEAD, purpose binding, tampering, cross-instance keys, overlap and
  retirement pass. JWT signatures are independently signed test-issuer tokens;
  account lookup is a test double. REAL SUPABASE AUTH remains NOT VERIFIED.

## Cleanup and source integrity

Final-tree disposable databases were all removed and absence verified:

| Gate | Database | OID |
| --- | --- | --- |
| #12 pg_trgm focused | ec3d1b_disposable_39473d60efbc431b | 21978 |
| #12 complete bootstrap | ec3d1b_disposable_839d8e67dca14c49 | 22305 |
| #12 initial D1A | ec3d1b_disposable_f7bed5bc6703479b | 22632 |
| Resumed D1B | ec3d1b_disposable_68ac3c12a6ab422d | 22959 |
| Post-install D1A | ec3d1b_disposable_78956e617b1f483e | 23233 |
| Post-install D1B | ec3d1b_disposable_019d50e7741344ee | 23560 |
| Operational direct-login gate | ec3d1b_disposable_2cbbc280e8544d9e | 23834 |

Each run closed task connections, joined/killed only its owned workers where
applicable, dropped exactly its verified DB/OID and task-created role, and
verified original schema hash, all 16 original table counts (zero), pg_trgm
metadata/ACLs, and absence of original d1b_operational. No residual disposable
DB/role or worker remains. No broad database/role cleanup or source fixture SQL.
Committed D1B test state was necessary for independent-connection visibility
and confined to the authorized disposable database; D1A retains fixture
rollback within its own separate disposable database.

Historical #11 cleanup (also preserved):

- Focused extension database `ec3d1b_disposable_e5af810302034fe2`, OID `21324`,
  removed and absence verified.
- Failed bootstrap database `ec3d1b_disposable_72ee4a0ac78f472f`, OID `21651`,
  removed and absence verified by the failure-path finally block.
- No operational role or HTTP worker was created in those historical #11 runs.
- Original 16 tracked table counts unchanged and all zero.
- Original whole-schema fingerprint and pg_trgm metadata unchanged.
- Original `d1b_operational` absent.
- Final read-only catalog query found no D1B disposable databases or operational
  role. No source fixture writes or source permission changes occurred.

## Remaining D1C gates

D1B local implementation is complete for independent review. D1C rollout is
**NO-GO / NOT AUTHORIZED**. The implementation is a local-only shared-Postgres
prototype, not an active endpoint. All above local evidence is separate from
Production data/schema/HTTP parity.

Real isolated Supabase Auth-issued sessions remain **NOT VERIFIED**. Test-issuer
JWT security tests are not Supabase Auth E2E. Further gates include approved
hosting/runtime selection, ordinary caller-scoped connection provisioning,
shared operational storage approval, secure cursor-key distribution/rotation,
production-sized load/abuse budgets, fresh Production schema/privacy/security
preflight, and a separately reviewed deployment/rollback plan.

Proposed rollout order, not authorization: approve hosting and ordinary-role
credentials; prove genuine Auth and TLS/cookie/ingress semantics in isolation;
approve exact private operational schema and key management; test contention,
fan-out and durability on representative data; refresh Production preflight;
only then authorize a controlled endpoint deployment without an automatic app
cutover. Proposed rollback disables that endpoint/consumer first, stops new
snapshot issuance, drains short-lived state and connections, and removes only
approved operational resources after review. It never broadens public grants,
modifies Canonical business data or falls back silently to legacy Questions.

Production mutation, migrations, grants/RLS/extension/Auth changes and Edge
deployment: **NO**. Existing Canonical APIs, client whitelist and global
Discovery runtime flags remain unchanged. No Home/Channel/Search/Person/Matching
consumer was activated. No merge or automatic D1C work is authorized.
