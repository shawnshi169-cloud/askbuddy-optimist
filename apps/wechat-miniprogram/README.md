# apps/wechat-miniprogram - WeChat Mini Program

本目录是微信小程序唯一前端路径。小程序 UI、生命周期和微信平台适配归 D 负责；字段、状态机、RPC、RLS、Token 与错误码遵循 A 的 shared contract。

## Runtime Boundary

- `authMode: real`：登录固定执行 `wx.login -> POST /functions/v1/wechat-auth`，不生成或回退到 `mock_token`。
- `develop` 使用 `legacyDataMode: mock`，尚未迁移的 Questions、Search、Experts 等业务数据可继续使用旧 Mock。
- `trial`、`release` 与无法识别的 runtime 使用 `legacyDataMode: disabled`，未迁移业务会明确失败，不会回退 Mock。
- 后端 Auth 失败会显示真实归一化错误，绝不模拟登录成功。

## WeChat Auth v1

Auth 由 `utils/auth.js` 集中管理，页面不直接管理 code、JWT、过期时间或 storage：

- session key：`ab_auth_session_v1`
- user key：`ab_auth_user_v1`
- user shape：`{ id, nickname, avatarUrl }`
- auth state：`unknown / anonymous / authenticating / authenticated / reauthenticating`
- 启动时仅恢复结构合法且在 30 秒 clock skew 后仍有效的 session。
- v1 没有 refresh token；过期后按需重新 `wx.login`，并通过 single-flight 合并并发重认证。
- authenticated request 收到 401 时清理旧 session、重认证并最多重试一次。
- logout 仅清理客户端 session/user；v1 不提供单 token 服务端撤销。

旧 `ab_auth_token`（包括历史 `mock_token_*`）不会恢复为已登录状态，并会在 restore 时清理。`wx.getUserProfile` 不再是登录前置条件；昵称或头像为空不影响认证。

## Client-safe Config

`config/client.js` 按微信 `envVersion` 预留三套客户端配置：

- `develop` -> development
- `trial` -> staging
- `release` -> production
- unknown / missing / runtime API exception -> unknown，Auth 配置校验失败并 fail closed

客户端只允许持有 Supabase URL 与 publishable key。配置缺失时 Auth fail closed，不会回退 Mock。`wechat-auth` bootstrap 只发送 `Content-Type` 和 `apikey`；已有 user JWT 的 authenticated request 才发送 `Authorization: Bearer <accessToken>`。

仅当 `envVersion === 'develop'` 时，开发者工具可临时设置 development 配置后重启小程序：

```js
wx.setStorageSync('ab_client_config_v1', {
  supabaseUrl: 'https://fslpvtlavhrnxsygkpvi.supabase.co',
  supabasePublishableKey: 'your-client-safe-publishable-key'
})
```

该 override 不会在 `trial`、`release` 或 unknown runtime 中读取，且不应提交真实值。真实 Auth 请求的客户端 host 为 `fslpvtlavhrnxsygkpvi.supabase.co`；微信公众平台的 **request 合法域名**需配置为 `https://fslpvtlavhrnxsygkpvi.supabase.co`。`api.weixin.qq.com` 由 Edge Function 服务端访问，不属于小程序客户端合法域名。

AppSecret、service-role key、identity HMAC secret、private JWK 及微信 identity 原始字段禁止进入小程序、日志或构建产物。

## Validation

Auth consumer 测试：

```bash
npm --prefix apps/wechat-miniprogram run test:auth
```

JavaScript 语法检查：

```bash
find apps/wechat-miniprogram -name '*.js' -print0 \
  | xargs -0 -n1 node --check
```

微信开发者工具需验证 compile、app launch、未登录 Profile、登录错误、logout 与 session restore，且控制台无 fatal error。

## Real UAT Status

`REAL WECHAT UAT READY`：生产 Edge Function、Auth secrets、identity migration、ES256 current signing key、invalid-code backend smoke test 与真实小程序 AppID 已准备完成。本仓库仍有意不跟踪 Production Supabase publishable key。

人工 UAT：

1. 在微信公众平台确认 request 合法域名为 `https://fslpvtlavhrnxsygkpvi.supabase.co`。
2. 使用真实 AppID 打开项目并确认 `envVersion === 'develop'`。
3. 在 Console 设置只含 Supabase URL 与 client-safe publishable key 的 `ab_client_config_v1`，然后重新编译。
4. 从“我的”执行真实微信登录，确认 `wechat-auth` 返回 HTTP 200。
5. 仅确认 session 的 `tokenType === 'bearer'`、token 非空、`expiresAt` 未过期；不要打印完整 token。需要时最多检查 JWT header 的 `alg === 'ES256'` 且存在 `kid`。
6. 由后端人工确认 `auth.users` 与 `wechat_identities` identity 对应，不在小程序加入 service-role 调试代码。
7. 使用现有无副作用 authenticated read/RPC 验证 publishable `apikey`、用户 Bearer JWT 与 RLS / `auth.uid()`。
8. 重新编译或重启，确认有效 session 恢复。
9. 执行 logout，确认 `ab_auth_session_v1` 与 `ab_auth_user_v1` 被清理。
10. 清理开发者工具中的本地 `ab_client_config_v1`（如不再需要）。

完成上述人工检查前，不得声明真实 `wx.login -> user JWT -> RLS` UAT 已通过。
