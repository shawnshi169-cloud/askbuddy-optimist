# A - Backend & Shared Contract 冲突处理流程

适用对象：B-Core App / C-iOS Native / D-Android Native / E-微信小程序
适用范围：字段语义、状态机、RPC 命名、target_type/item_type 命名冲突

---

## 1. 总则（强制）

1. A 是后端契约与共享层唯一事实来源。
2. B/C/D/E 不允许私自扩展后端字段语义。
3. B/C/D/E 不允许私自新增状态值或 target/item 类型值。
4. B/C/D/E 不允许私自把非白名单 RPC 升级为主路径。
5. 任何冲突必须先提报，再合并。

---

## 2. 冲突提报流程

1. 提报方（B/C/D/E）提交冲突单（按模板）
2. A Role 24h 内给出结论：
   - 接受并更新契约
   - 拒绝并给替代方案
   - 延后（给临时兼容方案）
3. A 更新：
   - `packages/shared-types`
   - `packages/shared-api`
   - `docs/contracts-snapshot-v1.md`（必要时）
4. 提报方按结论改端侧并回填链接

---

## 3. 冲突提报模板（B/C/D/E -> A）

```md
## 冲突提报
- 提报端：B Core / C iOS / D Android / E Mini Program
- 页面/模块：
- 现状：
- 冲突类型：字段语义 / 状态机 / RPC / target(item)类型
- 当前依赖表/RPC：
- 预期行为：
- 为什么现有契约不满足：
- 风险评估：
- 建议方案（可选）：
- 期望完成时间：
```

---

## 4. 仲裁结果模板（A -> B/C/D/E）

```md
## 仲裁结果
- 编号：
- 结论：接受 / 拒绝 / 延后
- 决策摘要：
- 生效范围：iOS / Android / 小程序 / 全端
- 契约变更：
  - shared-types:
  - shared-api:
  - 文档:
- 端侧改造要求：
- 兼容期说明（如有）：
- 截止时间：
- 验收方式：
```

---

## 5. 最小守护（文档级）

合并前自检（B/C/D/E 必勾）：

- [ ] 未新增后端字段语义
- [ ] 未新增状态值
- [ ] 未新增 target_type/item_type 新值
- [ ] 未引入非白名单 RPC 主路径
- [ ] 如有冲突，已附仲裁单链接

仓库 PR 模板已加入 Contract Check；所有角色必须勾选：

`Conflict Check: [ ] 无冲突 [ ] 有冲突（附 A 仲裁链接）`

---

## 6. 紧急例外（仅故障止血）

允许短期例外的条件：

1. 线上阻塞故障，且不改 schema 语义，仅临时绕过。
2. 24h 内必须补齐 A 仲裁与契约回收。

---

## 7. 责任分工

- A：定义/仲裁/更新共享契约，发布快照版本
- B/C/D/E：消费契约，提报冲突，不私扩语义
- Release Owner：监督是否按仲裁结果落地
