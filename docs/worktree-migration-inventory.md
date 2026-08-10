# Historical Worktree Migration Inventory

状态：Reviewed against `main` at `ea772af`

历史 worktree 按旧职责模型创建。文件归属由当前 Architecture Role 决定，不由历史分支名称决定。禁止整分支 merge。

分类：`Keep / Candidate`、`Needs Re-home`、`Needs Review`、`Superseded`、`Generated Asset`、`Do Not Merge`。

## worktree/b-ios

基线：`f5614df`，相对 `main` 11 个文件。

| Paths | Classification | Architecture Owner | Decision |
| --- | --- | --- | --- |
| `apps/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | Keep / Candidate | C iOS Native / Codex B | 在独立 P0.6 iOS PR 验证 scheme 后迁移 |
| `apps/ios/App/App/Info.plist` | Needs Review | C iOS Native / Codex B | 核对权限用途和最小声明后选择性迁移 |
| `apps/ios/README.md`, `docs/ios-call-v1-shell-alignment.md` | Keep / Candidate | C iOS Native / Codex B | 与实际构建步骤一起审查 |
| `src/App.tsx`, `src/pages/*`, `src/hooks/*`, `src/contracts/*` | Needs Re-home | B Core App / Codex B | 不能按 iOS 代码合并；逐文件与 main/shared Call 实现比较 |

结论：不能整分支 merge。Native 文件进入 `P0.6-iOS-Native-Baseline`；Core App 差异另开 Core PR 或标记 superseded。

## worktree/c-android

基线：`64b5687`，相对 `main` 180 个文件。

| Paths | Classification | Architecture Owner | Decision |
| --- | --- | --- | --- |
| Gradle wrapper、`settings.gradle`、`app/build.gradle`、Manifest、MainActivity、resources | Keep / Candidate | D Android Native / Codex C | 在独立 P0.6 Android PR 完成 Gradle build/install 后迁移 |
| `apps/android/app/src/main/assets/public/**` | Generated Asset | D Android Native / Codex C | 不作为业务源码逐文件合并；由确认后的 Capacitor sync/build 流程生成 |
| `packages/shared-api/endpoints.ts`, `packages/shared-types/index.ts` | Needs Re-home / Review | A Backend Contract / Codex A | 与当前 `packages/*/src` 比较，禁止由 Android 分支直接引入 |
| `src/**` | Needs Re-home | B Core App / Codex B | Android 真机问题可提单；共享 React 改动由 Core App PR 处理 |
| 旧 Capacitor/Cordova plugin fragments | Needs Review / Superseded | D Android Native / Codex C | 依据 Capacitor 8 sync 输出决定，不盲目删除或保留 |

结论：不能整分支 merge。Native baseline 有发布阻塞价值，但生成物和跨职责源码必须剥离。

## worktree/d-miniapp

基线：`515bfa3`，相对 `main` 92 个文件，主要位于 `apps/wechat-miniprogram/`。

| Paths | Classification | Architecture Owner | Decision |
| --- | --- | --- | --- |
| 小程序 pages/components/custom-tab-bar/styles/navigation | Keep / Candidate | E Mini Program / Codex D | 按 UI、Call、Auth/request adapter 拆分 PR，执行微信开发者工具验证 |
| `utils/call/*` 与 Call 文档 | Needs Review | E Mini Program / Codex D + A Contract | 只消费 A 的 RPC/状态，不得复制或扩展后端语义 |
| `utils/request.js`, `config/env.js` | Needs Review | E Mini Program / Codex D | 真实 JWT 前保留占位，但 production guard 必须明确 |
| `utils/mock.js`, `app.js useMock`, `mock_token_*` | Do Not Merge to production path | E Mini Program / Codex D | 可作为显式 development mock；真实发布前是 Production Blocker |

结论：文件职责总体清晰，但改动量大，应按目的拆 PR。不能把 mock auth 作为真实登录完成。

## Native Baseline Follow-ups

- `P0.6-iOS-Native-Baseline`：交给 `iOS Native / Codex B`，只整合 scheme、Info.plist、Capacitor/Xcode baseline 并完成 build/run。
- `P0.6-Android-Native-Baseline`：交给 `Android Native / Codex C`，只整合 Gradle/Manifest/Capacitor baseline，并完成 build/install。

两个任务都不得顺带合并各自历史 worktree 中的 `src/` 或 shared contract 差异。
