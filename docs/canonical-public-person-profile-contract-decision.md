# Canonical Public Person Profile Contract Decision

## Status

- Architecture owner: A - Backend & Shared Contract
- Audit base: `02b72c2c429c009cb761f7d454b014dc0c179a91`
- Production project inspected read-only: `fslpvtlavhrnxsygkpvi`
- Decision: accepted for implementation planning
- Runtime, schema, and product behavior changed by this decision: no

## Decision

The canonical public-person identifier is `auth.users.id`. At public storage
boundaries this is represented by `profiles.user_id` and by the author,
participant, sender, receiver, follower, and followee user identifiers.

The canonical public route will be:

```text
/person/:userId
```

`profiles.id` and `experts.id` are row identifiers, not public-person
identifiers. `experts` is an optional capability and service-provider
extension. A person does not need an expert row, a service offer, or a
verification result to have a public profile.

The existing `/profile` route remains the authenticated user's private/self
area. The name `/profile/:userId` is therefore rejected because it would blur
self-profile and public-person semantics.

## Production Schema Truth

The read-only production audit on 2026-09-01 established the following facts.

### Profiles

- `profiles.id` is the physical primary key.
- `profiles.user_id` is unique and references `auth.users(id)` with cascade on
  delete.
- No production row has `profiles.id = profiles.user_id`.
- All 27 Auth users have exactly one profile; there are no duplicate or orphan
  profiles.
- Stored profile fields include `nickname`, `avatar_url`, `cover_url`, `bio`,
  `phone`, `city`, `city_code`, `gender`, `school`, `industry`, `is_expert`,
  `is_verified`, and timestamps.
- `profiles` has no persisted profile status or visibility column.
- `user_settings.privacy_level` exists separately. All current profile owners
  have a setting and all current values are `public`; `friends_only` semantics
  have not been defined as a public-person read contract.
- RLS is enabled, but current public-read policies and table grants allow anon
  and authenticated callers to select every profile column, including
  `phone`. This is an existing privacy boundary defect. New public-person code
  must not copy or normalize this behavior.

### Experts

- `experts.id` is the expert-extension row primary key.
- `experts.user_id` is unique and is the current owner identity.
- No production expert has `experts.id = experts.user_id`.
- Production has 3 experts and 24 profiles without an expert. All experts map
  to an existing Auth user and profile, but production currently has no direct
  `experts.user_id -> auth.users.id` foreign key constraint.
- `headline`, `intro`, and `expertise_summary` are expert enrichment fields.
- `profile_status` and legacy `is_active` control whether the extension is
  publicly active.
- `education` and `experience` are untyped JSON arrays. All current production
  arrays are empty. They are not a stable experience contract.
- `verification_status` is expert-profile review state. `is_verified` is a
  legacy compatibility boolean.
- `title`, `bio`, `display_name`, `avatar_url`, `category`, tags, rating,
  response metrics, consultation pricing, order/consultation counts,
  experience level, response time, and available slots are marketplace-era
  fields or duplicated presentation data. They do not define Person identity.

### Content And Relationships

- `answers.author_id`, `questions.author_id`, and `posts.author_id` reference
  `auth.users.id`. Compatibility `user_id` columns currently match their
  `author_id` values in production.
- `messages.sender_id` and `messages.receiver_id` reference `auth.users.id`.
- `follows.follower_id` and `follows.followee_id` reference `auth.users.id`.
- All 9 production answers map to profiles, while all 9 answer authors lack an
  expert row. Expert-gated navigation therefore excludes every current real
  answer author.

### Skill Offers

- `skill_offers.expert_id` is misleadingly named. Its foreign key references
  `experts(user_id)`, not `experts(id)`.
- Its real semantic value is the owner Auth user ID. Owner RLS also compares
  `auth.uid()` to `skill_offers.expert_id`.
- The future canonical service-owner field is `ownerUserId: PublicPersonId`.
  Renaming the persisted column must be additive and compatibility-safe; it is
  not required for the first public-person read contract.

### Existing Shared Contract Drift

- `shared-types.Profile.status` has no corresponding production `profiles`
  column and must not be reused as a public-profile visibility status.
- the local Core `Expert` shape still contains raw `any[]` education,
  experience, and availability fields; those are not cross-platform contracts.
- `SearchExpertV2Row` exposes both the expert row `id` and `user_id`, but its
  current navigation target is built from the expert row ID.
- `shared-types.SkillOffer.expert_id` mirrors the misleading storage name even
  though the value is a user identity.

These items should be corrected additively in the A implementation slice. They
must not be patched independently in page code.

## Field Ownership

### Person Base

The public Person base is sourced from a safe projection of `profiles`:

- `user_id`
- `nickname`
- `avatar_url`
- `cover_url`
- `bio`
- `city`
- `created_at`

`school` and `industry` may be exposed only as explicitly self-reported
context. They are not verified experience claims.

The public contract must exclude `phone`, `gender`, `city_code`, profile row
`id`, `is_expert`, `is_verified`, and internal timestamps that have no product
use. The public display name falls back to a neutral product label when
`nickname` is null; it must not make expert display data the identity source.

### Experience And Capability

Answers and public posts are canonical evidence of a person's contributions.
Profile `school` and `industry` are self-reported context. Active expert
headline, intro, and expertise summary are optional self-reported enrichment.

Raw `experts.education` and `experts.experience` must not cross the shared
contract. Their JSON shape is not constrained, their current data is empty,
and no item-level verification relationship exists.

### Expert And Service Extension

An expert extension exists only when the person has an active `experts` row.
Published `skill_offers` may enrich that extension. The extension cannot make
the Person exist, change the route identifier, or imply that consultation or
payment is available.

## Canonical Shared Contract Proposal

The first implementation slice should add these types to `shared-types`. Names
are intentionally product-oriented and do not mirror legacy row names.

```ts
type PublicPersonId = Id; // auth.users.id / profiles.user_id

interface PublicPersonSummary {
  userId: PublicPersonId;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null; // optional active expert enrichment
}

interface PublicPersonAnswerSummary {
  answerId: Id;
  questionId: Id;
  questionTitle: string;
  excerpt: string;
  isAccepted: boolean;
  createdAt: ISODateTime;
}

interface PublicPersonPostSummary {
  postId: Id;
  excerpt: string;
  createdAt: ISODateTime;
}

interface PublicPersonSkillOfferSummary {
  skillOfferId: Id;
  title: string;
  description: string | null;
  pricingMode: SkillPricingMode;
  priceAmount: number | null;
  priceCurrency: string;
  deliveryMode: SkillDeliveryMode;
}

interface PersonExpertExtension {
  headline: string | null;
  intro: string | null;
  expertiseSummary: string | null;
  publishedSkillOffers: PublicPersonSkillOfferSummary[];
}

interface PublicPersonProfile {
  userId: PublicPersonId;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  city: string | null;
  joinedAt: ISODateTime;
  selfReportedContext: {
    school: string | null;
    industry: string | null;
  };
  contributions: {
    answerCount: number;
    postCount: number;
    recentAnswers: PublicPersonAnswerSummary[];
    recentPosts: PublicPersonPostSummary[];
  };
  expertExtension: PersonExpertExtension | null;
}
```

The V1 contract deliberately has no generic `verified` field, no profile or
expert row ID, no phone, no raw JSON experience arrays, and no consultation
success capability.

## Experience Contract Decision

Structured `PersonExperience` is a follow-up contract, not a facade over the
legacy JSON arrays. Its future minimum shape needs a stable item ID, one of
`education` or `employment`, organization, title or degree, optional period,
self-reported source, and an optional typed verification-claim reference.

Until that storage and evidence model exists, UI-1E may truthfully show:

- profile bio;
- self-reported school and industry;
- active expert headline, intro, and expertise summary;
- real answers and public posts.

It must not render a verified experience timeline from the legacy arrays.
Absence of structured experience is an explicit empty state, not a fixture.

## Verification Boundary

Public Person verification remains four separate domains:

1. identity verification;
2. education or employment claim verification;
3. professional qualification verification;
4. expert or service-profile review.

`profiles.is_verified`, `experts.is_verified`, and
`experts.verification_status` must not become a generic person or experience
badge. The V1 public-person response omits them. A later typed claim/evidence
contract may expose scope-specific public badges after evidence privacy,
reviewer provenance, validity, expiry, and revocation semantics are approved.
That follow-up does not block a truthful basic Public Person page.

## Canonical Read API Recommendation

Client-side multi-query aggregation is rejected as the canonical cross-platform
boundary. It would duplicate identifier joins and error handling, expose
storage vocabulary, and perpetuate the current broad profile-column access.

Architecture A should implement:

```text
public.get_public_person_profile_v1(p_user_id uuid) -> jsonb
```

The matching `shared-api` contract should define a request with `p_user_id`, a
runtime parser for `{ person: PublicPersonProfile | null }`, and a canonical RPC
catalog entry with an `anon` semantic read boundary.

The function should:

- return null for missing or non-public people without disclosing which guard
  failed;
- allow the owner to view their own profile;
- treat `friends_only` as unavailable until a friend visibility rule is
  explicitly defined;
- reject deleted or currently banned Auth users;
- project only approved profile columns;
- include only visible answers, public active posts, active expert enrichment,
  and published skill offers;
- use bounded recent-content limits and return aggregate counts;
- never expose Auth metadata, email, phone, legacy verification booleans, or
  raw expert JSON;
- fail closed on malformed storage rows rather than silently substituting
  fixtures.

Because anonymous callers cannot read owner-only `user_settings` or Auth user
status directly, the current recommendation is a narrowly scoped
`SECURITY DEFINER` read function with `SET search_path = ''`, fully qualified
objects, no dynamic SQL, an explicit safe projection, and explicit grants.
`PUBLIC` execute should be revoked; only `anon`, `authenticated`, and
`service_role` should receive execute. This is an intentional exception to the
normal `SECURITY INVOKER` preference and requires contract, grant, and privacy
tests.

The existing direct `profiles` public read, including `phone`, requires a
separate staged hardening after current clients are inventoried and moved to
safe projections. The new Person page must use the RPC from its first release;
it must not wait for or worsen the legacy table-access cleanup.

## Current Route And Entrypoint Audit

| Entrypoint | Current identifier | Current result | Canonical target |
| --- | --- | --- | --- |
| Home recommendation | `experts.id` | `/expert-profile/:expertId` | `/person/:userId` from `experts.user_id` |
| Channel recommendation | `experts.id` | profile and consultation routes use expert row ID | person route uses `user_id`; service route remains separate |
| Search expert result | `experts.id` despite row also returning `user_id` | opens expert profile | person result/navigation uses `user_id` |
| Question answer | `answers.author_id`, then active expert lookup | link exists only when `experts.id` resolves | direct `/person/:authorId` |
| Question asker | `questions.author_id` | no canonical person link | `/person/:authorId` |
| Discover author | `posts.author_id` | rendered but not linked | `/person/:authorId` |
| Message partner | Auth user ID | chat route already uses user identity | `/person/:partnerId` when profile navigation is added |
| Following | `follows.followee_id` | incorrectly passed to an expert-ID route | `/person/:followeeId` |
| User notification | related user ID by semantic contract | passed to an expert-ID route | `/person/:relatedUserId` |
| Legacy expert profile | `experts.id` | expert-only public identity | compatibility resolver to Person user ID |
| Legacy expert detail | `experts.id` | service/consultation detail | retain as a service-extension route until separately replaced |
| Mini Program search | legacy result key | expert-detail presentation route | later consume PublicPersonId; not part of UI-1E Core work |

The current code therefore mixes expert row IDs and Auth user IDs behind the
same `/expert-profile/:id` shape. Following and notification paths are already
capable of passing user IDs into a route that queries `experts.id`.

## Route Migration

### Phase 1: Additive Person Boundary

- Architecture A implements and deploys the V1 shared contract and read RPC.
- Architecture B adds `/person/:userId` and the UI-1E page using only that
  contract.
- Existing expert routes remain unchanged.

### Phase 2: Entrypoint Cutover

- Answer, asker, post author, message partner, following, notification, Home,
  Search, and Channel person links pass user IDs directly.
- Search and channel adapters use the existing `experts.user_id` enrichment
  field rather than `experts.id` for person navigation.
- `/expert-profile/:expertId` resolves the expert row to `user_id` and replaces
  navigation with `/person/:userId`; old links continue to work.

### Phase 3: Legacy Retirement

- Remove new generation of `/expert-profile` links after telemetry and static
  guards show zero callers.
- Retain `/expert/:expertId` only as a legacy service-extension route until a
  separate service contract replaces it.
- Rename persisted service-owner vocabulary only through a new additive
  migration and compatibility window.

## Implementation Gate And Ownership

The following are blockers before Architecture B starts production UI-1E data
wiring:

1. Architecture A exports the V1 shared types and runtime parser.
2. Architecture A adds the canonical RPC catalog/page-contract entries.
3. Architecture A creates, tests, reviews, deploys, and smoke-tests the safe
   read RPC against an ordinary non-expert profile and an active expert.
4. Architecture A verifies null/private/banned behavior and sensitive-field
   exclusion.

A separate normalized experience/verification schema is not a blocker for the
basic profile, but it is a blocker for any verified experience timeline or
badge.

Ownership is:

- A: identifier, shared types/API, RPC, grants, privacy projection, legacy
  resolver contract, and service-owner naming migration plan.
- B: Shared Core route/page and entrypoint adoption after the A gate passes,
  plus iOS shared-shell and deep-link targeted QA.
- C: Android shared-shell and deep-link targeted QA; no native identity model.
- D: later WeChat Mini Program contract adoption; no platform-specific Person
  semantics.

## Migration Need

A small reviewed migration is required to create the canonical RPC and its
explicit grants. No new Person table is required. No migration is applied by
this decision.

A later integrity migration should add and validate the missing
`experts.user_id -> auth.users.id` foreign key after dependency review. A later
privacy cutover should remove broad direct profile-column exposure once all
clients use safe projections. Neither change should be bundled into the UI
route migration without compatibility testing.

## Risks And Rollback

- Identifier mix-up: branded naming and route helpers must distinguish
  `PublicPersonId`, `ExpertProfileId`, and `SkillOfferId`; contract tests reject
  expert IDs in Person navigation construction.
- Privacy leak: the RPC is an allowlist projection and tests must assert that
  phone, Auth metadata, verification internals, and raw experience JSON never
  appear.
- Visibility ambiguity: `friends_only` fails closed until its relationship
  rule is approved.
- Legacy-link breakage: the old route remains additive and resolves to Person;
  it is not deleted during Phase 1 or Phase 2.
- Expert enrichment failure: a missing, inactive, or malformed expert row
  returns `expertExtension: null` and never makes the Person disappear.
- Deployment rollback: the additive RPC and route can be removed or clients
  can temporarily stop linking to `/person` without altering existing expert
  rows or content. No destructive data migration is part of V1.
