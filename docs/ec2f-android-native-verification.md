# EC-2F Android Native Verification

Architecture owner: D - Android Native. Codex workstream: Codex C.
Verified 2026-09-14 against main `aa7d17549d100b32ef7cd70e44b2c1886f8a8040`.
Branch: `codex-c/ec2f-android-native-verification`. Draft PR only; do not merge without review.

## Recovery And Traceability

- Fresh stable worktree: `~/askbuddy-worktrees/ec2f-android-native-verification`.
- Existing branch ref matched the approved baseline; initial fresh checkout was clean.
- Old broken `/private/tmp/askbuddy-ec2f-android-native-verification` was neither repaired nor deleted. No stale worktree metadata was pruned.
- All evidence present at recovery start was retained and copied to `~/askbuddy-worktrees/ec2f-evidence-20260913/historical/`.
- The old MainActivity was preserved as a read-only `recovery-MainActivity-before-rebuild.java`. Reconstruction matches it byte-for-byte; remaining old source contained no third modification.
- MainActivity SHA256: `6cc1672671805968e83f28c9cca1369961b3605496d149f9797c569056cd4129`.
- Fresh chain: locked dependencies -> current Shared Core build -> isolated development build -> Capacitor sync -> Gradle -> new APK -> install -> cold launch -> device QA.
- Verified fresh QA APK SHA256: `eb363e7d9bd3fe8edb7884726d4655fc43d31ce9ddf1bed7cac7c048704a2369`.
- QA APK and source patch/hash records are under the stable evidence root; the historical orphan APK was not used for acceptance.

## Environment And Isolation

Pixel 7 AVD `AskBuddy_EC2F_API36`, Android 16/API 36, arm64, gesture navigation (`navigation_mode=2`), adb `emulator-5554`, 1080x2400 at DPR 2.625. Android Studio 2026.1; JDK 21.0.12; Gradle 8.14.3; AGP 8.13.0. No toolchain upgrade.

All runtime data is **LOCAL ISOLATED QA**, not production backend evidence. Restored external ADB/CDP helpers use the existing canonical synthetic DTOs, fulfill reads/session locally at `ec2f.invalid`, block external HTTP requests and business mutation RPCs, and are not committed. No real credentials are used. Unmodeled realtime targets also use the reserved invalid domain.

For this native-only re-verification, Home -> empty New Question establishes history idx 1; a local route bootstrap replaces that entry with the existing synthetic Question. No publish/answer/reply/helpful operation is submitted. Subsequent modal, Person navigation, and Back actions use the actual Shared Core UI and Android key events. Business writes, auth-return business correctness, and multi-viewer cache semantics are not re-proven by this platform test.

## Three Blockers

1. Question bottom safe area: fixed in Shared Core by PR #45, not changed here. API 36 verification: Capacitor bottom variable 24 CSS px, env bottom 0, computed padding 36, CTA bottom 2307.5 physical px versus gesture-region start 2337. No overlap; clearance 29.5 physical px. The fresh APK retains the same CTA position/padding.
2. AlertDialog Back: MainActivity previously recognized only `role=dialog`. The selector now also recognizes open `role=alertdialog`, preserving Escape dispatch and consuming Back before history navigation. Fresh device test closes confirmation while Question route and idx 1 remain unchanged.
3. Rapid Back reentrancy: in-flight `handlingWebBack` previously fell through to Android default Back. It now returns early, coalescing overlapping presses. Missing bridge/WebView still falls back normally. No queue, timer, counter, new bridge, or other navigation architecture was added.

## Device Matrix

| Check | Result / Evidence |
| --- | --- |
| Fresh APK build/install/cold launch | PASS; all 102 initial Gradle tasks executed; MainActivity PID 7129 |
| App launch and Question render | PASS; bundled Core App, no white screen |
| /new rendering, Title/Context IME, publish-area insets | Previously approved PASS retained; not restarted as a full UI regression |
| AlertDialog Back | Fresh PASS; `/question/...903`, idx 1 unchanged, modal closed |
| Ordinary Answer Sheet Back | Fresh PASS; closes only dialog, route retained |
| Answer IME-first Back | Fresh PASS; viewport 578.2857 -> 915.0476 CSS px; Sheet remains |
| Reply composer/IME-first Back | Prior device PASS retained |
| Question -> Person | Fresh PASS; `/person/...902`, idx 2, no Expert/chat/booking/payment route |
| Person -> Question Back | Fresh PASS during rapid sequence; original Question, idx 1 |
| Scroll restoration | Prior PASS retained: 2521.142822 -> 2520.761963, delta -0.380859 CSS px |
| System bars / gesture inset | PASS; prior system-bar evidence retained, fresh CTA inset and width rechecked |
| Question/Person background-foreground | Prior PASS retained; routes/content preserved |
| Portrait-landscape-portrait | Prior PASS retained; valid route, no crash or blank screen |
| Rapid Back | Fresh PASS; `adb shell input keyevent 4 4` produced one internal pop, Person idx 2 -> Question idx 1; Activity remained foreground with PID 7129 |
| Deliberate no-modal Back | Fresh PASS; Question idx 1 -> Home idx 0 |
| Root default Back | Fresh PASS; single deliberate Back at Home idx 0 exited to Launcher |
| Unexpected runtime permissions | NO; INTERNET plus existing signature-only receiver permission, no new dangerous permission |
| Native fatal / bridge failure while active | NONE observed |

Fresh measurements/screenshots/logcat: `~/askbuddy-worktrees/ec2f-evidence-20260913/fresh-qa/` (`gate1-*` through `gate4-*`, `root-*`, `question-bottom-after-rapid.json`, `final-logcat.txt`). Historical lifecycle/rotation/scroll evidence is in the adjacent `historical/` directory. No binary evidence is committed.

## Log Interpretation

No Java FATAL EXCEPTION, AndroidRuntime crash, uncaught runtime exception, or renderer failure occurred during the active hard gates. Rapid Back retained the Activity. A renderer `crash detected (code -1)` message occurred only after the deliberately marked root Back and `App destroyed`; it is a post-destruction consequence, not an independently reproduced renderer blocker.

Known nonfatal QA noise is retained, not hidden: invalid-domain fetch/realtime errors before transport initialization or for unmodeled realtime, deliberately blocked external CDN script, unmodeled Home badge HEAD reads, and an existing `localhost/favicon.ico` 404. No missing current JS/CSS bundle or blank page was observed. This is not a claim of zero web-console warnings or production backend success.

## Regression And Boundaries

Final regression PASS: `typecheck`, `typecheck:baseline`, `test:question-answer-ui-v1`, `test:question-answer-v1`, `test:contracts`, `test:production-writes`, `test:fixture-isolation`, `test:runtime-mode`, `lint:changed`, `build`, `assembleDebug`, and `testDebugUnitTest`. Fresh `npm ci` and Capacitor sync also passed. The final production-mode dist was synced for Gradle packaging, then generated tracked assets were restored again; the separately preserved device-tested QA APK was not overwritten. Existing unit coverage was used; no test framework was added. npm reported 28 existing dependency audit findings; no dependency upgrade or audit fix was attempted.

Only the two approved MainActivity changes and this verification record may be committed. Generated assets are build outputs and must be restored before commit; QA helpers/APKs/screenshots stay outside the repository.

Shared React, canonical contract, RPC, A-owned truth, Supabase, iOS, WeChat, runtime permissions, Deep Links, and EC-3 changes: NO. Production mutation/Auth user/Question/Answer/Reply/Helpful, migrations, RLS/grants, and Edge deployments: NO.

Android machine truth is owned by A and may be updated only after Product Owner review/merge. WeChat follow-up remains separate. Do not merge automatically or start EC-3.
