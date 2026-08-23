export const PAYMENT_UNAVAILABLE_ERROR = Object.freeze({
  code: "PAYMENT_UNAVAILABLE",
  message: "Payment is currently unavailable.",
});

const MOCK_RUNTIME_MODES = new Set(["development", "test"]);

export const resolvePaymentGatewayPolicy = (runtimeMode, gatewayMode) => {
  if (MOCK_RUNTIME_MODES.has(runtimeMode) && gatewayMode === "mock") {
    return Object.freeze({ mode: "mock", available: true });
  }

  return Object.freeze({ mode: "unavailable", available: false });
};

export const normalizeMockPoints = (value) => {
  if (
    (typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new TypeError("Invalid points amount");
  }

  const points = Number(value);

  if (!Number.isSafeInteger(points) || points <= 0) {
    throw new TypeError("Invalid points amount");
  }

  return points;
};

export const buildDevelopmentMockPayment = (points, mockId) => ({
  order_id: mockId,
  provider_order_id: mockId,
  provider: "wechat",
  points,
  cash_amount: 0,
  status: "mock",
  payment_payload: {
    is_mock_gateway: true,
    mock_only: true,
  },
});
