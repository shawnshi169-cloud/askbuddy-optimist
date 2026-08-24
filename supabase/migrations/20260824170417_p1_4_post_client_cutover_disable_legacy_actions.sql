-- P1.4 post-client cutover: remove ordinary-client access to legacy actions.
-- P1.4c has removed these client call paths. This migration changes EXECUTE
-- privileges only; function bodies, RLS, and business data remain untouched.

-- Deprecated or compatibility-only client actions become server-only.
REVOKE EXECUTE ON FUNCTION public.accept_answer_and_transfer_points(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_answer_and_transfer_points(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recharge_points(integer, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recharge_points(integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_recharge_payment_order(integer, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_recharge_payment_order(integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_consultation_order(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_consultation_order(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_topic_discussion_secure(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_topic_discussion_secure(uuid, text) TO service_role;

-- Signed payment-webhook reconciliation remains service-only.
REVOKE EXECUTE ON FUNCTION public.confirm_recharge_payment(uuid, text, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_recharge_payment(uuid, text, numeric, jsonb) TO service_role;

-- Authenticated callers must still pass each function's server-side admin guard.
REVOKE EXECUTE ON FUNCTION public.admin_confirm_recharge_order(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_recharge_order(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_pending_recharge_orders() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_pending_recharge_orders() TO authenticated, service_role;
