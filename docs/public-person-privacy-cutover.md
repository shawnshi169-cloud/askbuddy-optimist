# Public Person Privacy Cutover

## Current Status

PRODUCTION PRIVACY BOUNDARY CLOSED / OWNER-PRIVATE CONTRACT DEPLOYED /
CURRENT CLIENT PATCH PREPARED / PRODUCT OWNER REVIEW PENDING.

- Baseline: `37ca0919dccf4b21e48228396a4eb1a85b1c4307`.
- Branch: `codex-a/public-person-privacy-cutover`.
- Project: `fslpvtlavhrnxsygkpvi`.
- Migration: `20261007005206_public_person_privacy_cutover.sql`.
- SHA-256: `fb6ca14cab5598f5159a2a9d093171fd3ad4acf57da13a45e4a4cc3bcc0b7f73`.
- Evidence window: 2026-10-07, approximately 06:55-07:12 UTC.
- Apply mechanism: standard `supabase db push --linked --yes`, once.
- Fresh dry-run showed exactly this migration; remote history records it once.
- Project remained `ACTIVE_HEALTHY`, PostgreSQL 17.6, build 17.6.1.063.

This closes direct profile column exposure and client system-field writes. It
does not implement general profile visibility settings or redesign Person UI.
The branch's current client is the supported contract; this task does not
publish an App Store/APK/web bundle or claim every installed client is updated.

## Authorization And Historical State

The initial STOPs were preserved until Product Owner decisions resolved them:

1. Obsolete `search_app_content` is not a compatibility boundary. No private
   profile columns or DEFINER workaround may be added to preserve it.
2. The C0C no-migration assertion now checks only reviewed historical commits
   `c0625b083decfa07437aabc351ba791593a8e56a` through
   `55dc2df070c8f98d3a2f8798c28b6cbc46a5ee6d`. Manifest/SHA/UUID/content,
   pure preview, no apply/seed path, no runtime manifest, closed Discovery flags
   and empty Question UI Topic input assertions remain intact.
3. Stale pre-cutover/internal QA builds are not required compatibility targets.
   The owner authorized one atomic maintenance-window cutover. Rebuild/reload old
   QA clients; never restore broad grants to accommodate them.
4. A final repository guard still asserted that the Public Person route was not
   wired. Work stopped again until the owner authorized a factual truth fix.
   Existing `/person/:userId` consumes canonical Public Person and public
   Experience reads. Blueprint/page guards now positively assert that wiring,
   keep the page read-only, and distinguish database-role verification from the
   untested authenticated HTTP owner-private transport. No UI was implemented
   by this correction and no second Production deployment was performed.

Repository release evidence did not establish a non-upgradable external release.
This is not proof that no old client exists. The Product Owner's observed safe
Data API logs were auxiliary evidence, not a substitute for fresh preflight.

Before cutover, profiles had all 16 expected columns, RLS enabled (not FORCE),
broad anon/authenticated table ACLs and no column ACLs. Both public SELECT
policies used true. Owner UPDATE policies did not protect system-owned columns.
Two existing triggers only maintained updated_at. Real anon HTTP requests for
private columns with limit=0 succeeded, proving permission without retrieving PII.

Historical exposure statements in the canonical Public Person decision remain
historical; its top current status now points to this closeout.

## Final Column Boundary

Public SELECT for anon/authenticated:

`user_id, nickname, avatar_url, cover_url, bio, city, school, industry, created_at`.

The first three preserve batch author/avatar enrichment without N+1 RPC calls.
Bio supports following summaries. Public Person V1 requires cover, city,
self-reported school/industry and joinedAt. City also supports the current city
content filter. These are public facts, not verification claims.

Authenticated owner UPDATE:

`nickname, avatar_url, cover_url, bio, city`.

Only these five have implemented self-edit semantics. School/industry mock
sections do not authorize writes. Existing triggers keep updated_at DB-owned.

Direct SELECT excludes id, phone, gender, city_code, updated_at, is_verified and
is_expert. Direct UPDATE also excludes user_id, created_at, school, industry and
all unsupported fields. Table-wide SELECT/UPDATE and unnecessary INSERT, DELETE,
TRUNCATE, REFERENCES, TRIGGER and MAINTAIN are removed from application roles and
PUBLIC, including prior column privileges before installing exact allowlists.

Existing row policies, RLS mode, backend/service-role privileges, profile schema,
Auth creation trigger and Public Person/Search function definitions are unchanged.

## Owner-Private Contract And Threat Model

`get_my_private_profile_v1()` returns:

`{profile: null | {userId, nickname, avatarUrl, coverUrl, bio, phone, city}}`.

No consumer needed profiles.id, so it is not returned. No target user argument,
verification status, expert state or unrelated private settings is supported.

This narrow SECURITY DEFINER is necessary because direct authenticated phone
SELECT is revoked. The function is postgres-owned, STABLE, empty search_path,
fully qualified and has an explicit non-null auth.uid check with exact owner
predicate. It uses no dynamic SQL or user_metadata authority. PUBLIC and anon
EXECUTE are revoked. Authenticated/service_role execution still requires a
non-null caller uid. Missing uid returns PT401 / AUTHENTICATION_REQUIRED; a
missing profile returns null.

The strict parser rejects missing/extra fields and never incorporates response
values into error messages. AuthContext checks the returned userId against its
requested session identity. Point-account balance loading and login/session
logic are unchanged.

The canonical public RPC remains SECURITY INVOKER with its original strict safe
response. Public identity remains auth.users.id = profiles.user_id.

## Consumer Inventory And Search

Seventeen audited explicit direct client profile projections remain in
ChatDetail, useLocalPosts, useHotTopics, useFollowingPosts, useNotifications,
useQuestions, useProfileData, useExperts, useMessages, usePosts, useSearch, and
useProfile's mutation return. Their batch behavior is retained.

AuthContext no longer reads profiles directly. useUpdateProfile no longer writes
updated_at or uses a bare returning select. Runtime tests exercise both actual
client paths, including balance preservation and stripping unsupported update
keys. No UI component or mock section changed.

Existing unused useUserLocation/get_nearby_experts references to absent
latitude/longitude columns remain separate pre-existing debt. No caller was
found in current client source; no location code or permissions were expanded.

Production legacyReadFallback remains disabled by the build-fact runtime gate.
The staging/development missing-V2 path skips only the obsolete intermediate RPC
and uses its original direct-table fallback with profile fields limited to
user_id,nickname,avatar_url. The legacy RPC definition and EXECUTE grants remain
untouched; it may fail under narrowed profile privileges and is no longer
guaranteed for clients. No profiles.id/updated_at compatibility grants were added.
Search V2 body and result semantics are unchanged.

## Production Verification

| Evidence | Result |
| --- | --- |
| Exact migration history / owner RPC / final column ACLs | PASS |
| No table-wide app privileges; no PUBLIC/anon owner RPC EXECUTE | PASS |
| Public Person/Search V2/legacy Search function definitions and ACLs unchanged | PASS |
| Profile RLS policies unchanged | PASS |
| Real anon HTTP safe user_id/nickname/avatar_url | PASS |
| Real anon HTTP phone/id/updated_at/gender/city_code/is_verified/is_expert | DENIED, 42501 |
| Real anon HTTP Public Person and nonempty-query Search V2 | PASS |
| Authenticated SQL own and cross-user direct phone | DENIED |
| Authenticated SQL owner-private payload equals exact owner row | PASS |
| Missing uid fails closed; another viewer receives only its own profile | PASS |
| Authenticated SQL forbidden field UPDATE grants and execution | DENIED |
| Approved owner update affects one own row; non-owner update affects zero | PASS |
| Anon/authenticated Public Person for 24 ordinary and 3 active-expert people | PASS |
| Missing Public Person; anon/authenticated Search V2 | PASS |
| Authenticated HTTP owner read/update transport | NOT RUN: no isolated session available |
| Real signup/login and WeChat login replay | NOT REPEATED: no users created |
| Auth/signup/WeChat permission and trusted creation path compatibility | PASS |
| Project final health | ACTIVE_HEALTHY |
| Deployment-window Postgres SIGSEGV/signal 11/recovery/termination query | 0 events |

The role smoke in `scripts/sql/profile-privacy-production-rollback.sql` used
existing rows inside one BEGIN/ROLLBACK. Allowed UPDATE statements assigned
existing values to themselves; only DB timestamp triggers could temporarily
change rows. No verification state was fabricated. After rollback, a complete
profile-table digest including private/system/timestamp fields exactly matched
pre-apply. Profiles and auth.users remained 27 rows each. No PII, ids or response
values were emitted by the test, and no users or business fixtures were created.

The repository-only resume performed a final read-only confirmation on
2026-10-07 (approximately 08:08 UTC): ACTIVE_HEALTHY, migration recorded once,
exact nine-column public SELECT and five-column owner UPDATE grants, no broad
application table privileges, unchanged RPC security boundaries, and 27 profile
and 27 Auth rows. No migration, mutation probe or authenticated smoke was rerun.

Role/JWT-context simulation is NOT authenticated HTTP evidence. The original
authorization permits catalog/role proof when an isolated HTTP identity is
unavailable; this transport gap is explicit, not reported PASS.

Email signup and WeChat retain the postgres-owned handle_new_user_pack01 trigger
creating profiles/user_settings/point_accounts. WeChat uses its existing Auth
Admin/service-role path. Neither relies on client profiles INSERT. No auth/Edge
function implementation or credentials changed.

## Security Advisor Delta

Fresh baseline 102; post-cutover 103. Existing categories/finding sets unchanged
except one new authenticated SECURITY DEFINER executable advisory:

| Category | Before | After |
| --- | ---: | ---: |
| RLS enabled without policy | 1 | 1 |
| Mutable function search_path | 14 | 14 |
| Extension in public | 1 | 1 |
| Anon-callable SECURITY DEFINER | 35 | 35 |
| Authenticated-callable SECURITY DEFINER | 50 | 51 |
| Leaked-password protection | 1 | 1 |

The new finding names only get_my_private_profile_v1(). It is the intended,
explicitly authorized narrow owner read, not an anon grant, mutable search_path
or missing owner check. Its threat model and role tests are above. It remains
visible for Product Owner/Security review; it is NOT described as zero new
findings and no unrelated historical debt was fixed.

[Advisor rationale and remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Types, Guards And Checks

Production public + graphql_public type generation yields exactly one new
zero-argument JSON RPC entry. Existing generated content is otherwise unchanged;
AuthContext now uses the normal typed Supabase call. Catalog/whitelist authorize
only the new authenticated owner-private RPC, without unrelated consumer unlocks.

The focused client guard rejects direct profiles star/bare/dynamic/forbidden
projections, including constant query aliases and embedded profile selections.
It audits Shared Core source, not trusted server SQL/Edge code. SQL privileges
remain the actual security enforcement boundary.

After the approved Public Person truth correction, the entire required
repository gate set was rerun, not only the formerly failing assertion:

| Check | Result |
| --- | --- |
| npm ci | PASS |
| typecheck / typecheck:baseline | PASS / PASS |
| complete test:contracts | PASS |
| test:public-person-contract / test:profile-privacy | PASS / PASS |
| test:production-writes / test:fixture-isolation | PASS / PASS |
| test:runtime-mode | PASS |
| test:ui-engineering-readiness / test:ui-platform-readiness | PASS / PASS |
| lint:changed | PASS, one existing AuthContext fast-refresh warning, zero errors |
| production build | PASS |
| git diff --check | PASS |

The local SQL test applies and rolls back the exact migration in the existing
isolated empty PostgreSQL without creating identities or content. It is local
permission/schema proof, not a replacement for the populated Production role
smoke. That pre-apply local test passed; its migration bytes have not changed and
no database test was repeated during repository-only closeout. GitHub CI results
are reported separately in the PR closeout, not inferred from local checks.

## Frozen Scope

No Person UI redesign, Experience UI rollout by A, Topic picker/UI, Search
redesign, Discovery backend, Home/Matching/Editorial, Conversation/Booking/Payment
or EC-4 implementation. No migration rewrite, UI component change, synthetic
Auth user, persistent business write, Edge deployment or broad-grant rollback.

Separate follow-up: the Experience domain's legacy Shared Core wiring wording
and other unrelated page/domain truth are not corrected in this privacy PR.
Only the Public Person route's actual read consumers are recorded here.

DO NOT AUTO-MERGE. Stop after the Draft PR is created and reviewed checks are
reported. Old QA clients must rebuild/reload the current client contract.
