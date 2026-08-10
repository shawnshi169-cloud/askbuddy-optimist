# Main Branch Protection

状态：Requires GitHub administrator verification

`main` 是集成与发布主干，不是 Architecture Role A 或任何 Codex 对话的日常开发分支。

## Required Rules

在 GitHub 中进入：

```text
Repository
-> Settings
-> Rules
-> Rulesets
-> New branch ruleset
-> Target branch: main
```

若仓库界面仍使用旧入口，则进入 `Settings -> Branches -> Branch protection rules`。

启用：

1. Require a pull request before merging。
2. Require at least 1 approving review。
3. Dismiss stale approvals when new commits are pushed（建议）。
4. Require status checks before merging。
5. Required check：`quality-gate`。
6. Require branches to be up to date before merging（建议）。
7. Block force pushes。
8. Block branch deletion。
9. 不给普通开发分支设置绕过；管理员紧急绕过需记录原因。

## Verification

规则启用后应通过一个测试 PR 确认：

- 未获 review 时不能 merge。
- `quality-gate` 失败时不能 merge。
- 直接 push `main` 被拒绝。
- force push 和删除 `main` 被拒绝。

在 GitHub 页面真实确认前，Architecture Risk Register 的 AR-016 必须保持 Open，不能仅凭文档标记为已开启。
