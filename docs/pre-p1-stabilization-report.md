# P0.5 Pre-P1 Stabilization Report

状态：Implemented on `chore/pre-p1-stabilization`

## Executive Summary

本轮建立了进入 P1 前的工程护栏，没有修改产品功能、业务页面或 Supabase 业务模型：

- 定版五个 Architecture Roles 与四个 Codex Workstreams 的映射。
- 新增 PR/main CI，并用增量基线阻止新增 TypeScript 和 lint 问题。
- 停止跟踪本地 `.env`，建立 client-safe/server-only secret 规则。
- 建立 development/staging/production Runtime Mode 基础 helper 和治理约束。
- 去除 shared-api 对 `SearchObjectType`、`ContentTargetType` 的重复定义。
- 完成历史 B/C/D worktree 与 Native Shell candidate inventory。
- 保留并更新 Architecture Risk Register，不以文档替代真实风险修复。

## CI Result

| Check | Result | Merge meaning |
| --- | --- | --- |
| `npm ci` | Pass | 依赖可复现安装 |
| `npm run typecheck:baseline` | Pass | 30 条既有诊断，无新增诊断 |
| `npm run lint:changed` | Pass | 本轮新增 Core infrastructure 无 lint 回归 |
| `npm run test:contracts` | Pass | schema/RPC contract check 通过 |
| `npm run build` | Pass | production build 通过 |
| `npm run typecheck` | Fail: 30 existing diagnostics | 历史债，保留为非 required 可见报告 |
| `npm run lint` | Fail: 74 errors, 9 warnings | 历史债，保留为非 required 可见报告 |

`test:smoke` 和 `test:call` 未作为普通 PR gate：它们需要真实 staging 凭据，不能要求 PR CI 持有 service-role 或数据库秘密。

## Branch Protection

**Not enabled - requires manual GitHub configuration.**

当前 GitHub App 权限为 push/triage，没有 admin/maintain，也没有 branch ruleset 管理能力。本轮新增了 `quality-gate` 和 `docs/main-branch-protection.md`，但 AR-016 保持 Open，直到仓库管理员在 GitHub 中真实启用并测试规则。

## Native Baseline Decision

- iOS：B 历史 worktree 的 shared scheme、Info.plist 和构建说明属于候选项，进入独立 `P0.6-iOS-Native-Baseline`。
- Android：C 历史 worktree 的 Gradle/Manifest/MainActivity 属于候选项，进入独立 `P0.6-Android-Native-Baseline`。
- Android generated web assets 不是业务源码，不能和 Native baseline 盲目整包迁移。
- B/C 中的 `src/` 差异归 Core App；C 中的 `packages/shared-*` 差异归 Backend Contract。任何历史分支都不得整分支 merge。

## Production Blockers Retained

- WeChat `useMock` / `mock_token` 与真实微信身份交换尚未落地。
- production write RPC fallback 尚未逐域退役。
- mock payment、legacy recharge、manual payment confirm 尚未生产化。
- Search/Home/Channel silent demo fallback 尚未收口。
- iOS/Android Native release baseline 尚未完成 build/install/signing UAT。

以上问题没有因本轮新增治理文档而标记完成。

## Recommended Order

1. P0.6 iOS/Android Native Baseline，分别选择性迁移并验证。
2. P1 WeChat Auth v1。
3. P1 Questions/Answers Contract First。
4. P1 Messages/Notifications Contract First。
5. Payment Productionization。

本报告停在 P0.5，不自动开始上述 P1 工作。
