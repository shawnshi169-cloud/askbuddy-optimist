# UX-1A: Core Visual References and Interactive Preview

Date: 2026-10-18 (Asia/Shanghai). Revision: **UX1A-R1**.

**Design approval: PENDING PRODUCT OWNER. Official page implementation: NOT AUTHORIZED.**
This is an isolated, synthetic, local visual reference, not a product release or proof of backend readiness.

## 1. Baseline and Product Truth

- Approved and initially verified remote main: `171f52f5c6aa9e1cff1768f7ac56b877b04b4419`.
- Branch: `codex/ux-1a-visual-reference`, created at that exact commit.
- North star: real Experience -> specific Question -> real Person -> ask that Person.
- [Product Blueprint](product-blueprint-v1-contract-decision.md), [frozen EC-3A decisions](ec3-discovery-contract-decision.md), [UX-0 audit](ux0-frontend-reality-and-roadmap.md), and [UX-P0B isolation](ux-p0b-auth-viewer-isolation.md) remain unchanged.
- Current presentation sources reviewed: [Home](../src/pages/Index.tsx), [Question](../src/pages/QuestionDetail.tsx), [Public Person](../src/pages/PublicPerson.tsx), [page map](../packages/shared-api/src/page-contract-map.ts), Home/question/Experience/UI2 components, BottomNav, SubPageHeader, PageStateCard, Sheet, index.css and App.css.
- Ordinary Person identity does not require an Expert record. Public Experience is evidence, not a permanent role. No ratings, universal verification, fake popularity, match percentages, accepted-answer winners, bounty, payment or service simulation.
- Existing Discovery flags `productionDeployed`, `clientConsumable`, `implementationStarted`, `rpcNamesFrozen` remain false. Existing canonical reads/writes are not used or changed by this preview.

## 2. Open and Run

From this branch's repository directory, with existing dependencies installed:

```sh
npm run preview:ux1a
```

Open **http://127.0.0.1:4178/#/**. This is local to the machine running Vite, not a public URL. No tunnel, deployment, login or paid service is needed or provided. Stop the preview process with Ctrl-C.

Preview-only hash locations:

| Reference | Local URL suffix | Available states |
| --- | --- | --- |
| Home | `/#/` | Question default, Person tab; sample/loading/empty/error |
| Question | `/#/question` | sample/loading/empty/error/missing/closed/long/partial |
| Person | `/#/person` | sample/loading/empty/error/missing/long/partial |
| Search entrance | `/#/search` | local text input, 综合/人/问题; unavailable results |
| Four Channel entrances | `/#/channel/<existing-product-slug>` | named entrance; discovery unavailable |

Use the top state selector or e.g. `/#/question?state=long`. Browser Back works within this independent HashRouter. The review strip always labels the revision, CSS width, page/state and synthetic source. These are not routes in `src/App.tsx`.

## 3. Isolation and Reuse

The normal Vite config, normal HTML entry, official router, all `src/`, shared contracts, lockfile, backend and runtime flags are unchanged.

The separate [Vite configuration](../visual-preview/ux1a/vite.config.mjs) permits only development serve on `127.0.0.1:4178` with strict port. It rejects build, preview-server, staging and production modes and non-loopback host overrides. It has `envDir: false`, no public directory, and a deliberately unused environment prefix. It does not read project .env files. CSP denies external resources, forms and embedding; only local Vite HMR WebSocket is allowed for connect-src. This development server is not a hardened hosted service.

An exact 14-file, presentation-only runtime import closure is audited by [the isolation check](../scripts/ux1a-preview-check.mjs). No Supabase client, AuthContext, data hook, fixture resolver, network API or persistent storage enters that graph. Type-only public Experience DTO imports do not create runtime reads. Negative checks reject AuthContext, Supabase module/package imports, unsupported modes and host overrides.

Reused unchanged: UI2 tokens, AppSurface, PageStateCard, shared Radix Sheet/Button, PersonExperienceCard, ExperienceTransitionPath, time formatting and the existing four-channel catalog. Public Experience card uses its default non-owner mode; no private Claim object exists in samples. No external image/font assets are loaded. Missing avatars use neutral icon/initial placeholders.

Preview-specific header and bottom navigation are intentional: importing production BottomNav would bring account/message hooks, while SubPageHeader carries production platform/layering behavior. The reference only copies their navigation shape; it does not duplicate data behavior. CSS is scoped to the preview document/classes, not appended to production CSS.

`test:ux1a-preview` is appended to required `test:contracts`, including strict preview TypeScript and dedicated ESLint. Normal `npm run build` now runs a postbuild inspection: no preview revision, component class, guard marker, label or preview artifact may exist in `dist`. No dependency or lockfile change.

## 4. Primary Visual Direction

One direction: **mint recognition, quiet reading surfaces, concrete Experience evidence**.

Preserve action-teal and existing semantic colors/radii. Use local Chinese font availability (PingFang SC / Noto Sans CJK SC / Microsoft YaHei), not downloaded fonts. Use a restrained two-line opening, small differentiated Channel icons, clear Question/Person tabs, white reading cards and neutral metadata. Desktop is a centered mobile reference with review notes, not a proposed full desktop application redesign.

| Area | Current source/reference issue | Preview proposal; production untouched |
| --- | --- | --- |
| Home hierarchy | Legacy Expert/feed semantics coexist with gated target state | Question-first; separate Person card emphasizing an Experience, not credentials |
| Home density | UI hierarchy competes with navigation and legacy content | One complete representative Question near first-screen boundary at 390px; 320px requires vertical scrolling. Review controls consume extra space and are not proposed app chrome |
| Header/sheet | Home header z90 exceeds shared Sheet overlay/content z50 | Preview header z20, bottom nav z30, unchanged shared Sheet z50. Actual browser hit testing confirms overlay intercepts header |
| Person | Identity alone cannot establish relevance | Biography, public period, directed transition, shareable subjects, public sample Topics, related Question |
| Question | Budget can be misread as bounty | Separate optional intent block, explicitly free public answers; partial state omits budget |
| Missing data | A route or CTA can imply unavailable capabilities | Explicit blocked/empty/error states; no fabricated fallback, counters or success |

The old header issue is a **source comparison**, not a screenshot or runtime test of the official app. No official app was launched against an API.

## 5. Interactive and Data Truth Matrix

| Interaction | Implemented reference behavior | Not represented as implemented |
| --- | --- | --- |
| Home tabs | Click/arrow/Home/End selection; distinct panels | Ranked discovery or real relevance |
| Channel | Four catalog slugs/labels; separate mode tabs | Querying or inferring Channel from Topic/Person |
| Search | Typed text held in memory, three target tabs | Search results, merged ranking, standalone Experience search |
| Question card | Opens matching fictional Question reference | Loading an actual Question |
| Answer author / Person card | Opens same explicitly fictional Person | Actual contributor identity or canonical ID |
| Question | Context, active-Topic presentation sample, optional budget, free answer, reply expansion | Topic catalog resolution, answer writes, Helpful mutation |
| Closed Question | Public sample remains readable, answer button disabled | Closed == hidden/deleted |
| Missing Question/Person | No sample payload revealed | Explanations disclosing moderation/private state |
| Experience | Public-only sample with dates, can-share text, directed transition; expand/collapse | Private Experience/Claim, reputation or verified qualifications |
| 问问TA | Truthful unavailable explanation | Conversation, paid Booking, RTC or order success |
| Central + | Radix sheet with two existing intent labels; click closes with no-publication explanation | Actual Question/Experience publishing or Skill Service |
| Bell / City | Explanation only; no badge, GPS or inferred city | Actionable priority queue or geographic filter |
| Editorial | Entire module absent | Legacy hot_topics or synthetic material passed as published editorial |
| Surrounding navigation | Five slots; out-of-scope destinations explain unavailability | Discover/Messages/Profile functionality in this preview |

All names, prose, dates and budget are locally authored fictional design material. No real public/private user data was copied. The sample requester has no profile, so its identity is not fabricated from the answer author's Person page. State and route changes clear transient feedback; nothing is persisted across browser sessions.

## 6. Visual Evidence and Accessibility

Evidence is actual headless Chrome **123.0.6312.59**, macOS, device scale factor 1, viewport height 844, reduced motion enabled. Capture date: 2026-10-18 Asia/Shanghai (JSON stores UTC). Not real iOS/Android devices, WeChat, Safari, hardware keyboard or screen-reader QA.

[Machine-readable evidence](visual-evidence/ux1a/browser-evidence.json) records 125 viewport/state cells, actual viewport/source/revision for each image, loopback module requests, interaction checks and sampled contrast. Local checkout paths are normalized to `/@repo/` so no machine username/path is published. Fifteen JPEGs plus JSON occupy approximately 728 KiB; no screenshots of actual users.

| Screenshot | Proof and boundary |
| --- | --- |
| [Home 320](visual-evidence/ux1a/home-questions-320.jpg), [375](visual-evidence/ux1a/home-questions-375.jpg), [390](visual-evidence/ux1a/home-questions-390.jpg), [430](visual-evidence/ux1a/home-questions-430.jpg) | Question default, first-screen density, four channels, five-slot nav. Scroll below first screen at narrower widths |
| [Home wide 1200](visual-evidence/ux1a/home-questions-1200.jpg) | Centered reference and review annotations, not desktop production approval |
| [Persons 390](visual-evidence/ux1a/home-persons-390.jpg) | Distinct evidence-led card; keyboard focus visible; lower card continues below viewport |
| [Create sheet 390](visual-evidence/ux1a/home-sheet-390.jpg) | Backdrop covers header; focused intent; two-entry copy discrepancy disclosed |
| [Question 390](visual-evidence/ux1a/question-390.jpg) | Full-page context/intent/answer hierarchy, no generated engagement counts |
| [Person 390](visual-evidence/ux1a/person-390.jpg) | Full-page ordinary identity, public Experience, directed transition, honest next step |
| [Question loading](visual-evidence/ux1a/question-loading-375.jpg), [error](visual-evidence/ux1a/question-error-375.jpg), [empty answers](visual-evidence/ux1a/question-empty-375.jpg) | Separate 375px state references; no substituted answers on error |
| [Person no evidence](visual-evidence/ux1a/person-empty-375.jpg) | 375px: no invented biography evidence or recommendations |
| [Long Question 320](visual-evidence/ux1a/question-long-320.jpg), [long Experience 320](visual-evidence/ux1a/person-long-320.jpg) | Full-page Chinese wrapping and vertical reading; not truncated screenshots |

Browser checks passed across 320/375/390/430/1200 CSS px:

- 25 scene/state combinations per width, zero detected horizontal overflow; all visible tested buttons/links/selects/inputs at least 44x44 CSS px.
- Keyboard tab semantics/roving focus, visible focus, skip link, browser Back, card/author navigation, Experience expansion.
- Sheet focus trap, Esc, backdrop and close dismissal, focus return, bounding box fit, actual z20/z50 header-overlay hit test.
- Closed/readable Question, optional absent budget, no-evidence Person, missing/hidden payload absence, error/loading and harmless unavailable feedback.
- Six sampled text/action contrast pairs >= 4.5:1: action 4.79, metadata 5.90, title/body 14.63. Icons mostly reuse these colors; decorative state icons have text equivalents. Not an exhaustive WCAG certification.
- Reduced-motion spinner disabled; no browser errors, external HTTP requests, API requests or local/session storage writes. Local Vite HMR is development tooling, not backend integration.

Remaining QA: real-device safe-area/keyboard behavior, 200% text zoom, screen reader ordering/announcements, high contrast, forced colors, dark theme, Safari and native/WebView behavior. Safe-area CSS exists but viewport simulation does not prove physical inset behavior. Light mode only is proposed; no dark-mode support claim. No real Auth or backend integration tested.

To reproduce opt-in browser QA, use an already installed local Playwright and Chrome, start the preview, then:

```sh
UX1A_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
UX1A_CHROME_PATH=/absolute/path/to/chrome \
node scripts/ux1a-browser-check.mjs --local --capture
```

Do not install a new service. The optional browser runner never accepts a remote target; origin is fixed loopback. Capture regenerates only the named synthetic images/JSON. This browser run is local evidence, not a GitHub browser/device gate.

## 7. PO Visual Decision Sheet

Every row is **APPROVAL PENDING**. Implementing a reference does not approve it.

| Decision | Proposed appearance and rationale | Contract constraint / decision needed |
| --- | --- | --- |
| A. First-screen density | [Home 390](visual-evidence/ux1a/home-questions-390.jpg): compact opening, channels then one Question; prioritize concrete circumstances | Approve density vs a shorter single-line intro; do not fill space with fake feed items |
| B. Header/brand | Quiet wordmark + outline bubble, optional city explainer and bell | Approve whether unavailable City/Bell should be omitted entirely in official UI until capabilities exist |
| C. Card hierarchy | [Question](visual-evidence/ux1a/home-questions-390.jpg) uses title/context; [Person](visual-evidence/ux1a/home-persons-390.jpg) uses one public Experience | No Expert/verification/rating shortcut; authentic runtime evidence required later |
| D. Answer layout | [Question detail](visual-evidence/ux1a/question-390.jpg): calm full-width reading, author, evidence link, modest actions | Free multiple answers; no winner, bounty or paid public reply; approve reading density |
| E. Experience storytelling | [Person](visual-evidence/ux1a/person-390.jpg): period rail, public card, directed transition, expandable description | Public-only, existing DTO/Topic semantics; approve timeline and collapse threshold |
| F. Central + copy | [Sheet](visual-evidence/ux1a/home-sheet-390.jpg) keeps current two entries: 我有问题 / 我有经验 / 技能 (second is one combined entry) | Machine centralPublish/current BottomNav use two rows; frozen prose/page map name three intents. Suggest two primary actions 我有问题 / 我有经历 with separate unavailable Skill explanation, ONLY after explicit terminology decision. Do not silently change frozen semantics |
| G. No content/capability | Editorial absent; no city inference; Bell explains unavailable | Hide Editorial unless genuine published content; choose omission vs explanatory affordances for unavailable City/Bell |
| H. Empty/blocked/loading | [Error](visual-evidence/ux1a/question-error-375.jpg), [no evidence](visual-evidence/ux1a/person-empty-375.jpg): specific calm state, return-to-sample only in preview | Approve tone; official retry/navigation must later follow real operations, never fake success |

## 8. Checks, Scope and Rollback

Required final-tree check results are recorded below after execution. No Production test, Docker/database integration, Auth resource or backend deployment is part of this verification.

| Check | Result |
| --- | --- |
| typecheck | PASS |
| typecheck:baseline | PASS, zero diagnostics |
| lint:changed | PASS; no changed production/shared TS files; dedicated preview lint runs separately |
| test:ux1a-preview | PASS: import/mode/network boundaries, dedicated strict TS and ESLint |
| Complete test:contracts | PASS, including new preview checks and existing Auth T01-T13 + Profile logout consumer regression |
| runtime-mode / profile-privacy / production-writes / fixture-isolation | PASS, each command rerun separately |
| Normal build + postbuild exclusion | PASS, no UX-1A artifact/marker in normal production output |
| Browser matrix + interactions | PASS, 125 cells, 15 screenshots |
| git diff --check | PASS |

The initial sandboxed contracts attempt could not create the suite's temporary compiler fixture under this managed worktree. The complete suite then passed with authorized local filesystem execution permissions; no assertion was modified for that restriction.

Local Node: 24.13.0. Whole-repository `npm run lint` remains FAIL: 27 errors and 7 warnings, all in unchanged historical `src/` files (useAdmin/useExperts/useLocalPosts/useLocation/useUserSettings, ChangePassword/ProductFeedback, iconOperations/platform, and existing fast-refresh export warnings). No changed file is among these findings; preview has its own passing ESLint command. No lint rule was relaxed. Build reports the existing outdated Browserslist database warning; no dependency or lockfile update was attempted.

Remote main was rechecked after local verification and still matched the exact approved baseline. GitHub required quality-gate status must be taken from the Draft PR, separately from the local results above.

Exact change inventory:

- `package.json`: local preview command, offline preview checks appended to contracts, production artifact exclusion postbuild; no dependency edits.
- `visual-preview/ux1a/index.html`, `main.tsx`, `samples.ts`, `preview.css`, `vite.config.mjs`, `tsconfig.json`, `eslint.config.mjs`: isolated entry, scoped style, authored samples and local configuration.
- `scripts/ux1a-preview-check.mjs`, `scripts/ux1a-browser-check.mjs`: static isolation/production exclusion and opt-in browser checks.
- This document, `docs/visual-evidence/ux1a/browser-evidence.json`, and the fifteen exact JPEG names listed in section 6.

No `src/`, `packages/`, Supabase, migrations, lockfile, Auth or production config changes. Revert this one UX-1A commit and stop its local Vite process to remove the reference/checks/evidence. No data migration or operational rollback is needed.

## 9. Suggested UX-1B Slices After Approval

These are proposals, not authorization:

1. **Question reading reference adoption**: QuestionDetail and presentation components only, preserving canonical lifecycle/Answer/privacy/draft behavior. Review real loading/error/closed/empty states and return navigation; rerun contracts, Auth isolation, Question UI and mobile visual checks. No Discovery dependency.
2. **Public Person/Experience presentation adoption**: public summary, existing Experience card and transition layout. Require safe projection, Topic/visibility and missing-evidence regression; no Claim, Expert or Conversation capability added.
3. **Shared header/sheet interaction correction**: narrowly review Header/BottomNav stacking, focus and safe areas with genuine device evidence before changing shared layers. Separately approve central wording. Preserve Auth/draft handoff.
4. **Home target presentation shell**: only after visual approval and a separate capability plan; never imply deployed Question/Person Discovery or enable Search/Home/Channel results from samples. Editorial remains hidden without published content.

Each should be an independently reviewable PR with its own scope/rollback. D1C and client activation remain separate gates.

## 10. Final Boundaries

UX-1A visual reference: implemented for local review.

PO design approval / independent code review: pending.

UX-1B official-page implementation: NOT AUTHORIZED.

D1C deployment: NO-GO. Real Auth: NOT AUTHORIZED / NOT VERIFIED.

Production access/mutation, paid infrastructure, client activation: NO.
