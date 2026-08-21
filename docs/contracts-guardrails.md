# Contracts Guardrails（A - Backend & Shared Contract 守护）

适用范围：B Core App / C iOS Native / D Android Native / E Mini Program
目标：防止端侧私自扩展后端语义，降低多端并行冲突。

---

## 1. 禁止项

1. 端侧新增后端字段语义（同名不同义也算）
2. 端侧新增状态机值
3. 端侧新增 target_type/item_type 值，或混用 moderation 与通用 target vocabulary
4. 端侧新增非 `RPC_CATALOG` canonical RPC 主路径
5. Native Shell 复制共享业务页面或后端状态机
6. 直接向 Git `main` 提交普通开发变更

---

## 2. 允许项

1. UI 展示字段组合
2. 前端本地派生字段（不回写后端）
3. 在白名单字段内做兼容映射
4. 平台权限、生命周期和媒体能力 adapter

---

## 3. 冲突处理

冲突提报与仲裁统一按：

- `docs/conflict-resolution-process.md`

未仲裁通过前，不得合并端侧语义变更。
