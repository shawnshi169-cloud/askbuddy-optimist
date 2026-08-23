# P1.4b Backend Hardening Activation Plan

Status: Prepared, not deployed

Architecture owner: A - Backend & Shared Contract
Codex workstream: Codex A

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

## POST-P1.4c REFERENCE SQL

Reference: `docs/sql/p1-4b-post-client-cutover-disable-legacy-actions.sql`

This file is not a migration and is intentionally outside `supabase/migrations`. A normal `supabase db push` cannot apply it. It records the reviewed plan to revoke ordinary-client EXECUTE from:

- `accept_answer_and_transfer_points`
- `recharge_points`
- `create_recharge_payment_order`
- `create_consultation_order`
- `create_topic_discussion_secure`

It keeps `confirm_recharge_payment` service-role-only for signed webhook reconciliation. `admin_confirm_recharge_order` and `list_pending_recharge_orders` remain callable by authenticated users but retain their server-side admin/moderator guards.

Current dependency findings:

- No server-side code calls `accept_answer_and_transfer_points`.
- `payment-webhook` legitimately calls `confirm_recharge_payment` with service role.
- Core clients still call legacy answer, recharge, consultation, and topic actions; P1.4c must remove or fail-close those calls first.
- `create_consultation_order` has no legitimate server-side caller and is safe to disable after P1.4c.

After P1.4c is merged and validated, Architecture A must recheck production dependencies, generate a new timestamped migration from this reference, review it, and then apply it. The retired `20260821153846` timestamp must never be moved back into `supabase/migrations`.

## Edge Function Activation

The repository `wechat-prepay` source now follows this policy:

- production/staging/missing/unknown runtime: HTTP 503 `PAYMENT_UNAVAILABLE`
- development/test: mock is allowed only with `PAYMENT_GATEWAY_MODE=mock`
- explicit mock validates the user but creates no database order and emits only visibly mock data

Do not deploy this source before P1.4c removes client fake-success and fallback behavior. No real WeChat payment capability is established by this change.

## Capability Decisions

- Real payment: unavailable.
- Consultation: unavailable; safe to disable after P1.4c.
- Canonical topic-discussion publish: unavailable; no v2 RPC was created.
- `skill_offers` storage and owner-scoped INSERT/UPDATE RLS: real.
- Skill Offer backend direct-write path: real, but the current client publish action remains unavailable because it writes `experts`.

## Activation Order

1. Merge P1.4b backend source and contract artifacts.
2. Independently deploy the SAFE NOW grant migration after its normal staging/dry-run review.
3. Keep the fail-closed `wechat-prepay` source undeployed until P1.4c.
4. Complete P1.4c client removal of legacy and fake-success paths.
5. Validate staging has no blocked legacy client calls.
6. Recheck production dependencies against the reference SQL.
7. Generate and review a newly timestamped cutover migration; do not reuse `20260821153846`.
8. Apply the new cutover migration and deploy fail-closed `wechat-prepay`.
9. Run canonical/reconciliation/payment-unavailable smoke tests and monitor denied legacy calls.
