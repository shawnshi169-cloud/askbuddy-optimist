# 多端联调切换 SOP（统一接入 staging）

日期：2026-04-24

## 1. 目标

确保 iOS / Android / 小程序在联调阶段统一连接共享 `staging`，避免出现“每端连不同后端”导致的问题漂移。

## 2. 执行前检查

1. 确认当前联调阶段目标环境是 `staging`。  
2. 检查本地环境变量是否为真实 staging 值，不含占位符。  
3. 核对以下三项一致：
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`（项目 ref）
   - `supabase/config.toml -> project_id`

## 3. 标准联调步骤

1. 拉取最新代码并切到联调分支。  
2. 更新本地 `.env` 到 staging。  
3. 启动前端并登录测试账号。  
4. 按主链路执行：
   - 登录/资料
   - 提问/回答/采纳
   - 专家/技能
   - 搜索/发现/关注
   - 消息/通知
   - 订单/积分/收益
5. 记录问题并按 Blocker / Non-blocker 分类。

## 4. 问题记录格式（建议）

```md
[环境] staging
[端] iOS / Android / Miniapp
[模块] 例如 搜索 / 消息 / 订单
[现象]
[复现步骤]
[预期]
[实际]
[是否阻塞] Blocker / Non-blocker
```

## 5. 回滚与止损

1. 发现阻塞问题，优先停在 staging 修复，不直接继续扩功能。  
2. 采用最小 patch 修复，避免扩大影响面。  
3. 仅在验证通过后再推进下一步。

## 6. Freeze 阶段注意事项

1. 不开新 Pack。  
2. 不做大 cleanup。  
3. 不做大前端重构。  
4. 所有契约冲突统一回 A - Backend & Shared Contract 仲裁。
