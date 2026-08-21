# packages/shared-api

跨端 API/RPC 名称、参数、返回值和页面数据契约的统一来源，由 A - Backend & Shared Contract 维护。

- `src/rpc-catalog.ts`：RPC 状态、权限、输入输出与 owner 的唯一目录。
- `src/rpc-whitelist.ts`：从 catalog 消费的 client/server 白名单兼容出口。
- `src/page-contract-map.ts`：canonical contract 与当前实现状态的对照。
- `src/search-v2.ts`：Search v2 生产 payload 校验与跨端规范化。
- `src/notification.ts`：通知 storage row 到 domain object 的兼容归一化。
- `src/index.ts`：统一导出入口。

业务枚举/类型由 `packages/shared-types` 定义。本目录只消费并可转导出这些类型，不维护同义副本。

规则：

- 客户端不得私自增加非 catalog RPC 主路径。
- service-role/server-only RPC 必须与普通 client-callable RPC 分开管理。
- `deprecated`、`compatibility-only`、`blocked` 均不得作为新功能主路径。
