# WeChat Auth v1

状态：P1.1 Backend + Shared Contract

## Architecture Decision

WeChat Auth v1 使用服务端身份桥接，不建立平行用户体系：

```text
wx.login code
  -> wechat-auth Edge Function
  -> WeChat jscode2session
  -> public.wechat_identities
  -> auth.users
  -> short-lived Supabase-compatible ES256 JWT
```

Edge Function 使用 Supabase Auth Admin API 创建无密码、无假邮箱、无假手机号的 `auth.users` 记录。用户 UUID 由 `WECHAT_IDENTITY_HMAC_SECRET` 对 `app_id:openid` 做 HMAC-SHA256 后确定性派生，并通过 `wechat_identities(app_id, openid)` 唯一约束和服务端 claim RPC 处理并发首次登录。

返回 JWT 使用 Supabase Dashboard 导入并激活的 ES256 signing key 签名。JWT 的 `sub` 是对应 `auth.users.id`，`role` 和 `aud` 均为 `authenticated`，因此现有 `auth.uid()` RLS 可以识别该用户。禁止使用 legacy JWT secret、自制 HS256、固定密码或客户端生成 JWT。

## Endpoint

```text
POST /functions/v1/wechat-auth
Content-Type: application/json

{ "code": "wx.login temporary code" }
```

成功响应：

```json
{
  "session": {
    "accessToken": "short-lived-user-jwt",
    "expiresAt": 1700000900,
    "tokenType": "bearer"
  },
  "user": {
    "id": "auth-user-uuid",
    "nickname": null,
    "avatarUrl": null
  }
}
```

响应不会包含 `openid`、`unionid`、`session_key`、service role key 或任何签名私钥。

## Session Lifecycle

- 默认有效期 900 秒，可通过 `WECHAT_AUTH_JWT_TTL_SECONDS` 配置为 300 至 3600 秒。
- v1 不提供 refresh token。过期后客户端重新执行 `wx.login -> wechat-auth` 获取新 token。
- logout 的客户端语义是清除本地 access token 和用户缓存；v1 JWT 不提供单 token 服务端撤销。
- 同一 Mini Program 下同一 `openid` 重复登录返回相同 `auth.users.id`。
- 账号合并不属于 P1.1。未来必须走 service-role 管理动作，客户端不得直接重绑 identity。

## Identity and Profile Separation

认证仅依赖服务端验证后的 `wx.login` code。`wx.getUserProfile` 的昵称和头像不是身份凭证，也不是登录前置条件。本 endpoint 只读取现有 `profiles.nickname/avatar_url` 返回；资料更新应在认证成功后通过独立 profile 能力完成。

## Error Contract

客户端只依赖以下稳定错误码，不依赖微信原始 `errcode/errmsg`：

- `INVALID_REQUEST`
- `INVALID_WECHAT_CODE`
- `WECHAT_UPSTREAM_ERROR`
- `AUTH_IDENTITY_ERROR`
- `AUTH_SESSION_ERROR`
- `RATE_LIMITED`

错误响应包含规范化 `message` 和用于排查的 `requestId`。日志不记录 raw login code、openid、unionid 或 session key。

## Security Boundary

- `wechat-auth` 是 unauthenticated bootstrap endpoint，因此 `verify_jwt = false`；函数内部负责 method/body/code 校验、超时和轻量限流。
- `wechat_identities` 开启并强制 RLS，撤销 `anon`/`authenticated` 权限，仅 service role 可访问。
- `claim_wechat_identity_v1` 仅 service role 可执行，并且不会替换既有 openid 对应的 user ID。
- AppSecret、service role key、HMAC secret 和 private JWK 只能配置为 Supabase Edge Function secrets。
- 限流为单实例最小护栏，不等价于全局分布式防滥用。生产流量扩大前应接入平台级限流/WAF。

## Server Secrets

必须配置：

```text
WECHAT_APP_ID
WECHAT_APP_SECRET
WECHAT_IDENTITY_HMAC_SECRET
WECHAT_AUTH_JWT_PRIVATE_JWK
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

可选配置：

```text
WECHAT_AUTH_JWT_TTL_SECONDS=900
WECHAT_AUTH_RATE_LIMIT_PER_MINUTE=10
```

`WECHAT_AUTH_JWT_PRIVATE_JWK` 必须是在可信环境中外部生成、已安全保留，并已导入 Supabase Auth signing keys 且处于 active 状态的 P-256 private JWK，包含匹配的 `kid`。不得把任何真实值提交到仓库。

## Dashboard and Deployment Prerequisites

1. 在可信环境外部生成 ES256 private JWK，例如使用 `supabase gen signing-key --algorithm ES256`，并立即存入受控 secret manager。
2. 将该 private key 导入目标 Supabase Auth Signing Keys，先保持为 standby key，确认 JWKS 已发布对应 public key 后再 rotate 为 active。
3. 将安全保留的同一份 private JWK 配置为 Edge Function secret `WECHAT_AUTH_JWT_PRIVATE_JWK`。不得采用“由 Supabase 创建 key 后再导出 private key”的流程，因为平台不会提供 private key 导出能力。
4. 注入微信 App ID/AppSecret、HMAC secret 和 service role key。
5. 执行 migration 后部署 `wechat-auth` Edge Function。
6. 使用真实小程序 App ID 和临时 code 完成 first-login、repeat-login 和 RLS UAT。

Signing key rotation 必须协调执行：先生成并安全保存新 private JWK，将其作为 standby key 导入 Supabase Auth，再更新 Edge Function secret 和部署函数，最后按 Supabase signing-key rotation 流程切换 active key。切换期间必须确保 Edge Function 使用的 `kid` 与 Supabase JWKS 中可验证的 key 一致，不能单独轮换任一侧。

未完成以上 Dashboard 配置前，代码可以通过 mock-upstream contract test，但不能声明真实微信 UAT 通过。

## Validation Scope

自动 contract test 覆盖：输入校验、微信错误规范化、敏感字段禁入、稳定用户 UUID、并发确定性、JWT claims、限流默认值，以及 migration/function contract 存在性。

真实微信 UAT：`NOT RUN`。需要目标环境的微信凭证、Supabase imported signing key 和部署后的 Edge Function。
