# Codex Workstream Mapping

状态：Normative

本文件区分代码职责模型与当前 Codex 执行模型。两者同时有效，不能互相替代。

## Architecture Roles

Architecture Role 描述代码属于哪个职责域：

| Architecture Role | 职责 | 主要目录 |
| --- | --- | --- |
| A - Backend & Shared Contract | 后端、共享类型、API/RPC 契约与仲裁 | `supabase/`, `packages/shared-types/`, `packages/shared-api/` |
| B - Core App | iOS/Android 共用 React 页面与业务交互 | `src/` |
| C - iOS Native | iOS 原生壳、权限、插件、签名与构建 | `apps/ios/` |
| D - Android Native | Android 原生壳、权限、插件、签名与构建 | `apps/android/` |
| E - WeChat Mini Program | 微信小程序独立前端与微信平台能力 | `apps/wechat-miniprogram/` |

## Codex Workstreams

Codex Workstream 描述当前四个长期 Codex 对话由谁实际执行：

| Codex Workstream | 承担的 Architecture Role | 当前职责 |
| --- | --- | --- |
| Codex A | Architecture Role A | Architecture、Backend、Shared Contract、Release Governance |
| Codex B | Architecture Role B + C | Shared Core App + iOS Native |
| Codex C | Architecture Role D | Android Native |
| Codex D | Architecture Role E | WeChat Mini Program |

特别注意：

```text
Architecture Role C != Codex C
Architecture Role D != Codex D
```

因此 Issue、PR、交接和任务指令不得只写“交给 C”或“交给 D”。必须使用以下无歧义格式：

- `Backend Contract / Codex A`
- `Core App / Codex B`
- `iOS Native / Codex B`
- `Android Native / Codex C`
- `WeChat Mini Program / Codex D`

## Routing Rules

- 字段、枚举、状态机、RLS、RPC、错误码：`Backend Contract / Codex A`。
- React 页面、hooks、routing、iOS/Android 共用业务交互：`Core App / Codex B`。
- Xcode、Info.plist、APNs、Apple 登录、iOS 权限和签名：`iOS Native / Codex B`。
- Gradle、Manifest、FCM、Android 权限、系统返回键和签名：`Android Native / Codex C`。
- WXML/WXSS、微信生命周期、客户端 wx API：`WeChat Mini Program / Codex D`。

一人或一个 Codex 对话可以兼任多个角色，但一个 PR 仍应按代码职责拆分，不能因为执行者相同而混合无关责任域。

## Handoff Format

任务交接至少写明：

```text
Architecture owner:
Codex workstream:
Allowed paths:
Contract dependency:
Out of scope:
Required validation:
```

端侧提出后端需求时，使用 `Backend Contract Request`，说明当前页面、所需字段/RPC、预期状态、兼容影响和阻塞程度。Codex A 定版前，端侧不得自行扩展后端业务语义。
