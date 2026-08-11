import type {
  WechatAuthErrorPayload,
  WechatAuthResponse,
} from "../../shared-types/src/contracts";

export const EDGE_FUNCTION_WHITELIST = {
  wechat_auth_v1: "wechat-auth",
} as const;

export type EdgeFunctionName = keyof typeof EDGE_FUNCTION_WHITELIST;

export interface WechatLoginRequest {
  code: string;
}

export type WechatAuthV1SuccessResponse = WechatAuthResponse;

export interface WechatAuthV1ErrorResponse {
  error: WechatAuthErrorPayload;
}

export type WechatAuthV1Result =
  | WechatAuthV1SuccessResponse
  | WechatAuthV1ErrorResponse;
