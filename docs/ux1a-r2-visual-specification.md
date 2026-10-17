# UX-1A-R2: Fresh Mint and Chinese Mobile Reading

2026-10-18, Asia/Shanghai. **Visual-copy and palette proposals: APPROVAL PENDING.**

R2 refines the isolated UX-1A preview on Draft PR #68. Reviewed R1 parent: `692987b6f7a44eecd897ea8716568a5a27f65826`; original main baseline: `171f52f5c6aa9e1cff1768f7ac56b877b04b4419`. The existing branch is `codex/ux-1a-visual-reference`.

The direction is fresh mint, approachable language, clear Chinese reading, and trust grounded in public Experience. Official pages, shared contracts, Auth, backend, runtime flags and deployment remain outside this implementation.

## 1. Review Modes and Navigation

Start in this branch with `npm run preview:ux1a`. Local URL: **http://127.0.0.1:4178/#/**. It is available only on the machine running Vite.

| Mode | Example suffix | Purpose |
| --- | --- | --- |
| User reference (default) | `/#/?view=user` | App composition with a small persistent “UX1A-R2 · 设计预览 · 虚构内容” watermark; no debug controls or unavailable City/Bell affordances |
| Lab review | `/#/?view=lab` | Full state, palette, hero, revision/width and page controls, plus explanatory City/Bell buttons |
| Controlled R1 color comparison | `/#/?view=user&palette=r1` | Original R1 base semantic colors applied to the same R2 content, type and geometry |
| Compact opening comparison | `/#/?view=user&hero=compact` | Single-line “问问题，找经历过的人” above Search |
| Direct Search composition | `/#/?view=user&hero=none` | Recommended R2 default; no separate visible hero |
| Multiple Answers | `/#/question?state=multiple` | Two fictional authors; each author opens the corresponding fictional public profile |
| Multiple Experiences | `/#/person?state=multiple` | Two public Experience samples with one period per Experience |

“实验室” and “查看用户视角” switch modes. Presentation choices survive preview navigation. Watermark height adapts to text enlargement and offsets the sticky page header. The Sheet itself retains a synthetic-preview disclosure.

Lab controls expose: Question sample/multiple/long/replies/loading/empty/error/missing/closed/partial; Person sample/multiple/long/short/loading/empty/error/missing/partial; Home sample/loading/empty/error. Unavailable states do not expose sample payloads.

## 2. Color Review and Semantic Roles

The [color audit](visual-evidence/ux1a/r2/color-audit.json) inventories every R1 preview color declaration (129), its selector/property/value/source line, and the 153 corresponding R2 declarations. These are declarations, not distinct colors. R2 consolidates the old forest/grey-green variants into the following scoped roles; imported components receive preview-only overrides.

| Role | Actual R2 CSS value | Intended use |
| --- | --- | --- |
| Brand mint | `#8ADFD6` | Brand mark, small identity accent, Lab banner; never light text on mint |
| Mint soft | `#ECF9F7` | Channel icon surfaces and preview watermark; avoid stacking tinted content cards |
| Action teal | `#207B77` | Main actions, links, selected underline, focus |
| Page neutral | `#F7FAFA` | Page surround, modest input/reply/chip backgrounds |
| Surface | `#FFFFFF` | Reading, cards, navigation, Sheet |
| Primary text | `#23313A` | Titles, body, identity |
| Secondary text | `#53666A` | Meaningful dates, metadata, helper text |
| Subtle border | `#E1EBEA` | Separators and decorative card boundaries; not a focus indicator |
| Action hover | `#196662` | White text on hovered main action |
| Action pressed | `#135653` | White text on pressed main action |
| Error accent | `#A94736` | Small error icon with an explicit text explanation |

The backdrop mixes primary text at 36% over the page. This replaces the old black/80 treatment only inside the preview. Reading sections stay white; Experience has simple separators instead of nested tinted cards. Existing source tokens are untouched; preview semantic variables and the two needed inherited UI2 variables are scoped to the preview body.

Measured in actual Chrome CSS:

| Pair | Contrast |
| --- | --- |
| Primary text / white | 13.36:1 |
| Secondary text / white | 6.04:1 |
| White / action teal | 5.05:1 |
| Secondary text / page chip | 5.76:1 |
| Secondary text / mint-soft watermark | 5.60:1 |
| Controlled R1 sample minimum | 4.79:1 |

Hover and pressed action pairs are also measured and required to exceed 4.5:1; exact foreground/background values are in [browser evidence](visual-evidence/ux1a/r2/browser-evidence.json). Focus is a visible 3px action-colored outline with 3px offset. This is sampled verification, not an exhaustive WCAG certification. Low-contrast subtle borders are decorative; actions have text/icon affordances and a stronger focus state.

## 3. Chinese Typography and Rhythm

Use local `PingFang SC / Noto Sans CJK SC / Microsoft YaHei / sans-serif`; no external fonts. All meaningful preview text is at least 12px at the default 16px root. Sizes use rem so text can enlarge. Weights are restricted to 400/500/600.

| Role | Default size | Line height | Weight |
| --- | --- | --- | --- |
| Page title | 24px | 36–38.4px | 500–600 |
| Compact Home statement | 22px | 33px | 500 |
| Section heading / tabs | 18px | 27px | 400 inactive / 600 selected or heading |
| Question card title | 18px | 28.8px | 500 |
| Experience title / state title | 17px | 27.2px | 500 |
| Question context / Answer body / biography | 16px | 30.4px | 400 |
| Card summary / Experience story | 15px | 27–28.5px | 400 |
| Primary action | 15px | 24px | 500 |
| Secondary action | 13–14px | 20.8–22.4px | 400–500 |
| Dates, Topics, meaningful metadata, watermark | 12–13px | 18–22.75px | 400 |

Spacing scale: **4 / 8 / 12 / 16 / 24 / 32px**. Default mobile horizontal gutter/card padding is 16px; reading sections use 24px vertical rhythm, and related blocks use 8–16px. The 24px section gap separates stories without a large colored divider. Layout caps at 460px; wide screens retain a centered reference.

Chinese prose preserves source punctuation and paragraph breaks, uses normal wrapping plus overflow-wrap where necessary, and avoids ellipsis on expanded reading content. Question dates use day precision `2024.01.01`; Experience periods use month precision `2022.06 – 2023.07`, with tabular numerals. Transition dates retain their own event semantics. Experience has no duplicate outer year rail.

## 4. Reusable UI Reference for Later Slices

These are proposed visual rules for future UX-1B review, not additional official-page changes.

| Element | R2 reference rule | Behavior / boundary |
| --- | --- | --- |
| Header | White, 64px minimum, mint brand mark, 16px gutter | Back remains reachable; user watermark is preview chrome |
| Bottom navigation | Five slots, white surface, 12px labels, 48px main + | Safe-area padding and footer clearance; no extra service entry |
| Question card | 18px title, 15px context, modest metadata/action | A specific situation leads; no fabricated counts or rankings |
| Person card | Identity, one concrete public Experience, period and invitation | No Expert requirement, badge, score or generic expertise label |
| Experience story | Period -> title -> story -> transition -> Topics/shareable details | One-level section separators; long text expands with aria-expanded |
| Form/input | 48px minimum entry, 16px input text, visible label/name | Search text stays in memory; no transport or fake validation success |
| Tabs | 18px with underline, selected semantics, roving arrows/Home/End | Wrap rather than overflow when text enlarges |
| Chips | 12px readable labels on neutral background | Topic examples are synthetic; no taxonomy or association writes |
| Primary/secondary actions | Teal/white main action, readable text action, hover/pressed/focus | Disabled state cannot imply success |
| Sheet/dialog | Existing Radix primitive, white, 24px radius, bounded height/scroll | Focus trap, Esc/backdrop/close, restore; z50 above header z20 |
| Loading | Small 24px icon and calm state copy | Reduced-motion spinner disabled; no real load claim |
| Empty/error | Compact card, 17px title, 15px explanation | Missing content remains absent; “返回设计样例” is preview navigation |
| Mobile accessibility | >=44px targets, rem text, wrapping, visible focus | Native insets, screen readers and physical-device behavior need separate QA |

The public Experience reference now composes the unchanged shared period formatter and Transition component in a small preview-only story layout. That supports the approved period/story order without changing the production Experience card. Removing its unused owner/dropdown dependencies narrows the exact runtime import closure from 14 to 12 files.

## 5. Product Wording and State Truth

- Home remains Question-first with separate Person mode, existing four Channels, Search in the approved order, and five navigation slots. Editorial remains absent.
- User-view City/Bell are omitted until actionable capability exists. Lab-only explanation controls carry no counts, GPS or queue state.
- Question CTA is **我来回答**. An Answer does not require creating a canonical Experience first. Public Answers remain free and multiple; no accepted winner, bounty or payment.
- Budget is secondary neutral metadata after context/author, explicitly optional deeper-exchange intent.
- Question has multiple Answers, long Answer, missing avatar fallback, one-level reply, closed/readable, empty/error/missing and partial-budget examples.
- Person presents identity, public Experience period/story, transition and Topics. Multiple/very long/short/no Experience and incomplete identity are selectable. User view contains no developer-facing “PERSON” or “Claim” wording.
- Sheet uses proposed **我有问题 / 我有经历**, followed by **技能服务尚未开放**. Both copy and grouping remain pending PO approval. Official BottomNav/create contracts retain their existing wording.
- Search domains are exactly **all / person / question**, labels **综合 / 人 / 问题**. Home's existing preview mode IDs are separate from these Search domains.
- Helpful, reply, Answer, creation and 问问TA only explain unavailable operations. No content, Auth state, order or conversation is created.

## 6. Comparable Captures

Three evidence types are kept distinct:

1. [Original R1 record](ux1a-visual-reference.md): all 15 original JPEGs and original machine evidence are byte-for-byte retained.
2. **Controlled color comparison** below: R1 base palette and R2 palette rendered on identical R2 content, type, layout, user-view chrome and viewport. DOM text plus heading/article/button geometry hashes match for all 28 pairs. This isolates the color decision.
3. R2 composition/interaction examples: compact vs no hero, Lab, long reading, replies, partial identity, loading and 200% root-font emulation.

Each paired cell links **R1 base palette / R2 palette**, at the stated CSS width and 844px height. Question/Person/empty/error are full-page captures; Home and Sheet are actual viewport captures. Per-image source, state, revision, view, hero and palette are recorded in the [manifest](visual-evidence/ux1a/r2/browser-evidence.json).

| Scene | 320px | 375px | 390px | 430px |
| --- | --- | --- | --- | --- |
| Home Questions | [R1](visual-evidence/ux1a/r2/r1-palette-home-questions-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-questions-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-questions-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-questions-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-questions-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-questions-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-questions-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-questions-430.jpg) |
| Home Persons | [R1](visual-evidence/ux1a/r2/r1-palette-home-persons-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-persons-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-persons-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-persons-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-persons-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-persons-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-home-persons-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-home-persons-430.jpg) |
| Multiple Answers | [R1](visual-evidence/ux1a/r2/r1-palette-question-multiple-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-multiple-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-multiple-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-multiple-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-multiple-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-multiple-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-multiple-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-multiple-430.jpg) |
| Multiple Experiences | [R1](visual-evidence/ux1a/r2/r1-palette-person-multiple-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-multiple-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-multiple-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-multiple-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-multiple-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-multiple-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-multiple-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-multiple-430.jpg) |
| Creation Sheet | [R1](visual-evidence/ux1a/r2/r1-palette-create-sheet-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-create-sheet-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-create-sheet-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-create-sheet-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-create-sheet-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-create-sheet-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-create-sheet-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-create-sheet-430.jpg) |
| Person empty | [R1](visual-evidence/ux1a/r2/r1-palette-person-empty-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-empty-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-empty-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-empty-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-empty-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-empty-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-person-empty-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-person-empty-430.jpg) |
| Question error | [R1](visual-evidence/ux1a/r2/r1-palette-question-error-320.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-error-320.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-error-375.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-error-375.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-error-390.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-error-390.jpg) | [R1](visual-evidence/ux1a/r2/r1-palette-question-error-430.jpg) / [R2](visual-evidence/ux1a/r2/r2-question-error-430.jpg) |

Additional 390px captures: [compact Question mode](visual-evidence/ux1a/r2/r2-home-questions-compact-390.jpg), [compact Person mode](visual-evidence/ux1a/r2/r2-home-people-compact-390.jpg), [Lab](visual-evidence/ux1a/r2/r2-lab-390.jpg), [long Answer](visual-evidence/ux1a/r2/r2-long-answer-390.jpg), [one-level replies](visual-evidence/ux1a/r2/r2-replies-390.jpg), [short Experience](visual-evidence/ux1a/r2/r2-short-experience-390.jpg), [partial identity](visual-evidence/ux1a/r2/r2-partial-person-390.jpg), [loading](visual-evidence/ux1a/r2/r2-loading-390.jpg).

200% examples: [320px Home](visual-evidence/ux1a/r2/r2-zoom200-home-320.jpg), [320px Question](visual-evidence/ux1a/r2/r2-zoom200-question-320.jpg). These are viewport captures; longer content remains scrollable.

Total: 66 optimized JPEGs, approximately 3 MiB including audit/manifest. The runner enforces a 4 MiB screenshot budget. No real user data, machine paths or credentials are published.

## 7. Visibility, Accessibility and Limits

At **390x844 user-view**, actual measured card content positions:

| Opening | Question title top/bottom | Person Experience top/bottom |
| --- | --- | --- |
| Direct Search | 434.75 / 492.34px | 519.75 / 570.34px |
| Compact statement | 483.75 / 541.34px | 568.75 / 619.34px |

Both put concrete content above the bottom navigation. Direct Search saves 49px and is the recommended default. Lab chrome is deliberately excluded from this density assessment. First-screen results do not imply real discovery queries.

Browser QA: actual local headless Chrome 123.0.6312.59 on macOS, device scale 1, reduced motion; 320/375/390/430/1200px. The 29 scenes across two views and five widths produce **290 layout cells**. All passed horizontal-overflow, visible target >=44px and meaningful text >=12px checks. The Sheet is separately checked at all five widths.

Keyboard QA covers tabs/arrows/Home/End, visible focus, Sheet trap/Esc/backdrop/close/focus return, skip link, browser Back and fresh deep-link Back. Answer author navigation matches the selected fictional identity. No private payload is displayed in missing/hidden/error/loading states.

At 320 and 390px, five flows each were tested with root font-size 200%: Home Question/Person, long Question, multiple Experiences, Search. Body text doubles 16 -> 32px. Tabs wrap, watermark offset adapts, Sheet scrolls, and no horizontal overflow or clipped control boxes were detected. At this size, more content naturally moves below the first viewport.

**Limitations:** root-font enlargement emulates text scaling; native browser text-only zoom, physical devices, Safari, Android/iOS/WeChat WebViews, real safe-area insets, software keyboard, screen-reader announcements, forced colors and dark mode are not verified. Full-page images position fixed navigation at the original viewport edge; interactive scrolling is the authoritative way to inspect content behind it. Automated rectangle/contrast checks are not a complete accessibility certification.

## 8. PO Decisions

All choices below remain **APPROVAL PENDING**:

| Decision | Recommendation | Alternative / approval impact |
| --- | --- | --- |
| Palette | Candidate R2 mint/teal with neutral reading surfaces | Retain R1 base colors; no global token approval is implied |
| Home opening | Direct Search; concrete content starts 49px earlier | Compact single-line statement; both captures provided |
| Type/rhythm | 16px reading, 15px summaries, 12–13px metadata; 16px gutters | Adjust density after real-device review; do not shrink meaningful text |
| Question | 我来回答, optional subdued intent, free multiple Answers | Reading/collapse thresholds may be refined; no Experience prerequisite |
| Person | Period/story-first sections with light separators | Keep more card framing; public-evidence rules remain mandatory |
| Central create | 我有问题 / 我有经历, separate unopened Skill Service | Retain official combined wording; requires explicit copy/contract reconciliation before official adoption |
| User-view chrome | Small synthetic watermark, no inactive City/Bell | Future official affordances need actionable capabilities |
| Empty/error | Compact icon, readable explanation and honest next step | Tone may be refined; real operations must supply future retry/success behavior |

UX-1B candidates remain separate: Question reading presentation, public Person storytelling, then reviewed shared header/Sheet behavior. Home/Search/Channel consumer work depends on its own runtime gates.

## 9. Checks, Change Inventory and Rollback

Final local results are recorded after execution:

| Check | Result |
| --- | --- |
| R2 browser QA / comparisons / text enlargement | PASS: 290 cells, 28 pairs, 10 zoom flows |
| Preview isolation + strict preview TS/lint | PASS: exact 12-file presentation closure |
| typecheck / typecheck:baseline / lint:changed | PASS; zero type diagnostics; preview has its own passing strict TS/lint |
| Complete test:contracts | PASS, including Auth T01–T13, Profile logout consumers and preview isolation |
| runtime-mode / profile-privacy / production-writes / fixture-isolation | PASS, each explicitly executed |
| Normal build + preview exclusion | PASS; UX-1A-R1/R2 markers and preview assets excluded |
| Documentation links / git diff --check | PASS |

Whole-repository `npm run lint` remains FAIL: 27 errors / 7 warnings, all in unchanged historical `src/` files. No changed file is among those findings. No rule suppression or dependency/lockfile edits are part of R2. Build retains the existing outdated Browserslist warning. GitHub CI outcome belongs to the PR's actual latest-head checks.

Adding pointer-state contrast measurement exposed a browser-test setup issue: programmatic focus immediately after a mouse click does not necessarily match `:focus-visible`. The final run uses real Shift+Tab/Tab navigation, verifies the primary action is active, and retains the original 3px focus assertion. The final full browser suite passed.

R2 changes: `visual-preview/ux1a/main.tsx`, `preview.css`, `samples.ts`; `scripts/ux1a-browser-check.mjs`, `ux1a-preview-check.mjs`; a small R1-document pointer, this specification, and `docs/visual-evidence/ux1a/r2/` (66 JPEGs, two JSON reports). Exact screenshot inventory is the manifest. No official source, route, backend, Auth, runtime, package/lockfile or production configuration edit.

Rollback: revert only the single R2 follow-up commit and refresh/restart the existing preview. R1 remains available through its preserved evidence and parent commit. No data rollback.

UX-1B official implementation: NOT AUTHORIZED. D1C deployment: NO-GO.

Production access/mutation, client activation, paid infrastructure: NO.
