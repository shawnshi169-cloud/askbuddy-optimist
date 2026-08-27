# Runtime Mode Governance

状态：Normative for new code; existing legacy paths are migrated incrementally.

统一运行模式为：

```text
development
staging
production
```

Core App 以 Vite 的 `import.meta.env.MODE` 作为运行模式事实源，基础判断位于 `src/config/runtimeMode.ts`。客户端 `VITE_*` 配置不能覆盖或降低该模式，新代码不得自行发明另一套环境布尔值。

标准命令：

```text
npm run dev            -> development
npm run build:staging  -> staging
npm run build          -> production
```

未知或非法 mode 统一解析为 `production`，即 fail closed，而不是回退到 development。

## Development

可以显式启用：mock data、demo data、manual test helper，以及已登记的 legacy fallback。任何 mock/fallback 必须在代码或配置中可识别，不能伪装成真实成功结果。

Core App 的 presentation fixture 只有在 Vite mode 为 `development` 且显式设置
`VITE_PRESENTATION_FIXTURES=true` 时可用。统一入口为
`isPresentationFixtureAllowed()`；页面、hook 和 adapter 不得自行读取环境变量。
即使显式设置该变量，staging、production 和未知 mode 仍会 fail closed。

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

`.env.local` 中即使遗留 `VITE_APP_RUNTIME_MODE=development` 也不会影响 production build，因为该变量不再被读取。

## Migration Rule

既有高风险路径继续按 Contract First 逐模块退役；P1.4d 已将 Core App 的 presentation fixture 收口到统一 development-only gate。

新功能必须在首次实现时使用统一 Runtime Mode；不得新增无法在 production 中关闭的 mock 或 fallback。
