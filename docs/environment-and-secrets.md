# Environment and Secret Governance

状态：Normative

## File Policy

- `.env.example`：可跟踪，只包含占位符和公开配置名称。
- `.env`、`.env.local`、`.env.*.local`：仅本地使用，禁止提交。
- CI、staging、production：通过 GitHub Environments、Supabase secrets 或受控部署环境注入。
- 不在 Issue、PR、日志和截图中粘贴 secret 值。

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
- Apple server/private key。
- FCM server credentials。
- OAuth client secret、webhook signing secret。
- 支付网关私钥和回调验证 secret。

这些值只能通过 Supabase Edge Function secrets、CI secret store 或受控 server-side deployment 注入。客户端必须调用受控 Edge Function/RPC，不能持有 server-only secret。

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
