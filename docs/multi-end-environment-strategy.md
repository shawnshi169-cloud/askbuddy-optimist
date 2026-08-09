# 多端协作环境策略（Freeze 阶段）

日期：2026-04-24  
适用范围：iOS / Android / 微信小程序 + Supabase 后端一期

## 1. 总体策略

采用“三层环境”并明确职责：

- `local`：每个开发者自己的本地开发/测试环境（不共享）
- `staging`：团队共享联调环境（统一联调入口）
- `prod`：正式环境

## 2. 后端环境规则

1. 每位开发者本地可用自己的 local DB/本地 Supabase 做开发验证。  
2. 团队联调一律使用共享 `staging`。  
3. 正式发布前检查、冒烟、试运行优先走 `staging` 或 `prod-like`。  
4. 禁止把个人 local 当成团队日常联调环境。

## 3. 前端三端规则

1. iOS/Android/小程序开发者均在各自本地开发。  
2. 需要联调时，统一接入共享 `staging`。  
3. 真机测试与内测尽量使用 `staging` / `prod-like`，避免连接个人 local。  
4. 字段、状态机、RPC 命名冲突，以 A - Backend & Shared Contract 仲裁为准。

## 4. 配置一致性规则

1. 项目标识必须一致：
   - `.env` 中 `VITE_SUPABASE_PROJECT_ID`
   - `.env` 中 `VITE_SUPABASE_URL` 的项目 ref
   - `supabase/config.toml` 的 `project_id`
2. 出现不一致时，优先修复并提交到仓库，避免串环境。  
3. 环境变量中禁止提交占位符或无效值。

## 5. 迁移与联调规则

1. migration 先在 local 验证，再推到 `staging`。  
2. `staging` 上执行后，必须跑最小验证命令（contracts/smoke）。  
3. 任一阻塞问题先走最小 patch，不开新大功能包。

## 6. Freeze 阶段变更边界

当前仅允许：
- bugfix
- 小 patch
- cleanup

不允许：
- 新 Pack 扩展
- 大规模重构
