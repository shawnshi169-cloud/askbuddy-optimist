# Runtime Mode Governance

状态：Normative for new code; existing legacy paths are migrated incrementally.

统一运行模式为：

```text
development
staging
production
```

Core App 使用 `VITE_APP_RUNTIME_MODE`，基础判断位于 `src/config/runtimeMode.ts`。新代码不得自行发明另一套环境布尔值。

## Development

可以显式启用：mock data、demo data、manual test helper，以及已登记的 legacy fallback。任何 mock/fallback 必须在代码或配置中可识别，不能伪装成真实成功结果。

## Staging

默认使用真实 backend、真实 auth 和真实 RPC。仅允许已登记的只读兼容 fallback；使用时必须产生可观测 warning。写 RPC 失败后不得静默直写表或返回 mock 成功。

## Production

禁止：

- mock/demo data 和 silent demo fallback。
- `mock_token` 或本地伪造登录成功。
- write RPC 失败后 direct table fallback。
- legacy recharge fallback。
- mock payment gateway。
- development manual payment confirmation。

`production` 默认不允许任何 `RuntimeCapability`。新增能力必须先由 Architecture / Backend & Shared Contract 审查。

## Migration Rule

本轮只建立统一 helper 和规则，不批量改造既有 Questions、Search、Messages、Payments 或小程序页面。现有高风险路径继续在 Architecture Risk Register 中作为 Production Blocker，按 Contract First 单模块退役。

新功能必须在首次实现时使用统一 Runtime Mode；不得新增无法在 production 中关闭的 mock 或 fallback。
