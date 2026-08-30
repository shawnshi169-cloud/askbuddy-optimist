# Product Channel Contract

## Decision

AskBuddy has four stable top-level Product Channels. Their canonical source of
truth is the version-controlled shared catalog in
`packages/shared-types/src/product-channels.ts`:

| Slug | Display label | Order |
| --- | --- | ---: |
| `education-learning` | 教育学习 | 0 |
| `career-development` | 职业发展 | 1 |
| `lifestyle-services` | 生活服务 | 2 |
| `hobbies-skills` | 兴趣技能 | 3 |

The catalog defines product vocabulary and ordering. Routes, icons, colors, and
other presentation details remain platform-owned mappings keyed by the stable
slug.

## Storage And Read Boundaries

- There is no canonical `public.categories` relation. A Product Channel list
  must not depend on that table.
- `public.skill_categories` is the taxonomy referenced by
  `public.skill_offers.category_id`. It is not the Product Channel catalog.
- `public.get_channel_feed(text, text, integer, integer)` is the canonical
  backend read contract for content within one Product Channel. The request
  uses `ProductChannelSlug`, and the response echoes the normalized canonical
  slug.
- No channel-list RPC is required while the catalog remains a fixed product
  vocabulary. Adding a network dependency would make stable navigation less
  available without adding a backend-owned business capability.

The database remains responsible for validating persisted `channel` values and
RPC input. The shared catalog and database constraints intentionally carry the
same four values; contract tests guard that alignment.

## Runtime Policy

Trial, staging, and production clients consume the shared catalog directly.
They must not silently substitute `skill_categories`, a demo response, or an
unknown channel when a channel feed request fails. `get_channel_feed` rejects
unknown channel values, and consumers must surface an explicit empty or error
state according to the page contract.

Development-only presentation fixtures may style or populate content cards
when runtime governance explicitly allows them. They cannot redefine the
Product Channel catalog.

## Ownership And Adoption

Architecture A owns `ProductChannelSlug`, `PRODUCT_CHANNEL_CATALOG`, and the
backend alignment rules. Platform owners consume those values and own only
presentation mappings.

Core follow-up work owned by Architecture B must replace the current
`useCategories()` query and name-based routing with the shared catalog. It must
also replace the duplicated `useChannelFeed()` channel union with
`ProductChannelSlug`. That consumer change is intentionally separate from this
contract decision.
