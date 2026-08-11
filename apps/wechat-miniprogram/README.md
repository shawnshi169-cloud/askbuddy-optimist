# apps/wechat-miniprogram - WeChat Mini Program

本目录是微信小程序唯一前端路径。小程序 UI、生命周期和微信平台适配归 D 负责；字段、状态机、RPC、RLS、Token 与错误码遵循 A 的 shared contract。

## Runtime Boundary

- `authMode: real`：登录固定执行 `wx.login -> POST /functions/v1/wechat-auth`，不生成或回退到 `mock_token`。
- `legacyDataMode: mock`：尚未迁移的 Questions、Search、Experts 等业务数据继续显式使用旧 Mock，与身份认证完全分离。
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

客户端只允许持有 Supabase URL 与 publishable key。配置缺失时 Auth fail closed，不会回退 Mock。开发者工具可临时设置 development 配置后重启小程序：

```js
wx.setStorageSync('ab_client_config_v1', {
  supabaseUrl: 'https://your-project.supabase.co',
  supabasePublishableKey: 'your-client-safe-publishable-key'
})
```

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

`REAL WECHAT UAT BLOCKED`：仓库当前仍使用 `touristappid`，client-safe Supabase 配置为空；目标环境的 migration、Edge Function deployment、ES256 signing key、函数 secrets、真实小程序 AppID 与 request domain 状态也尚未在本工作流确认。满足这些前提后才能声明真实 `wx.login -> user JWT -> RLS` 链路通过。
