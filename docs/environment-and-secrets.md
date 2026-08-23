# Environment and Secret Governance

状态：Normative

## File Policy

- `.env.example`：可跟踪，只包含占位符和公开配置名称。
- `.env`、`.env.local`、`.env.*.local`：仅本地使用，禁止提交。
- CI、staging、production：通过 GitHub Environments、Supabase secrets 或受控部署环境注入。
- 不在 Issue、PR、日志和截图中粘贴 secret 值。

Runtime Mode 不属于可由 `.env.local` 覆盖的配置。它由 Vite 命令的 `MODE` 决定：dev 为 development、staging build 为 staging、默认 production build 为 production。

当前仓库检查到的历史 `.env` 仅包含 Supabase project ref、URL 和 publishable/anon key，没有发现 server-only secret。本次停止跟踪该文件，不据此制造“服务端秘密已泄露”的结论。

## Client-safe Configuration

以下值按平台设计可以进入客户端构建，但仍应按环境分别配置：

- Supabase project URL。
- Supabase anon/publishable key。
- 公开 App ID、bundle identifier、package name。
- 明确设计为公开的 analytics/public endpoint identifier。

Client-safe 不等于可以跨 dev/staging/prod 混用。每次发布必须确认 project ref、URL 和目标环境一致。

## Server-only Secrets

以下值禁止进入 `src/`、任何 `apps/*` 客户端目录、Git 跟踪的 `.env` 或构建产物：

- `SUPABASE_SERVICE_ROLE_KEY`。
- Supabase 数据库密码。
- 微信 AppSecret、微信支付商户私钥和 API secret。
- WeChat identity HMAC secret 与 Supabase Auth imported signing private JWK。
- Apple server/private key。
- FCM server credentials。
- OAuth client secret、webhook signing secret。
- 支付网关私钥和回调验证 secret。

这些值只能通过 Supabase Edge Function secrets、CI secret store 或受控 server-side deployment 注入。客户端必须调用受控 Edge Function/RPC，不能持有 server-only secret。

## WeChat Auth v1 Secrets

`wechat-auth` Edge Function 需要以下 server-only 配置：

- `WECHAT_APP_ID`：服务端 code exchange 使用；它本身可公开，但与 AppSecret 一起在服务端集中配置。
- `WECHAT_APP_SECRET`：微信 code exchange secret。
- `WECHAT_IDENTITY_HMAC_SECRET`：确定性派生稳定 `auth.users.id`，至少 32 个随机字符。
- `WECHAT_AUTH_JWT_PRIVATE_JWK`：在可信环境外部生成并安全保留、与 Supabase Auth 当前 active ES256 signing key 匹配的 private JWK。Supabase 平台内创建的 signing key 不提供 private key 导出能力，因此不能依赖“平台创建后导出”的部署流程。
- `SUPABASE_SERVICE_ROLE_KEY`：创建 Auth user 和写入敏感 identity mapping。
- `SUPABASE_URL`：目标 Supabase 环境地址。

可选的非秘密运行参数为 `WECHAT_AUTH_JWT_TTL_SECONDS` 和 `WECHAT_AUTH_RATE_LIMIT_PER_MINUTE`。任何上述 server-only 值均不得加入 `.env.example` 的 `VITE_*`、小程序配置或客户端构建。

ES256 rotation 必须同时协调 Supabase Auth Signing Keys 与 Edge Function secret：新 key 应先在可信环境生成并保存，再以 standby 导入，更新 `WECHAT_AUTH_JWT_PRIVATE_JWK` 并部署函数，最后 rotate 为 active。任何一侧单独更新都可能导致新签发 JWT 无法被 Supabase 验证。

## Payment Runtime Policy

`wechat-prepay` 使用服务端配置，而不是客户端 `VITE_*` 值：

- `APP_RUNTIME_MODE`：`development`、`test`、`staging` 或 `production`。
- `PAYMENT_GATEWAY_MODE`：当前只识别显式值 `mock`。

仅当 `APP_RUNTIME_MODE` 为 `development` 或 `test`，且 `PAYMENT_GATEWAY_MODE=mock` 时允许 mock payment。Production、staging、配置缺失和未知值均 fail closed，返回 `PAYMENT_UNAVAILABLE`。这两个变量只控制服务端行为；支付凭证仍属于 server-only secret。

## Incident Rule

若任何 server-only secret 被提交：

1. 立即停止常规合并和部署。
2. 撤销并轮换 secret，而不是只删除 Git 最新版本。
3. 检查 Git history、构建日志和已发布产物。
4. 更新受影响环境并执行最小回归。
5. 在风险清单记录影响范围和轮换结果。

## Release Check

发布前必须确认：

- 客户端只包含目标环境的 URL 和 publishable key。
- staging 和 production 使用不同、可识别的配置来源。
- server-only RPC/Edge Function 不向 `anon`/普通 `authenticated` 授权。
- 构建日志不会输出 token、数据库密码或支付 secret。
