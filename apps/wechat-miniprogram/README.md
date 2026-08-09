# apps/wechat-miniprogram - WeChat Mini Program

本目录是微信小程序唯一前端路径，负责：

- 小程序页面、组件、样式和路由；
- 微信生命周期、导航与微信平台 API；
- 调用 shared contract 的请求适配层；
- 微信开发者工具构建与验收。

小程序可以独立实现 UI，但不拥有独立后台业务语义。Supabase 字段、枚举、状态机、`target_type`/`item_type`、RPC、RLS、Token 规则和错误码必须遵循 A 维护的 shared contract，不得在端侧猜测或扩展。

微信 AppSecret、Supabase service-role key 不得进入本目录或任何客户端构建产物。真实微信身份与 Supabase 用户绑定必须等待 A 定版 WeChat Auth v1。

## 开发基线

- 固定开发路径：`apps/wechat-miniprogram`
- D worktree 分支：`worktree/d-miniapp`
- 契约来源：`packages/shared-types`、`packages/shared-api`
- 契约冲突仲裁：A

## staging 连接

1. 复制 `config/env.local.example.js`。
2. 新建 `config/env.local.js`，该文件已被 `.gitignore` 忽略。
3. 填入 A 提供的 `supabaseUrl` 和客户端 publishable/anon key。
4. 不得填入 AppSecret、service-role key 或个人 access token。

默认配置使用真实 staging 请求层：

- `app.globalData.useMock` 为 `false`；
- `useMockFallback` 为 `false`；
- 网络或 RPC 失败会展示错误，不会静默模拟成功。

任何 `useMock`、`mock_token_*`、mock payment 或 mock API 都只能用于 development-only 联调，不能作为 production 主路径。

## 页面清单

主入口：

- 首页：`pages/home/index`
- 发现：`pages/discover/index`
- 消息：`pages/messages/index`
- 我的：`pages/profile/index`
- 自定义底部导航：`custom-tab-bar`

核心与二级页面：

- 搜索：`pages/search/index`
- 提问：`pages/ask/index`
- 问题详情与回答：`pages/question-detail/index`
- 频道：`pages/channel/index`
- 热榜专题：`pages/topic-detail/index`
- 城市选择：`pages/city-selector/index`
- 专家详情：`pages/expert-detail/index`
- 技能发布：`pages/skill-publish/index`
- 私信详情：`pages/chat-detail/index`
- 个人中心子页面：`pages/profile-section/index`
- 动态发布：`pages/post-editor/index`
- 发现互动：`pages/discover-interactions/index`
- Call v1 会话壳层：`pages/call/index`

## API 接入状态

已接入真实 staging：

- 首页：读取 `questions` 列表；
- 搜索：优先调用 `search_app_content_v2`，兼容 A 现有的 `search_app_content`，结果对象统一为 `question/expert/skill/post`；
- 问题详情：读取 `questions` 与 `answers`；
- 通知：读取 `notifications` 并调用 `get_my_unread_notification_count`；
- Call v1：只调用 `create_call_session_v1`、`accept_call_v1`、`reject_call_v1`、`end_call_v1`，并只读轮询 `call_sessions`。

当前 development-only 或待契约能力：

- 发现 Feed 当前由 `PREVIEW_ONLY_NAMES` 显式标记为体验数据；
- 私信会话、部分频道/专家/发布/个人中心内容仍包含 UI catalog 示例数据；
- 提问提交尚无 staging 适配，不会在请求失败后模拟发布成功；
- 真实微信登录等待 A 发布 WeChat Auth v1；
- Call v1 仅接入会话状态层，尚未接入真实 RTC 媒体传输。

## 微信开发者工具验证

导入目录：`apps/wechat-miniprogram`。

最近一次自动化抽查覆盖：

- 首页与自定义 TabBar；
- 搜索及返回首页；
- 消息与 Tab 选中态；
- 我的与游客态；
- Call 页面及返回消息路径。

提交前至少执行：

```bash
find apps/wechat-miniprogram -name '*.js' -print0 \
  | xargs -0 -n1 node --check
```

真机验收还需覆盖微信授权、网络域名、安全区、页面栈、下拉刷新、分享、后台恢复和权限拒绝路径。
