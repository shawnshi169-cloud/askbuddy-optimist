# P1.4b Backend Hardening Activation Plan

Status: Production cutover deployed and verified

Architecture owner: A - Backend & Shared Contract
Codex workstream: Codex A
Activation base: `73f8346a0668d9ad617fa91f3cec707d0b24ffb4`

## Production Grant Audit

The production inspection was read-only. `true/false` values below describe effective EXECUTE privileges before these migrations are applied.

| RPC | Catalog boundary | PUBLIC | anon | authenticated | service_role | Internal boundary | Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `accept_answer_v2` | authenticated | false | true | true | true | `auth.uid()` + author guard | authenticated + service_role |
| `create_question_secure` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `create_answer_secure` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `send_direct_message` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `get_user_conversations` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `get_my_unread_message_count` | authenticated | true | true | true | true | user-scoped visibility | authenticated + service_role |
| `get_my_unread_notification_count` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `mark_notifications_read` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `upsert_search_history` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `submit_content_report` | authenticated | true | true | true | true | `auth.uid()` | authenticated + service_role |
| `create_call_session_v1` | authenticated | false | false | true | true | participant + `auth.uid()` | authenticated + service_role |
| `accept_call_v1` | authenticated | false | false | true | true | participant + `auth.uid()` | authenticated + service_role |
| `reject_call_v1` | authenticated | false | false | true | true | participant + `auth.uid()` | authenticated + service_role |
| `end_call_v1` | authenticated | false | false | true | true | participant + `auth.uid()` | authenticated + service_role |
| `search_app_content_v2` | anon | true | true | true | true | public read | anon + authenticated + service_role |
| `get_search_suggestions_v2` | anon | true | true | true | true | public read; optional user history | anon + authenticated + service_role |
| `get_channel_feed` | anon | true | true | true | true | public read | anon + authenticated + service_role |
| `get_nearby_experts` | anon | true | true | true | true | public read | anon + authenticated + service_role |
| `create_system_notification_v2` | service_role | false | false | false | true | service-role guard | service_role |
| `transition_order_status_v2` | service_role | false | false | false | true | service-role guard | service_role |
| `claim_wechat_identity_v1` | service_role | false | false | false | true | service-role guard | service_role |

The ten canonical authenticated RPCs with effective anon access are:

- `accept_answer_v2`
- `create_question_secure`
- `create_answer_secure`
- `send_direct_message`
- `get_user_conversations`
- `get_my_unread_message_count`
- `get_my_unread_notification_count`
- `mark_notifications_read`
- `upsert_search_history`
- `submit_content_report`

## SAFE NOW

Migration: `20260821153836_p1_4b_normalize_canonical_rpc_grants.sql`

This privilege-only migration normalizes every canonical RPC in `RPC_CATALOG`:

- authenticated actions: `authenticated`, `service_role`
- anonymous reads: `anon`, `authenticated`, `service_role`
- server actions: `service_role` only
- PUBLIC is revoked so future access is explicit

It does not change function bodies, rows, RLS, or business state. It was applied to Production as Stage 2 and its canonical, anonymous-read, and server-only grant boundaries were verified afterward.

## Production Dependency Re-audit

The post-P1.4c production inspection was read-only. It confirmed:

- Core production source no longer calls `accept_answer_and_transfer_points`, `recharge_points`, `create_recharge_payment_order`, `create_consultation_order`, or `create_topic_discussion_secure`.
- Database function definitions contain no additional server-side caller for those five actions.
- `payment-webhook` legitimately uses service role to call `confirm_recharge_payment` after its provider HMAC verification succeeds.
- `admin_confirm_recharge_order` and `list_pending_recharge_orders` retain their server-side admin/moderator guards and still require `authenticated` plus `service_role` EXECUTE.
- The previously deployed `wechat-prepay` v12 was the only observed server dependency on `create_recharge_payment_order`; Production now runs fail-closed v13, so that obsolete dependency has been removed.
- API and Edge logs returned no recent invocation evidence during the inspection window. This is supporting evidence, not a substitute for source and privilege checks.

## Post-P1.4c Cutover Migration

Formal migration: `20260824170417_p1_4_post_client_cutover_disable_legacy_actions.sql`

This new privilege-only migration was generated after P1.4c merged and after the production dependency re-audit. It removes ordinary-client EXECUTE from the five deprecated/compatibility actions, keeps `confirm_recharge_payment` service-role-only, and keeps the guarded admin reconciliation RPCs available to `authenticated` and `service_role`.

It was applied to Production as Stage 3. Post-deployment checks confirmed that the five deprecated/compatibility actions and `confirm_recharge_payment` are service-role-only, while the two guarded admin reconciliation RPCs remain available to `authenticated` and `service_role`.

## Reviewed Reference SQL

Reference: `docs/sql/p1-4b-post-client-cutover-disable-legacy-actions.sql`

This file is not a migration and is intentionally outside `supabase/migrations`. A normal `supabase db push` cannot apply it. It records the reviewed plan to revoke ordinary-client EXECUTE from:

- `accept_answer_and_transfer_points`
- `recharge_points`
- `create_recharge_payment_order`
- `create_consultation_order`
- `create_topic_discussion_secure`

It keeps `confirm_recharge_payment` service-role-only for signed webhook reconciliation. `admin_confirm_recharge_order` and `list_pending_recharge_orders` remain callable by authenticated users but retain their server-side admin/moderator guards.

P1.4c is now merged and the new formal migration has been generated. This reference remains non-deployable review history. The retired `20260821153846` timestamp must never be reused or moved back into `supabase/migrations`.

## Edge Function Activation

The repository `wechat-prepay` source now follows this policy:

- production/staging/missing/unknown runtime: HTTP 503 `PAYMENT_UNAVAILABLE`
- development/test: mock is allowed only with `PAYMENT_GATEWAY_MODE=mock`
- explicit mock validates the user but creates no database order and emits only visibly mock data

P1.4c removed the client fake-success and fallback behavior. Production now runs `wechat-prepay` v13 with this fail-closed policy; repeated smoke requests returned HTTP 503 `PAYMENT_UNAVAILABLE` and created no order. No real WeChat payment capability is established by this activation.

## Capability Decisions

- Real payment: unavailable.
- Consultation: unavailable; safe to disable after P1.4c.
- Canonical topic-discussion publish: unavailable; no v2 RPC was created.
- `skill_offers` storage and owner-scoped INSERT/UPDATE RLS: real.
- Skill Offer backend direct-write path: real, but the current client publish action remains unavailable because it writes `experts`.

## Completed Activation And Verification

1. Deployed fail-closed `wechat-prepay` v13 from the reviewed canonical `main` activation base.
2. Verified Production prepay returns HTTP 503 `PAYMENT_UNAVAILABLE` before authentication or order creation.
3. Applied `20260821153836_p1_4b_normalize_canonical_rpc_grants.sql` after a single-migration dry-run stop gate.
4. Applied `20260824170417_p1_4_post_client_cutover_disable_legacy_actions.sql` after a second single-migration dry-run stop gate.
5. Verified canonical RPC grants, legacy client EXECUTE revocations, service-role-only `confirm_recharge_payment`, and guarded admin reconciliation grants.
6. Verified deployed `payment-webhook` v11 reads `SUPABASE_SERVICE_ROLE_KEY`, creates its backend client with that key, validates provider HMAC before its RPC call, and calls `confirm_recharge_payment` without an anon-key path.
7. Verified the reconciliation boundary with a rolled-back database session using `SET LOCAL ROLE service_role` plus a local `request.jwt.claim.role=service_role` claim. A confirmed nonexistent order reached the expected `Order not found` business error rather than a permission error.
8. Verified an invalid-signature webhook request fails closed with HTTP 401 `Invalid webhook signature` before reaching the RPC.
9. Compared `orders`, `payments`, `payment_callbacks`, both point-ledger tables, `point_accounts`, and profile update metadata before and after the smokes. No business row or balance changed.

The Edge-first activation removed the obsolete deployed caller of `create_recharge_payment_order` before ordinary-client access was revoked. The Stage 4 boundary smoke was transaction-scoped and explicitly rolled back.

## Signed Webhook E2E

Full signed HMAC webhook E2E: deferred.

The Production `WECHAT_WEBHOOK_SECRET` has no retained operator copy, and the Supabase secret API exposes only its digest. Generating a valid signature without rotating the secret is therefore impossible. This does not block P1.4 closeout while payment remains explicitly unavailable because the deployed source boundary, database service-role context, zero-write behavior, and invalid-signature fail-closed path have all been verified independently.

Before enabling a real Production payment provider:

- rotate the webhook secret through a reviewed payment-integration task
- retain the replacement in an approved password manager or secret manager with operator recovery access
- synchronize the replacement with the real payment provider
- execute a complete signed webhook end-to-end UAT
- verify callback idempotency, reconciliation, ledger effects, and monitoring with controlled test orders

No webhook secret was rotated or modified during P1.4 closeout.

## Security Advisor Follow-up

The closeout Security Advisor snapshot reported no P1.4 cutover-specific blocker. None of the six service-only cutover targets remained in the anon or authenticated SECURITY DEFINER findings.

Existing backlog recorded without Production mutation:

- `wechat_identities` has RLS enabled with no policy. This is intentional fail-closed behavior for a server-only identity mapping table; no public policy should be added to silence the advisor.
- 14 functions have mutable `search_path`; address them in a scoped function-hardening migration.
- `pg_trgm` remains installed in the public schema; review extension relocation separately.
- 35 anon-executable and 50 authenticated-executable SECURITY DEFINER findings require classification by public API, trigger/helper, admin-guarded RPC, or intentional anonymous read. Canonical authenticated RPC findings are not automatically defects when their internal identity, ownership, or role guards are intact.
- leaked-password protection remains disabled and belongs to the Auth security backlog.

## Performance Advisor Follow-up

The closeout Performance Advisor snapshot reported no Stage 2/3 migration-specific blocker. Existing backlog consists of:

- 17 unindexed foreign-key findings
- 120 `auth_rls_initplan` findings
- 74 multiple-permissive-policy findings
- 111 unused-index findings
- 2 duplicate-index findings

Indexes and RLS policies must be reviewed against real workload and authorization semantics in separate scoped tasks; none were changed during this closeout.

## Deployment State

- Activation base: `73f8346a0668d9ad617fa91f3cec707d0b24ffb4`
- SAFE NOW migration in repository: yes
- SAFE NOW applied to Production: yes (`20260821153836`)
- Post-P1.4c migration in repository: yes
- Post-P1.4c migration applied to Production: yes (`20260824170417`)
- Fail-closed `wechat-prepay` source in repository: yes
- Fail-closed `wechat-prepay` deployed to Production: yes (v13 ACTIVE)
- `payment-webhook`: v11 ACTIVE; service-role reconciliation boundary verified by a zero-write database context smoke
- `wechat-auth`: v8 ACTIVE; unchanged by P1.4 activation
- Production business rows created by Stage 4 smoke: no
- Production DB modified during Stage 4 closeout: no
- Production Edge modified during Stage 4 closeout: no
