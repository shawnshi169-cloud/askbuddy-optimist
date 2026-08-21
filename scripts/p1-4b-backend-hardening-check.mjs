import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDevelopmentMockPayment,
  normalizeMockPoints,
  resolvePaymentGatewayPolicy,
} from "../supabase/functions/wechat-prepay/core.mjs";

const root = process.cwd();
const safeNow = readFileSync(
  join(root, "supabase/migrations/20260821153836_p1_4b_normalize_canonical_rpc_grants.sql"),
  "utf8",
);
const postCutover = readFileSync(
  join(root, "supabase/migrations/20260821153846_p1_4b_post_client_cutover_disable_legacy_actions.sql"),
  "utf8",
);
const prepayIndex = readFileSync(
  join(root, "supabase/functions/wechat-prepay/index.ts"),
  "utf8",
);
const rpcCatalog = readFileSync(
  join(root, "packages/shared-api/src/rpc-catalog.ts"),
  "utf8",
);

const authenticatedRpcSignatures = [
  "accept_answer_v2(uuid, uuid)",
  "create_question_secure(text, text, text, text[], integer)",
  "create_answer_secure(uuid, text)",
  "send_direct_message(uuid, text, text)",
  "get_user_conversations()",
  "get_my_unread_message_count()",
  "get_my_unread_notification_count()",
  "mark_notifications_read(uuid[])",
  "upsert_search_history(text, text)",
  "submit_content_report(uuid, text, text, text)",
  "create_call_session_v1(uuid, text, text, uuid, uuid)",
  "accept_call_v1(uuid)",
  "reject_call_v1(uuid, text)",
  "end_call_v1(uuid, text)",
];

const anonRpcSignatures = [
  "search_app_content_v2(text, integer)",
  "get_search_suggestions_v2(text, integer, text)",
  "get_channel_feed(text, text, integer, integer)",
  "get_nearby_experts(double precision, double precision, double precision)",
];

const serviceRpcSignatures = [
  "create_system_notification_v2(uuid, text, text, text, text, uuid)",
  "transition_order_status_v2(uuid, text, text)",
  "claim_wechat_identity_v1(text, text, text, uuid)",
];

const assertGrant = (sql, signature, roles) => {
  assert.ok(
    sql.includes(
      `REVOKE EXECUTE ON FUNCTION public.${signature} FROM PUBLIC, anon, authenticated, service_role;`,
    ),
    `Missing explicit revoke for ${signature}`,
  );
  assert.ok(
    sql.includes(`GRANT EXECUTE ON FUNCTION public.${signature} TO ${roles};`),
    `Unexpected target grants for ${signature}`,
  );
};

for (const signature of authenticatedRpcSignatures) {
  assertGrant(safeNow, signature, "authenticated, service_role");
}
for (const signature of anonRpcSignatures) {
  assertGrant(safeNow, signature, "anon, authenticated, service_role");
}
for (const signature of serviceRpcSignatures) {
  assertGrant(safeNow, signature, "service_role");
}

for (const signature of [
  "accept_answer_and_transfer_points(uuid, uuid)",
  "recharge_points(integer, text)",
  "create_recharge_payment_order(integer, text)",
  "create_consultation_order(uuid, text)",
  "create_topic_discussion_secure(uuid, text)",
  "confirm_recharge_payment(uuid, text, numeric, jsonb)",
]) {
  assertGrant(postCutover, signature, "service_role");
}

for (const signature of [
  "admin_confirm_recharge_order(uuid, text)",
  "list_pending_recharge_orders()",
]) {
  assertGrant(postCutover, signature, "authenticated, service_role");
}

assert.match(postCutover, /POST-P1\.4c ACTIVATION ONLY/);
assert.match(rpcCatalog, /accept_answer_and_transfer_points[\s\S]*?"deprecated"/);
assert.match(rpcCatalog, /create_consultation_order[\s\S]*?"blocked"/);
assert.match(rpcCatalog, /create_topic_discussion_secure[\s\S]*?"compatibility-only"/);

assert.deepEqual(resolvePaymentGatewayPolicy("production", "mock"), {
  mode: "unavailable",
  available: false,
});
assert.deepEqual(resolvePaymentGatewayPolicy("staging", "mock"), {
  mode: "unavailable",
  available: false,
});
assert.deepEqual(resolvePaymentGatewayPolicy(undefined, "mock"), {
  mode: "unavailable",
  available: false,
});
assert.deepEqual(resolvePaymentGatewayPolicy("unknown", "mock"), {
  mode: "unavailable",
  available: false,
});
assert.deepEqual(resolvePaymentGatewayPolicy("development", undefined), {
  mode: "unavailable",
  available: false,
});
assert.deepEqual(resolvePaymentGatewayPolicy("development", "mock"), {
  mode: "mock",
  available: true,
});
assert.deepEqual(resolvePaymentGatewayPolicy("test", "mock"), {
  mode: "mock",
  available: true,
});

assert.equal(normalizeMockPoints("10"), 10);
assert.throws(() => normalizeMockPoints(0), TypeError);
assert.throws(() => normalizeMockPoints(1.5), TypeError);
assert.throws(() => normalizeMockPoints(true), TypeError);
assert.throws(() => normalizeMockPoints(" "), TypeError);
const mockPayment = buildDevelopmentMockPayment(10, "mock_test_id");
assert.equal(mockPayment.payment_payload.is_mock_gateway, true);
assert.equal(mockPayment.payment_payload.mock_only, true);
assert.equal(mockPayment.status, "mock");
assert.equal(mockPayment.cash_amount, 0);

assert.match(prepayIndex, /PAYMENT_UNAVAILABLE_ERROR/);
assert.match(prepayIndex, /return jsonResponse\(\{ error: PAYMENT_UNAVAILABLE_ERROR \}, 503\)/);
assert.match(prepayIndex, /APP_RUNTIME_MODE/);
assert.match(prepayIndex, /PAYMENT_GATEWAY_MODE/);
assert.doesNotMatch(prepayIndex, /create_recharge_payment_order/);
assert.doesNotMatch(prepayIndex, /WECHAT_PAY_SIGNING_SECRET/);
assert.doesNotMatch(prepayIndex, /prepayid|paySign|HMAC-SHA256/);

console.log("P1.4b backend hardening checks passed.");
