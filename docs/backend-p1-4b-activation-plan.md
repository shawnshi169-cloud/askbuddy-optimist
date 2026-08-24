# P1.4b Backend Hardening Activation Plan

Status: P1.4c merged - production cutover prepared, not deployed

Architecture owner: A - Backend & Shared Contract
Codex workstream: Codex A
Canonical main: `c099ebd620135fdb9e13774c031618ca24dedb13`

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

It does not change function bodies, rows, RLS, or business state. Deployment still requires normal staging validation and an explicit Architecture A deployment task.

## Production Dependency Re-audit

The post-P1.4c production inspection was read-only. It confirmed:

- Core production source no longer calls `accept_answer_and_transfer_points`, `recharge_points`, `create_recharge_payment_order`, `create_consultation_order`, or `create_topic_discussion_secure`.
- Database function definitions contain no additional server-side caller for those five actions.
- `payment-webhook` legitimately uses service role to call `confirm_recharge_payment` after its provider HMAC verification succeeds.
- `admin_confirm_recharge_order` and `list_pending_recharge_orders` retain their server-side admin/moderator guards and still require `authenticated` plus `service_role` EXECUTE.
- The deployed `wechat-prepay` v12 is the only observed server dependency on `create_recharge_payment_order`; it is the obsolete mock implementation that this activation replaces, not a reason to retain client access.
- API and Edge logs returned no recent invocation evidence during the inspection window. This is supporting evidence, not a substitute for source and privilege checks.

## Post-P1.4c Cutover Migration

Formal migration: `20260824170417_p1_4_post_client_cutover_disable_legacy_actions.sql`

This new privilege-only migration was generated after P1.4c merged and after the production dependency re-audit. It removes ordinary-client EXECUTE from the five deprecated/compatibility actions, keeps `confirm_recharge_payment` service-role-only, and keeps the guarded admin reconciliation RPCs available to `authenticated` and `service_role`.

It is prepared in the repository and has not been applied to Production.

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

P1.4c has removed the client fake-success and fallback behavior. The source is ready for a separate reviewed Production activation, but remains undeployed. No real WeChat payment capability is established by this change.

## Capability Decisions

- Real payment: unavailable.
- Consultation: unavailable; safe to disable after P1.4c.
- Canonical topic-discussion publish: unavailable; no v2 RPC was created.
- `skill_offers` storage and owner-scoped INSERT/UPDATE RLS: real.
- Skill Offer backend direct-write path: real, but the current client publish action remains unavailable because it writes `experts`.

## Activation Order

1. Review and merge the post-P1.4c cutover preparation PR; do not deploy from its feature branch.
2. Deploy the merged fail-closed `wechat-prepay` from canonical `main` before revoking `create_recharge_payment_order` client access.
3. Verify an authenticated Production prepay request returns HTTP 503 `PAYMENT_UNAVAILABLE` and creates no order.
4. Run linked migration list and dry-run stop gates; the plan must include only the pending SAFE NOW migration and the new post-P1.4c cutover migration in order.
5. Apply `20260821153836_p1_4b_normalize_canonical_rpc_grants.sql`.
6. Apply `20260824170417_p1_4_post_client_cutover_disable_legacy_actions.sql`.
7. Verify canonical RPC grants, legacy client EXECUTE revocations, service-role-only `confirm_recharge_payment`, and guarded admin reconciliation grants.
8. Run a signed payment-webhook reconciliation smoke that proves service-role execution still works without exposing or logging secrets.
9. Monitor denied legacy RPC calls, prepay 503 responses, payment-webhook errors, and unexpected order creation. Roll back only with a separately reviewed privilege restoration migration or a prior known-good Edge deployment.

The Edge-first order removes the only deployed caller of `create_recharge_payment_order` before the cutover migration revokes its authenticated access. It also prevents the old mock endpoint from creating apparently payable orders during the migration window.

## Deployment State

- SAFE NOW migration in repository: yes
- SAFE NOW applied to Production: no
- Post-P1.4c migration in repository: yes
- Post-P1.4c migration applied to Production: no
- Fail-closed `wechat-prepay` source in repository: yes
- Fail-closed `wechat-prepay` deployed to Production: no
