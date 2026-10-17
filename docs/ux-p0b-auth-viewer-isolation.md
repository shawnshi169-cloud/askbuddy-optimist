# UX-P0B: AuthContext viewer isolation

Baseline: `60135a179d720acd2150ccbb81a5fde8bd51adb0`.
Branch: `codex/ux-p0b-auth-viewer-isolation`.
Scope: local Shared Core state ownership and deterministic offline tests only.
No Production access, database/Auth changes, deployment, or client activation.

## Root cause and behavior

The previous provider independently updated user, session and profile. Profile
success and failure wrote state without checking current ownership. A delayed
timer or `getSession()` could outlive a newer Auth event or provider lifetime.
Matching the RPC's returned user ID did not prevent A -> B -> A races or older
same-viewer refreshes. `signOut()` ignored returned SDK errors and cleared state
even after a newer login. This is source/offline evidence, not a reproduction
with genuine Supabase sessions.

| Boundary | Before | After |
| --- | --- | --- |
| Viewer/session transition | Previous profile could remain visible or return late | One atomic user/session/profile snapshot; different viewer clears profile immediately |
| Profile success/failure | Any completion could write or clear profile | Effect lifetime, session epoch, latest request and current owner must all match |
| Same-viewer refresh | Completion order won | Latest issued request wins; old success and failure are ignored |
| Initialization | Late initialization could replace event state | Accepted Auth events and logout initiation invalidate initialization authority |
| Token refresh | Always started a profile fetch | Valid same-viewer profile retained; pending old-token work is invalidated/restarted; duplicate events do not duplicate pending reads |
| Logout | Returned errors ignored; late completion cleared state | Pending reads invalidated before calling SDK; returned/thrown errors reject; newer Auth events outrank the completion |
| Unmount | Only subscription removed | Timers canceled and effect-local authority revoked, including cleanup/remount replay |

## Isolation mechanism

`AuthContext.tsx` retains the public `useAuth` interface. One React state object
is the consumer-visible snapshot. Each effect lifetime holds synchronous
ownership counters and its latest snapshot; no private persistent storage is
added. The lifetime is not reactivated when effects replay.

- Session epoch changes on viewer/token changes, sign-out, and explicit user
  updates. Returning to the same user ID cannot revive an old epoch.
- Request sequence changes at every refresh. Scheduled work also captures both
  counters and checks them before making a request.
- RPC and balance completion each check ownership. Both the success commit and
  error/null commit check it again. Obsolete errors neither clear newer data nor
  log their payloads.
- The existing strict owner parser and returned `userId` check are unchanged.
  Balance remains `point_accounts.available_balance` filtered by the owner ID.
  A returned balance error retains the existing warning/default-to-zero behavior;
  a thrown lookup error retains the existing profile-null behavior. The fallback
  zero is not newly asserted to be a successfully verified account balance.
- `INITIAL_SESSION` is accepted before other Auth events, including after a
  fallback `getSession()` result. Duplicate same-session reads are coalesced.
  A late initial event after a newer event/logout is ignored. Failed initial
  reads fail closed and finish loading without overriding newer event state.
- Auth callbacks return synchronously. RPC work uses an invalidatable zero-delay
  task outside the SDK callback lock. Same-viewer `USER_UPDATED` refreshes profile;
  `TOKEN_REFRESHED` updates the session without dropping a valid owner profile.
- Logout failure keeps the current viewer (and any valid current profile),
  rejects its promise, and permits a fresh read if necessary. A successful late
  logout completion does not clear a newer viewer. A later SDK `SIGNED_OUT` event
  itself remains authoritative; this change does not redefine SDK semantics.

Reviewed installed dependencies: React 18.3.1, supabase-js/auth-js 2.93.3.
The installed auth-js callback documentation warns about awaiting client APIs
inside its exclusive lock. The official
[onAuthStateChange reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
was checked on 2026-10-17. No dependency upgrade was made.

## Deterministic evidence

`scripts/lib/auth-provider-harness.mjs` executes the actual transpiled provider
and owner parser. Controlled hook slots rerender synchronously at every state
setter, checking user/session/profile identity consistency even without React
batching. Deferred Auth/RPC/balance promises and a controlled timer queue allow
explicit ordering. No network or real credentials are available to the tests.
This is not a DOM renderer or evidence of genuine SDK/server Auth behavior.

| Case | Offline result |
| --- | --- |
| T01 A late success after B starts | PASS; no stale commit or balance query |
| T02 A returned/thrown error after B succeeds | PASS; B retained |
| T03 A success after signed out | PASS; remains anonymous |
| T04 A failure after signed out | PASS; no state update |
| T05 late initial success/null/error/rejection and INITIAL_SESSION ordering | PASS; newer events retained, bootstrap deduplicated and failure recoverable |
| T06 same-viewer out-of-order refresh success/failure | PASS; latest request owns commits |
| T07 A -> B -> A and old queued callback | PASS; first A never regains authority |
| T08 pending work after unmount and effect replay | PASS; no retired-lifetime commit, timers/subscriptions released |
| T09 token refresh, repeated sign-in, USER_UPDATED, password recovery | PASS; valid same-viewer profile retained, required refreshes performed |
| T10 wrong owner, missing or malformed profile | PASS; rejected before balance lookup |
| T11 balance error, rejection, delayed cross-viewer/same-viewer response | PASS; original fallback semantics and ownership preserved |
| T12 refresh/logout overlap, logout errors and late completion | PASS; errors reject, no stale clear or initial-read revival |
| T13 anonymous -> A -> B -> anonymous | PASS at every observed snapshot; password API return/error contracts retained |

The existing profile-privacy regression now uses this harness rather than
depending on the old four `useState` slot numbers. All original RPC, balance,
projection, parser and privacy assertions remain. `test:auth-viewer-isolation`
is included in `test:contracts`, the existing required CI path. CI execution
evidence is recorded in the PR closeout, not inferred from this wiring alone.

## Limitations and rollback

Genuine Supabase Auth E2E, real token refresh/revocation, cross-tab SDK delivery,
browser React scheduling, native/WeChat and device QA remain NOT VERIFIED.
The client still relies on SDK Auth events; this is not server authorization,
JWT validation, session revocation or a database privacy policy. No claims are
made about caches or async state outside this provider. Existing logout callers
must handle a rejected promise; this task adds no unrelated page error redesign.

UX-P0A pages, navigation, Question/Experience drafts, owner parser, private RPC,
WeChat behavior, RLS/grants and Discovery runtime flags are unchanged. Historical
[UX-0 findings](ux0-frontend-reality-and-roadmap.md) and
[database privacy cutover evidence](public-person-privacy-cutover.md) remain history.

Rollback is a review-approved revert of this frontend/test commit; no schema,
data or secret rollback is needed. Reverting reintroduces the identified races
and must not be represented as a secure release fallback.

UX-1A and genuine Auth testing are not authorized. D1C deployment: NO-GO.
Production access/mutation: NO. Client activation: NO. Independent review required.
