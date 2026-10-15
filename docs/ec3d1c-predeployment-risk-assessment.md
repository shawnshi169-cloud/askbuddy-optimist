# EC-3D1C Predeployment Risk Assessment

Assessment date: 2026-10-15 (Asia/Shanghai). Research window: 2026-10-14 to 2026-10-15.

**D1C DEPLOYMENT: NO-GO. PRODUCTION ACCESS/MUTATION: NO. CLIENT ACTIVATION: NO.**

All hosting, endpoint, operational-schema and test-plan proposals below are **PROPOSED / NOT DEPLOYED**. This document is not permission to provision, test against Production, deploy, change grants, or activate a consumer.

## 1. Executive decision

**PROPOSED:** Prefer a small, persistent server-side Node API in the same region as Supabase Postgres, behind a trusted same-origin HTTPS ingress, with two separately authenticated database pools. Reuse the D1B ordinary-caller SQL and shared Postgres snapshot abstractions. Do not add Redis, a vector service, or another database. Hosting vendor, region, budget and credential provisioning remain undecided and require Product Owner (PO) approval.

**BLOCKED:** The local implementation is not deployable unchanged. Genuine Supabase Auth session validity, a permissible hosted caller-login role, TLS/pool behavior, an independently packaged server artifact, operational retention/abuse controls and representative capacity are not established. A valid JWT plus a successful user lookup is not proof that its session is still active. The 2,000-candidate completeness limit and 128-snapshot global limit can reject legitimate traffic even with otherwise fast queries.

**VERIFIED:** This change is documentation only. No implementation, SQL, lockfile, runtime flag, endpoint or consumer changes are proposed as part of this PR. EC-3A semantics remain frozen. HOME/CHANNEL Question discovery is distinct from Person, Search, Matching and Editorial; none of those later slices is started here.

Evidence labels used throughout:

| Label | Meaning |
| --- | --- |
| VERIFIED | Independently inspected merged source, repository metadata, public documentation or read-only dependency output during this assessment; not an implicit live-system test |
| REPORTED BUT NOT INDEPENDENTLY VERIFIED | Earlier local/Production test report or CI evidence not reproduced in this assessment |
| PROPOSED | Future design, test, budget or approval condition, not an implementation or achieved result |
| UNKNOWN | Evidence is absent or cannot establish the conclusion |
| BLOCKED | A required future deployment/activation acceptance condition is unsatisfied |

## 2. Baseline and evidence reconciliation

**VERIFIED:** Remote main was checked before branch creation and again on resume; both returned `09ca9464b50d8005d7cad303036b9237f54430a2`. Branch: `codex/ec3d1c-predeployment-risk-assessment`. The baseline merges PR #62, including implementation commit `fa9fafe0cad9bc28c2e345b5a67430c6f3fd3aaa` and CI-integration commit `d3d9e0311985563d92a28cdf6969bb77656400d7`.

| Evidence | Source and scope |
| --- | --- |
| Frozen product target | [EC-3 decision](ec3-discovery-contract-decision.md), `packages/shared-api/src/discovery-v1.ts`, `packages/shared-types/src/discovery-v1.ts` |
| Relations and earlier live schema inspection | [D0 audit](ec3d0-discovery-readiness-audit.md); historical observations, not today's Production truth |
| Canonical recall and cursor foundation | [D1A evidence](ec3d1a-question-discovery-local.md), `local-backend/question-discovery-v1/{contract,repository,service,snapshot}.ts` |
| Trusted adapter and shared storage prototype | [D1B evidence](ec3d1b-question-discovery-transport-storage.md), `local-backend/question-discovery-transport-v1/{auth,database,http,security,store}.ts`, `operational.proposed.sql` |
| Current consumer/permission boundaries | `src/config/runtimeModeCore.ts`, `src/integrations/supabase/client.ts`, shared Question/Topic contracts, `20260904174215_canonical_question_answer_v1.sql`, `20260915140330_canonical_topic_local_foundation_v1.sql`, `20261007005206_public_person_privacy_cutover.sql` |
| Required offline CI coverage | `package.json`, `.github/workflows/ci.yml`; `test:contracts` includes `test:question-discovery-transport-v1`, not its Docker/Postgres local integration command |
| Reviewed-head CI record | [PR #62 quality-gate](https://github.com/shawnshi169-cloud/askbuddy-optimist/actions/runs/38571674752/job/115878189409); reported PASS, including offline security checks; no substitute for Auth or hosted tests |

**VERIFIED source facts:** Question eligibility is canonical, visible and nondeleted, including open and closed records. Answer counts use visible live `answers_v1` with eligible parents. Recall and hydration are set-based, parameterized and explicitly public-filtered under ordinary roles. HOME needs no Topic; CHANNEL uses the existing exact channel catalog; optional Topic filters require an active canonical ID; non-null city is explicitly unsupported. Ordered IDs use `created_at DESC, id ASC`; pages recheck visibility and filter membership without adding/reordering candidates. No requester-private projection is read by these queries.

All four `DISCOVERY_V1_CONTRACT` flags remain **false**: `productionDeployed`, `clientConsumable`, `implementationStarted`, `rpcNamesFrozen`. Existing Question/Experience Topic consumers are not Discovery activation. Historical documents are retained as history, not rewritten to imply that local prototypes were already hosted.

**REPORTED BUT NOT INDEPENDENTLY VERIFIED:** D1B recorded two OS service processes, real loopback HTTP, committed shared snapshots, ordinary-role pool reuse, atomic quotas, 2,000-candidate traversal and explicit 2,001 overflow. Its 124 loopback samples were p50 27.9 ms, p95 67.0 ms, maximum 209.7 ms; no p99 is established. The harness advanced time for rate windows. These are not internet latency, real Auth, sustained load or Production SLO evidence. No Docker/database integration was rerun here.

**REPORTED BUT NOT INDEPENDENTLY VERIFIED:** D0's 2026-10-11 read-only Production window recorded project `fslpvtlavhrnxsygkpvi`, ACTIVE_HEALTHY, 79 active Topics, 192 terms, two canonical Questions, zero Experiences and zero Question/Experience Topic links. Those counts are observations, not invariants. Today's counts, status, schema drift and role availability are **UNKNOWN**. No Production connection was made for this assessment.

## 3. Hosting choices

| Criterion | A: persistent Node API + Supabase Postgres | B: Supabase Edge Functions | C: on-demand Node function + Supabase Postgres |
| --- | --- | --- | --- |
| Runtime fit | Best fit for current Node crypto, `pg`, streams, aborts and process tests; production HTTP wrapper still absent | Deno compatibility layer is not proof that Node `pg`, cancellation and crypto behave identically; separate port/bundle tests required | Node APIs plausible, but platform socket, timeout and packaging restrictions untested |
| Caller-scoped leasing | Bounded persistent pools; direct IPv6 or session pooler is the first choice to test | Short-lived worker/pool lifecycle; transaction pooling needs independent context-reset proof | Cold starts and parallel instances multiply pools; global instance cap essential |
| Operational login/shared state | Separate least-privilege login, same committed operational store across instances | Same store still needed; Edge does not replace atomic DB quotas | Same store still needed; no memory-only fallback |
| Concurrency/limits | Explicit instance count and pool budget; predictable graceful drain | Documented memory/CPU/worker limits; worker reuse/termination must be tolerated | Scaling can exhaust DB before application request limiter reacts |
| Auth/ingress/TLS | Pinned Auth issuer, same-origin proxy, verified DB TLS; trusted ingress adapter must be implemented later | Existing Supabase platform, but gateway JWT policy and anonymous access must match custom verifier | Provider ingress/IP trust and cold-start Auth/JWKS behavior require tests |
| Operations/cost | One additional host/service, patching, ingress, monitoring and on-call; no new data vendor | Fewer hosting vendors, invocation costs; adaptation/connection risk is larger | Potential idle savings, greater retry/cold-start and connection variability |
| Rollback | Stop ingress, drain instances, leave business tables untouched | Disable function routing/version; operational state still needs managed expiry | Disable route/version; prevent residual invocations and queued retries |
| Decision | **PROPOSED preferred**, conditional on Gates A-F | Feasible alternative only after isolated compatibility proof; not selected | No demonstrated advantage over A for current transaction-sensitive prototype |

Supabase documents 256 MB Edge memory and 2 seconds CPU per request, with worker wall limits differing by plan. Those limits do not imply this prototype is compatible or incompatible without testing. [Official Edge limits](https://supabase.com/docs/guides/functions/limits).

Supabase recommends direct connections for persistent servers and offers session/transaction pooling for different workloads. Transaction-mode pooling does not preserve general session state. D1B's pre/post-transaction identity probes occur outside its transaction, so a pinned lease at the driver level alone does not prove the same backend across those probes. Prefer direct IPv6 or session pooling initially; do not simply swap a transaction-pooler URL. Test certificate verification, cancellation, role identity and connection recycling on the chosen path. [Official connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).

**PROPOSED trust flow:** browser -> exact same-origin HTTPS ingress -> Node request/size/rate boundary -> pinned JWT verifier and current-identity check -> server-managed anonymous/authenticated scope -> ordinary caller pool for public SQL -> distinct operational pool for encrypted ordered-ID snapshots -> strict Question-only response. No `service_role` in this read path. No direct public access to operational relations.

## 4. Genuine isolated Supabase Auth plan

**VERIFIED implementation / UNKNOWN genuine integration:** `auth.ts` uses `jose` with pinned issuer/JWKS, ES256/RS256, audience `authenticated`, required `exp`, `iat`, `sub`, `session_id`, UUID checks, an authenticated role check and a maximum two-hour token lifetime. It rejects request-supplied issuer/key URLs and constructs branded trusted principals. Its bounded `/auth/v1/user` check verifies the returned user ID; it does not itself inspect current session existence, ban status or a revocation timestamp. The local signed test issuer is not Supabase Auth.

**VERIFIED additional compatibility boundary:** `supabase/functions/wechat-auth/index.ts` signs a custom ES256 JWT from `buildWechatJwtClaims` in `core.mjs`. That claim builder supplies `jti` but no `session_id`. Such a token fails D1B's required-claim validation even if its signature/issuer otherwise match. Do not relabel `jti` as a genuine Supabase session, remove the required claim, or claim WeChat compatibility. Whether this path is currently used in a released client is UNKNOWN here. Any future WeChat activation needs a separately approved identity/session design and actual tests; web-only backend scope must explicitly exclude this unsupported token path. No existing WeChat code or configuration is changed.

`supabaseUserCheck` also accepts only the `sb_publishable_...` API-key format. Availability of the intended public key and asymmetric JWKS configuration is a future preflight input, not verified from the legacy client configuration or assumed from the project ref. No key value is collected in this phase.

Supabase documents that access-token lifetime and current session lifetime differ, and that immediate post-logout invalidation requires additional session validation. Session settings can be enforced at refresh rather than instantly. Therefore signature verification and `getUser` success must be measured separately from revoked/disabled-account rejection. Do not add broad `auth.sessions` reads or a privileged read function as a shortcut. [Official session semantics](https://supabase.com/docs/guides/auth/sessions).

Signing-key compatibility must be established with the actual isolated issuer. The adapter deliberately does not support legacy HS256. Supabase supports asymmetric signing keys; JWKS caches can delay observing rotation/revocation. D1B also configures a ten-minute JWKS cache, 30-second cooldown and 1.5-second fetch timeout. Test the complete cache chain, not just a locally replaced key. [Official signing-key lifecycle](https://supabase.com/docs/guides/auth/signing-keys).

**PROPOSED prerequisites:** PO authorizes a genuinely isolated Supabase Auth service/project and its cost, test-only identities, email-delivery suppression and cleanup; security owner approves signing algorithm, issuer/audience, session-validity semantics and safe account administration. Obtain access through a separate approved process. No Production account, credential, token, Auth session or key was created/read here.

| Isolated test | Required acceptance evidence, not a result |
| --- | --- |
| Actual sign-in | Obtain two real Auth-issued sessions A/B; record only issuer, algorithm, timing and redacted identifiers; ordinary role SQL identity matches verified principal |
| Signature/claims | Forged, malformed, wrong issuer/audience/role, missing session ID, expired and future-issued tokens reject before caller SQL; test legitimate configured token lifetime |
| Refresh/expiry | Client refreshes through existing Auth flow, never through Discovery; old access token expiry enforced; same valid session can paginate, stale cookies/tokens cannot extend expiry |
| Logout/revocation | Global/local logout, refresh-token revocation/reuse, password/security action and disabled/deleted user tested with old bearer plus old scope cookie; measure when both user lookup and Discovery reject |
| Current session validity | Require rejection by next request after authoritative invalidation for the proposed strict gate; if supported Auth APIs do not establish this, **BLOCKED** pending a separately reviewed minimal solution or explicit PO/security decision on a bounded revocation window |
| Account switch | A -> B -> anon -> A cannot reuse another identity/epoch's cursor, even if IDs/filters match; two tabs and stale in-flight responses included |
| Anonymous visitor | No JWT remains a normal public visitor, not a Supabase anonymous sign-in; raw body/header UUID cannot fix the server scope; a cursor paired with another session's cookie rejects. Theft of a matching cookie plus cursor is a bearer-session compromise, not something integrity protection alone prevents; test and document that residual risk |
| Supabase anonymous sign-in | Its token is an authenticated-role identity, distinct from a no-token visitor; behavior and any account-link transition need explicit product/security review before claiming support |
| Key rotation | Actual isolated issuer rotates approved asymmetric keys; both instances observe overlap/retirement; stale cached keys and unavailable JWKS fail according to reviewed bounds; never silently downgrade to anonymous |
| Auth outage | Timeout, non-JSON/oversized reply, incorrect user ID, 4xx/5xx, redirect and DNS/TLS failure fail closed with stable errors; no retry storm or privileged fallback |
| Browser/ingress | Real HTTPS, exact Origin, Secure/HttpOnly/SameSite cookie behavior, trusted proxy chain, request cancellation and cache headers tested in browser; reject spoofed forwarded IP/protocol/Host |

**VERIFIED:** D1B's `__Host-d1b-scope` cookie is Secure, HttpOnly, SameSite=Strict, Path=/, server-managed, with a 30-minute lifetime and identity-transition epoch. It is not an Auth access/refresh cookie. Existing SPA Auth uses localStorage and auto refresh; this change does not cure bearer-token theft through XSS. The adapter expects an injected trusted ingress key, not arbitrary `X-Forwarded-For`. No deployable proxy configuration, CORS preflight handler or production cookie-domain strategy is established. Same-origin routing is the minimal proposed approach; native/WeChat client activation requires separate decisions.

**REAL SUPABASE AUTH: NOT VERIFIED. Production Auth E2E: NOT VERIFIED.**

## 5. Database, storage and secrets

### 5.1 Separate trust domains

**VERIFIED:** `CallerDatabase` requires a clean `authenticator` session, nonsuperuser/non-BYPASSRLS status and empty claims; it leases one connection, begins READ ONLY, applies transaction-local ordinary role/verified JWT context and timeouts, rechecks identity and cleans up. Failed cleanup destroys the connection. `SET` claims is not authentication; the branded verifier context is required first. Parameterized canonical queries explicitly exclude nonpublic parents/items.

**BLOCKED:** A literal local `authenticator` login is not a proven permissible hosted credential. Existing managed role membership/credentials must not be assumed safe or acquired casually. If the hosted role can switch to privileged roles, READ ONLY inside this adapter does not protect against credential compromise outside it. Review a dedicated switcher with only approved anon/authenticated memberships, or an equivalently constrained supported model, separately; adapting the hardcoded identity would be future implementation, not authorized here. No use of postgres or service-role credentials for caller reads.

**VERIFIED:** `operational.proposed.sql` creates a separate NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOREPLICATION role. It grants only schema USAGE, SELECT/UPDATE on the singleton gate and CRUD on snapshots/sessions/rates. Direct local LOGIN provisioning was a disposable-harness exception, not a hosted provisioning procedure. No runtime ownership of public schema or business-table grants is intended. Operational tables have ACL isolation, not declared RLS policies; do not describe them as RLS-protected.

**PROPOSED Gate C evidence:** direct least-privilege operational login; deny canonical/Auth/private-table access and role escalation; verify inherited/PUBLIC CONNECT, schema, table, column and function privileges; keep schema out of Data API exposure; separate deployment owner from runtime login. Test both pools under the actual chosen hosted connection mode using non-Production credentials. Source and target grants, ownership, RLS/FORCE RLS, trigger/function security and extension dependencies require strict scoped comparison, not table-count equality.

### 5.2 Shared state and lifecycle

| Item | VERIFIED local design | PROPOSED hosted acceptance / gap |
| --- | --- | --- |
| Snapshots | Encrypted ordered public Question IDs, caller/quota bindings, expiry, byte accounting; no private card payload | IDs and caller hashes are still linkable metadata; restrict access/logging/backups; live public hydration must continue |
| Consistency | Committed transactions; singleton `FOR UPDATE` gate serializes quota/creation; no process-local authoritative Map | Two-instance and failover tests with actual pooler; no hidden eviction/restart; corruption and store outage fail explicitly |
| Transaction boundaries | Caller read transaction and separate operational transaction; no transaction spans cursor pages | A page can hold both pool leases; bounded acquisition and nested-pool saturation tests; partial failures may leave a valid snapshot until TTL |
| Retention | Ten-minute snapshots; 30-minute scopes; minute rate buckets; cleanup happens during gated operations | No independent scheduler exists; idle expired rows can persist physically. Approve bounded cleanup and vacuum plan, without treating TTL as deletion from backups |
| Quotas | 128 snapshots, four per subject, 16 MiB accounted snapshots, 1,024 sessions, 4,096 rate keys | Test atomic limits plus row/index/WAL/dead-tuple overhead and malicious issuance; no scale claim from payload limit alone |
| Clock | Application clock drives expiration/buckets across instances | Agree time source and clock-skew budget; test fast/slow nodes cannot prematurely delete another node's valid state |
| Backups/recovery | No recovery policy implemented | Canonical backup remains independent; operational data is ephemeral, proposed RPO permits losing all cursors, RTO <=15 minutes for service recovery; restore must not resurrect revoked session epochs or silently restart cursors |
| Encryption | AES-256-GCM key ring with purpose-bound authenticated data for cursor/session/snapshot | Verify managed disk/backups/TLS separately; encryption does not hide caller/quota metadata or replace ACLs |

The rates table has a primary-key index but no bucket-expiration index. The existing 4,096-key bound may make scans acceptable, but only plans under churn can establish that. No new index is authorized here. Canonical reverse Topic index `(topic_id, question_id)`, public Question listing indexes and Answer-by-Question index are available in source; Topic RLS fan-out remains a cost to measure.

### 5.3 Key and credential lifecycle

**VERIFIED:** The application key ring has versioned IDs, 32-byte keys, bounded accepted key count (one to three), encrypt/decrypt time windows and authenticated purpose binding. This is separate from Supabase JWT signing keys. All nodes must share compatible active keys and context/ranking versions. A retired key rejects; it must not restart pagination.

**PROPOSED:** Use an approved host secret store with separate access policies for caller credentials, operational credentials and the application key ring. No client bundle, Git, image layer, logs or URLs may contain these values. Start overlap before changing the active encrypt key; retain decryption through the longest issued token lifetime (currently 30 minutes), measured skew and drain margin. Validate all nodes before retirement, with an emergency revoke path that deliberately invalidates state. One key ring covers three purposes: authenticated data prevents token-type confusion, but compromise still affects all three; separate rings are a future security design choice, not implemented here.

Rotate DB credentials through separate approved maintenance, drain old pools and test revocation without affecting canonical clients. Never grant superuser/BYPASSRLS or owner impersonation to ease rotation. Key backup/recovery policy must not outlive the approved metadata retention policy unnoticed. No secret was generated, read or rotated in this assessment.

### 5.4 Preserve the local metadata exceptions

**REPORTED BUT NOT INDEPENDENTLY VERIFIED this phase:** D1B's scoped Canonical security parity and disposable cleanup passed in its historical evidence. Local Auth is a minimal test substitute, and its foundation predates the Production profile privacy migration. That is not full Production ownership/Auth/privacy parity.

| Exception | Exact permitted scope | Consequence |
| --- | --- | --- |
| `profiles` physical attnum | Source historical dropped slots 7, 12, 13; target reconstructs the same 16 live columns in relative order; logical definitions, ACLs, effective privileges and resolved dependent objects remained strict | Physical metadata NOT IDENTICAL / REVIEWED LOCAL EXCEPTION. No global attnum exemption, no fake dropped columns, no security waiver |
| `pg_trgm` raw function ACL | Version 1.6/public, owner supabase_admin, 47 members, 31 functions and two Profile GIN indexes; target lacks the reviewed 124 explicit EXECUTE entries for postgres/anon/authenticated/service_role while PUBLIC execution remains | RAW ACL NOT IDENTICAL / REVIEWED LOCAL ONLY. Structural/effective checks remain required. Later PUBLIC revocation could make the difference significant; no Canonical/Auth/operational exception |

The Profile trigram extension/indexes are dependencies of the local signup/regression bootstrap, not of D1's exact-Topic Question SQL. Do not install them in Production merely to imitate that harness. Supabase's published extension-version policy also means an explicit VERSION request is not a portable guarantee of managed extension version. Verify actual target metadata if later authorized. [Extension version policy](https://supabase.com/changelog/extension-version-pinning-ignored).

## 6. Dependency security triage

### 6.1 Evidence and count reconciliation

| Snapshot | Counts | Evidence status |
| --- | --- | --- |
| Historical D1B local | 44: 2 low / 7 moderate / 32 high / 3 critical | REPORTED BUT NOT INDEPENDENTLY VERIFIED; preserved, not overwritten |
| Latest reviewed PR #62 CI | 45: 2 low / 6 moderate / 34 high / 3 critical | REPORTED BUT NOT INDEPENDENTLY VERIFIED here; quality-job link in section 2 |
| This assessment, 2026-10-14 22:20 Asia/Shanghai | 44: 2 low / 7 moderate / 32 high / 3 critical | VERIFIED read-only registry audit of approved lock; exit 1 denotes findings, not remediation |

Command: `npm audit --package-lock-only --ignore-scripts --json --registry=https://registry.npmjs.org`.

Local research tools: Node v24.13.0, npm 11.6.2. This is recorded provenance, not selection of the future hosted runtime version.

Lock SHA-256: `2d15f0e44fa6941479c91d58d718ca1fcb2f79388ca1abcb922599b70589fd2a`.

Raw audit SHA-256: `55dda2b385cbb99b38791db0c42de3f77c65880e070d0e51be104bef4e87ba02`.

The 44 vulnerable package records reference **93 distinct GHSA identifiers**; package counts include transitive meta-vulnerabilities and are not advisory counts. Registry advisory metadata can change independently of the lock. Historical full JSON was not available for an advisory-by-advisory comparison. **44 -> 45 cause: UNKNOWN; 45 -> current 44 is not evidence of a fix.** No vulnerability has been remediated by this task. No `npm audit fix`, install upgrade or lockfile edit was performed for this analysis.

GitHub Security Advisory metadata was retrieved read-only for all 93 identifiers on 2026-10-14. Appendix A lists each advisory, exploit precondition and patch evidence; package context below applies to every advisory for that package. Patch availability is not proof of compatibility or of a clean aggregate version. Null patch metadata is reported as such, not converted to a guessed fix.

### 6.2 D1B reachability and packaging

**VERIFIED static dependency closure:** Current server source uses Node built-ins, `jose` 6.1.0, `pg` 8.23.1 and `zod` 3.23.8. Lock traversal of these roots (including installed optional dependencies) found 16 packages and no intersection with the audit's vulnerable package nodes. This is a narrow current-code observation, not an SBOM for a future image or proof of no vulnerabilities. No exploit was executed. Native modules, OS/OpenSSL, a future HTTP framework/ingress, compiler and host image require their own scan.

**BLOCKED packaging:** `jose` and `pg` are devDependencies in this application repository. A normal root `--omit=dev` server install is not a valid D1 artifact. The root manifest mixes browser, native and tooling dependencies. A separately reviewed minimal server build/runtime closure, lock/SBOM, supported patched Node release, reproducible build and image scan are prerequisites; this PR does not create that package. Do not ship a Vite development server as the API or assume root npm audit severity directly measures the isolated Node module.

Policy codes below are **PROPOSED**, not accepted risk waivers:

- **B:** build/toolchain exposure. No current D1 request path identified; blocks future release if untrusted build/archive/config input or artifact integrity is exposed. Require patch/removal or independently approved non-reachability/containment evidence at Gate D.
- **W:** current web-client surface. Not imported by D1 Node code; review/patch relevant browser sinks before Gate H. Blocks Gate G too if accidentally included/executed in the server artifact.
- **N:** native surface. No D1 server use; blocks affected native rollout until separately reviewed, without expanding this task into native changes.
- **S:** server-library surface outside current D1 closure. Exclude from minimal artifact or patch and test before importing it; actual reachability is conditional, not declared safe.

### 6.3 Package context and remediation ownership

`D` means direct in the root manifest; `T` means transitive. Runtime classification follows execution, not just npm's dev flag. Security owner must approve residual risk; Codex A may implement dependency work only under separate authorization.

| Package / locked version | D/T; surface and reachability | Recommendation / deployment impact |
| --- | --- | --- |
| `@babel/runtime` 7.25.9 | T, W; browser helper via UI dependencies; vulnerable named-capture replacement use not established | Patch helper >=7.26.10 and inspect generated regex code; low expected API break, browser regression needed |
| `@capacitor/android`, `@capacitor/ios` 8.0.0 | D, N; internal native HTTP proxy when untrusted remote content is loaded | Critical; coordinate core/native versions and real device QA. Advisory has later fixes 8.4.3 / 8.5.1; do not assume an intermediate release is safe |
| `@capacitor/cli` 8.0.0 | D, B despite production manifest placement; inherits `tar` findings | Upgrade compatible CLI chain or isolate/exclude from server artifact; tar major transition needs native build tests |
| `@eslint/plugin-kit` 0.2.3; `eslint` 9.13.0 | T / D, B; crafted source comments in lint path; eslint is meta-vulnerable | Update compatible plugin-kit >=0.3.4; rerun lint, not runtime exemption for unsafe CI |
| `@humanfs/node` 0.16.5 | T, B; copying attacker-influenced symlink trees | >=0.16.8; review workspace/artifact copy inputs |
| `@isaacs/brace-expansion` 5.0.0 | T, B; malicious expansion input | >=5.0.1; distinct package from `brace-expansion` |
| `@remix-run/router` 1.20.0 | T, W; untrusted redirects; via React Router | >=1.23.3 for listed router advisories; coordinate all React Router fixes, not just this transitive package |
| `react-router` / `react-router-dom` 6.27.0 | T / D, W; navigation/redirect input; SSR advisory not demonstrated in this SPA | Review sinks and coordinated upgrade; some fixes require 7.18.0 (major), not merely 6.30.4. No D1 Node import |
| `@tailwindcss/typography` 0.5.15 | D, B; inherits selector parser findings | Upgrade compatible toolchain; audit's proposed lower version is not an endorsed downgrade |
| `typescript-eslint` and `@typescript-eslint/{eslint-plugin,parser,type-utils,typescript-estree,utils}` 8.11.0 | D for umbrella, T for five scoped packages; B; meta-chain through fast-glob/micromatch/braces | Resolve downstream parser/glob risk with coordinated tooling update or reviewed containment; no direct D1 runtime import |
| `@xmldom/xmldom` 0.8.11 | T, B; plist/native tooling parses or serializes crafted XML | >=0.8.15 covers listed patch points; review XML producers/consumers and serialization behavior |
| `ajv` 6.12.6 | T, B; crafted `$data` schema with relevant option enabled | >=6.14.0 on 6.x line; schema compatibility tests; not D1's Zod parser |
| `brace-expansion` 1.1.11 / 2.0.1 | T, B; crafted nested/range patterns | >=1.1.21 / 2.1.7 for listed branches; verify all nested copies |
| `braces` 3.0.3 | T, B; nested pattern stack exhaustion | No first-patched version supplied for listed advisory. Remove affected execution path or await supported fix; do not call an npm parent upgrade a proven package patch |
| `chokidar` 3.6.0, `fast-glob` 3.3.2, `micromatch` 4.0.8 | T, B; inherited braces exposure | Parent-chain upgrade/removal and adversarial glob tests; no regex-wildcard risk acceptance |
| `tailwindcss` 3.4.17; `lovable-tagger` 1.1.7 | D, B; inherited glob chains, not served Node request code | Tailwind 4.x is a breaking toolchain migration. Do not blindly accept audit downgrade suggestions for tagger |
| `browserslist` 4.24.2 | T, B; untrusted queries/custom statistics | >=4.28.7 and build compatibility tests |
| `esbuild` 0.21.5 | T, B; development server cross-origin access | >=0.25.0; never publicly expose dev server; minor version can change build behavior |
| `flatted` 3.3.1 | T, B; untrusted serialized graph parsing | >=3.4.2; inspect cache inputs; no D1 import |
| `glob` 10.4.5 | T, B; CLI command option with crafted matched filenames | >=10.5.0; do not execute glob CLI command interpolation on untrusted trees |
| `js-yaml` 4.1.0 | T, B; crafted YAML merges/aliases/omap | >=4.3.2 for listed advisories; lint/config pipeline regression |
| `lodash` 4.17.21 | T, W via Recharts; vulnerable template/unset/omit use not established by import alone | >=4.18.0 for listed fixes; inspect exact sinks and attacker control; not D1 SQL/runtime |
| `minimatch` 3.1.2 / 9.0.5 / 10.1.1 | T, B; pathological glob/extglob | >=3.1.4 / 9.0.7 / 10.2.3 for listed branches; ensure every copy fixed |
| `nanoid` 3.3.7 | T, B via PostCSS; invalid custom sizes/generators | >=3.3.18 for listed issues; D1 uses Node crypto rather than nanoid |
| `picomatch` 2.3.1 | T, B; malicious glob/options | >=2.3.2; rerun glob cases |
| `postcss` 8.4.47 | D, B; attacker-controlled CSS/source-map paths | >=8.5.23 for all listed patch points; deny build access to secrets and untrusted external maps |
| `postcss-selector-parser` 6.0.10 / 6.1.2 | T, B; crafted CSS selector complexity | Latest listed fix 7.1.6 requires major compatibility review; 6.1.3 fixes only one listed issue |
| `rollup` 4.24.0 | T, B; crafted paths during output writing | >=4.59.0; review plugin/input trust and output containment |
| `source-map-js` 1.2.1 | T, B; malicious indexed map offsets | >=1.2.2; untrusted map handling is build risk |
| `tar` 6.2.1 | T, B via Capacitor CLI; malicious archives, paths, link chains or compressed data | Critical aggregate; listed patches reach 7.5.21, a major transition from 6.x. Treat archive ingestion/artifact tampering as release-blocking until fixed or proven excluded |
| `vite` 5.4.10 | D, B; exposed dev server and crafted URLs/paths/maps | Some listed fixes require 6.4.3; major migration/testing, not a blind audit fix. No Vite server in hosted D1 |
| `ws` 8.19.0 | T, S via Supabase Realtime SDK; malicious WebSocket peer/frame behavior | >=8.21.0 for both listed issues. D1 uses fetch/jose, not Supabase Realtime; if SDK is added, re-audit closure |
| `yaml` 2.6.0 | T, B; deeply nested YAML | >=2.8.3; parser input bounds and tooling regression |

**PROPOSED Gate D rule:** No unaccepted exploitable high/critical finding in the shipped server or artifact-producing path; every advisory has a fix, removal or independently signed reachability/containment disposition. Do not waive all build-only findings: a compromised build can compromise a clean runtime. Browser/native items stay explicit backlog and Gate H dependencies. No vulnerability is marked resolved here. The unrelated PR #62 legacy-lint failure does not remediate or worsen this advisory set; its reported errors did not touch PR-changed files.

## 7. Performance and abuse assessment

### 7.1 Capacity consequences, not Production SLOs

**VERIFIED code / derived arithmetic:** Page size 1..20; 2,000 complete candidate IDs maximum; 2,001 causes explicit failure, not truncation. If public HOME contains 2,001 eligible Questions, HOME is unavailable under this prototype even if every individual page is cheap. Topic/Channel filtering may fit, but cannot be a silent fallback. A future capacity/recall design change requires approval before deployment.

One measured full local snapshot was 104,931 accounted bytes; 128 such snapshots are about 12.81 MiB, excluding Postgres row/index/WAL/bloat/backup overhead. At ten-minute retention, 128 slots admit at most **12.8 new full-TTL snapshots per minute sustained**, absent early deletion; terminal/replayed snapshots also occupy slots. Thirty-two subjects holding four each fill the store. A 1,024-session store with 30-minute retention admits about 34.1 distinct new sessions/minute sustained. These derived ceilings are much lower than raw request-rate ceilings and need legitimate-user/anonymous-abuse evaluation.

The configured fixed-window limits are 600 requests/minute globally, 120 per ingress, 60 per subject, four snapshot issuances/minute per subject and ten new sessions/minute per ingress; four inflight requests per process. The global gate is also acquired for rate/session work on normal pages. Roughly four serialized operations per continuation and six or more for issuance can turn an admitted 10 requests/second into tens of singleton-lock acquisitions per second. This is an estimate from call structure, not measured throughput. Distributed ingress rotation can exhaust global capacity; fixed windows permit boundary bursts; same-NAT fairness and rejection work remain risks.

### 7.2 Proposed isolated load matrix and gates

All figures below are **PROPOSED starting acceptance thresholds**, not measured results or immutable product contracts. PO/security/SRE must approve the workload and revise limits using evidence before Gate G. No Production load test is authorized.

| Scenario | Workload | Proposed pass / explicit no-go |
| --- | --- | --- |
| Completeness and skew | 0/20/500/2,000/2,001 eligible Questions; 10k/100k total hidden/unrelated rows; 0/1/many Topics; hot Topic matching 90%; open/closed mix | Exact complete ID set <=2,000; 2,001 always explicit overflow; no duplicates or quiet truncation. Expected real HOME growth above cap is deployment NO-GO pending approved redesign/capacity |
| Answer fan-out | Few Questions with 1k/10k visible/hidden/deleted Answers, correct parent rules | Exact live counts; no hidden reads; ordinary-role EXPLAIN ANALYZE in isolated data, no new index without evidence |
| Legitimate steady traffic | Two instances, 5 requests/s for 30 minutes, at most six new snapshots/minute initially, remaining requests pagination/replay; A/B/anon mix | End-to-end p50 <=150 ms, p95 <=500 ms, p99 <=1,000 ms in documented same-region staging; unexpected 5xx <0.1%; zero isolation/visibility failures. Real Auth included, cold/warm samples separate |
| Short burst / overload | 10 then 50 requests/s; concurrent first pages, 33 subjects at four snapshots, 129th snapshot, 1,025th session, >4,096 rate keys | Exact quotas never exceeded, bounded explicit rejection within 5 seconds, no crash/eviction; recover normal latency within 60 seconds after pressure clears; legitimate admission requirement must be reviewed separately |
| Two-pool saturation | Two instances initially <=4 caller + <=4 operational connections each; lease failure, nested leases, DB limit and slow query | <=16 configured runtime connections in this proposal plus separately budgeted maintenance; pool-wait p95 <=100 ms, max 1 second; no lease/role/claim leak; reserve >=30% DB connection capacity after all existing services |
| Singleton lock / SQL | Hot-key and diverse-key mix; expiry sweep; concurrent inserts/cleanup | Gate wait p95 <=50 ms, p99 <=100 ms; canonical SQL p95 <=200 ms; no deadlock; 2-second statement timeout and 5-second request bound remain effective. Failure blocks scaling claim |
| Durability / restart | Kill one instance before/after commit; abort first-page response; restart both; lose operational DB connection | Committed valid cursor works cross-instance; unavailable/expired/missing/corrupt state explicit; no new candidates or partial success; orphaned rows bounded and expire |
| Visibility churn | Hide/delete/change Topic/Channel between pages; close/reopen Question; new insertions | Live public eligibility rechecked for every page; original order maintained, cursor advances scanned positions; no privileged owner bypass |
| Rate abuse / ingress | Forged proxy headers, IP rotation, same-NAT clients, invalid JWT/body flood, minute-boundary bursts | Trusted ingress derived only from reviewed proxy/socket; bounded pre-DB admission rejects abuse; no account/session fixation; legitimate NAT fairness report and explicit PO decision |
| Resource/retention | 24-hour isolated soak, maximum candidate/rate/session tables, expired idle rows, small clock offsets | Steady CPU/DB pool utilization <70% at target, process RSS <60% host allocation with no sustained growth after warmup; operational table+index footprint proposed <=64 MiB steady, WAL <=128 MiB/hour at target; cleanup within two minutes of expiry after approved maintenance exists; fail and re-budget if exceeded |
| Key/Auth/network failure | Overlap/retirement, clock skew +/-1 second and beyond budget, JWKS outage, invalid cert, Auth latency, DB reconnect | No fail-open, no secret logs, no silent cursor restart; timeout cleanup complete within 10 seconds; old keys not accepted after approved deadline; current-session semantics satisfy Gate B |

Do not convert these thresholds into a green dashboard by excluding rejected legitimate requests. Report throughput, admission/rejection rates, retained snapshots, clock conditions, Auth overhead, connection count, lock waits, CPU/RSS, buffer hits, rows/loops, WAL and disk separately. At least 10k successful requests are proposed for p99 reporting; small-sample maxima are not p99 estimates.

**PROPOSED retry policy:** explicit error classification, bounded exponential backoff with jitter (at most two retries for transient service errors), no retry for invalid cursor/filter/Auth, no automatic snapshot restart, and a retry budget shared with ingress. Current adapter does not supply a complete hosted backpressure/Retry-After strategy. Add only in a separately authorized implementation. Log aggregate error codes/latencies and opaque request IDs, never JWT/cookies/cursors/SQL bindings/profile data; redact database URLs and retain access logs only under approved policy.

## 8. Future read-only Production preflight

**PROPOSED / NOT EXECUTED.** Gate F needs separate explicit PO authorization even for read-only access to project `fslpvtlavhrnxsygkpvi`. Run bounded catalog/aggregate inspections, not private row exports or Production `EXPLAIN ANALYZE` load. Use a reviewed read-only role, timeout, evidence window and schema fingerprint. An unknown/drift result is a stop, not permission to fix live SQL.

| Check | Required future evidence |
| --- | --- |
| Identity/version | Exact project/ref, ACTIVE_HEALTHY, actual PG build/TLS endpoint and expected environment; no inference from local Docker |
| Lineage | Remote approved main, migration ledger/head and hashes, no missing/unreviewed migration; D0's recorded head is historical only |
| Relations/indexes | Canonical Question, Answer, Topic, term and association schemas; PK/FK/unique constraints, valid indexes, reverse Topic index, partial predicates, collation/opclass dependencies |
| Authorization | Table/column ACLs, schema USAGE, RLS/FORCE RLS, policies, ownership, role inheritance/SET ROLE memberships, function body/signature/security/search_path/EXECUTE; compare effective permissions as well as raw metadata |
| Privacy cutover | No table-wide profile SELECT/UPDATE for client roles; nine approved safe SELECT columns and five owner-update columns; phone/internal ID/system flags remain restricted; owner-private RPC auth.uid-only, PUBLIC/anon EXECUTE denied |
| Canonical behavior | Existing Question/Topic public-read rules and historical deprecated associations; no discovery bypass of RLS, no new RPC whitelist, no legacy fallback |
| Counts/fan-out | Aggregate eligible HOME/Channel/Topic counts, max/percentile links and Answers per Question; whether 2,000 completeness cap is viable; no titles, phone, email or raw user exports |
| Credentials/pooling | Whether approved ordinary caller switcher and separate operational login are provisionable; required role attributes, connection cap, TLS verify-full, selected pool mode and cleanup evidence from staging |
| Operational scope | Proposed schema not exposed by Data API; no existing name/role collision, no dependency on privileged business reads; approved owner/runtime split and maintenance plan |
| Extensions/patches | Actual installed version/owner/opclasses/ACLs, no assumption that local pg_trgm exception applies; assess Postgres security patch status and supported TLS suites |
| Runtime/consumer | All four Discovery flags false, no active endpoint/RPC catalog/client whitelist entry, no Home/Channel/Search consumer changes; canonical existing APIs unchanged |
| Review output | Redacted metadata diff, current risk/Advisor findings if separately authorized, signed go/no-go with expiration of evidence; mismatch stops before writes |

Published Supabase notices include Postgres 15.19/17.11 security-related changes and TLS cipher deprecations. They require a fresh version/TLS review, not an unapproved upgrade here; the older local PG 17.6 test environment cannot establish current patch readiness. [Postgres notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes), [TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated).

## 9. Deployment gates and rollback

Every gate needs an explicit PO decision; none is approved by this assessment. Backend deployment and client activation are separate. Proposed owners: Codex A prepares engineering evidence, independent security reviewer signs security findings, designated SRE/DBA owns infrastructure and operations, PO owns product/risk authorization. These assignments do not create new tasks or authorize work.

| Gate / owner | Prerequisites | Acceptance evidence | Rollback/stop condition and PO approval |
| --- | --- | --- | --- |
| A: architecture / PO + A + SRE | This assessment, hosting/network/cost constraints | Chosen Node host/region, TLS/ingress path, pooled-role model and scoped packaging plan | Incompatible ordinary-role access or unacceptable cost: stop selection, no provisioning; explicit architecture approval |
| B: genuine Auth / security + A | A; separately authorized isolated Auth resources/users/keys and cleanup plan | Section 4 matrix with actual Auth-issued sessions, current-session decision, rotation/outage/browser evidence | Any identity/revocation/anonymous isolation failure: stop, no Production credentials; explicit Auth acceptance |
| C: DB/secrets / DBA + security | A/B; least-privilege provisioning feasibility, dedicated owner/runtime design | Reviewed future migration/role/secret/retention proposal and isolated tests; no broad grant; restore/drain rehearsal | Role collision/elevation need, key leak or invalid pool semantics: stop and revoke only authorized test resources; explicit DB/secret approval before any future write |
| D: dependencies / security + build owner | Minimal artifact/SBOM and section 6 triage | Fixed/excluded/accepted disposition for each relevant advisory, fresh registry and image/OS scan, protected build inputs | Reachable unaccepted high/critical or unknown artifact closure: no release; explicit residual-risk sign-off |
| E: load/failure / SRE + A | B-D and authorized representative isolated dataset | Section 7 measured matrix, capacity headroom, isolation, chaos and cleanup proof | Any leak, silent truncation, quota race, timeout leak or failed service budget: no deployment; explicit operational acceptance |
| F: fresh Production preflight / DBA + reviewer | A-E and separate read-only authorization | Section 8 exact fresh metadata/aggregates, no drift, approved artifacts/hashes and maintenance/rollback runbook | Unexpected schema/data/role/privacy state: stop before write; explicit preflight sign-off tied to evidence window |
| G: backend deployment / PO + SRE + DBA | A-F, separate controlled deployment authorization | Future reviewed tracked migration/provisioning, canary health/security/operational smoke and preserved existing APIs; clients still off | Any privacy/Auth/public-read regression, leak or overload: block ingress/drain new service, preserve existing APIs; reviewed compensating cleanup only, never restore broad grants. Explicit backend-only GO |
| H: client activation / PO + client owner | Independent deployed-backend review, UI/request/cookie/cache/account-switch QA and affected dependency dispositions | Separate Home/Channel consumer plan, rollout gate, error/empty/pagination behavior, browser/native platform evidence as applicable | Disable client feature independently; no silent legacy substitution, invented data or cursor restart. Explicit activation approval, not inherited from G |

**PROPOSED rollback detail:** First prevent new ingress and drain task-owned requests/pools; preserve schema/state for bounded forensic review without exposing secrets. Revert the service artifact only if old/new operational and key versions are compatible. If not, explicitly invalidate snapshots/scopes under a reviewed maintenance action and return stable unavailable/expired errors. Do not restore a business database to roll back ephemeral discovery state, delete canonical records, reverse historical migrations casually or reopen broad profile privileges. Dropping an operational schema/role or rotating a key is itself a separately authorized change, not a spontaneous response in this phase. Client gate remains off until H even after backend recovery.

## 10. Risk register

Severity describes potential impact, not proof of exploitation. All mitigations are **PROPOSED** unless a source fact is explicitly identified.

| ID | Severity / status | Risk | Required gate / disposition |
| --- | --- | --- | --- |
| R1 | High / BLOCKED | Signature-valid token may remain accepted after session revocation/identity disable; real Auth semantics unverified | B: genuine sessions, immediate-rejection target or reviewed bounded policy; no generic privileged Auth reads |
| R2 | Critical / BLOCKED | Hosted caller-login privilege inheritance or operational credential accidentally grants private access | C/F: strict two-role separation, denial tests, no service-role/superuser bypass |
| R3 | High / BLOCKED | 2,001 eligible HOME Questions makes complete recall fail; cap is not sustainable product limit | E/F: counts/growth and reviewed complete-recall strategy; no quiet truncation |
| R4 | High / BLOCKED | 128 snapshots/1,024 scopes and singleton lock permit low-rate denial of legitimate anonymous traffic | E: retention/admission/anti-abuse evidence and approved scale budget |
| R5 | High / BLOCKED | Nested pools, transaction-pooler state probes, aborts/restarts leak role or exhaust DB | C/E: actual connection mode, pool/cancellation/failover tests |
| R6 | High / BLOCKED | Vulnerable build/browser/native dependencies or unscanned image reach future artifact | D/H: full appendix dispositions; minimal server package, no blind upgrades or count-based waiver |
| R7 | High / UNKNOWN | Incorrect ingress IP/HTTPS trust, cookie replay/fixation, cross-origin deployment mismatch | A/B/E: same-origin TLS, explicit proxy chain, browser tests; no header-trust shortcut |
| R8 | High / BLOCKED | Key retirement/cache/clock mismatch invalidates or incorrectly extends state | B/C/E: separate JWT/app-key lifecycle, shared versions, tested overlap and synchronized time |
| R9 | High / UNKNOWN | Production privacy/schema/role drift not represented by older local foundation | F: fresh authorized inspection; preserve both narrow metadata exceptions, no Production parity claim |
| R10 | Medium / BLOCKED | Expired metadata/backups, rates/WAL/bloat and observability expose identities or consume resources | C/E: retention, cleanup, recovery policy, redaction and measured overhead |
| R11 | Medium / UNKNOWN | Host/vendor/network pricing, IPv6 availability and service ownership not selected | A: approved region, vendor/exit plan, budget and on-call |
| R12 | Medium / UNKNOWN | npm historical count difference mistaken for improvement; optional legacy lint mistaken for new regression | D: keep historical snapshots, do not claim causal delta or remediation; independent evidence |
| R13 | High / BLOCKED for WeChat activation | Current custom WeChat token builder has no session_id; D1B requires a genuine session identity | B/H: explicit supported-client scope and separate Auth integration decision; no weakening of JWT validation or WeChat redesign here |

## 11. Explicit unknowns and blockers

No genuine Supabase Auth token/session was tested; no current account ban/logout enforcement, hosted JWT configuration, Auth availability SLO or Production session policy is verified. No hosted service, gateway, certificate, ordinary caller credential, secret store, pooler compatibility or deployable runtime artifact exists as verified evidence here. Production state/cardinality and existing load headroom remain unknown. No representative concurrency/abuse benchmark, p99, long-duration soak, disk/WAL budget or hosted disaster recovery result exists. No dependency has been upgraded or vulnerability resolved. The 44/45 historical advisory delta remains uninvestigated at the per-advisory level because matching historical JSON is absent.

The baseline's documented local tests are useful engineering evidence, not substitutes for those gates. Findings requiring live access are deliberately left blocked; this assessment does not attempt to obtain that access.

## 12. Cost and infrastructure assumptions

**PROPOSED:** Two small persistent Node instances for cross-instance availability tests, one region near the approved Supabase region, trusted TLS ingress, a secret store, bounded logs/metrics and an isolated genuine-Auth environment. No new database vendor/cache/search service. Existing Supabase Auth and Postgres remain dependencies; Node hosting is an additional operational responsibility, not known to be already provisioned.

**UNKNOWN:** Current paid plan, region, idle capacity, connection budget, IPv6 support, backup retention, host vendor, traffic forecast and currency/tax/egress costs. Do not use published included connections as free headroom for this service. Proposed runtime connection allocation must be subtracted from total demand from Auth/PostgREST/other clients and maintenance.

Cost model for PO review: host instances + TLS/ingress/network + incremental Supabase compute/disk/WAL/backup + Auth/session/API use + logs/alerts + isolated-test resources + operations labor. At the currently published Supabase pricing page, Pro starts at USD25/month with usage/compute considerations; this is a public reference, not a quote for the existing project or the proposed total. Obtain a vendor-specific monthly ceiling and alert/spend policy before provisioning. [Official pricing](https://supabase.com/pricing), [compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk).

Suggested comparison exercise, not a purchase authorization: cost a low-volume internal pilot and tenfold forecast, include two instances and actual connection reservations, then compare the same Auth/storage obligations under Edge. Include exit costs: standard Node/Postgres eases host migration, but Supabase JWT/role semantics and its managed pooler remain vendor dependencies.

## 13. Decisions requested from Product Owner

1. Approve or reject persistent Node plus Supabase Postgres as the preferred architecture; name host/region, operating owner and spending ceiling before any provisioning.
2. Authorize a separate genuine isolated Supabase Auth E2E phase, including resource/user/key lifecycle and cleanup; decide required revocation/disabled-account rejection semantics with security review.
3. Approve review of a minimum-privilege hosted caller-login and operational-login model, minimal server artifact and key/retention/backup policy. No grants are approved by accepting this assessment alone.
4. Decide a legitimate traffic/data-growth target and how to address the completeness and admission ceilings; approve measurable Gate E thresholds before testing or changing limits.
5. Assign dependency backlog remediation and independent risk acceptance. Keep browser/native scope separate; no broad dependency upgrade is authorized in this PR.
6. Require fresh read-only Production authorization and then separate backend deployment and client activation decisions. Current recommendation for both is **NO-GO**.

## 14. Assessment verification and closeout boundary

This phase performs read-only source/dependency/public-document research and applicable static repository/documentation checks only. It does not repeat cryptographic fixture creation, Docker/database integration, hosted Auth, Production probes or load tests. Prior test reports remain labeled historical. Assessment-tree checks are recorded below; final commit/PR identity belongs to the PR closeout. No runtime PASS is inferred from Markdown changes.

Final assessment-tree verification, 2026-10-15:

| Check | Result and scope |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS, exact locked local dependencies for checks; no lifecycle scripts or tracked dependency changes |
| `npm run typecheck` | PASS |
| `npm run typecheck:baseline` | PASS, zero diagnostics; no baseline growth |
| `npm run test:discovery-v1` | PASS, frozen contract and four false runtime flags |
| `npm run test:product-blueprint-v1` | PASS |
| `npm run test:canonical-topic-v1` | PASS, offline contract only; initial sandbox EPERM creating its temporary compilation directory was retried with local filesystem permission, not a code/permission-model change |
| `npm run test:canonical-topic-manifest-v1` | PASS, 24 offline manifest/planner checks |
| `npm run test:profile-privacy` | PASS, static/mocked checks; 17 safe projections; not real authenticated HTTP |
| `npm run test:production-writes` | PASS, static guard; no Production write |
| `npm run test:fixture-isolation` | PASS |
| `npm run test:runtime-mode` | PASS |
| `npm run test:ui-engineering-readiness` | PASS |
| `npm run test:ui-platform-readiness` | PASS |
| `npm run lint:changed` | PASS, no changed Core/shared TypeScript files; not a full legacy lint rerun |
| `npm run build` | PASS; existing stale Browserslist-data warning, no dependency update; not a server deployment artifact |
| Advisory/link/integrity checks | PASS: all 93 unique audited GHSA IDs represented exactly once; relative document links resolve; lock SHA unchanged; only this Markdown file changed |
| `git diff --check` | PASS; repeated against staged document before commit |
| Full `test:contracts`, D1A/D1B integration, genuine Auth, load and Production checks | NOT RUN in this research-only phase; do not infer new transport/security-runtime verification from the applicable static checks above |

Required CI definitions remain untouched, including the D1B offline check in `test:contracts`. The documentation-only Draft PR can run that existing CI independently; its results must not be represented as genuine Auth or Production verification.

D1C deployment: **NO-GO**. Production access/mutation: **NO**. Migration/grants/Auth/extension changes: **NO**. Client/Home/Channel/Search activation: **NO**. D2 Person Discovery/Matching/Editorial implementation: **NO**. Four global Discovery runtime flags: **unchanged, false**. Draft PR only; stop for PO review, do not merge or deploy.

## Appendix A. Advisory-level register

The following read-only advisory register is paired with section 6.3: each row inherits its package's direct/transitive classification, execution surface, current D1B non-use/conditional reachability, remediation owner and deployment gate. Actual exploitability beyond those static findings is **UNKNOWN** until separately reviewed/tested. Patch points are advisory-specific, not blanket safe-version promises. All fixes/removals remain **PROPOSED; NOT PERFORMED**.

Patch columns select the relevant installed major line where available. A major-line change is explicitly noted. Package-level recommendations in section 6.3 take the combined advisory set into account. GHSA links are the identifier and source for each row.

| Package | Advisory / severity | Exploit precondition or vulnerable operation | Published patch point for relevant line |
| --- | --- | --- | --- |
| @babel/runtime | [GHSA-968p-4wvh-cqc8](https://github.com/advisories/GHSA-968p-4wvh-cqc8), Moderate | Crafted replacement text reaches transpiled named-capture regex helper | 7.26.10 |
| @capacitor/android; @capacitor/ios | [GHSA-rvm3-566m-v7fv](https://github.com/advisories/GHSA-rvm3-566m-v7fv), Critical | Untrusted remote resource is interpreted within native application's origin through proxy | Old 8.0-8.3.4 entry has no patch value; subsequent entries identify 8.4.3 and 8.5.1; coordinated native review required |
| @eslint/plugin-kit | [GHSA-xffm-g5w8-qvg7](https://github.com/advisories/GHSA-xffm-g5w8-qvg7), Low | Adversarial configuration comment reaches lint parser | 0.3.4 |
| @humanfs/node | [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g), Moderate | Copy operation encounters attacker-controlled symlink tree | 0.16.8 |
| @isaacs/brace-expansion | [GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2), High | Crafted expansion pattern consumes excessive resources | 5.0.1 |
| @remix-run/router | [GHSA-2w69-qvjg-hvjx](https://github.com/advisories/GHSA-2w69-qvjg-hvjx), High | Untrusted redirect target reaches unsafe navigation/XSS path | 1.23.2 |
| @remix-run/router; react-router | [GHSA-2j2x-hqr9-3h42](https://github.com/advisories/GHSA-2j2x-hqr9-3h42), Moderate | Leading double slash changes intended redirect origin | 1.23.3 / 6.30.4 |
| @xmldom/xmldom | [GHSA-wh4c-j3r5-mjhp](https://github.com/advisories/GHSA-wh4c-j3r5-mjhp), High | Untrusted CDATA content is serialized into markup | 0.8.12 |
| @xmldom/xmldom | [GHSA-2v35-w6hq-6mfw](https://github.com/advisories/GHSA-2v35-w6hq-6mfw), High | Deep XML tree exhausts serializer stack | 0.8.13 |
| @xmldom/xmldom | [GHSA-f6ww-3ggp-fr8h](https://github.com/advisories/GHSA-f6ww-3ggp-fr8h), High | Crafted document-type data escapes serialization boundary | 0.8.13 |
| @xmldom/xmldom | [GHSA-x6wf-f3px-wcqx](https://github.com/advisories/GHSA-x6wf-f3px-wcqx), High | Unsafe processing-instruction content inserts markup | 0.8.13 |
| @xmldom/xmldom | [GHSA-j759-j44w-7fr8](https://github.com/advisories/GHSA-j759-j44w-7fr8), High | Unsafe XML comment content inserts markup | 0.8.13 |
| @xmldom/xmldom | [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6), Moderate | Invalid entity-reference name defeats well-formed output expectation | 0.8.15 |
| @xmldom/xmldom | [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj), High | Attacker controls an element name passed to construction API | 0.8.14 |
| @xmldom/xmldom | [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm), High | Attacker controls an attribute name passed to construction API | 0.8.14 |
| @xmldom/xmldom | [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv), High | Malicious processing-instruction target is serialized | 0.8.15 |
| @xmldom/xmldom | [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv), High | Malicious doctype name is serialized | 0.8.15 |
| @xmldom/xmldom | [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59), Moderate | Malformed closing tag is accepted instead of rejected | 0.8.15 |
| @xmldom/xmldom | [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6), High | Many attributes drive quadratic deduplication work | 0.8.15 |
| @xmldom/xmldom | [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4), High | Crafted end-tag whitespace drives regex backtracking | 0.8.15 |
| @xmldom/xmldom | [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g), High | Crafted XML consumes quadratic memory | 0.8.15 |
| @xmldom/xmldom | [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9), High | Malformed input repeatedly exercises expensive recovery | 0.8.15 |
| ajv | [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6), Moderate | Crafted input/schema with `$data` feature enabled | 6.14.0 |
| brace-expansion | [GHSA-v6h2-p8h4-qcjw](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw), Low | Pathological expansion input triggers regex complexity | 1.1.12 / 2.0.2 |
| brace-expansion | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v), Moderate | Zero-step range causes nontermination/resource growth | 1.1.13 / 2.0.3 |
| brace-expansion | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp), High | Repeated non-expanding groups trigger exponential work | 1.1.16 / 2.1.2 |
| brace-expansion | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), High | Huge expansion output exhausts memory | 1.1.17 / 2.1.3 |
| brace-expansion | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), High | Intermediate arrays bypass output-size mitigation | 1.1.18 / 2.1.4 |
| brace-expansion | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), Moderate | Crafted brace/comma rewrite produces quadratic CPU work | 1.1.21 / 2.1.7 |
| brace-expansion | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), High | Nested groups exhaust recursive parser stack | 1.1.20 / 2.1.6 |
| brace-expansion | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), High | Crafted comma structure exhausts parser stack | 1.1.19 / 2.1.5 |
| braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), High | Deeply nested patterns exhaust stack | None identified in retrieved metadata |
| browserslist | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), High | Many distinct queries grow cache without eviction | 4.28.7 |
| browserslist | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g), High | Untrusted custom statistics affect object prototype/crash handling | 4.28.7 |
| esbuild | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), Moderate | Attacker website reaches running development server | 0.25.0 |
| flatted | [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f), High | Untrusted graph causes excessive revival recursion | 3.4.0 |
| flatted | [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh), High | Crafted serialized objects pollute prototypes | 3.4.2 |
| glob | [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2), High | CLI command mode interpolates malicious matched filenames | 10.5.0 |
| js-yaml | [GHSA-mh29-5h37-fv8m](https://github.com/advisories/GHSA-mh29-5h37-fv8m), Moderate | Crafted merge keys alter prototypes | 4.1.1 |
| js-yaml | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68), Moderate | Repeated aliases make merge handling quadratic | 4.2.0 |
| js-yaml | [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m), High | Long merge chains consume excessive CPU | 4.3.0 |
| js-yaml | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), High | Crafted ordered map requires quadratic resolution | 4.3.1 |
| js-yaml | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh), High | Empty merge sources evade work limits | 4.3.2 |
| lodash | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc), High | Attacker controls import-key names in template compilation | 4.18.0 |
| lodash | [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh), Moderate | Crafted array path reaches unset/omit prototype mutation | 4.18.0 |
| lodash | [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg), Moderate | Untrusted unset/omit paths reach prototypes | 4.17.23; later bypass requires 4.18.0 |
| minimatch | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26), High | Repeated wildcards plus nonmatching literal consume CPU | 3.1.3 / 9.0.6 / 10.2.1 |
| minimatch | [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj), High | Separated globstar segments cause combinatorial matching | 3.1.3 / 9.0.7 / 10.2.3 |
| minimatch | [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74), High | Nested extglob patterns trigger catastrophic regex work | 3.1.4 / 9.0.7 / 10.2.3 |
| nanoid | [GHSA-mwcw-c2x4-8c55](https://github.com/advisories/GHSA-mwcw-c2x4-8c55), Moderate | Caller supplies fractional size, weakening generated result | 3.3.8 |
| nanoid | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), High | Negative size reaches non-secure generator loop | 3.3.16 |
| nanoid | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8), High | Zero size reaches custom generator loop | 3.3.18 |
| nanoid | [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w), High | Out-of-range sizes cause integer wrapping | 3.3.12 |
| picomatch | [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p), Moderate | Crafted POSIX class changes matching behavior | 2.3.2 |
| picomatch | [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj), High | Extglob quantifiers drive pathological regex matching | 2.3.2 |
| postcss | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), Moderate | Untrusted serialized CSS closes surrounding style element | 8.5.10 |
| postcss | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q), High | Attacker-controlled mapping URL reads local files | 8.5.12 |
| postcss | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), Moderate | Missing source path permits crafted map reference to bypass earlier fix | 8.5.23 |
| postcss | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849), High | Mapping-path traversal discloses local map content | 8.5.18 |
| postcss-selector-parser | [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92), Low | Deep selector AST exhausts recursion | 6.1.3 for affected 6.1.x copy |
| postcss-selector-parser | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), Moderate | Flat but long selector requires quadratic work | 7.1.6, major from locked 6.x |
| react-router | [GHSA-9jcx-v3wj-wh4m](https://github.com/advisories/GHSA-9jcx-v3wj-wh4m), Moderate | Untrusted path becomes unintended external redirect | 6.30.2 |
| react-router | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), Moderate | Backslash in navigation input bypasses redirect protection | 7.18.0, major from 6.x |
| react-router | [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg), Moderate | Crafted SSR hydration error selects an unsafe constructor; SSR not established here | 7.18.0, major from 6.x |
| rollup | [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc), High | Crafted output paths escape intended build location | 4.59.0 |
| source-map-js | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), High | Indexed map section offsets stall event loop | 1.2.2 |
| tar | [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v), High | Crafted hardlink path writes outside extraction root | 7.5.7, major from 6.x |
| tar | [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97), High | Malicious archive paths/links overwrite files | 7.5.3, major |
| tar | [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx), High | Linked paths resolve through attacker-crafted symlink chain | 7.5.8, major |
| tar | [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96), High | Drive-relative hardlink target escapes extraction boundary | 7.5.10, major |
| tar | [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256), High | Drive-relative symlink target escapes extraction boundary | 7.5.11, major |
| tar | [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w), High | Unicode-colliding paths race under macOS APFS semantics | 7.5.4, major |
| tar | [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh), Moderate | Crafted PAX size and intermediary headers cause inconsistent archive interpretation | 7.5.16, major |
| tar | [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp), Moderate | Numeric PAX path is processed as wrong type and crashes | 7.5.18, major |
| tar | [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), Critical | Unbounded compressed/archive input exhausts parser resources | 7.5.19, major |
| tar | [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w), High | Negative entry length reaches archive-replacement loop | 7.5.18, major |
| tar | [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j), Moderate | NUL-containing PAX path triggers unhandled exception | 7.5.17, major |
| tar | [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m), High | Deep archive path with member selection exhausts stack | 7.5.21, major |
| vite | [GHSA-vg6x-rcgg-rjx6](https://github.com/advisories/GHSA-vg6x-rcgg-rjx6), Moderate | Malicious website can read exposed development-server responses | 5.4.12 |
| vite | [GHSA-x574-m823-4x7w](https://github.com/advisories/GHSA-x574-m823-4x7w), Moderate | Crafted raw query bypasses file restriction | 5.4.15 |
| vite | [GHSA-356w-63v5-8wf4](https://github.com/advisories/GHSA-356w-63v5-8wf4), Moderate | Malformed request target bypasses file restriction | 5.4.18 |
| vite | [GHSA-859w-5945-r5v3](https://github.com/advisories/GHSA-859w-5945-r5v3), Moderate | Slash-dot path variant bypasses file restriction | 5.4.19 |
| vite | [GHSA-xcj6-pq6g-qj4x](https://github.com/advisories/GHSA-xcj6-pq6g-qj4x), Moderate | SVG/relative-path variants bypass file restriction | 5.4.17 |
| vite | [GHSA-g4jq-h2w9-997c](https://github.com/advisories/GHSA-g4jq-h2w9-997c), Low | Public-directory prefix collision exposes unintended file | 5.4.20 |
| vite | [GHSA-jqfw-vq24-v9c3](https://github.com/advisories/GHSA-jqfw-vq24-v9c3), Low | HTML file requests skip intended filesystem checks | 5.4.20 |
| vite | [GHSA-93m4-6634-74q7](https://github.com/advisories/GHSA-93m4-6634-74q7), Moderate | Windows backslash path bypasses file restriction | 5.4.21 |
| vite | [GHSA-4r4m-qw57-chr8](https://github.com/advisories/GHSA-4r4m-qw57-chr8), Moderate | Import plus inline/raw queries bypass file restriction | 5.4.16 |
| vite | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9), Moderate | Optimized dependency source-map path escapes expected directory | 6.4.2, major from 5.x |
| vite | [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3), Moderate | Windows editor launch follows UNC path and discloses NTLM material | 6.4.3, major |
| vite | [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff), High | Windows alternate filename forms evade deny checks | 6.4.3, major |
| ws | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), Moderate | Vulnerable WebSocket processing exposes uninitialized bytes | 8.20.1 |
| ws | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p), High | Peer floods tiny fragments/chunks to amplify memory use | 8.21.0 |
| yaml | [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp), Moderate | Nested YAML collections exhaust parser stack | 2.8.3 |
