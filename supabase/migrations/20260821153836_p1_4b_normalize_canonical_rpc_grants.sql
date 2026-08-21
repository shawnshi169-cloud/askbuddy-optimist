-- P1.4b SAFE NOW: make canonical RPC execution grants match the shared catalog.
-- This migration changes privileges only. Function bodies and business data are untouched.

-- Authenticated question, message, notification, search-history, and moderation actions.
REVOKE EXECUTE ON FUNCTION public.accept_answer_v2(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_answer_v2(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_question_secure(text, text, text, text[], integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_question_secure(text, text, text, text[], integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_answer_secure(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_answer_secure(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.send_direct_message(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_conversations() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_unread_message_count() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_unread_message_count() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_unread_notification_count() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_unread_notification_count() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_search_history(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_search_history(text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.submit_content_report(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_content_report(uuid, text, text, text) TO authenticated, service_role;

-- Authenticated Call v1 actions.
REVOKE EXECUTE ON FUNCTION public.create_call_session_v1(uuid, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_call_session_v1(uuid, text, text, uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.accept_call_v1(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_call_v1(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reject_call_v1(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_call_v1(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.end_call_v1(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_call_v1(uuid, text) TO authenticated, service_role;

-- Anonymous read/search RPCs remain available to anon and authenticated clients.
REVOKE EXECUTE ON FUNCTION public.search_app_content_v2(text, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_app_content_v2(text, integer) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_search_suggestions_v2(text, integer, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_search_suggestions_v2(text, integer, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_channel_feed(text, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_channel_feed(text, text, integer, integer) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_nearby_experts(double precision, double precision, double precision) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_experts(double precision, double precision, double precision) TO anon, authenticated, service_role;

-- Server-only canonical actions.
REVOKE EXECUTE ON FUNCTION public.create_system_notification_v2(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_system_notification_v2(uuid, text, text, text, text, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_order_status_v2(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_order_status_v2(uuid, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_wechat_identity_v1(text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_wechat_identity_v1(text, text, text, uuid) TO service_role;
