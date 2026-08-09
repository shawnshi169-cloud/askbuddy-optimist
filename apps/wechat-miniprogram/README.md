# apps/wechat-miniprogram - WeChat Mini Program

本目录是微信小程序唯一前端路径，负责：

- 小程序页面、组件、样式和路由；
- 微信生命周期与微信平台 API；
- 调用 shared contract 的请求适配层；
- 微信开发者工具构建与验收。

小程序可以独立实现 UI，但不得自行创造 Supabase 字段、状态机、target/item type、RPC 或错误码。微信 AppSecret、Supabase service-role key 不得进入本目录。

当前 `useMock`、`mock_token_*` 和 mock API 属于已登记联调占位，不得作为 production 主路径。真实登录需等待 A 定版 WeChat Auth v1。
