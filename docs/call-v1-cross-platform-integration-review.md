# Call v1 Cross-platform Integration Review

> 历史说明：本文 B-iOS/C-Android/D-小程序是当时的任务标签。当前代码所有权以 `docs/architecture-repository-ownership.md` 的 A-E 模型为准。

审查日期：2026-08-02  
审查基线：A `9059341` / B `3ecd024` / C `ba5a615` / D `36aa2f4`

## 1. 结论

Call v1 后端最小状态层已经可供三端接入。B、C、D 均已使用四个真实 RPC，未发现端侧直接更新 `call_sessions.status` 的主路径，也未调用未实现的 heartbeat/timeout RPC。

当前不应继续扩展 Call 后端。下一阶段应先完成公共实现整合与跨端 staging 状态联调，之后再决定 RTC 服务商和真实音视频 Token 方案。

## 2. A 契约收口

端侧可调用 RPC 仅限：

- `create_call_session_v1`
- `accept_call_v1`
- `reject_call_v1`
- `end_call_v1`

以下名称仅保留，尚未部署，端侧不得调用：

- `heartbeat_call_v1`
- `mark_call_timeout_v1`

共享 API 已将保留名称移出 `RPC_WHITELIST`，避免端侧把候选能力误认为可调用能力。

## 3. B - iOS 审查

通过项：

- 使用真实 create/accept/reject/end RPC。
- 使用 `call_sessions` RLS 查询会话。
- 使用 Supabase Realtime 订阅单一会话更新，并在卸载时移除 channel。
- 已移除 `useMockCallSession` 生产路径。
- 保留 iOS 麦克风和摄像头权限处理。

注意项：

- 当前页面只完成会话状态和本地权限，不包含真实 RTC 媒体。
- B 与 C 都修改根目录 `src/`，不可将两个平台分支整体合并到 `main`。

## 4. C - Android 审查

通过项：

- 使用真实 create/accept/reject/end RPC，不再静默 Mock 成功。
- 未调用 `heartbeat_call_v1`。
- 使用 Realtime 订阅并提供显式 unsubscribe。
- Android UI 状态通过映射与 A 后端状态隔离。
- `rtcAdapter` 仅作为媒体能力占位，没有伪造真实通话。

注意项：

- C 的 RPC/service 分层更适合作为根目录公共 Call 数据层候选。
- 原生生命周期和媒体权限仍应留在平台适配层，不应写入共享后端契约。

## 5. D - 微信小程序审查

通过项：

- 后端状态已映射到 A 白名单。
- RPC 名称、参数和 `call_session_id` 返回字段一致。
- Call 请求失败不会降级为 Mock 成功。
- 使用 2.5 秒轮询读取会话；`onHide` / `onUnload` 会停止轮询。

待处理项：

- 小程序个人页仍使用 `mock_token_*` 登录占位。真实 Call RPC 要求 Supabase 用户 JWT，因此跨端 staging UAT 前必须提供真实登录会话。
- 通用非 Call 请求仍允许 Mock fallback；该兼容行为不影响 Call 权限边界，但后续应按页面渐进收口。
- D 正在进行 UI 对齐，完成前不合并其分支。

## 6. 整合边界

推荐边界：

- 根目录 `src/`：iOS/Android 共用的 Call RPC、会话读取、状态映射和 Realtime 数据层。
- `apps/ios/`：iOS 权限、原生配置与生命周期差异。
- `apps/android/`：Android 权限、原生配置与生命周期差异。
- `apps/wechat-miniprogram/`：小程序独立 UI、请求适配和轮询生命周期。
- `packages/shared-types` / `packages/shared-api`：仅由 A 修改和仲裁。

由于 B/C 都修改了根目录 `src/`，禁止整分支同时 merge。A 应手工选定一个公共 Call 数据层，再分别吸收 B/C 的平台差异。

A 已建立公共实现入口：

- `src/features/call/callRpc.ts`：唯一 RPC、RLS 读取、返回校验与 Realtime 订阅层。
- `src/features/call/useCallSession.ts`：iOS/Android 可共用的 React 会话状态层。
- `src/features/call/index.ts`：公共导出入口。

B/C 下一次同步 A 后，应改为消费该入口；端侧不再各自维护 RPC 名称、返回解析和订阅实现。

## 7. 下一步验收顺序

1. A 整合公共 Call 数据层并在 `main` 形成单一实现。
2. B/C 同步新 `main`，只保留各自原生适配差异并回归构建。
3. D 完成 UI 批次并提交；补齐真实 Supabase 登录后再做 Call UAT。
4. 使用两个 staging 用户执行 iOS/Android/小程序互呼状态测试。
5. 状态层通过后，再开启 RTC 供应商选型和 Token 服务端设计。

## 8. 问题分级

### P0

- 无后端或契约 P0。

### P1

- B/C 根目录公共实现需要 A 收口，不能直接双分支合并。
- D 缺少真实 Supabase 登录会话，暂时阻塞小程序真实 Call staging UAT。
- 尚无真实 RTC 媒体与 Token，当前不能传输音视频。

### P2

- heartbeat、服务端超时回收、来电推送、计费联动和质量观测继续延后。

## 9. 静态验证结果

- A：`npm run test:contracts` 与 `npm run build` 通过；验证时临时复用主工作区依赖，结束后已移除链接。
- A：全量 `tsc --noEmit` 仍存在既有字段兼容类型债；过滤后 `src/features/call/` 与共享 RPC 白名单没有新增诊断。
- B：`npm run test:contracts` 与 `npm run build` 通过。
- C：`npm run test:contracts` 与 `npm run build` 通过。
- D：`apps/wechat-miniprogram` 下全部 JavaScript 文件通过 `node --check`。
- B/C/D 相对 `main` 的 `git diff --check` 均通过。
