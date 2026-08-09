# packages/shared-api

跨端 API/RPC 名称、参数、返回值和页面数据契约的统一来源，由 A - Backend & Shared Contract 维护。

- `src/rpc-whitelist.ts`：可调用 RPC 白名单与输入输出。
- `src/page-contract-map.ts`：Core App 与 Mini Program 可消费的表/RPC/字段。
- `src/index.ts`：统一导出入口。

规则：

- 客户端不得私自增加非白名单 RPC 主路径。
- service-role/server-only RPC 必须与普通 client-callable RPC 分开管理。
- 已存在但尚未纳入白名单的旧 RPC 进入风险清单，按模块渐进收口，不在本轮批量迁移。
