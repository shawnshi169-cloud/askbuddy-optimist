# packages/shared-types

跨端业务类型、枚举、状态机和 target/item type 的唯一来源，由 A - Backend & Shared Contract 维护。

当前覆盖用户、问题、回答、专家、技能、消息、通知、订单、积分、收益与 Call v1；导出入口为 `src/index.ts`。

P1.4a truth rules：

- `QuestionStatus` 只表示 production `questions.status` 的持久化值；草稿使用 `question_drafts`，隐藏使用 `is_hidden`。
- `ModerationTargetType` 独立匹配 Pack07 举报/审核白名单，不与通知/Call 的宽泛 target type 混用。
- 通知区分 `NotificationRow`（storage）和 `Notification`（domain）。

规则：

- B Core App、C/D Native adapter、E Mini Program 遇到契约冲突时必须先提报 A。
- UI-only Props、label map 和本地派生状态可以保留在端侧。
- 持久化字段、后端状态和跨端枚举不得在 hook/page 中重复创造。
- 本目录当前尚未形成独立发布 package；该限制已登记在架构风险清单。
