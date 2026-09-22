# EC-3C0C Core Seed v1 Preview

## Current Status

Core Seed manifest: **PREPARED / REVIEW PENDING**. Production apply: **NOT STARTED**.
Production taxonomy remains **EMPTY**. No Topic UI, Candidate runtime, or Discovery runtime is implemented by this work.

- Baseline main: `c0625b083decfa07437aabc351ba791593a8e56a` (PR #51 merge).
- Branch: `codex-a/ec3c0c-topic-core-seed-manifest`.
- Manifest: [`canonical-topics/core-v1.json`](../canonical-topics/core-v1.json).
- Exact file SHA-256: `fe1591a81323092d745e08cd9fa024808033c5c95dcc0ca89bd41f8739deda6f`.
- Schema version: `1`; manifest ID: `core-v1`; Topics: **79 active / 0 deprecated**; aliases: **113**.
- Normalized terms: **192**, globally unique; collision count: **0**.
- All identities are cryptographically secure RFC 4122 UUID v4, generated exactly once. No regeneration command is committed.
- Human review: [`core-v1-review.md`](../canonical-topics/reviews/core-v1-review.md). Its four Channel groups are review metadata only; tooling does not read that document or infer Channel associations.
- 人像摄影 is deferred and has no allocated ID. Only the approved 79 names and exact approved aliases are included.

## Validation And Governance

`topic:manifest:validate`: **PASS**. The strict validator rejects unknown fields, invalid identity/status, empty terms, wrong ordering, duplicates and all normalized canonical/alias collisions. It does not rewrite inputs. Core v1 validation additionally requires exactly 79 active entries. The test freezes the exact approved name/alias fixture and exact manifest bytes, including every UUID.

The separately exported structural validator allows future approved desired states (including deprecated Topics) for pure planner regression tests. This is not a bypass in the Core v1 command: the current command and recorded preview always use the initial Core v1 validator. Changing curated content, identity or reviewed bytes requires a new governance review, not an ID refresh.

Normalization is factored without semantic change from the existing shared Topic parser into `canonical-topic-normalization-v1.ts`. Both the parser and offline tooling use that exact implementation: C/ASCII whitespace collapse, ASCII-space trim and ASCII A-Z case folding. Non-ASCII characters and punctuation are preserved. No pinyin, unaccent, fuzzy matching or second normalization algorithm is introduced. The deployed migration remains unchanged.

Topic UUID, not its name/group/array position, is identity. Core Seed is a curated subset, not a complete Production mirror. Topic state remains flat; no hierarchy or Channel field exists. Governed operators, not ordinary users or AI, create roots. Candidate != Canonical Topic. Missing Topics must not become a prerequisite for future Question/Experience discoverability.

## Planner Boundary

`planManifest(manifest, snapshot)` is a pure informational comparison with no networking, credentials, clock, randomness or database writes. A snapshot contains only governance roots (`topicId`, `canonicalName`, `normalizedName`, `status`) and resolver terms (`topicId`, `term`, `normalizedTerm`). It validates root/term integrity and recomputes normalization before planning. Timestamps such as `updated_at` are not snapshot inputs or semantic changes.

The planner supports exactly `CREATE_TOPIC`, `RENAME_TOPIC`, `ADD_ALIAS`, `REMOVE_ALIAS`, `DEPRECATE_TOPIC`, `REACTIVATE_TOPIC`, `NO_CHANGE`, `PRODUCTION_ONLY_UNMANAGED`. Every operation has execution action `NONE`; every effective change requires separate future approval. There is no executor or apply command. Alias payload is embedded in CREATE, not counted as separate ADD_ALIAS operations.

REMOVE_ALIAS and DEPRECATE_TOPIC are governance-sensitive. REACTIVATE_TOPIC is HIGH risk and requires explicit future approval. Production-only roots remain unmanaged with no rename, alias alteration or deprecation. Production term ownership wins even if another manifest entry proposes removing that term: conflicts fail closed, never steal/merge/reassociate/redirect.

Same UUID with a changed name produces RENAME_TOPIC, never an implicit old-name alias. The existing deployed `ensure_canonical_term` trigger retains the old resolver term on rename. If the desired manifest omits that old name, the planner therefore explicitly includes a governance-sensitive REMOVE_ALIAS for the trigger-retained term; it does not pretend a root rename alone satisfies desired state. Explicitly retaining the old name as an alias is allowed only via manifest content. Promoting an alias to canonical never removes the new canonical resolver term. Display-spelling changes to an alias are shown as explicit removal/addition, not silently normalized away. These are preview semantics, not executable SQL sequencing; future apply needs its own transaction/concurrency review.

Plan serialization recursively sorts object keys, sorts operations by UUID/action/payload and sorts snapshot collections by UUID/normalized term. Input manifest array order is validated, never rewritten. Comparison uses deterministic non-locale string order. `manifestStateHash` and `productionStateHash` bind the complete semantic inputs; `planHash` is SHA-256 over the canonical plan without its `planHash` field. Exact manifest file SHA is recorded separately. No hash authorizes apply or proves a snapshot is still current. Future apply authorization must bind exact file SHA and planHash and independently refresh/revalidate Production state.

## Read-only Production Evidence

Observed 2026-09-22 UTC; post-preview count confirmation completed before `2026-09-22T00:19:57Z`.

- Project ref independently read: `fslpvtlavhrnxsygkpvi`.
- Project status: **ACTIVE_HEALTHY**; DB metadata build: `17.6.1.063`.
- Acquisition: existing authenticated Supabase read-only tool calls. No credential was printed or committed.
- Before preview: one SELECT of four aggregate counts, all zero.
- Governance snapshot: one SELECT of explicit root/term governance columns, returning `topics=[]`, `terms=[]`.
- After preview: a separate, independent SELECT of the same four aggregate counts, all zero.
- No Questions, Experiences, profiles, private content or user data were selected. Only aggregate association counts were read.

| Relation | Pre-preview | Post-preview |
| --- | ---: | ---: |
| canonical_topics_v1 | 0 | 0 |
| canonical_topic_terms_v1 | 0 | 0 |
| question_topics_v1 | 0 | 0 |
| experience_topics_v1 | 0 | 0 |

The observed safe snapshot is stored in [`core-v1-production-snapshot.json`](../canonical-topics/reviews/core-v1-production-snapshot.json). This is historical evidence, not a live database connection. The preview command accepts only an explicitly supplied snapshot, verifies project/health/zero-count gates, reads the fixed manifest, and prints an informational plan. It has no network, write or apply capability:

```sh
npm run topic:manifest:validate
npm run topic:manifest:preview -- --snapshot canonical-topics/reviews/core-v1-production-snapshot.json
```

Replaying this command is offline and does not refresh Production evidence. Snapshot acquisition and independently checking pre/post counts remain external read-only operations. A supplied file cannot attest to its own freshness or authenticity; this document records the actual tool observations for Product Owner review.

The complete reviewable payload is [`core-v1-production-preview.json`](../canonical-topics/reviews/core-v1-production-preview.json). Each CREATE includes UUID, canonical name, all aliases and active status. The pretty-printed artifact and CLI canonical JSON have identical semantic content.

| Preview classification | Count |
| --- | ---: |
| CREATE_TOPIC | 79 |
| RENAME_TOPIC | 0 |
| ADD_ALIAS (embedded in CREATE) | 0 |
| REMOVE_ALIAS | 0 |
| DEPRECATE_TOPIC | 0 |
| REACTIVATE_TOPIC | 0 |
| NO_CHANGE | 0 |
| PRODUCTION_ONLY_UNMANAGED | 0 |
| COLLISION | 0 |
| HIGH-RISK | 0 |

Plan hash: `9319fcf1ae9c7641927760f3a679cd5df74c9a5ab944460fa33dec350ed84cc2`.

Production mutation = **NO**. No migration, DDL, DML, Auth user, fixture, RPC mutation, Topic seed or Edge deployment was performed. The plan does not mark taxonomy seeded or change machine runtime truth.

## Regression And Runtime Boundaries

Offline tests cover exact approved content/identity, global collisions, strict invalid inputs, shared normalization, 79 CREATE, idempotent NO_CHANGE, rename/alias transitions, active/deprecated transitions, HIGH-risk reactivation, Production-only preservation, Production collision priority, corrupt snapshots, stable hashes, input immutability, replay gates and the no-mutation/no-app-import safety boundary. The static test is included in `test:contracts`.

Canonical Topic backend and consumer remain deployed/verified; Blueprint stays `production-ready` / `may-use-deployed-contract`. Question shared contract still accepts 0..N IDs, while the current Question UI still sends `p_topic_ids=[]`. No Topic picker, resolver UI, Experience Topic UI or AI suggestion is added. Discovery `productionDeployed`, `clientConsumable`, `implementationStarted` and `rpcNamesFrozen` remain false. Home/Search/Matching, Editorial, Candidate runtime and EC-4 are not started.

**DO NOT AUTO-MERGE. DO NOT APPLY CORE SEED. DO NOT START EC-3C DISCOVERY BACKEND.**
