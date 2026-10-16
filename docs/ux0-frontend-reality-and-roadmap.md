# UX-0 Frontend Reality and Product Experience Roadmap

**Audit date:** 2026-10-16. **Source baseline:** `97b418ddffa6202fedaebdc0fdc25c1afcdba159`.
**Branch:** `codex/ux0-frontend-reality-audit`. Documentation only; every proposed UX slice below requires separate approval.

## 1. Executive Findings

AskBuddy already has a substantial canonical Question/Answer and Person/Experience UI. Replacing it with a new visual system would discard useful behavior. The highest-value work is to make existing journeys truthful, connected, accessible and demonstrably viewer-safe before broader discovery rollout.

The principal split is **canonical detail/editor surfaces versus legacy acquisition and self-area lists**. Home, Channel and Search can look like the target product without supplying canonical discovery identities or evidence. A rendered screen is not a deployed product capability.

| Rank | Gap and evidence | Priority / next decision |
| --- | --- | --- |
| 1 | Privacy Settings promises profile, education, work, message and activity visibility controls; it saves legacy JSON, not an approved canonical visibility policy. Blacklist invents two blocked users and locally claims interaction restrictions. | P0 truthful-privacy release gate; quarantine unsupported claims, not a new privacy backend. |
| 2 | `AuthContext.fetchProfile` checks the response against its original argument, then asynchronously writes global profile state without checking the current viewer. A late A response can race B/login/logout; an old failure can also clear a newer profile. | P0 source-identified isolation risk. Reproduce with an isolated delayed-response test before claiming a live privacy incident or a fix. |
| 3 | Home/Channel/Search and My Answers/Favorites still supply legacy Question identities to the now canonical-only `/question/:id`. | P1 source-verified contract mismatch; no live-data claim that every link fails. Never cast a legacy ID into a canonical identity. |
| 4 | Home/Channel/Search “Person” results remain Expert-derived; My Following specifically routes an Auth `followee_id` to `/expert-profile/:id`, which expects an Expert ID. | P1 identity/evidence correction; ordinary Persons must not require Expert rows. |
| 5 | Search has five legacy domains, including Posts and Services, rather than `综合 / 人 / 问题`; the All tab is not the frozen independent canonical Question/Person discovery contract. | P1 target presentation can be reviewed; real cutover remains backend-gated. |
| 6 | Home “问问热榜” is `hot_topics`, not published Editorial; unread Bell, default Shenzhen and Channel “本周精选” copy overstate target semantics. “Use current location” actually selects Shenzhen. | P1 remove ambiguity before target-state approval; no Editorial, location or action-queue invention. |
| 7 | Account binding, blacklist and storage screens include ungated hardcoded facts; storage/general settings can announce success without the represented operation. | P0 for security/account claims, P1 for other settings. Existing fixture guards are not proof every screen is honest. |
| 8 | Self-area drafts/counters remain legacy. Remote DraftList opens `/new?draftId=...`, but canonical NewQuestion restores a viewer-local draft, not that record. | P1 draft-source/return-path clarity; do not silently migrate private drafts. |
| 9 | Home fixed header remains above the create-sheet overlay; small/low-contrast controls and unnamed icon buttons/switches are inconsistent with newer canonical surfaces. | P1 observable overlay/accessibility corrections before visual expansion. |
| 10 | Populated canonical, authenticated editing, real account switching and current native/WeChat journeys are not verified by this browser-only audit. | P1 evidence gap; separately authorize isolated fixtures and platform QA, not Production probes. |

P0 means a proposed gate before broader frontend rollout, not permission to change code now. The database phone boundary is not alleged to have reopened. Runtime checks passing below do not discharge these UX or async-state risks.

**Recommendation:** approve a small UX-1A reference/state/accessibility slice using existing tokens, with P0 privacy and account-isolation follow-ups explicitly scheduled before rollout. Do not begin Home/Search backend integration as a cosmetic change.

## 2. Product Truth and Evidence Precedence

North star: **Real Experience -> Specific Question -> Find a Real Person -> Ask That Person**. Experience is evidence, not a permanent Expert identity. Public Answers are free and multiple. Service, paid exchange and Verification remain separate optional capabilities. A budget expresses intent, not bounty, escrow or paid-answer entitlement.

Precedence used: latest approved semantics, actual merged source, dated deployment evidence, then historical observations. No historical record has been rewritten.

| Source | Use and reconciliation |
| --- | --- |
| [Blueprint decision](product-blueprint-v1-contract-decision.md), [legacy matrix](product-blueprint-v1-legacy-canonical-matrix.md), [machine domains](../packages/shared-api/src/product-blueprint-v1.ts), [page map](../packages/shared-api/src/page-contract-map.ts) | Target entity boundaries and current domain status. `production-ready` for an existing backend contract does not mean every client/platform is complete. |
| [EC-3A decision](ec3-discovery-contract-decision.md), [Discovery API targets](../packages/shared-api/src/discovery-v1.ts), [target DTOs](../packages/shared-types/src/discovery-v1.ts) | Frozen Home, separate Question/Person rankings, evidence requirements, opaque stable snapshots. No public numeric match score, generic verification, invented heat or Service requirement. |
| [Channel contract](product-channel-contract.md), [catalog](../packages/shared-types/src/product-channels.ts) | Four exact slugs: `education-learning`, `career-development`, `lifestyle-services`, `hobbies-skills`. Historical “canonical feed” wording does not convert Expert feed RPCs into frozen Discovery. |
| [Public Person decision](canonical-public-person-profile-contract-decision.md), [privacy closeout](public-person-privacy-cutover.md) | Person identity is `auth.users.id = profiles.user_id`; safe public projection and owner-private contract, not general profile visibility settings. Old exposure observations are historical. Owner-private authenticated HTTP transport was not repeated in that closeout. |
| [Experience decision](canonical-experience-v1-contract-decision.md), current Experience consumers | Public/private Experience, owner editing, directed Transitions and public evidence are implemented in Shared Core. Old “UI not wired” observations are superseded. Claim/private evidence is not public matching material. |
| [Question decision](canonical-question-answer-v1-contract-decision.md), [deployment](canonical-question-answer-v1-production-deployment.md), [consumer gate](canonical-question-answer-v1-consumer-gate.md) | Canonical Question/Answer/Reply/Helpful/owner-close behavior, open and closed public reads; not legacy accepted-answer or reward semantics. |
| [Topic consumer gate](ec3b2c-canonical-topic-consumer-gate.md), [Core apply closeout](ec3c0d-canonical-topic-core-seed-production-apply.md), current Topic components | Old empty-taxonomy/`topicIds=[]`-only statements are dated. Current source supports optional NewQuestion Topics, existing-owner Experience Topic editing and public Experience Topic display. Core's recorded 79 Topics/192 terms are historical verified seed facts, not a fresh count or permanent namespace ceiling. |
| [D0 audit](ec3d0-discovery-readiness-audit.md), [D1A local](ec3d1a-question-discovery-local.md), [D1B local](ec3d1b-question-discovery-transport-storage.md), [D1C risks](ec3d1c-predeployment-risk-assessment.md), [Gate A](ec3d1c-gate-a-hosting-cost-decision.md) | D1A/B isolated backend exists. D1C deployment remains NO-GO. No active canonical Home/Channel/Search/Person discovery endpoint. D0 cardinalities are dated snapshots, not UX-0 observations. |

Follow-ups, not edits in this PR: the page map still lists Home `table:categories` while `CategorySection` uses the shared catalog; some page-map Topic notes are less specific than current Topic consumers. The central-create machine constant has two choices including a combined `我有经验 / 技能`, whereas frozen prose describes three intents. These require narrow truth/copy review, not a new taxonomy or Service implementation.

## 3. Inventory Method and Shared Baselines

Inventory is exhaustive for the **55 route declarations** in [App.tsx](../src/App.tsx), including `*`, plus 17 WeChat pages. It is not exhaustive proof of every interaction state. Unrouted helpers such as `OrderList` and `DraftList` are included through their parent routes, not counted as extra capabilities.

Labels: **IMPLEMENTED / SOURCE VERIFIED** means code and its dependency inspected; **IMPLEMENTED / VISUALLY VERIFIED** applies only to the exact local state in section 8. **PARTIAL**, **LEGACY COMPATIBILITY**, **PRESENTATION ONLY**, **BLOCKED**, **NOT IMPLEMENTED** and **UNKNOWN** never imply deployability. In tables, `S` and `V` abbreviate those two IMPLEMENTED labels; `L/E/X` means loading/empty/error handling present in source, not independently exercised success.

All Web routes share HashRouter (`/#/...`), lazy-route loading, AuthProvider, QueryClient and navigation wrappers. Most subpages use `SubPageHeader` and `navigateBackOr`/`buildFromState`; root pages use five-slot BottomNav and page scroll memory. Native Android/iOS consume this Core but safe areas, IME, system Back and lifecycle require separate testing. No inventory row grants native/WeChat parity. Source references in each row identify the page; supporting hooks/components are mapped in section 4.

### 3.1 Entry, Discovery and Canonical Journeys

| Route / source | User goal and approved target | Actual source/data capability | States, actions, auth/return, main issue and priority |
| --- | --- | --- | --- |
| `/` [Index](../src/pages/Index.tsx) | Question-first entry, separate evidence-backed Persons | LEGACY COMPATIBILITY; legacy Questions/Experts/hot_topics. V: both modes/error + dev hot-topic fixtures | L/E/X/retry, Search/City/Bell, Channels, +, bottom tabs. Default Questions works; data/identity/editorial mismatch. P1. |
| `/auth` [Auth](../src/pages/Auth.tsx) | Return to intended action safely | S/PARTIAL; Supabase password/signup and existing auth UI, not exercised | Validation/pending/error, auth return; V anonymous handoff and browser-back draft retention only. Brand copy remains “智能问答社区”; unnamed icon controls. P1. |
| `/career` [CareerDevelopment](../src/pages/CareerDevelopment.tsx) | Career Channel, separate Q/P modes | LEGACY COMPATIBILITY; `career-development` feed | Shared scaffold L/E/X, subfilters, Search, Question FAB; Expert results, not evidence-backed Persons. P1. |
| `/education` [EducationLearning](../src/pages/EducationLearning.tsx) | Education Channel | LEGACY COMPATIBILITY; `education-learning` feed; V error state | Tabs/subfilters/Search/FAB; “本周精选” static banner is not verified publication. No canonical discovery claim. P1. |
| `/lifestyle` [LifestyleServices](../src/pages/LifestyleServices.tsx) | Lifestyle Channel | LEGACY COMPATIBILITY; `lifestyle-services` feed | Same state/action pattern; slug is navigation context, not Service activation or Person label. P1. |
| `/hobbies` [HobbiesSkills](../src/pages/HobbiesSkills.tsx) | Hobbies Channel | LEGACY COMPATIBILITY; `hobbies-skills` feed | Same pattern; no canonical Skill/Person matching. P1. |
| `/education/search` [EducationSearchResults](../src/pages/EducationSearchResults.tsx) | Preserve old education search links | LEGACY COMPATIBILITY redirect to shared Search with parameters | No independent search backend; preserve Channel/return context. P2. |
| `/search` [SearchResults](../src/pages/SearchResults.tsx) | `综合 / 人 / 问题`, independent Q/P sections | LEGACY COMPATIBILITY; `search_app_content_v2`, five domains; V query/error | Debounce, history, hot terms, L/E/X/retry. Posts/Skills remain; Expert routes; history local and channel-scoped, not viewer-scoped. P1. |
| `/city-selector` [CitySelector](../src/pages/CitySelector.tsx) | Optional explicit city focus | PARTIAL; static location list and device localStorage | Search/no-results, recent choices, return source. “Current location” selects Shenzhen without location evidence; no null-city choice. No GPS or Discovery filter proof. P1. |
| `/question/:id` [QuestionDetail](../src/pages/QuestionDetail.tsx) | Read canonical Q, free Answers/Replies, author Person | S; canonical RPCs only; V network error | L/not-found/X/retry, close-owner confirmation, Helpful, auth handoff, Answer/Reply sheets, share/report, `/person/:id`. Closed remains readable. Populated/write states source-only. P1 reference slice. |
| `/person/:userId` [PublicPerson](../src/pages/PublicPerson.tsx) | Understand a real Person through public evidence | S; public Person + public Experience + Topic reads; V skeleton/error/invalid ID | UUID validation, independent Experience errors, deduped pagination, directed Transitions, read-only Topic chips. Self-only edit/manage. No paid/chat “success” action. Populated state unverified here. P1 reference slice. |
| `/new` [NewQuestion](../src/pages/NewQuestion.tsx) | Specific Question, one Channel, optional Topics | S; `create_question_v1`, active Topic catalog/exact resolver; V form/validation/auth return | Title/context required, 0..N Topics, budget intent only, viewer-local draft, busy/uncertain result guards. Topic fetch error does not erase draft or require Topics. Publish not performed. P1. |
| `/experience/new` [ExperienceEditor](../src/pages/ExperienceEditor.tsx) | Create authentic owner Experience | S; canonical owner create, private default; V auth redirect only | Owner required, draft scoped to viewer, dirty-exit/pending guards. New-Experience Topic UI NOT connected; do not claim otherwise. P1. |
| `/experience/:experienceId/edit` [ExperienceEditor](../src/pages/ExperienceEditor.tsx) | Edit owned Experience/visibility/Transitions/Topics | S; canonical update and separate Transition/Topic operations | Loading/missing/error/ownership guards, form validation, unsaved Topic state prevents mistaken exit/save. Separate saves need clear acknowledgement. All editor interiors source-only. P1. |
| `/profile/experiences` [MyExperiences](../src/pages/profile/MyExperiences.tsx) | Manage/reorder/delete and review public list | S; canonical owner list/write contracts | Auth, L/E/X/retry, create/edit, reorder, public/private, delete confirmation, public preview. No claim this is a discovery feed. P1. |
| `/expert/:id` [ExpertDetail](../src/pages/ExpertDetail.tsx) | Historical Expert/service detail, not canonical Person | LEGACY COMPATIBILITY | Expert ID reads, L/missing/X; consultation capabilities gated. Do not widen this route to ordinary Persons or Booking. P1 containment. |
| `/expert-profile/:id` [ExpertProfile](../src/pages/ExpertProfile.tsx) | Historical Expert profile | LEGACY COMPATIBILITY; Expert attributes/counters/skills | L/E/X; contact routes into legacy surroundings, not approved Ask-Person Conversation. Never substitute for `/person/:userId`. P1. |
| `/skill-publish` [SkillPublish](../src/pages/SkillPublish.tsx) | Existing compatibility Skill Offer form | LEGACY COMPATIBILITY / BLOCKED for canonical Service | Expert-gated skill-offer path, draft/validation/media/exit behavior; not ordinary Experience or future Service approval. Do not extend from +. P1 containment. |
| `/topic/:topicId` [TopicDetail](../src/pages/TopicDetail.tsx) | Historical discussion topic | LEGACY COMPATIBILITY; hot_topics/topic_discussions | L/missing/X, follow/likes/discussions, publishing gated. Neither canonical Topic landing nor Editorial Article. P1. |

### 3.2 Surrounding App and Self Area

| Route / source | Goal / actual implementation truth | States, actions, identity and priority |
| --- | --- | --- |
| `/discover` [Discover](../src/pages/Discover.tsx) | Social Posts surrounding the core journey; LEGACY COMPATIBILITY, not canonical Discovery. V feed error | Follow/recommend/local tabs; real legacy Post/media hooks, composer, filters, L/E/X. “经验广场” Posts are not canonical Experiences. Static suggested tags; Sonner error calls need host review. P1. |
| `/discover/interactions` [DiscoverInteractions](../src/pages/DiscoverInteractions.tsx) | Legacy Post engagement inbox | Auth + legacy likes/comments, L/E/X and navigation. No canonical reputation inference. P2. |
| `/messages` [Messages](../src/pages/Messages.tsx) | Compatibility direct messages/notifications; V dev fixture list | `get_user_conversations`, auth-aware reads, search/tabs, L/E/X; explicit development fixtures produced two synthetic rows in this audit. Not a new Conversation/Booking contract. P1. |
| `/chat/:chatId` [ChatDetail](../src/pages/ChatDetail.tsx) | Existing direct-message compatibility | Auth/participant context, messages/pending/error; requested-demo chat cannot transmit. Safe profile enrichment. No paid chat, call or service completion. Positive transport UNKNOWN here. P1. |
| `/notifications` [Notifications](../src/pages/Notifications.tsx) | Read/mark real legacy notifications | Auth, L/E/X/retry and mark-read; related object routes require identity audit. Not the Home actionable-priority queue. P1. |
| `/profile` [Profile](../src/pages/Profile.tsx) | Self-area entry; S/PARTIAL; V anonymous state | Owner-private profile, legacy stats, avatar/cover hooks, Experience entry and own public preview. Anonymous login, L/error handling; zero defaults are not evidence of successful empty reads. P1. |
| `/edit-profile` [EditProfile](../src/pages/EditProfile.tsx) | Supported narrow owner edit | S; nickname/avatar/cover/bio/city only, safe explicit returning projection. Auth, viewer-keyed editor, error/pending/exit. No mock education/work/privacy expansion. P1. |
| `/profile/answers` [MyAnswers](../src/pages/profile/MyAnswers.tsx) | Find one's contributions | LEGACY COMPATIBILITY; legacy `answers`, not canonical Answer collection; auth/L/E/X, canonical detail destination mismatch. P1. |
| `/profile/favorites` [MyFavorites](../src/pages/profile/MyFavorites.tsx) | Revisit saved items | LEGACY COMPATIBILITY; favorites + old Questions, auth/L/E/X; identity mismatch. No new canonical favorite contract inferred. P1. |
| `/profile/following` [MyFollowing](../src/pages/profile/MyFollowing.tsx) | Revisit followed Persons | LEGACY COMPATIBILITY; auth `followee_id` mapped to Expert-profile route; auth/L/E/X. Exact namespace bug is source-verified. P1. |
| `/profile/drafts` [MyDrafts](../src/pages/profile/MyDrafts.tsx), [DraftList](../src/pages/profile/DraftList.tsx) | Resume intended draft | LEGACY COMPATIBILITY; authenticated remote drafts, list/delete/open; canonical `/new` does not consume `draftId`. Local canonical draft continuity is separate. P1. |
| `/profile/orders` [MyOrders](../src/pages/profile/MyOrders.tsx), [OrderList](../src/pages/profile/OrderList.tsx) | Historical order status | LEGACY COMPATIBILITY / BLOCKED for new commerce; auth/L/E/X/status filters. Order/payment compatibility is not canonical Booking. P2 containment. |
| `/profile/earnings` [MyEarnings](../src/pages/profile/MyEarnings.tsx) | Historical points/earnings | LEGACY COMPATIBILITY; point-account/ledger reads, auth/L/E/X. Not money settlement or Person reputation. P2. |
| `/profile/recharge` [PointsRecharge](../src/pages/profile/PointsRecharge.tsx) | Historical recharge entry | BLOCKED capability; no successful payment simulation. Pricing/amount presentation is not payment authorization. P2. |
| `/profile/talent-certification` [TalentCertification](../src/pages/profile/TalentCertification.tsx) | Historical certification submission | LEGACY COMPATIBILITY; legacy verification/media path, validation/pending/error. Not canonical identity/Experience verification; do not advertise a generic badge. P1 containment. |
| `/profile/community` [MyCommunity](../src/pages/profile/MyCommunity.tsx) | Historical groups | PRESENTATION ONLY / BLOCKED outside permitted development fixture mode; no canonical Community. List/empty/unavailable states. P2. |
| `/profile/community/:groupId` [CommunityChat](../src/pages/profile/CommunityChat.tsx) | Historical group chat | PRESENTATION ONLY; development sample history, send is unavailable. No real group Conversation. P2. |
| `/profile/community/:groupId/info` [CommunityGroupDetail](../src/pages/profile/CommunityGroupDetail.tsx) | Group information/settings | PRESENTATION ONLY; route-state/sample details and local interactions, not membership governance. Unavailable/preview copy must be explicit. P2. |

### 3.3 Settings, Administration and Fallback

These routes are not globally protected by App-level auth routing. A hook's disabled query is not an authenticated page guard; controls can still render their default/presentation state. None of the account/security actions below was executed.

| Route / source | Goal / actual capability | States/actions and audit priority |
| --- | --- | --- |
| `/settings/account` [AccountSecurity](../src/pages/settings/AccountSecurity.tsx) | Account facts/security; PRESENTATION ONLY for displayed bindings/phone | Hardcoded masked phone and Apple-bound state, inert social switches, navigation links, destructive account-deletion confirmation with no deletion handler. P0 misleading security state. |
| `/settings/general` [GeneralSettings](../src/pages/settings/GeneralSettings.tsx) | Display/language preferences; PRESENTATION ONLY | Local state and acknowledgement; no application-wide theme/font/language implementation demonstrated. P1. |
| `/settings/notifications` [NotificationSettings](../src/pages/settings/NotificationSettings.tsx) | Preferences; PARTIAL legacy JSON persistence | Loading/toggles/save toast via user_settings; not proof push delivery is implemented. Error/rollback and switch labels need review. P1. |
| `/settings/privacy` [PrivacySettings](../src/pages/settings/PrivacySettings.tsx) | Privacy controls; PARTIAL persistence, canonical enforcement NOT IMPLEMENTED | V anonymous defaults and unnamed switches; optimistic local toggle, no page rollback/error state. Claims exceed approved privacy contract. P0. |
| `/settings/storage` [StorageSpace](../src/pages/settings/StorageSpace.tsx) | Device usage/cleanup; PRESENTATION ONLY | Hardcoded usage/total, cleanup acknowledgement without corresponding storage operation. No actual measurement. P1. |
| `/settings/content-preferences` [ContentPreferences](../src/pages/settings/ContentPreferences.tsx) | Preferences; PRESENTATION ONLY | Local selections do not implement Discovery personalization/Matching. No backend proof. P1. |
| `/settings/help` [HelpCenter](../src/pages/settings/HelpCenter.tsx) | Find help; S static content | FAQ search/accordion/contact presentation; review commerce/expert language. No live support service proven. P2. |
| `/settings/guidelines` [CommunityGuidelines](../src/pages/settings/CommunityGuidelines.tsx) | Read rules; S static content | Read/back; copy must agree with free public Answers and moderation, not imply enforcement from prose alone. P2. |
| `/settings/feedback` [ProductFeedback](../src/pages/settings/ProductFeedback.tsx) | Submit feedback; S legacy feedback write path | Auth/validation/pending/error; not executed. Preserve truthful submission acknowledgement. P2. |
| `/settings/about` [AboutUs](../src/pages/settings/AboutUs.tsx) | Understand product; S static content | Read/navigation; align language with real Experience/Question/Person rather than expert marketplace. P2. |
| `/settings/user-research` [UserResearch](../src/pages/settings/UserResearch.tsx) | Volunteer/research; PRESENTATION ONLY | Toast-level participation, no verified enrollment contract. P2. |
| `/settings/change-password` [ChangePassword](../src/pages/settings/ChangePassword.tsx) | Change credential; S Auth mutation path | Validation/pending/error via Supabase updateUser; no credential entered or changed. Real session/recovery verification separate. P1. |
| `/settings/phone` [PhoneSettings](../src/pages/settings/PhoneSettings.tsx) | Verified phone change; BLOCKED / placeholder | No verified phone workflow; must not restore direct profiles.phone updates. P1. |
| `/settings/account-recovery` [AccountRecovery](../src/pages/settings/AccountRecovery.tsx) | Recovery; BLOCKED / placeholder | No claimed successful recovery; current helper/toast is not account recovery security. P1. |
| `/settings/login-activity` [LoginActivity](../src/pages/settings/LoginActivity.tsx) | Inspect/revoke sessions; PRESENTATION ONLY | Static device/location rows; removal capability pending. Not real session telemetry. P0 security-data honesty. |
| `/settings/blacklist` [BlacklistSettings](../src/pages/settings/BlacklistSettings.tsx) | Control blocking; PRESENTATION ONLY | Ungated invented users; local remove toast says interactions resume. No approved blocked-Person visibility contract. P0. |
| `/admin` [AdminDashboard](../src/pages/admin/AdminDashboard.tsx) | Existing moderation/config operations | LEGACY COMPATIBILITY; admin check, hooks, loading/no-permission, reports/config/recharge controls. Not an Editorial CMS; live authorization/effects UNKNOWN and not tested. P2 containment. |
| `*` [NotFound](../src/pages/NotFound.tsx) | Recover unknown route | S not-found and return navigation; distinguish invalid route from valid-but-unavailable content. P2. |

### 3.4 Platform Inventory

[Capacitor configuration](../capacitor.config.ts) shares Web `dist` with [Android](../apps/android) and [iOS](../apps/ios/README.md). It does not create native parity automatically. [EC-2F Android evidence](ec2f-android-native-verification.md) is dated 2026-09-14 against `aa7d175...`: Pixel 7 AVD/API 36, isolated fixtures, Question/Person Back, safe-area, IME and lifecycle subsets. It is historical emulator evidence, not current handset QA or current Topic/Experience acceptance. iOS shell exists; current real-device keyboard/safe-area QA is **NOT VISUALLY VERIFIED**.

[WeChat app.json](../apps/wechat-miniprogram/app.json) declares the following independent pages. All are **SOURCE ONLY** in UX-0, with no DevTools or real device run. [README](../apps/wechat-miniprogram/README.md), [runtime policy](../apps/wechat-miniprogram/config/client.js) and [request adapter](../apps/wechat-miniprogram/utils/request.js) separate development mock mode from trial/release fail-closed legacy access. Four tab roots plus custom center create entry are not five canonical journeys.

| WeChat page (`apps/wechat-miniprogram/pages/.../index.js`) | Goal / actual scope / main gap |
| --- | --- |
| [home](../apps/wechat-miniprogram/pages/home/index.js) | Home presentation/legacy adapter; target canonical discovery NOT IMPLEMENTED. P1. |
| [search](../apps/wechat-miniprogram/pages/search/index.js) | Legacy/mock search; canonical three-tab/evidence runtime absent. P1. |
| [ask](../apps/wechat-miniprogram/pages/ask/index.js) | Local `ab_question_draft_v1`, title/context; publish explicitly unavailable. Draft key not viewer-scoped; no canonical Topic picker. P1. |
| [discover](../apps/wechat-miniprogram/pages/discover/index.js) | Development presentation social feed, not canonical Experiences/discovery. P2. |
| [messages](../apps/wechat-miniprogram/pages/messages/index.js) | Development presentation/compatibility inbox; no canonical Conversation approval. P1. |
| [profile](../apps/wechat-miniprogram/pages/profile/index.js) | Auth/self shell; cannot substitute for canonical Public Person/owner Experience. P1. |
| [question-detail](../apps/wechat-miniprogram/pages/question-detail/index.js) | Legacy/mock Question rendering, not canonical free Answer/Reply end-to-end. P1. |
| [channel](../apps/wechat-miniprogram/pages/channel/index.js) | Channel navigation/legacy data, not activated Discovery. P1. |
| [topic-detail](../apps/wechat-miniprogram/pages/topic-detail/index.js) | Legacy topic, not canonical Topic/Editorial. P2. |
| [city-selector](../apps/wechat-miniprogram/pages/city-selector/index.js) | Local city selection; not verified location or matching. P2. |
| [expert-detail](../apps/wechat-miniprogram/pages/expert-detail/index.js) | Expert-oriented presentation, not ordinary Person identity. P1. |
| [skill-publish](../apps/wechat-miniprogram/pages/skill-publish/index.js) | Skill presentation, not newly approved Service. P2. |
| [chat-detail](../apps/wechat-miniprogram/pages/chat-detail/index.js) | Chat shell, not genuine canonical Conversation/paid exchange. P1. |
| [profile-section](../apps/wechat-miniprogram/pages/profile-section/index.js) | Multiplexed legacy self-area presentation; each section needs data-honesty acceptance. P2. |
| [post-editor](../apps/wechat-miniprogram/pages/post-editor/index.js) | Post editing/presentation, not Experience owner editor. P2. |
| [discover-interactions](../apps/wechat-miniprogram/pages/discover-interactions/index.js) | Social interaction presentation; not canonical reputation. P2. |
| [call](../apps/wechat-miniprogram/pages/call/index.js) | Explicit unavailable Call transport; visual states development-only, actions show blocker. No call simulation performed. P2 containment. |

There are no canonical Person or Experience routes in this WeChat page registry. [WeChat Auth history](wechat-auth-v1.md) is not new UX-0 Auth verification and is not genuine D1B Supabase-issued-session evidence. Do not alter its custom JWT/session behavior in a UI consistency slice.

## 4. Frontend, Data and Runtime Truth

| Module evidence | Current implementation | Approved boundary / follow-up |
| --- | --- | --- |
| [useQuestions](../src/hooks/useQuestions.ts), [QuestionCard](../src/components/QuestionCard.tsx), [Index](../src/pages/Index.tsx) | Legacy list/adapters; detail links use ID directly | No canonical feed completeness, visibility or ID equivalence established by this audit. Needs independently approved Discovery cutover, not legacy fallback in canonical details. |
| [useSearch](../src/hooks/useSearch.ts), [SearchResultTabs](../src/components/search/SearchResultTabs.tsx), [SearchResultItems](../src/components/search/SearchResultItems.tsx) | V2 Question/Expert/Post/Skill; production legacy fallback disabled; optional nonproduction fallback skips obsolete `search_app_content` and uses safe direct enrichment | Preserve privacy cutover; no profiles.id/phone/is_expert/is_verified grants for compatibility. Search history/device retention requires policy; public query cache is not automatically a proven private leak. |
| [useQuestionAnswerV1](../src/hooks/useQuestionAnswerV1.ts), [QuestionTopicPicker](../src/components/question/QuestionTopicPicker.tsx), [questionForm](../src/components/question/questionForm.ts) | Canonical parsing, viewer-keyed caches, auth transitions and form drafts; real active exact Topics | No AI inference, new Topic creation, Question Edit picker or Question Detail Topic display. Empty selection valid. Public closed Q remains readable; hidden/deleted fail canonical reads. |
| [usePersonExperiences](../src/features/experience/usePersonExperiences.ts), [experienceApi](../src/features/experience/experienceApi.ts), [PersonExperienceCard](../src/components/experience/PersonExperienceCard.tsx) | Owner CRUD/reorder/visibility; public Experience/Transition list | Preserve real values, owner isolation and privacy. Do not expose Claim, private Experience or invented expertise as public evidence. |
| [ExperienceTopicManager](../src/components/experience/ExperienceTopicManager.tsx), [PublicExperienceTopics](../src/components/experience/PublicExperienceTopics.tsx), [publicTopicQuery](../src/features/experience/topics/publicTopicQuery.ts) | Existing-owner edit only; read-only public chips; lazy near-viewport work and bounded three-query scheduler | Do not expand to create flow in a styling PR. Historical deprecated associations displayed with their documented status, not rewritten. Chips are not legacy topic-detail links. |
| [AuthContext](../src/contexts/AuthContext.tsx), [useProfile](../src/hooks/useProfile.ts) | Owner-private RPC, explicit safe update return; database-controlled system fields | The global profile async race is separate from DB grants. Need epoch/cancellation acceptance, not wider SELECT or fake session state. |
| [useProfileData](../src/hooks/useProfileData.ts), [DraftList](../src/pages/profile/DraftList.tsx) | User-keyed legacy counters/collections, points and drafts | Canonical Answer contribution count and draft migration are not available merely because collections exist. |
| [useUserSettings](../src/hooks/useUserSettings.ts), settings pages | Some preference JSON persists; many controls only change component state | JSON persistence is not privacy enforcement, notification delivery, logout revocation, device measurement or personalized ranking. |
| [runtimeModeCore](../src/config/runtimeModeCore.ts), [runtimeMode](../src/config/runtimeMode.ts), [runtime governance](runtime-mode-governance.md) | Development fixtures require explicit opt-in; staging/production forbid them; unknown environment fails closed | Preserve all runtime policies. Ungated hardcoded settings content is a separately identified coverage gap, not permission to enable fallback. |
| [call feature](../src/features/call), [page map](../packages/shared-api/src/page-contract-map.ts) | Compatibility modules and blocked product surfaces coexist | No canonical Conversation/Booking/Payment/RTC activation. “问问TA” must lead to a real Person or explicitly unavailable next step, never invented success. |

`Discovery.productionDeployed`, `clientConsumable`, `implementationStarted` and `rpcNamesFrozen` remain **false**. The flags describe activated runtime; isolated D1A/B implementation is not denied. No active consumer, endpoint, RPC whitelist or backend capability changed.

## 5. Journey Audit

| Journey | Working steps | Gaps, dead ends and semantic conflicts | Proposed acceptance |
| --- | --- | --- | --- |
| J1 Discover Q -> Detail -> Answer -> Author | Canonical direct detail/read/Answer/Reply/Helpful and `/person/:authorPersonId` source-wired; real error states V | Acquisition feeds use legacy IDs. No populated canonical path verified here. Person view does not authorize Conversation. | Isolated approved canonical Q/visible Answer/ordinary Person path plus cold link/back/closed/hidden cases; legacy ID must never be misrepresented. |
| J2 Create Q -> Channel -> Topics -> Publish -> Q | Actual form, four channels, optional exact active Topics, nullable intent budget; anonymous handoff/back retains local draft V | Successful publish, owner identity and real Topic selection not tested. Catalog error wording is truthful and optional Topics remain optional. | Real isolated create success/error/uncertain result, zero/many Topics, inactive rejection, draft across auth and account switching; no duplicate publish or bounty semantics. |
| J3 Person -> public Experience -> Transitions/evidence | Safe projection, public cards, directed path, Topic chips, paginated independent states S; loading/error/invalid ID V | No populated authorized local fixture in current preview; no relevance score or general profile-visibility contract. | Public/private/deleted/cross-owner cases; expand long description/Transition; Topic failure does not hide real Experience. |
| J4 Owner Experience -> visibility/save -> public review | Owner list/editor/dirty guard/reorder/delete/private default/public link S | Topic linking only after creation on existing-owner edit; multiple save boundaries can be unclear. Auth redirect V, editor interior source-only. | Separately verified create/edit/public/private/reorder/delete and transition/topic saves; no premature success; public review excludes private evidence. |
| J5 Home -> modes -> Channels | Layout, default Q mode, four catalog channels, navigation and failure states V | Expert evidence, old Qs, legacy hot_topics, non-actionable Bell, non-null default city; D1C closed. | Target presentation prototype only until runtime approvals; no fixtures outside explicit dev; published Editorial absent means entire module absent. |
| J6 Search -> All/Person/Q -> correct route | V2 request path, query/error/retry UI, Channel redirect S/V | Five legacy domains, Expert identity, legacy Q route, local search-history carryover. No canonical independent-ranking contract consumed. | Three target tabs, independent sections and explicit gated states; backend integration separately approved, no score merge or standalone Experience/Post results. |
| J7 Auth/drafts/switch/return | Viewer-scoped canonical Q/Experience hooks and local drafts; from-state helpers; anonymous Q handoff/back V | Global AuthContext late completion risk; legacy/WeChat local drafts differ; real switch/logout not tested. Some settings render while anonymous. | Delay A reads past B/logout; no stale private state, no draft overwrite, correct return route, canceled responses do not clear new viewer state. |
| J8 Discover/Messages/Profile/Settings | Five-slot shell, real error states, social compatibility hooks, narrow EditProfile and Experience entry S; anonymous Profile/fixture Messages V | Posts called “experience”, legacy counts/drafts, static security data, inconsistent feedback and missing canonical Conversation. | Honest capability labels and disabled/unavailable states; scope legacy navigation explicitly; no fabricated enrollment/payment/chat/security outcome. |

## 6. Design System and Visual Audit

Reuse, do not replace: [index.css](../src/index.css), [App.css](../src/App.css), [UI 2.0](../src/components/ui2), [SubPageHeader](../src/components/layout/SubPageHeader.tsx), [PageStateCard](../src/components/common/PageStateCard.tsx), [BottomNav](../src/components/BottomNav.tsx), [Radix Sheet](../src/components/ui/sheet.tsx), [Dialog](../src/components/ui/dialog.tsx), [navigation](../src/utils/navigation.ts) and [scroll memory](../src/hooks/usePageScrollMemory.ts).

| Dimension | Existing useful foundation | Observed/source conflict and next verification |
| --- | --- | --- |
| Color | Mint brand, darker action teal, neutral page/text/border tokens | Legacy white-on-mint headers/icons differ from dark canonical content headers; visually weak contrast in Privacy/Discover. Measure text/icon/focus contrast before approving palettes. |
| Typography | Shared font stack, heading/body utilities and Chinese content already used | 10px bottom labels/11px metadata and inconsistent heading weights; Auth/old help copy uses broader “intelligent Q&A” framing. Test Chinese fallback, large text and unbroken links. No font redesign assumed. |
| Density/cards | UI2 surfaces, feed spacing, reusable SectionHeader/Experience tags | Rounded 2xl/3xl cards, large marketing panels and nested surfaces compete with actionable content; Channel banner and Discover introduction dominate first viewport. Tighten selectively, not globally. |
| Images/avatars | Avatar fallback; owner media upload and public safe URLs | Test missing/slow image, ordinary Person without avatar and long names. Generic `VerificationBadge` defaults must not become invented canonical certification. |
| States | PageStateCard, skeletons, explicit canonical missing/error/no fixture fallback | Legacy stats default to 0; settings default values can look authoritative. Empty requires successful zero results, not failed fetch. `question-loading-390.jpg` actually captured error, not loading. |
| Forms | Real Q validation, free-answer explanation, Topic errors, dirty guards | Optional budget hierarchy and separate Experience Topic/Transition saves need comprehension review. Long context wraps at 320px; single-line title naturally scrolls, not a multiline title proof. |
| Dialogs/layers | Radix focus management and dismiss primitives | V: Home fixed `z-[90]` header above `z-50` Sheet overlay. Header must be occluded/inert while dialog active; test focus, Escape, backdrop, scroll lock and native Back. |
| Navigation | Five slots, center +, selected state, return helpers, page scroll memory | Two combined create choices vs three intents; old Expert/Q destinations; browser-back handoff worked but does not prove all return paths or native Back. |
| Keyboard/accessibility | Semantic buttons/radios in canonical form, Radix primitives | AX shows unnamed Auth icon buttons and Privacy switches; click-only div rows and custom Home tabs need keyboard review. No screen-reader conformance claimed. Proposed minimum 44 CSS px action targets, visible focus and semantic labels. |
| Mobile/safe area | `env(safe-area-inset-*)`, `100dvh`, native handling, Web max-width shell | CSS viewport is not real IME/gesture-inset testing. Body `overflow-x:hidden` can hide a layout defect; inspect actual bounds rather than assuming no scroll means no clipping. |
| Motion/theme | Existing loading/transition animations and light tokens | No complete dark theme or reduced-motion policy established; GeneralSettings dark toggle is not evidence of dark-mode support. Do not promise dark mode until separately approved/tested. |
| Feedback | Shared toast host plus mutation errors | Discover imports Sonner while App mounts the Radix-style toaster, with no mounted Sonner found. Source-level missing-feedback risk, not a verified failed publication. Reconcile feedback hosts in a narrow future slice. |

**Visual reference proposal (UX-1, not produced as a new implementation here):** Home shell with default Question/Person modes and truthful gated data states; canonical Question Detail with free Answers and clear Person navigation; Public Person with real public Experience/Transitions and no invented reputation. Review the same components at 320/375/390/430, plus one wider breakpoint, before generalizing tokens. PO must approve hierarchy, density, copy, create-intent treatment, empty/gated states and which legacy modules are hidden. A mock reference must be unmistakably labelled, never a real-data fallback.

## 7. Local Inspection Environment and Limits

Source checked out at the exact baseline in the existing clean managed worktree; original workspace's unrelated `supabase/.temp/cli-latest` modification was not touched. No implementation files changed.

Local Vite development preview on `127.0.0.1:4180`; `VITE_PRESENTATION_FIXTURES=true` explicitly enabled only for the existing permitted development fixture path. Supabase URL overridden in the process to closed loopback `http://127.0.0.1:9` with a non-secret placeholder publishable key. No new fixture transport, arbitrary session injection or Production endpoint. The separate `npm run build` uses production mode and is not a deployment.

Browser: Codex in-app desktop Chromium surface with CSS viewport overrides. All interactions anonymous. Synthetic Q/Person UUID URLs and a Chinese audit draft were local-only; nothing published. Click Publish on an anonymous valid draft only entered the actual Auth page; no credentials entered. Browser Back restored draft/channel. Search input was synthetic. No privacy switch, payment, call, account binding, upload or destructive action was executed.

This proves source rendering, selected navigation and deterministic network-failure handling. It does **not** prove valid-empty backend results, genuine Auth, database permissions, real publication, canonical populated cards, screen-reader behavior, real touch/IME, Android/iOS hardware or WeChat QA. Public external presentation images, if loaded by existing components, are not API evidence.

## 8. Screenshot Manifest

Local evidence directory: `/private/tmp/askbuddy-ux0-evidence-20261016/`. JPEG screenshots are deliberately outside Git; this PR changes only the audit document. They are local review artifacts, not durable CI artifacts. Preserve/export them separately before temporary-directory cleanup if PO requires long-term visual evidence. Route paths below are hash routes under the local origin.

Dimensions below are the configured CSS viewports, not a claim of one-to-one screenshot pixels. The capture backend emitted narrower rasters on some scrollable pages. Additional viewport captures `home-viewport-320.jpg`, `home-viewport-375.jpg`, `home-viewport-390.jpg`, `home-viewport-430.jpg` have actual file dimensions 305x763, 360x780, 375x812 and 415x899 respectively; full-page captures also vary in height/width. They show the selected Question mode and retained page scroll position, not four fresh default launches. No screenshot resizing or image editing was performed by the audit. Treat these as browser layout evidence, not physical-device pixel measurements.

| Files | Viewport / route | Exactly what was observed |
| --- | --- | --- |
| `home-questions-320.jpg`, `home-questions-375.jpg` | 320x800, 375x812; `/` | Default Q mode; feed error, four channels, bottom nav; **synthetic development hot_topics**, not published Editorial. |
| `home-persons-390.jpg`, `home-persons-430.jpg` | 390x844, 430x932; `/` | Selected Person mode and fetch failure; no genuine Person candidates. |
| `create-sheet-430.jpg` | 430x932; `/` | Combined Experience/Skill choice, foreground sheet, header incorrectly above overlay. |
| `new-question-390.jpg` | 390x844; `/new` | Real empty form and disabled publish; optional Topic catalog error, not synthetic catalog. |
| `new-question-long-320.jpg` | 320x800; `/new` | Synthetic draft long Chinese context wraps; selected Channel, optional Topic error, valid enabled anonymous handoff. |
| `auth-handoff-320.jpg`, `draft-restored-320.jpg` | 320x800; `/auth` then `/new` | Actual handoff/back and retained local text/channel; not successful login or server draft. |
| `question-error-390.jpg` | 390x844; `/question/00000000-0000-4000-8000-000000000001` | Real network error, retry/back. No fabricated Question. Earlier `question-loading-390.jpg` is also an error capture despite its filename; excluded as loading evidence. |
| `person-loading-390.jpg`, `person-error-390.jpg` | 390x844; `/person/00000000-0000-4000-8000-000000000002` | Skeleton then independent request failure. No populated real Person/Experience. |
| `person-invalid-390.jpg` | 390x844; `/person/invalid-person` | Invalid identity state without claiming backend not-found. |
| `experience-auth-required-430.jpg` | 430x932; `/experience/new` -> `/auth` | Required auth redirect only; editor interior NOT VISUALLY VERIFIED. |
| `search-initial-375.jpg`, `search-query-375.jpg`, `search-error-375.jpg` | 375x812; `/search` | Route-loading, query skeleton and final error respectively. Development popular keywords were observed in the accessibility tree between captures, not established by the initial screenshot. No successful canonical search. |
| `channel-error-430.jpg` | 430x932; `/education` | Static feature/subfilter shell, distinct modes, real feed error/retry. Early `channel-loading-430.jpg` is not used to assert a precise loading duration. |
| `discover-error-390.jpg` | 390x844; `/discover` | Social shell and static tag suggestions, real failed feed; not a successful empty feed. |
| `profile-anon-390.jpg` | 390x844; `/profile` | Anonymous call to login, self-area entry/navigation; zeros are anonymous presentation, not real user statistics. |
| `messages-anon-390.jpg` | 390x844; `/messages` | Two explicitly enabled **development synthetic conversation fixtures**. Not authentic conversations or successful message transport. |
| `privacy-anon-390.jpg` | 390x844; `/settings/privacy` | Anonymous default toggles and strong privacy claims; no preference mutation or enforcement test. |

This is a representative width/state matrix, **not every page at every width**. Populated canonical preview, successful-empty canonical list, authenticated Experience Editor, disabled-owner mutation states, long public Experience and real keyboard modes remain NOT VISUALLY VERIFIED. No screenshots establish real-device QA.

## 9. Ranked Backlog and Risks

| ID / priority | Risk or required change proposal | Evidence / blocker | Acceptance before closing |
| --- | --- | --- | --- |
| UX-P01 / P0 | Unsupported privacy/blocking claims can cause users to rely on nonexistent restrictions | Source + anonymous Privacy V; enforcement absent from canonical contract | Explicitly unavailable/removed controls and no fake users/outcomes, or a separately approved real contract. Never invent private/friends-only semantics in this PR. |
| UX-P02 / P0 | Late Auth profile response can violate current-viewer display isolation | Source race; NOT reproduced with genuine sessions | Deterministic delayed A -> B -> anon success/error tests; profile identity never mismatches active user; no reopening database permissions. |
| UX-P03 / P0 | Hardcoded security account/session facts look real | Source AccountSecurity/Blacklist/LoginActivity | Real approved facts only, otherwise explicit unavailable presentation; no simulated deletion/binding/revocation success. |
| UX-P04 / P1 | Legacy Question IDs target canonical detail | Source Home/Channel/Search/self lists | Contract-aware navigation and explicit unavailable legacy path; backend feed replacement separately gated. No privileged hydration. |
| UX-P05 / P1 | Expert identity/evidence substituted for Person | Source search/cards; exact MyFollowing mismatch | `/person/:userId` only with real Person identity; ordinary non-expert case; discovery evidence requires real public Experience or permitted Answer. |
| UX-P06 / P1 | Discovery/Editorial/City/Bell display outruns backend | Source + Home/Channel V | Target-state contract review, optional city honestly chosen, no fake location, published-only Editorial or hidden module; no active target endpoint. |
| UX-P07 / P1 | Draft continuity and state ownership inconsistent | Q local vs remote drafts vs WeChat device key | Viewer-safe retention, no overwrite or cross-account disclosure; clearly distinguish unsupported legacy drafts. |
| UX-P08 / P1 | Overlay, label, touch/contrast and feedback inconsistency | V overlay/AX; source toast/theme | Focus/stacking/labels measured; reference slice approves real error/empty/pending states before reuse. |
| UX-P09 / P1 | Current native/auth/populated positive path evidence missing | This task intentionally lacks genuine backend/session/device access | Separately approved isolated fixture/QA plan, per-platform evidence and residual limits; never reuse dated snapshots as current PASS. |
| UX-P10 / P2 | Copy, surrounding settings, help and capability entry points drift | Source inventories | Consistent product language and truthful capability states; retain compatibility boundaries or explicitly retire them with PO. |

Additional dependencies: D1C hosting/Auth/storage/security/load gates remain separate; Person/Search discovery is not supplied by D1 local Question code. Historical dependency vulnerabilities remain security backlog in D1C documents, not remediated by UX-0. Repository/static tests do not prove live RLS, privacy settings or realtime delivery. No actual service health or current business cardinalities were read.

## 10. Proposed Independently Reviewable Slices

All slices are **PROPOSED / NOT AUTHORIZED**. Complexity is relative scope, not a delivery date. P0 safety follow-ups can precede the numbered visual sequence with explicit PO approval. Each PR should have one reviewable outcome; never bundle backend deployment with client activation.

| Slice / modules | User-visible outcome and reuse | Forbidden dependencies / checkpoint | Acceptance, checks, rollback, complexity and blockers |
| --- | --- | --- | --- |
| UX-1A: `src/index.css`, `App.css`, `components/ui2/*`, `layout/SubPageHeader.tsx`, `common/PageStateCard.tsx`, `BottomNav.tsx`, `ui/sheet.tsx` | Approve Home/Q Detail/Person reference states using existing mint/action/neutral tokens; correct overlay hierarchy, labels and state language | No wholesale redesign, invented data, new APIs or generic verified badge. PO approves density, contrast, state cards, + intents before implementation | 320/375/390/430 + desktop; keyboard/focus/sheet/long text; contracts, typecheck, privacy/runtime/fixture/write guards, affected UI guards/build. Revert only presentation PR; medium, needs visual approval. |
| UX-1B: same component family, `components/question/*`, `components/experience/PersonExperienceCard.tsx` | Apply approved hierarchy to three reference surfaces, not every page | No ranking/evidence changes or new fixture fallback; review screenshots before expanding | Same visual matrix plus missing-avatar/pending/error; component-local rollback; medium, depends UX-1A and authorized isolated populated fixtures. |
| UX-2A: `contexts/AuthContext.tsx`, `hooks/useQuestionAnswerV1.ts`, `features/experience/experienceCache.ts`, `utils/navigation.ts` | Viewer-safe self/profile and return continuity; retain existing canonical adapters | No Auth redesign, WeChat changes, private grant expansion or account creation. Security review of epoch/race handling separate from visual approval | Delayed A/B/anon success and error, logout, draft retention, no data reuse; existing EC-1/EC-2/privacy tests plus focused race tests. Revert narrow consumer-state change; medium/high due isolation risk. |
| UX-2B: `NewQuestion.tsx`, `QuestionDetail.tsx`, `PublicPerson.tsx`, `ExperienceEditor.tsx`, `profile/MyExperiences.tsx`, existing Topic/Transition components | Clear next steps, independent save acknowledgements, public review and truthful unavailable paths; reuse deployed Q/Person/Experience/Topic contracts | No new Topic-on-create feature, Question Edit, fabricated evidence, service/chat CTA or canonical favorites API. PO approves cross-save wording | Real isolated owner/non-owner/private/deleted/closed/topic-error tests, forms/dirty exits/return; existing Q UI, PersonExperience, owner/public Topic tests. Page-level rollback; medium, authenticated isolated QA required. |
| UX-2C: `profile/MyFollowing.tsx`, `hooks/useProfileData.ts`, `profile/MyAnswers.tsx`, `MyFavorites.tsx`, `DraftList.tsx` | Correct known identity navigation; make unsupported legacy collections/drafts honest | No guessed ID conversion, fake canonical totals or silent draft migration. PO chooses containment vs deferred backend dependency | Auth user ID -> Person; no Expert requirement; known legacy Question ID cannot masquerade as canonical; draft ownership retained. Route tests + guards; narrow PRs, medium. |
| UX-3A: `Index.tsx`, `components/home/*`, `components/channel/*`, four Channel pages, `SearchResults.tsx`, `components/search/*`, `CitySelector.tsx` | Review target Home/Channel/Search presentation with explicit runtime gating; separate Q/P, three search tabs, truthful city/Bell/Editorial absence | No active D1/D2/Search RPC, whitelist or flag change; no mixed score, hot_topics-as-Article, Post/Service results or Person from label alone. PO approves hidden/gated legacy modules | Isolated labelled reference only; production/staging never mock. Discovery/Blueprint/channel/Home/Search/runtime/fixture guards, visual matrix. Revert presentation shell; high semantic coordination, backend remains blocked. |
| UX-3B: future consumer cutover, exact modules depend on approved endpoints | Genuine canonical retrieval only after separate backend and client approvals | NOT authorized by UX-0 or UX-3A; no D1C auto-start | Stable cursor/viewer/filter/visibility integration, independent Q/P ranking; deployment approval and rollback plan from backend owner. High, BLOCKED. |
| UX-4A: `settings/PrivacySettings.tsx`, `BlacklistSettings.tsx`, `AccountSecurity.tsx`, `LoginActivity.tsx`, `StorageSpace.tsx`, `hooks/useUserSettings.ts` | Remove unsupported assurances/facts; distinguish saved preference from enforced capability | No new privacy policy, session backend, phone flow or fake success. PO explicitly approves unavailable/hidden surfaces | Anonymous/auth/error states, no fabricated security records, labelled switches, rejected writes do not look saved; privacy/production-write/fixture tests. Page-local rollback cannot restore misleading claims; medium, P0 review first. |
| UX-4B: `Discover.tsx`, `Messages.tsx`, `ChatDetail.tsx`, `Profile.tsx`, `settings/*`, toast host | Consistent surrounding shell, reliable failure feedback, clear Post vs Experience and compatibility messaging | No canonical Conversation, Booking, Payment, Service, RTC or Matching; no new dependency merely for styling | Existing legacy boundaries/auth gates + unavailable/pending/error tests, correct toast host, keyboard and return. Small page-family PRs; medium. |
| UX-5: `apps/android`, `apps/ios`, `apps/wechat-miniprogram` plus shared safe-area/navigation adapters only as approved | Evidence-backed IME/back/focus/rotation/safe-area/lifecycle behavior | No porting canonical flows to WeChat without separate contract task; no new native permissions or Auth resources | Current Android emulator + real device if authorized, iOS keyboard/device, WeChat DevTools/device; all evidence labelled by build/data mode. Native changes independently reversible; high environment dependency. |
| UX-6: acceptance records, existing frontend checks and narrowly approved truth docs | Traceable readiness matrix, not automatic release | No broad guard weakening, runtime activation or deployment | Re-run affected and full required gates, every P0 closed with evidence, full journey matrix, independent PO/security/platform review; docs/test-only rollback; medium, depends prior slices. |

## 11. Objective Acceptance and Release Gates

| Acceptance area | Proposed measurable evidence |
| --- | --- |
| Purpose and next step | PO reviews three reference screens and a scripted first-use walkthrough: user can distinguish asking, contributing Experience and viewing a Person; no Expert/paid-answer prerequisite. Record observed comprehension, not invented user research. |
| Honest actions | Every visible CTA resolves to supported navigation/action or an explicit unavailable state; success follows confirmed supported effect, not a toast alone. No fake reputation, security record, payment or publication. |
| Identity and privacy | All canonical links carry the correct identity; isolated A/B/anon late-response tests show no cross-viewer state/drafts; public cards have only approved data and evidence. |
| Canonical journeys | J1-J4 positive/negative isolated tests cover private/deleted/hidden/closed/missing/failed requests and correct author/owner; no new backend dependencies hidden in UI work. |
| Discovery honesty | Distinct Q/P modes/rankings, Q first, four Channels, real published Editorial or hidden module. Target presentation does not enable runtime. |
| Visual consistency | Approved tokens/hierarchy/spacing on reference slice; 320/375/390/430 and wider layout; long Chinese, missing images, error/empty/loading/disabled/pending; no clipped essential action. |
| Interaction/accessibility | Keyboard-operable controls, accessible names, visible focus, modal focus/stacking/return, reviewed contrast and target sizes; no claim of assistive-tech compliance without testing it. |
| Mobile | IME, safe areas, system Back, scroll restoration, background/foreground and orientation measured on named platforms/builds. CSS emulation is labelled separately. |
| Regression and capability | Required contracts/typecheck/lint/runtime/privacy/write/fixture/build gates pass; frozen flags unchanged unless a separate activation authorization exists. |

Separate statuses, never implication chains:

| Status | UX-0 result |
| --- | --- |
| DESIGN REVIEW COMPLETE | NO; audit/reference direction proposed, PO visual decisions pending. |
| FRONTEND IMPLEMENTATION COMPLETE | NO new implementation authorized; selected existing canonical surfaces SOURCE VERIFIED, surrounding gaps remain. |
| LOCAL INTERACTION VERIFIED | PARTIAL; anonymous browser scope in screenshot matrix only. |
| REAL BACKEND INTEGRATION VERIFIED | NOT REPEATED; dated approved evidence retained, no live connection in UX-0. |
| PRODUCTION RELEASE READY | NO decision granted by this audit. |

## 12. Product Owner Decisions Required

1. Approve immediate containment of unsupported privacy, blacklist and account-state assurances, without inventing a new visibility contract.
2. Authorize an isolated AuthContext late-response reproduction/fix slice; decide whether it blocks all broader client rollout pending security review.
3. Approve the Home/Question/Person visual reference direction using existing tokens, with a measurable accessibility/state baseline rather than a wholesale redesign.
4. Decide how legacy acquisition/self-area links are visibly contained while canonical Discovery and collection contracts remain unavailable. No ID guessing or detail fallback.
5. Resolve two combined create choices versus three labelled intents. Keep Skill unavailable unless separately authorized; Experience must not imply Service.
6. Approve hiding legacy “问问热榜” from the target Home and showing no Editorial module until real published content exists; decide interim Bell/city copy without inventing action queue/location behavior.
7. Authorize a strictly isolated, clearly labelled canonical populated/owner fixture harness and current Android/iOS/WeChat QA evidence scope. No Production sessions or writes by implication.
8. Assign frontend, security, platform and backend review owners for the proposed slices; D1C deployment and client activation remain independent decisions.

## 13. Verification and Closeout Boundary

Executed locally on the audit baseline; no Docker/Postgres integration, Production query, real Auth, business mutation or infrastructure command:

| Check | Result / scope |
| --- | --- |
| Remote main and ancestry | Exact approved `97b418ddffa6202fedaebdc0fdc25c1afcdba159`; fresh branch from that commit. |
| `npm run test:contracts` | PASS, complete aggregator including offline Discovery transport/security. Static schema checks are not database integration. |
| `npm run typecheck` | PASS. |
| `npm run typecheck:baseline` | PASS, 0 diagnostics and no baseline growth. |
| `npm run lint:changed` | PASS; documentation-only change, no changed Core/shared TypeScript to lint. Not a claim that whole-repository legacy lint is clean. |
| `npm run test:runtime-mode` | PASS; development/staging/production, unknown mode fails closed. |
| `npm run test:profile-privacy` | PASS; 17 explicit safe client projections, owner parser, Search boundary. Does not test the AuthContext async race or implement visibility settings. |
| `npm run test:production-writes` | PASS. |
| `npm run build` | PASS; 2,774 modules. Existing 24-month-old Browserslist data warning retained; no dependency upgrade. |
| Documentation link/inventory/scope checks; `git diff --check` | PASS: all 141 local Markdown links resolve, all 55 declared Web routes covered; one new Markdown document only. No source, lockfile, migration, runtime flag or configuration changes. |

UX-0 AUDIT: completed for source and bounded local preview, with explicit gaps above. UX-1 IMPLEMENTATION: PENDING PO. D1C DEPLOYMENT: NO-GO. PRODUCTION ACCESS/MUTATION: NO. CLIENT ACTIVATION: NO. Draft PR only; do not merge or continue implementation automatically.
