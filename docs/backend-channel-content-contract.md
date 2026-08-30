# 频道内容接口契约（频道 + 子类 + 本周精选）

## 1. 目标

为四个二级频道页统一后端数据规则，确保：

- 频道页只返回该频道内容（问题 / 专家 / 本周精选）
- 子类筛选（如 `gaokao`）只返回该子类相关内容
- 本周精选与当前频道（及子类）强关联，避免错位

---

## 2. 统一枚举

> 四个一级频道是稳定 Product Channel Catalog，不是动态 category 表。
> Canonical shared definition: `packages/shared-types/src/product-channels.ts`.
> `public.skill_categories` 只服务于 skill offer 下层分类，不得替代本目录。
> 前端如需路由、图标或颜色，在平台层按稳定 slug 映射。

### 2.1 channel

- `education-learning`
- `career-development`
- `lifestyle-services`
- `hobbies-skills`

### 2.2 subcategory

#### education-learning
- `gaokao`
- `kaoyan`
- `study-abroad`
- `competition`
- `paper`

#### career-development
- `job`
- `resume`
- `interview`
- `remote`
- `startup`

#### lifestyle-services
- `housing`
- `legal`
- `emotional`
- `insurance`
- `overseas`

#### hobbies-skills
- `photography`
- `music`
- `art`
- `fitness`
- `cooking`

---

## 3. 数据模型要求

## 3.1 questions（必须）

- `id`
- `title`
- `content`
- `channel`（必填，取 2.1）
- `subcategory`（建议必填，取 2.2）
- `tags[]`
- `bounty_points`
- `view_count`
- `created_at`
- `user_id`
- `status`

## 3.2 experts（必须）

- `id`
- `user_id`
- `nickname`
- `avatar_url`
- `title`
- `bio`
- `channel`（必填，取 2.1）
- `subcategory`（建议必填，取 2.2）
- `tags[]`
- `rating`
- `response_rate`
- `order_count`
- `consultation_price`
- `verification_status`（仅表示专家档案审核状态，不等价于通用身份/资质核验）

## 3.3 featured（本周精选）

建议独立维护专题表（topic）或精选池，至少包含：

- `id`
- `channel`（必填）
- `subcategory`（可空；为空表示频道通用精选）
- `title`
- `summary`
- `target_type`（`question` | `topic` | `expert`）
- `target_id`
- `priority`
- `is_active`
- `start_at`
- `end_at`

---

## 4. 接口契约

## 4.1 获取频道页内容（推荐单接口）

`GET /api/v1/channel-feed`

### Query

- `channel`（必填）
- `subcategory`（可选，默认 `all`）
- `tab`（可选：`everyone` / `experts`，默认 `everyone`）
- `cursor`（可选）
- `page_size`（可选，默认 20，最大 50）

### 规则

1. `channel` 必须精确过滤。
2. `subcategory != all` 时，问题和专家都按 `subcategory` 过滤。
3. `featured` 优先返回 `channel + subcategory` 精选；若无，降级到 `channel + null`。
4. 内容排序默认：
   - 问题：`is_pinned desc, heat_score desc, created_at desc`
   - 专家：`is_recommended desc, rating desc, response_rate desc`

### Response（示例）

```json
{
  "channel": "education-learning",
  "subcategory": "gaokao",
  "featured": {
    "id": "feat_1001",
    "title": "高考志愿填报避坑清单",
    "summary": "先看分数位次、专业优先级和城市偏好再填报。",
    "target_type": "topic",
    "target_id": "topic_3001"
  },
  "questions": {
    "items": [
      {
        "id": "q_1",
        "title": "高考 620 分如何选专业？",
        "subcategory": "gaokao",
        "tags": ["高考", "志愿"],
        "bounty_points": 20,
        "view_count": 356
      }
    ],
    "next_cursor": "q_1"
  },
  "experts": {
    "items": [
      {
        "id": "e_1",
        "nickname": "王老师",
        "subcategory": "gaokao",
        "rating": 4.9
      }
    ],
    "next_cursor": "e_1"
  }
}
```

## 4.2 搜索（频道内）

`GET /api/v1/search`

### Query

- `q`（必填）
- `channel`（可选，频道内搜索时必传）
- `subcategory`（可选）
- `type`（`question` | `expert` | `all`）
- `cursor` / `page_size`

### 规则

- 传 `channel` 时必须限制在该频道。
- 传 `subcategory` 时必须进一步限制到该子类。

## 4.3 本周精选（可独立）

`GET /api/v1/channel-featured`

### Query

- `channel`（必填）
- `subcategory`（可选）

### 规则

- 优先返回 `channel + subcategory` 命中。
- 无命中时返回 `channel + null`。

---

## 5. 兼容策略（当前前端过渡）

当前前端已按 `channel + subcategory` 展示逻辑收口。  
后端联调前，请保证至少满足：

1. `questions` 返回有 `channel`（或与之等价字段）；
2. 尽快补 `subcategory` 字段；
3. 精选接口返回 `featured`（不要让前端猜“第一条就是精选”）。

---

## 6. 验收清单（后端联调）

1. 在“教育学习”页只出现教育问题与教育专家。
2. 点击“高考”后，问题与专家都只出现高考相关。
3. “本周精选”切到“高考”后变为高考精选；切回“全部”回到频道通用精选。
4. 四个频道都满足同样规则。
5. 搜索页在频道内搜索时，不跨频道出结果。
