import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.3';
import { importJWK, SignJWT } from 'npm:jose@6.1.0';
import {
  WECHAT_AUTH_ERROR_CODES,
  WechatAuthError,
  buildWechatAuthResponse,
  buildWechatJwtClaims,
  consumeRateLimit,
  normalizeJwtTtl,
  normalizeRateLimit,
  normalizeWechatExchange,
  parsePrivateJwk,
  resolveWechatUser,
  validateWechatLoginRequest,
} from './core.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

type AuthErrorShape = {
  code: string;
  message: string;
  status: number;
};

const jsonResponse = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

const errorResponse = (error: AuthErrorShape, requestId: string, retryAfterSeconds = 0) =>
  jsonResponse(
    {
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    },
    error.status,
    retryAfterSeconds > 0 ? { 'Retry-After': `${retryAfterSeconds}` } : {},
  );

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_SESSION_ERROR,
      'Authentication service is not configured.',
      500,
    );
  }
  return value;
};

const exchangeWechatCode = async (appId: string, appSecret: string, code: string) => {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appId);
  url.searchParams.set('secret', appSecret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.WECHAT_UPSTREAM_ERROR,
        'WeChat authentication is temporarily unavailable.',
        502,
      );
    }
    return normalizeWechatExchange(await response.json());
  } catch (error) {
    if (error instanceof WechatAuthError) throw error;
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.WECHAT_UPSTREAM_ERROR,
      'WeChat authentication is temporarily unavailable.',
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse(
      new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
        'Only POST is supported.',
        405,
      ),
      requestId,
    );
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 2_048) {
      throw new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
        'Request body is too large.',
        413,
      );
    }

    const sourceKey =
      request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'unknown';
    const rateLimit = consumeRateLimit(
      rateLimitBuckets,
      sourceKey,
      Date.now(),
      normalizeRateLimit(Deno.env.get('WECHAT_AUTH_RATE_LIMIT_PER_MINUTE')),
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        new WechatAuthError(
          WECHAT_AUTH_ERROR_CODES.RATE_LIMITED,
          'Too many authentication attempts.',
          429,
        ),
        requestId,
        rateLimit.retryAfterSeconds,
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
        'Invalid request body.',
        400,
      );
    }

    const { code } = validateWechatLoginRequest(payload);
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const appId = requiredEnv('WECHAT_APP_ID');
    const appSecret = requiredEnv('WECHAT_APP_SECRET');
    const namespaceSecret = requiredEnv('WECHAT_IDENTITY_HMAC_SECRET');
    const privateJwk = parsePrivateJwk(requiredEnv('WECHAT_AUTH_JWT_PRIVATE_JWK'));

    const wechatIdentity = await exchangeWechatCode(appId, appSecret, code);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const userId = await resolveWechatUser(
      admin,
      appId,
      wechatIdentity.openid,
      wechatIdentity.unionid,
      namespaceSecret,
    );

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttlSeconds = normalizeJwtTtl(Deno.env.get('WECHAT_AUTH_JWT_TTL_SECONDS'));
    const claims = buildWechatJwtClaims(userId, supabaseUrl, nowSeconds, ttlSeconds);
    const signingKey = await importJWK(privateJwk, 'ES256');
    const accessToken = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: privateJwk.kid, typ: 'JWT' })
      .sign(signingKey);

    const { data: profile } = await admin
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    return jsonResponse(
      buildWechatAuthResponse(
        accessToken,
        nowSeconds + ttlSeconds,
        userId,
        profile,
      ),
      200,
    );
  } catch (error) {
    const normalizedError = error instanceof WechatAuthError
      ? error
      : new WechatAuthError(
          WECHAT_AUTH_ERROR_CODES.AUTH_SESSION_ERROR,
          'Unable to create an authenticated session.',
          500,
        );

    console.error(JSON.stringify({
      event: 'wechat_auth_failed',
      requestId,
      code: normalizedError.code,
    }));
    return errorResponse(normalizedError, requestId);
  }
});
