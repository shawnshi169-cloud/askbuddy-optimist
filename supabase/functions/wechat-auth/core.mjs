export const WECHAT_AUTH_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_WECHAT_CODE: 'INVALID_WECHAT_CODE',
  WECHAT_UPSTREAM_ERROR: 'WECHAT_UPSTREAM_ERROR',
  AUTH_IDENTITY_ERROR: 'AUTH_IDENTITY_ERROR',
  AUTH_SESSION_ERROR: 'AUTH_SESSION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
});

export class WechatAuthError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'WechatAuthError';
    this.code = code;
    this.status = status;
  }
}

export function validateWechatLoginRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
      'Invalid request body.',
      400,
    );
  }

  const code = payload.code;
  if (
    typeof code !== 'string'
    || code.length < 1
    || code.length > 256
    || code.trim() !== code
    || !/^[A-Za-z0-9_-]+$/.test(code)
  ) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
      'Invalid login code.',
      400,
    );
  }

  return { code };
}

export function normalizeWechatExchange(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.WECHAT_UPSTREAM_ERROR,
      'WeChat authentication is temporarily unavailable.',
      502,
    );
  }

  const errcode = Number(payload.errcode ?? 0);
  if (Number.isFinite(errcode) && errcode !== 0) {
    const isInvalidCode = errcode === 40029 || errcode === 40163;
    throw new WechatAuthError(
      isInvalidCode
        ? WECHAT_AUTH_ERROR_CODES.INVALID_WECHAT_CODE
        : WECHAT_AUTH_ERROR_CODES.WECHAT_UPSTREAM_ERROR,
      isInvalidCode
        ? 'The WeChat login code is invalid or expired.'
        : 'WeChat authentication is temporarily unavailable.',
      isInvalidCode ? 401 : 502,
    );
  }

  if (typeof payload.openid !== 'string' || payload.openid.length < 1 || payload.openid.length > 128) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.WECHAT_UPSTREAM_ERROR,
      'WeChat authentication is temporarily unavailable.',
      502,
    );
  }

  return {
    openid: payload.openid,
    unionid:
      typeof payload.unionid === 'string' && payload.unionid.length > 0
        ? payload.unionid
        : null,
  };
}

export async function deriveWechatUserId(appId, openid, namespaceSecret) {
  if (typeof namespaceSecret !== 'string' || namespaceSecret.length < 32) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Authentication identity configuration is unavailable.',
      500,
    );
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(namespaceSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${appId}:${openid}`)),
  );
  const bytes = digest.slice(0, 16);

  // RFC 9562 UUIDv8: application-defined payload with the standard variant.
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const WECHAT_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildWechatSyntheticEmail(candidateUserId) {
  if (typeof candidateUserId !== 'string' || !WECHAT_USER_ID_PATTERN.test(candidateUserId)) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to create the authenticated identity.',
      500,
    );
  }

  return `${candidateUserId.toLowerCase()}@wechat.askbuddy.invalid`;
}

export function isUserNotFoundError(error) {
  return error?.status === 404 && error?.code === 'user_not_found';
}

function isDisabledAuthUser(user, nowMs = Date.now()) {
  const bannedUntil = user?.banned_until;
  const hasBannedUntil = bannedUntil !== null
    && bannedUntil !== undefined
    && String(bannedUntil).length > 0;
  const bannedUntilMs = hasBannedUntil
    ? Date.parse(String(bannedUntil))
    : null;
  const isDeleted = user?.deleted_at !== null
    && user?.deleted_at !== undefined
    && String(user.deleted_at).length > 0;
  const isBanned = bannedUntilMs !== null
    && (!Number.isFinite(bannedUntilMs) || bannedUntilMs > nowMs);

  return isDeleted || isBanned;
}

export function isRecoverableWechatBootstrapUser(user, expectedUserId, nowMs = Date.now()) {
  const providers = user?.app_metadata?.providers;

  // Normal client sign-up cannot choose auth.users.id. The deterministic UUID
  // plus its exact non-deliverable email marks a server-created partial user.
  return Boolean(
    user
    && user.id === expectedUserId
    && !isDisabledAuthUser(user, nowMs)
    && typeof user.email === 'string'
    && user.email.toLowerCase() === buildWechatSyntheticEmail(expectedUserId)
    && user.app_metadata?.provider === 'email'
    && Array.isArray(providers)
    && providers.length === 1
    && providers[0] === 'email'
  );
}

export function validateWechatAuthUser(user, expectedUserId, nowMs = Date.now()) {
  const providers = user?.app_metadata?.providers;
  const hasWechatProvider = user?.app_metadata?.provider === 'wechat'
    && Array.isArray(providers)
    && providers.includes('wechat');

  if (
    !user
    || typeof user.id !== 'string'
    || user.id !== expectedUserId
    || isDisabledAuthUser(user, nowMs)
    || !hasWechatProvider
  ) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to validate the authenticated identity.',
      401,
    );
  }

  return user;
}

async function finalizeWechatBootstrapUser(
  admin,
  user,
  expectedUserId,
  forceMetadataUpdate = false,
) {
  if (!forceMetadataUpdate) {
    try {
      return validateWechatAuthUser(user, expectedUserId);
    } catch (error) {
      if (!isRecoverableWechatBootstrapUser(user, expectedUserId)) {
        throw error;
      }
    }
  } else if (
    !user
    || user.id !== expectedUserId
    || isDisabledAuthUser(user)
    || typeof user.email !== 'string'
    || user.email.toLowerCase() !== buildWechatSyntheticEmail(expectedUserId)
  ) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to validate the authenticated identity.',
      401,
    );
  }

  const { data: updatedUser, error: updateUserError } =
    await admin.auth.admin.updateUserById(expectedUserId, {
      app_metadata: {
        provider: 'wechat',
        providers: ['wechat'],
      },
    });
  if (updateUserError || !updatedUser.user) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to create the authenticated identity.',
      500,
    );
  }

  return validateWechatAuthUser(updatedUser.user, expectedUserId);
}

export async function resolveWechatUser(
  admin,
  appId,
  openid,
  unionid,
  namespaceSecret,
) {
  const { data: existingIdentity, error: lookupError } = await admin
    .from('wechat_identities')
    .select('user_id')
    .eq('app_id', appId)
    .eq('openid', openid)
    .maybeSingle();

  if (lookupError) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to resolve the authenticated identity.',
      500,
    );
  }

  const candidateUserId = existingIdentity?.user_id
    ?? await deriveWechatUserId(appId, openid, namespaceSecret);

  if (!existingIdentity) {
    const { data: existingUser, error: existingUserError } =
      await admin.auth.admin.getUserById(candidateUserId);
    if (existingUserError && !isUserNotFoundError(existingUserError)) {
      throw new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
        'Unable to resolve the authenticated identity.',
        500,
      );
    }

    if (!existingUserError && !existingUser?.user) {
      throw new WechatAuthError(
        WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
        'Unable to resolve the authenticated identity.',
        500,
      );
    }

    let resolvedUser = existingUserError ? null : existingUser.user;
    let forceMetadataUpdate = false;
    if (!resolvedUser) {
      const { data: createdUser, error: createUserError } =
        await admin.auth.admin.createUser({
          id: candidateUserId,
          email: buildWechatSyntheticEmail(candidateUserId),
          role: 'authenticated',
          app_metadata: {
            provider: 'wechat',
            providers: ['wechat'],
          },
          user_metadata: {},
        });

      if (createUserError) {
        const { data: racedUser, error: racedUserError } =
          await admin.auth.admin.getUserById(candidateUserId);
        if (racedUserError || !racedUser.user) {
          throw new WechatAuthError(
            WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
            'Unable to create the authenticated identity.',
            500,
          );
        }
        resolvedUser = racedUser.user;
      } else {
        if (!createdUser?.user) {
          throw new WechatAuthError(
            WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
            'Unable to create the authenticated identity.',
            500,
          );
        }
        resolvedUser = createdUser.user;
        forceMetadataUpdate = true;
      }
    }

    await finalizeWechatBootstrapUser(
      admin,
      resolvedUser,
      candidateUserId,
      forceMetadataUpdate,
    );
  }

  const { data: claimedUserId, error: claimError } = await admin.rpc(
    'claim_wechat_identity_v1',
    {
      p_app_id: appId,
      p_openid: openid,
      p_unionid: unionid,
      p_candidate_user_id: candidateUserId,
    },
  );

  if (claimError || typeof claimedUserId !== 'string') {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to persist the authenticated identity.',
      500,
    );
  }

  const { data: finalUserData, error: finalUserError } =
    await admin.auth.admin.getUserById(claimedUserId);
  if (finalUserError) {
    throw new WechatAuthError(
      WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
      'Unable to validate the authenticated identity.',
      401,
    );
  }
  validateWechatAuthUser(finalUserData.user, claimedUserId);

  return claimedUserId;
}

export function normalizeJwtTtl(rawValue) {
  const parsed = Number(rawValue ?? 900);
  if (!Number.isInteger(parsed) || parsed < 300 || parsed > 3600) {
    return 900;
  }
  return parsed;
}

export function normalizeRateLimit(rawValue) {
  const parsed = Number(rawValue ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
    return 10;
  }
  return parsed;
}

export function buildWechatJwtClaims(userId, supabaseUrl, nowSeconds, ttlSeconds) {
  return {
    iss: `${supabaseUrl.replace(/\/$/, '')}/auth/v1`,
    aud: 'authenticated',
    sub: userId,
    role: 'authenticated',
    aal: 'aal1',
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    jti: crypto.randomUUID(),
    is_anonymous: false,
    app_metadata: {
      provider: 'wechat',
      providers: ['wechat'],
    },
    user_metadata: {},
    amr: [{ method: 'wechat', timestamp: nowSeconds }],
  };
}

export function buildWechatAuthResponse(accessToken, expiresAt, userId, profile) {
  return {
    session: {
      accessToken,
      expiresAt,
      tokenType: 'bearer',
    },
    user: {
      id: userId,
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

export function consumeRateLimit(buckets, key, nowMs, limit, windowMs = 60_000) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
