# 多端目录层级定版执行清单（执行完成记录）

日期：2026-04-24  
状态：已执行完成（目录已归一到 apps 同层级）

## 1. 本次目标

在不新增功能、不改后端契约的前提下，完成目录层级统一，避免 iOS / Android / 小程序后续协作混乱。

本次已完成：
- 路径定版
- 目录迁移落地
- 关键命令路径更新

本次不做：
- 新功能开发
- 新后端 Pack
- 大规模前端重构

---

## 2. 目标结构（定版）

```text
askbuddy-optimist/
  apps/
    ios/                  # iOS 原生工程主路径
    android/              # Android 原生工程主路径
    wechat-miniprogram/   # 微信小程序主路径
  packages/
    shared-types/
    shared-api/
  supabase/
  docs/
```

说明：
- 最终三端同层级，降低认知成本。
- `packages/shared-*` 与 `supabase/` 保持不变。

---

## 3. 当前基线（更新后事实）

- iOS/Android Shared Core App：`src/`
- iOS Native Shell：`apps/ios/`
- Android Native Shell：`apps/android/`
- 小程序当前主线：`apps/wechat-miniprogram`
- 根目录 `ios/` 已迁移收口到 `apps/ios`

---

## 4. 执行结果（目录归一已完成）

1. ✅ Android 已归一：`apps/android`
2. ✅ 小程序已归一：`apps/wechat-miniprogram`
3. ✅ iOS 原生工程已归一：`apps/ios`

当前约束：
- iOS/Android 共用业务页面和 React 逻辑在 `src/` 开发。
- iOS/Android 平台专属能力分别在 `apps/ios/`、`apps/android/` 开发。
- 小程序在 `apps/wechat-miniprogram/` 独立开发并消费 shared contract。
- `src/` 不等于 iOS 原生工程目录。

---

## 5. 执行前检查清单（必须全绿）

1. 当前分支干净或已提交 checkpoint。  
2. 已创建迁移专用分支并合并。  
3. iOS/Android 当前构建命令可通过。  
4. CI/本地冒烟命令可通过。  
5. 已约定冻结窗口，不并行开发功能分支。

---

## 6. 每步执行模板（建议）

每个迁移动作都按以下模板记录：

```md
### Step X: <动作名>
- 变更范围：
- 变更命令：
- 受影响文件：
- 验证命令：
- 结果：
- 回滚命令：
```

---

## 7. 验证命令建议

```bash
# 前端基础
npm run build
npm run test:contracts
npm run test:smoke

# iOS（归一后）
xcodebuild -project apps/ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator build

# Android（按现有工程）
cd apps/android && ./gradlew assembleDebug
```

> 注：`capacitor.config.ts` 中 iOS/Android path 也需保持和 `apps/*` 一致。

---

## 8. 回滚策略

1. 每完成一个端的迁移就单独 commit。  
2. 不跨端混在同一个 commit。  
3. 若构建失败，优先 `git revert <commit>` 回滚该端迁移。  
4. 严禁在失败状态下继续叠加下一端迁移。

---

## 9. 恢复开发门槛（何时解冻 B/C/D）

满足以下条件再恢复多端功能开发：

1. 目录结构定版 PR 已合并。  
2. iOS/Android/小程序“唯一主路径”文档已更新。  
3. 至少完成一轮主链路冒烟：登录、首页、搜索、提问、消息、我的。  
4. A 主线确认 shared-types/shared-api 引用路径无断裂。

---

## 10. 责任划分建议

- A（后端与共享契约）：裁决字段、状态、RPC 和后端边界。
- B（Core App）：维护 iOS/Android 共用 React 前端。
- C（iOS Native）：验证 iOS Shell、签名与构建。
- D（Android Native）：验证 Android Shell、签名与构建。
- E（小程序）：验证小程序路由、请求适配与资源路径。

---

## 11. 本轮结论

目录层级已完成归一。  
后续进入常规开发阶段时，优先保证“按平台目录分责 + 按分支并行 + 共享 staging 联调”。
