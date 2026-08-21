# Contract Snapshot v1 - P1.4a Production Truth Baseline

Updated: 2026-08-21

Owner: Architecture A - Backend & Shared Contract

Consumers: Core App, iOS Native, Android Native, WeChat Mini Program

This snapshot records persisted production vocabulary and API boundaries. It
does not claim that every client has already migrated to the canonical path.

## Sources checked

- Production project `fslpvtlavhrnxsygkpvi` (read-only schema, constraints,
  function signatures and grants)
- Repository migrations through P1.3
- `packages/shared-types/src/contracts.ts`
- `packages/shared-api/src/rpc-catalog.ts`
- `packages/shared-api/src/page-contract-map.ts`

## Question truth

`public.questions.status` accepts only:

- `open`
- `pending_payment`
- `paid`
- `closed`
- `solved`

`draft` is not a persisted question status. Draft content belongs in
`public.question_drafts` or an explicitly local composer draft. Hidden content
is represented by `questions.is_hidden`; `hidden` is not a question status.
`matched` is not accepted by the production status constraint and is not a
canonical value.

Answer status remains:

- `active`
- `accepted`
- `hidden`
- `rejected`

## Moderation truth

`content_reports.target_type` and `moderation_queue.item_type` accept:

- `question`
- `answer`
- `post`
- `skill_offer`
- `expert`
- `message`
- `user_verifications`

Report status accepts:

- `pending`
- `in_review`
- `resolved`
- `rejected`

Queue status accepts:

- `pending`
- `in_review`
- `processed`
- `closed`

Legacy adapters may normalize `discussion -> post`, `profile -> expert`,
`user_verification -> user_verifications`, and `reviewing -> in_review`.
Clients must not send legacy values to canonical Pack07 APIs.

The wider `ContentTargetType` remains separate because notifications, messages
and Call have additional values such as `order`, `manual` and `call_session`.
The singular `user_verification` remains valid for the existing Call target
constraint; it must not be confused with Pack07 moderation vocabulary.

## Notification boundary

Production keeps Pack05 canonical and legacy compatibility columns together:

- Canonical storage: `body`, `target_type`, `target_id`
- Compatibility storage: `content`, `related_type`, `related_id`

Cross-platform code must consume:

```text
NotificationRow
-> normalizeNotification()
-> Notification
```

The normalizer prefers canonical columns and reads compatibility columns only
when canonical values are null. UI code should consume camelCase domain fields
and must not choose between storage columns.

## Search v2 boundary

`search_app_content_v2` returns four typed collections:

- `questions: SearchQuestionV2Row[]`
- `experts: SearchExpertV2Row[]`
- `skills: SearchSkillV2Row[]`
- `posts: SearchPostV2Row[]`

`parseSearchAppContentV2RawResult()` validates the production payload.
`parseSearchAppContentV2Result()` adds the discriminant and navigation target:

```text
kind: question | expert | skill | post
navigationTarget: { kind, id }
```

Canonical result collections contain no `unknown[]` or `any[]`.

## RPC catalog

`packages/shared-api/src/rpc-catalog.ts` is the source of truth. Every entry
records name, status, effective authentication boundary, request type, response
type, feature owner and production grant review.

### Deprecated

- `accept_answer_and_transfer_points`
- `recharge_points`
- `search_app_content`

### Blocked / noncanonical

- `create_consultation_order`
- `create_recharge_payment_order`
- `confirm_recharge_payment`
- `admin_confirm_recharge_order`
- `list_pending_recharge_orders`

### Compatibility-only

- `create_topic_discussion_secure`
- legacy admin moderation/config RPCs listed in the catalog

Deprecated, blocked and compatibility-only entries remain deployed where
needed for compatibility, but must not become new product main paths.

Production grants are not fully aligned with effective authentication for some
legacy `SECURITY DEFINER` functions. Those entries are marked `overbroad`; grant
normalization belongs to P1.4b and is not changed by this baseline.

## Capability truth

Payment:

- `wechat-prepay`: `mock`, not production-ready
- recharge order flow: `unavailable`, current RPC uses pre-Pack06 vocabulary
- `recharge_points`: deprecated compatibility only

Consultation:

- `create_consultation_order`: unavailable until Pack06 order and ledger
  compatibility is resolved

Skill offers:

- `public.skill_offers`: real canonical persisted model
- current Skill Publish action: unavailable because the current UI writes
  `experts` instead of `skill_offers`

## Page mapping

`packages/shared-api/src/page-contract-map.ts` separately records:

- canonical `readContracts`
- canonical `writeContracts`
- current implementation status
- current read/write paths
- known gaps

The map covers Home, Search, Ask, Discover, Messages, Profile, Question Detail,
Channel, Topic Detail, Expert Detail, Skill Publish, Chat Detail, Post Editor
and Call.

## Guardrails

1. Persisted values come from `shared-types`; UI-only state cannot be added to
   a backend enum.
2. RPC status and auth boundaries come from `RPC_CATALOG`.
3. New client work may use only canonical catalog entries.
4. Platform adapters normalize storage/API shapes before UI consumption.
5. Contract conflicts return to Architecture A before implementation.

## Out of scope for P1.4a

- No production database mutation
- No RPC/RLS/grant implementation change
- No fallback removal
- No payment or consultation repair
- No Core App or Mini Program behavior change
