-- NOT A MIGRATION
-- DO NOT APPLY BEFORE P1.4c
-- REFERENCE SQL ONLY
--
-- 本文件不是 migration。
-- P1.4c 完成并验证客户端切换之前不得执行。
-- 仅作为后续生成正式 migration 的审核基线。
-- Post-P1.4c, Architecture A must recheck production dependencies and create a
-- newly timestamped migration. Do not move the old 20260821153846 file back.

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

-- Payment webhook reconciliation remains service-only.
REVOKE EXECUTE ON FUNCTION public.confirm_recharge_payment(uuid, text, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_recharge_payment(uuid, text, numeric, jsonb) TO service_role;

-- Existing server-guarded admin reconciliation remains available to authenticated admins.
REVOKE EXECUTE ON FUNCTION public.admin_confirm_recharge_order(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_recharge_order(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_pending_recharge_orders() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_pending_recharge_orders() TO authenticated, service_role;
