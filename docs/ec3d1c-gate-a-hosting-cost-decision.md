# EC-3D1C Gate A: Hosting Architecture and Cost Decision

Research date: **2026-10-15, Asia/Shanghai**. Currency: **USD**, excluding tax, exchange conversion and labor unless stated. All designs and budgets are **PROPOSED / NOT DEPLOYED**.

**Gate A final architecture approval: PENDING PRODUCT OWNER. Gate B Auth and Gate C provisioning: NOT AUTHORIZED. D1C deployment: NO-GO. Production access/mutation: NO. Client activation: NO.**

## 1. Executive recommendation

**PROPOSED preferred:** a persistent Node API on **Render**, one paid `1c-2g` instance for an internal pilot, followed by a separately authorized two-instance test. Use a Pro workspace for shared operational ownership. **Singapore is a conditional region, not a verified project match.** Keep committed snapshot/session/quota state in the existing Supabase PostgreSQL project, with two distinct database credentials and pools. Initially validate IPv4 **Supavisor session mode**, not transaction pooling. No new Redis, database vendor or public RPC is recommended.

**PROPOSED backup:** **Fly.io**, initially `sin` only if the database is nearby, with one/two always-running Machines and direct IPv6 PostgreSQL connections. It has lower quoted infrastructure costs and a documented IPv6 egress path, but requires more container, networking and operational ownership. If Render's ordinary-role session path cannot pass isolation tests, or its region/network costs do not fit, reconsider Fly with PO approval rather than relaxing permissions.

**Deferred:** Cloud Run is technically plausible for a containerized Node service, but adds IAM/ingress/billing complexity and less predictable instance lifecycle/connection peaks. Supabase Edge is an architectural baseline, not a drop-in deployment of D1B: worker/runtime adaptation and session-sensitive database behavior remain unproved. Another vendor is not justified before resolving these common blockers.

**PROPOSED planning envelopes, not invoice quotes:** Render approximately **$132/month single / $157 two-instance pilot**, and **$225 single / $250 two-instance 10x scenario**, including explicit reserves for currently unpriced components. The traceable hosting-only subtotals are $51.75/$76.75 and $65.25/$90.25 respectively. Actual all-in cost is **UNKNOWN** until database headroom, ingress and monitoring are priced. Request a **$200/month pilot ceiling**, with a separately approved **$300/month 10x ceiling**, excluding labor and existing Production Supabase charges. No purchase is authorized.

Approval must remain **CONDITIONAL** on region confirmation, ordinary-role connectivity, genuine Auth verification, current-session validity, packaging/security review, capacity and operating ownership. A second API instance is not multi-region availability or database high availability.

## 2. Baseline and evidence levels

**VERIFIED FROM REPOSITORY CODE / GitHub metadata:** approved main is `4d00c7ef76bbd2dfbf2e9d2e8fdf0d4869413fe1`, merging PR #63. Gate A branch: `codex/ec3d1c-gate-a-hosting-cost`. Its parent history contains merged PR #62's D1B implementation and required offline-CI correction. Remote main matched before branch creation. Git HTTPS fetch timed out; the exact signed merge object was retrieved through GitHub's Git API, reconstructed with its signature, and accepted only after its Git SHA and all referenced local objects matched. No historical commit was rewritten.

| Label | Scope |
| --- | --- |
| VERIFIED FROM OFFICIAL DOCUMENTATION | Public provider documentation checked on the research date; not an account entitlement or hosted test |
| VERIFIED FROM REPOSITORY CODE | Inspected source at the exact baseline; not proof of deployment |
| REPORTED BUT NOT INDEPENDENTLY VERIFIED | Historical test evidence retained without rerunning it here |
| PROPOSED | Recommendation, workload assumption, budget or future acceptance criterion |
| UNKNOWN | Missing evidence; never treated as zero cost or successful compatibility |
| BLOCKED | Required deployment condition not met |

Reviewed sources: [predeployment assessment](ec3d1c-predeployment-risk-assessment.md), [D1B evidence](ec3d1b-question-discovery-transport-storage.md), [D0 audit](ec3d0-discovery-readiness-audit.md), [frozen Discovery decisions](ec3-discovery-contract-decision.md), [D1A modules](../local-backend/question-discovery-v1/), [D1B modules](../local-backend/question-discovery-transport-v1/), [Discovery flags](../packages/shared-api/src/discovery-v1.ts), [runtime mode](../src/config/runtimeModeCore.ts), [privacy migration](../supabase/migrations/20261007005206_public_person_privacy_cutover.sql), and existing Supabase Auth/Edge infrastructure.

**VERIFIED FROM REPOSITORY CODE:** this is an opt-in local Node implementation using `pg`, Node crypto and `jose`, not an approved hosting artifact. `pg`/`jose` are root devDependencies; deploying a root `npm install --omit=dev` or the Vite development server is not a valid server release. A pinned, supported Node version, minimal server package/image, lock/SBOM and HTTP/proxy lifecycle wrapper require later implementation approval. Native/WeChat, UI, canonical RPCs and all four Discovery flags remain unchanged/false.

**REPORTED BUT NOT INDEPENDENTLY VERIFIED:** D1B exercised two OS processes, ordinary-role SQL and shared snapshots locally. Its 124 loopback samples (p50 27.9 ms, p95 67.0 ms, maximum 209.7 ms) are not Production latency or SLOs. D0's October 11 snapshot contained 79 active Topics, 192 terms, two canonical Questions and no associations/Experiences. Today's database region, plan, capacity, usage, data and network restrictions are **UNKNOWN**. No Production endpoint, dashboard or database was accessed here.

## 3. Hosting comparison

The capability entries below are **VERIFIED FROM OFFICIAL DOCUMENTATION** where linked; fit and configuration choices are **PROPOSED**. None was deployed or benchmarked.

| Dimension | Render: preferred | Fly.io: backup | Cloud Run: deferred | Supabase Edge: deferred |
| --- | --- | --- | --- | --- |
| Region examples relevant to Supabase | Singapore, Frankfurt, Virginia, Ohio, Oregon only in current list [R1] | Singapore `sin`, Tokyo `nrt`, Sydney `syd`, Frankfurt `fra`, Ashburn `iad`, others [F1] | Singapore `asia-southeast1` and many other regions [G1]; actual allocation availability UNKNOWN | Singapore `ap-southeast-1`, Tokyo, Sydney, Frankfurt and others [S3]; explicit region selection changes failover behavior |
| Runtime / process | Native Node or container, continuously running paid service; explicit version pin supported [R2,R3] | Container image controls Node/OS; persistent Machine lifecycle [F2,F3] | Containerized Node, instance-based CPU billing and minimum instances; instances can still restart [G1,G2,G3] | Deno-based worker; Node compatibility is not D1B parity; 256 MB, 2 s CPU/request and paid worker lifetime up to 400 s [S2,S4] |
| PostgreSQL connections | Native TCP `pg`; treat IPv6 as unavailable per Supabase compatibility guidance; validate IPv4 session pooler [S1,S5] | Documented outbound IPv6/IPv4; direct IPv6 is first path to validate, session pooler an alternative [F4,S1] | TCP driver plausible; simple public outbound IPv6 path NOT VERIFIED; propose IPv4 session pooler first, not an unreviewed VPC workaround | Outbound database integration exists, but connection recycling and ordinary-role session identity require a separate adapter proof [S4,S1] |
| Instances / concurrency | Manual fixed count available; Pro autoscaling has min/max; choose fixed 1 then 2, no disks [R4] | Explicit 1/2 Machines; disable autostop for this evaluation; min-running applies only in primary region, autostart does not create Machines [F5] | Propose service min=max=1 or 2 and concurrency=4; max may briefly be exceeded, including during rollout; not a hard connection cap [G3,G4] | No equivalent user-controlled fixed pair of persistent Node instances established; platform concurrency does not enforce D1B's global pool budget |
| Memory / CPU reference | `1c-2g`: 1 CPU, 2 GB; not the free/sleeping plan [R5] | `shared-cpu-1x`, 1 GB reference; shared CPU is not Render dedicated-equivalent throughput [F6] | 1 vCPU, 1 GiB reference; billing selection matters [G1] | Worker limits are materially different; no claim that 256 MB suffices [S2] |
| Drain / restart | Health-gated replacement; default 30 s SIGTERM shutdown delay, configurable; rolling overlap consumes extra connections [R6] | Configure SIGTERM rather than default SIGINT; timeout best-effort, default 5 s, configurable up to 300 s [F2] | SIGTERM then 10 s before SIGKILL; even minimum instances can terminate [G2] | Finite worker lifetime; cannot rely on persistent process/pool or shutdown hook for correctness [S2] |
| HTTPS / domains / streaming | Managed TLS, custom domains, load balancing and WebSockets [R2] | Fly Proxy/TLS and custom domains; configure HTTPS; HTTP concurrency controls [F2,F7] | Default HTTPS URL; recommended custom path ingress is external Application LB; domain mapping remains Preview [G5] | HTTPS gateway; separate custom-domain/routing approval; WebSockets supported separately [S4] |
| Secrets / observability | Environment groups/secret files; Pro HTTP logs/latency metrics/metrics export [R7,R8]; alert delivery and retention costs need sizing | App secrets distributed to Machines; managed Prometheus/Grafana, approximately 15-day metrics retention [F8,F9]; log retention/alert delivery need a selected solution | Secret Manager/IAM, Cloud Monitoring and logging; configure alerts and retention, not automatic on-call [G6,G7,G8] | Project secrets and function logs [S2,S4]; published log limits, not a full audit/alert strategy |
| Release / rollback | Retained build artifacts and digest-pinned images; rollback must account for current/shared environment settings [R9] | Image-based deployment; retain known-good digest/config and redeploy it; operator owns lifecycle controls [F3] | Revision traffic migration/rollback [G9]; tagged/overlap instances must be budgeted | Redeploy reviewed function version and routing; D1B port would be more vendor-specific |
| Exit / operational burden | Portable Node/SQL, replace platform config/ingress/secrets; lower day-to-day complexity | Portable image/SQL, replace Fly proxy/network/secrets config; more platform operation | Portable image, but IAM, LB, registry, secret and monitoring resources increase exit work | Greatest adapter/runtime rewrite risk; invocation savings do not establish lower total engineering cost |

WebSockets and HTTP streaming are **not required by D1**: it returns bounded JSON within a five-second request budget. They should not determine vendor selection or justify a new runtime feature. Cookie/Origin compatibility is an application-and-ingress requirement on every provider, not a property guaranteed by custom-domain support.

## 4. Region and network decision

**UNKNOWN:** Production Supabase region and IPv4 add-on status. Do not infer location from project ID, developer timezone or Chinese-language content. Obtain approved non-secret region/plan information from PO, or wait for separately authorized Gate F read-only preflight.

**PROPOSED:** place API instances together near the database, not one near each user continent. Provisional Singapore means: database confirmed nearby; provider capacity available; DNS/TLS and role connections pass; measured inter-provider RTT satisfies the later budget. If Supabase is in Frankfurt or US West, reselect the corresponding Render region and reprice network traffic. If it is Tokyo/Sydney, Fly's matching metro is a stronger fallback than assuming Singapore is close enough. Same city is not the same VPC, guaranteed latency or free traffic. No cross-vendor private link is assumed.

| Path | Assessment / later acceptance |
| --- | --- |
| Client -> same-origin HTTPS ingress -> API | Preferred. Reuse an existing trusted path router only if its owner and capabilities are confirmed. Otherwise separately price/approve one, or an isolated pilot origin serving its own test page. Do not move the current app or register a route in Gate A |
| Render -> Supavisor session -> database | IPv4-compatible candidate. Authenticate each pool with its own reviewed role; session identity, cancellation and cleanup must pass on the actual path |
| Fly -> direct database IPv6 | Simpler backend-session model, conditional on actual DNS/routes/TLS. Default egress addresses can change; optional app-scoped static IPv4/IPv6 is per region [F4] |
| Cloud Run -> session pooler | Conditional fallback path; static egress/VPC/NAT is extra design and cost, not included or provisioned |
| Any host -> Auth issuer / JWKS | Approved HTTPS hostname, normal certificate validation, bounded lookup and explicit failures; no request-selected issuer or key URL |

Supabase documents direct IPv6, optional paid direct IPv4, and IPv4 shared session pooling [S1,S5]. Direct IPv4 add-on changes the project's endpoint address family rather than adding dual-stack [S1]; enabling it is a separate database/network approval, not an automatic repair. Render dedicated outbound IP sets may materially change the budget [R10]. Shared regional egress IPs are not a strong per-application identity. If strict DB source-IP isolation is mandatory, PO/security must compare that paid option against Fly's static egress before selecting Render finally.

**PROPOSED later network threshold:** API-to-database round-trip p95 <=20 ms and p99 <=40 ms over representative periods, plus successful two-pool TLS/authentication probes. These are evaluation targets, not measured results. Many SQL round trips make distant hosting expensive in latency even when egress dollars are small. User-to-region reachability, including mainland-China networks if relevant, is UNKNOWN and needs separately authorized testing; no provider performance or regulatory suitability is assumed.

## 5. Database trust and connection budget

**VERIFIED FROM REPOSITORY CODE:** [database.ts](../local-backend/question-discovery-transport-v1/database.ts) leases a client and performs its first identity query **before BEGIN**. It checks `current_user`, `session_user`, nonsuperuser/non-BYPASSRLS and empty request claims. Caller work starts `BEGIN READ ONLY`, installs only verified anon/authenticated role and claims using transaction-local settings, then rechecks `auth.uid()`/role. After COMMIT it performs another query **outside the transaction**, checking current role and empty claims. The post-COMMIT check does not repeat the entire initial session-user/role-attribute check. Errors roll back where possible and destroy the lease; aborted/late-acquired connections are discarded.

| Connection strategy | D1B suitability |
| --- | --- |
| Direct PostgreSQL | Preferred identity semantics when IPv6/approved IPv4 is available: application lease pins one backend session. Still verify TLS, actual permissions and hosted cancellation behavior |
| Supavisor session mode | Preferred Render candidate: intended for long-lived IPv4 sessions. Test all pre/post-transaction checks, A -> B -> anon reuse, prepared-query behavior, timeout/abort and reconnect isolation. Pooler client identity and actual PostgreSQL session identity are not assumed identical |
| Transaction mode / dedicated transaction pooler | **NOT APPROVED for current adapter.** Pre-BEGIN, transaction and post-COMMIT probes may hit different server sessions. `pg.connect()` pins a client socket, not a database backend through a transaction pooler. Passing one probe is insufficient; no URL-only substitution [S6] |

**BLOCKED hosted caller credential:** the code requires literal login `authenticator`. A permissible hosted credential with only anon/authenticated switching rights is not established. Do not retrieve/reset a managed role password or use a role that can switch to privileged roles. A dedicated restricted login and any hardcoded-name adaptation require later review. `service_role`, postgres, SUPERUSER, BYPASSRLS, broad public grants and SECURITY DEFINER shortcuts are prohibited.

**PROPOSED two trust domains:** pool 1 only canonical public Question/Answer/Topic reads under ordinary RLS. Pool 2 directly authenticates as the separately provisioned least-privileged operations role, never through session authorization impersonation. [Operational SQL](../local-backend/question-discovery-transport-v1/operational.proposed.sql) grants schema USAGE, gate SELECT/UPDATE, and snapshot/session/rate CRUD; it creates no public API and does not include hosted LOGIN provisioning. Runtime roles must not own business tables or the operational schema. Operational tables use ACL isolation, not declared RLS; keep them out of Data API exposure and audit PUBLIC/inherited access. Existing profile privacy remains closed.

**PROPOSED conservative budget, not configured:** `max=4` caller + `max=4` operations per instance, no eager minimum, retain four HTTP requests in flight per instance. A request can hold both domains, so count both. Supabase system services and other poolers also consume connections [S6].

| Deployment model | Caller | Operations | Steady runtime total | Conservative full replacement overlap | Separate maintenance reserve |
| --- | ---: | ---: | ---: | ---: | ---: |
| One instance | 4 | 4 | 8 | 16 | 2 |
| Two instances | 8 | 8 | 16 | 32 | 2 |

Require `existing_peak + overlap_runtime + 2 <= floor(0.70 * usable_backend_capacity)`, after managed/reserved connection accounting. If `existing_peak` already includes managed services, do not subtract them twice. Also budget each pooler role/database/mode pool and its separate frontend-client limit with >=30% headroom. Existing usage/capacity are **UNKNOWN**; advertised Micro limits are not evidence of available project capacity. Cloud Run temporary over-max/extra revisions can exceed this overlap assumption and require additional enforcement/proof. Autoscaling remains off until budgets are accepted; do not raise database limits to conceal saturation.

## 6. TLS, ingress, Auth and secrets

**PROPOSED flow:** client -> trusted HTTPS ingress -> Node HTTP adapter -> fixed-issuer Auth verification -> caller-scoped canonical pool, plus a separately authenticated operational pool. Responses remain Question-only, no-store and private-state-free.

The current [HTTP adapter](../local-backend/question-discovery-transport-v1/http.ts) requires exact Origin, POST/JSON and a trusted ingress fingerprint. It has no CORS preflight implementation. Same-site subdomains are **not same-origin**. Keep `__Host-d1b-scope` Secure/HttpOnly/SameSite=Strict/Path=/ with no Domain; preserve cookie and Authorization end-to-end without caching Set-Cookie. This cookie is not the Auth access/refresh token. Do not weaken Origin/cookies to make a separate API domain work. A future cross-origin/native contract requires separate approval.

Terminate HTTPS at a reviewed provider/proxy boundary; Render explicitly forwards HTTP internally after TLS termination [R2]. Trust only the known proxy chain, normalize/reject spoofed Host/forwarded headers and prevent an alternate public provider URL from bypassing rate limits. The socket address behind a proxy is not automatically the visitor IP. The trusted ingress key must be derived by server-owned policy, never accepted from request JSON or arbitrary `X-Forwarded-For`. Provider DDoS protection is not application quota enforcement.

Use certificate-chain and hostname verification for PostgreSQL and Auth HTTPS; no `rejectUnauthorized=false`, insecure fallback, embedded credentials or DSN logging. Whether provider-to-container encryption meets the organization's threat model is a security decision, distinct from browser HTTPS. Validate DNS rotation/reconnect and failed-certificate behavior later. Current public Supabase changelog includes TLS cipher deprecation; old clients need a future compatibility check, not a Production probe here [S11].

**REAL SUPABASE AUTH: NOT VERIFIED.** [auth.ts](../local-backend/question-discovery-transport-v1/auth.ts) pins ES256/RS256, issuer, audience, expiry and UUID `session_id`; a successful signature plus user-ID lookup does not prove current session/account validity. Gate B must independently test genuine issued sessions, logout/revocation/deletion/disabled users, refresh, account switches, anonymous transitions, JWKS rotation/outage and real HTTPS cookies. Supabase documents separate JWT/session lifetimes [S7,S8]. The repository's WeChat custom JWT lacks required `session_id`; it is not compatible by assertion. Do not remove that check or modify WeChat here.

Use separate server-only caller/operations credentials and shared application keyring in the selected host's secret system [R7,F8,G6]. Deploy access can exfiltrate runtime secrets, so enforce human access review and audit. Stage identical active/overlap key versions on both instances; retain decryption through the 30-minute session lifetime plus measured skew/drain margin. Database credentials, application AEAD keys and Supabase signing keys have independent rotation procedures. Propose <=1 s inter-instance clock skew monitoring; no provider clock guarantee has been verified. Log only bounded error categories, timings and aggregate occupancy, not bearer tokens, cookies, cursors, DSNs, raw IPs, user IDs or Question content.

## 7. Auditable monthly cost model

### 7.1 Workloads and accounting

All workload values are **PROPOSED**, not forecasts approved by Product or successful load tests. Use **730 hours = 2,628,000 seconds**. Flat monthly subscriptions remain their published monthly price; normalize Fly's explicit 720-hour examples by `730/720`. Decimal GB and binary GiB are not interchangeable (`1 GB = 0.931322575 GiB`). All quoted prices below were checked **2026-10-15**, USD on-demand, with no committed discounts, trial credits or assumed unused account allowances.

| Input | Scenario 1: internal pilot | Scenario 2: 10x demand |
| --- | ---: | ---: |
| API requests/month, including unsuccessful requests in budget | 100,000 | 1,000,000 |
| Average request rate over 730 h | 0.038/s | 0.381/s |
| Proposed peak for isolated tests | 1/s | 10/s |
| New snapshot fraction | 5% | 5% |
| New distinct scope sessions/month | 1,000 | 10,000 |
| API/provider outbound allowance, including responses and SQL requests | 10 GB | 100 GB |
| Separate Supabase database outbound allowance | 5 GB | 50 GB |
| Log-ingest planning volume, redacted | 1 GiB | 10 GiB |
| API compute reference | Fixed 1, separately compare 2 | Same fixed 1/2 for cost sensitivity only, not a claim of capacity |

Outbound allowances deliberately exceed 20 KiB x request-count response estimates; actual byte mix is UNKNOWN. Charge each provider's **outbound** bytes once; Supabase response traffic enters the API host and is not charged again as API-host outbound. An additional same-origin proxy can impose another real transfer charge, which is unpriced here. Two instances share the same request/egress totals; do not double them. Build/rollout overlap adds usage outside fixed steady-state compute.

### 7.2 Price ledger

All rows inherit the date/currency/month assumptions above. Sources are official URLs in section 11. References with region-dependent or unverified units are explicitly limited, not extrapolated silently.

| Item | Verified unit and region scope | Modeled treatment / exclusions |
| --- | --- | --- |
| Render compute | $25/instance-month for 1 CPU/2 GB, current `1c-2g` (legacy Standard), no regional uplift quoted [R5,R11] | Singapore reference; fixed 1/2; excludes temporary overlap/builds |
| Render workspace / transfer / domain | Pro $25/workspace-month; outbound overage $0.15/GB; additional domain $0.25/month [R12] | Charge full transfer and one domain conservatively, without consuming included quotas; published Pro inclusions could lower bill |
| Render HTTPS / secrets | Managed TLS/LB and environment secrets are service capabilities [R2,R7] | No separate mandatory unit quoted; separate front proxy, external secret system and alert retention remain UNKNOWN |
| Fly compute | Singapore shared-cpu-1x/1 GB $8.50 per 720 h [F6] | $8.6181 per 730 h/instance; shared CPU, no throughput equivalence asserted |
| Fly egress / IP / certificate | APAC outbound $0.04/GB; static egress $0.005/h; single-host cert $0.10/month before allowance [F6,F4] | Budget one regional static egress pair $3.65, shared across 1/2 Machines, and one cert; no volumes or Fly database |
| Cloud Run compute reference | **Iowa us-central1**, instance-based $0.000018/vCPU-s + $0.000002/GiB-s [G1] | 1 vCPU/1 GiB = $52.56/730 h; **Singapore service SKU price UNKNOWN**, not quoted as equal to Iowa. No request-based idle/free-tier discount |
| Cloud Run LB reference | Global forwarding-rule tier $0.025/h = $18.25/month [G10] | Add LB data-processing and internet egress by actual region/destination; those Singapore prices UNKNOWN; no second LB for second instance |
| Cloud Secret Manager | $0.06/active-version-month; $0.03/10,000 accesses beyond allowances [G11] | Six versions + 1,000 accesses = $0.363/month gross reference, no free-tier assumption; replica/location/rotation extras excluded |
| Supabase Edge invocations | $2 per **started package** of 1 million billable invocations [S9] | If existing included quota exhausted: both 100k and 1m cost $2, not $0.20; extra retries crossing 1m cost another package. Fixed 1/2 workers not a comparable SKU |
| Supabase database compute | Published monthly reference Micro $10, Small $15, Medium $60, Large $110 [S10] | **Incremental Production compute UNKNOWN:** new required size minus actual existing size, not the full project charge |
| Supabase network / storage | Pro uncached egress overage $0.09/GB; general-purpose database disk overage $0.125/GB-month [S10] | Gross egress reserve $0.45/$4.50; disk/WAL/bloat/IOPS usage UNKNOWN; no unused quota assumed |
| Isolated genuine Auth environment | New Pro organization $25/month plus Micro reference $10, with advertised $10 compute credit [S10] | Gross **$35 reserve** before credit, separate from existing Production bill; actual new-org starter bill approximately $25 if that offer applies. Existing-org incremental project alternative starts $10; eligibility UNKNOWN; no project created |
| Backups / retention | Pro daily backups included; optional PITR starts $100/month [S10] | Existing plan/backup sufficiency UNKNOWN; no automatic PITR purchase. Extra WAL/backup storage and recovery work require sizing |

The Render pricing page's dynamic body was not reliably readable; compute is corroborated by official compute-plan mapping and the $25/2 GB official comparison, while current workspace prices come from its dated pricing announcement. Older official articles still mention obsolete bandwidth/seat allowances; those are **not** used. Cloud Run's retrieved pricing table exposed Iowa, not a reliably selected Singapore SKU; do not base procurement on its reference calculation. Re-quote all SKUs before a later authorized purchase.

### 7.3 Comparable priced subtotals, not all-in bills

| Provider / formula | Pilot, single | Pilot, two | 10x, single | 10x, two |
| --- | ---: | ---: | ---: | ---: |
| Render Singapore: `25 workspace + 25*N + 0.15*GB + 0.25` | $51.75 | $76.75 | $65.25 | $90.25 |
| Fly Singapore: `8.50*730/720*N + 3.65 + 0.10 + 0.04*GB` | $12.77 | $21.39 | $16.37 | $24.99 |
| Cloud Run **Iowa reference only**: `52.56*N + 18.25 + 0.363` | $71.17 + variable network | $123.73 + variable network | $71.17 + variable network | $123.73 + variable network |
| Cloud Run Singapore | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Supabase Edge invocation component only | $2 if quota exhausted | N/A fixed pair | $2 if quota exhausted | N/A fixed pair |

For **each** row, actual incremental total = priced subtotal + database compute delta + storage/IO/WAL/backup delta + isolated Auth environment + unpriced ingress/logging/alerts/build/registry + relevant database egress. Existing Production subscription/compute is an existing cost, **not** a new D1C fee. Edge reuse does not imply spare database capacity; its invocation-only price cannot be compared as a complete replacement for the Node service.

| Cross-provider component | Pilot planning allowance | 10x allowance | Evidence / accounting |
| --- | ---: | ---: | --- |
| Isolated Auth environment retained for a month | $35 | $35 | Conservative gross reference above, optional later Gate B expense, included once |
| Incremental database compute/storage/IO/WAL/backups | $20 | $75 | **PROPOSED reserve, actual UNKNOWN**, not a vendor quote or proof an upgrade suffices |
| Same-origin routing, log retention, alerts/monitoring | $20 | $40 | **PROPOSED reserve, actual UNKNOWN**; Render/Fly platform features do not establish external retention/paging cost; GCP log/metric volumes need separate quote |
| Builds, artifact registry, temporary replacement overlap | $5 | $5 | **PROPOSED reserve, actual UNKNOWN**; not guaranteed to cover frequent redeploys |
| Database egress at gross overage unit | $0.45 | $4.50 | Independent of host response egress |
| Total allowance | **$80.45** | **$159.50** | Add to priced subtotal, never label unpriced items $0 |

Resulting Render envelopes: **$132.20 / $157.20 pilot**, **$224.75 / $249.75 10x** (single/two). Fly equivalents: **$93.22 / $101.84**, **$175.87 / $184.49**. These are budget scenarios with reserves, not known total charges. Cloud Run cannot receive a reliable Singapore envelope until the regional compute/network quote and ingress design are complete. Edge cannot receive an equivalent two-instance envelope without a different operational design. Optional support, domain registration, SMTP/email test delivery, WAF, static-IP policy, extended backups, taxes and labor require explicit review; they are not silently included.

**PROPOSED PO spending control:** pilot ceiling $200/month incremental infrastructure; alert at 70% ($140) and escalate at 90% ($180), including month-end forecast. Separate 10x ceiling $300, alerts $210/$270, only after new approval and capacity tests. No automatic scale/purchase at a threshold. A Render dedicated-IP set (published $100/month [R13]) or PITR can exhaust the envelope; reprice and seek PO decision, potentially selecting the backup. Budget alerts are not hard provider billing caps. No existing provider account, credit, paid plan or available quota was assumed.

## 8. Capacity and operating work

**VERIFIED FROM REPOSITORY CODE:** 2,000 complete candidates; 2,001 explicit overflow; 128 shared snapshots, four per subject, ten-minute TTL, 16 MiB accounted snapshot budget; 1,024 scope sessions with 30-minute lifetime; 4,096 rate keys; singleton PostgreSQL quota lock. Four in-flight requests per instance; acquisition 1 s, statement 2 s, lock 1 s, idle transaction 5 s, request 5 s. Live public visibility remains checked each page. A larger machine does not remove any of these semantic/resource limits.

**Derived constraints:** 128 full-TTL slots sustain at most 12.8 new snapshots/minute without early removal; 32 subjects holding four each fill the store. Session retention yields roughly 34.1 new scopes/minute sustainable at the 1,024 bound. At the proposed 10x peak, 10 requests/s x 5% issuance = 30 new snapshots/minute, exceeding the full-TTL capacity in a sustained ten-minute window. Its 600 requests/minute also reaches the global rate limit. **Current code is not shown capable of the 10x peak**, regardless of provider. The cost scenario is not a performance PASS.

`store.ts` locks the same gate and deletes expired rows during rate/session/snapshot creation operations. More instances do not parallelize that lock. No idle cleanup scheduler exists; expiration is not guaranteed physical deletion while traffic stops. SQL row/index/WAL/dead-tuple/backup cost exceeds encrypted payload bytes. Popular Topic fan-out and >2,000 HOME candidates can reject legitimate demand without CPU exhaustion. No silent truncation, reranking or quota increase is proposed.

**PROPOSED later isolated acceptance:** one and two service instances, true ordinary roles, simultaneous issuance, NAT-shared visitors, abusive anonymous churn, quota exhaustion, 2,000/2,001 candidates, restart/key-overlap, Auth/JWKS outage, slow DB, failed COMMIT and mixed-revision drain. Initial targets: p50 <=150 ms, p95 <=300 ms, p99 <=750 ms at agreed ordinary load; unexpected failures <0.1%; pool wait p95 <100 ms; lock wait p95 <50 ms; no deadline violation beyond controlled abort cleanup; bounded memory/WAL plateau; zero cross-caller leaks. Measure overload rejections separately from success latency. These are proposals, not Production SLOs. Render/Fly/Cloud Run can host future isolated paired services; actual provisionability and tests remain unverified. Edge needs an equivalent worker-distribution test rather than pretending two permanent workers exist.

| Option | PROPOSED ongoing effort, pilot / 10x | Main operating responsibility |
| --- | --- | --- |
| Render | 2-4 / 4-8 engineer-hours per month | Image/runtime patching, two pools, retention, alert response, controlled rollout/key overlap; platform manages host/ingress |
| Fly | 4-8 / 6-12 hours | Above plus Machine placement, image lifecycle, egress identity and observability integration |
| Cloud Run | 4-8 / 6-12 hours | Above plus IAM, revisions, LB, service-level scaling, billing and optional VPC/NAT |
| Edge | 4-8 / 6-12 hours after a separately estimated port | Worker/connection adapter, invocation pressure, platform logs and shared-state lifecycle |

Hours are planning estimates, not provider commitments, and exclude initial implementation, incidents and security remediation. Labor cost is `hours * PO-approved loaded hourly rate`, currently **UNKNOWN**. PO must appoint a human primary and backup operator/security reviewer; Codex A can implement approved work but cannot be the unattended on-call owner. Database contention/expiry vacuum and backup ownership remain with the assigned database operator, not the hosting provider.

**PROPOSED rollback/exit:** disable ingress to Discovery only, stop new issuance, drain bounded requests and both pools, redeploy known-good artifact/config/keyring, and preserve explicit cursor failures. Do not revert canonical schema/privacy or restore broad grants. Expired operational state can be discarded through an approved lifecycle, not silently reconstructed. A Node container and unchanged Supabase data path make Render/Fly exit mostly host/ingress/secrets work; DNS/cookie/key continuity, image provenance and database credentials still require rehearsal. Platform rollback does not undo database state or guarantee old keys remain safe. No rollback or deployment action occurred here.

## 9. Risks and unknowns

| Risk | Level / evidence | Gate condition |
| --- | --- | --- |
| Genuine session/account validity and missing WeChat session_id | High, BLOCKED; source verified, real Auth NOT VERIFIED | Gate B genuine issued-session tests and explicit unsupported-client decision; no verification weakening |
| Hosted caller login/memberships and operations role | High, UNKNOWN/BLOCKED | Separate Gate C approval and isolated proof; never privileged fallback |
| Region, actual capacity, existing connection usage | High, UNKNOWN | PO-provided non-secret facts or separately authorized fresh Gate F; >=30% headroom including overlap |
| Snapshot/session/quota ceilings and singleton contention | High, code verified; 10x peak exceeds modeled issuance capacity | Gate E workload review and isolated tests; any new algorithm/quota requires review |
| Ingress bypass, spoofed proxy headers, cookie routing | High, UNKNOWN hosted behavior | Same-origin route ownership, TLS/proxy/auth/rate tests; no new client route in this phase |
| Dependency/build artifact exposure | High, unresolved backlog | Preserve historical 44 vulnerabilities (2 low/7 moderate/32 high/3 critical), CI 45 (2/6/34/3), and assessment's later 44. Count difference uninvestigated, nothing remediated; Gate D minimal artifact/SBOM and advisory dispositions |
| Local metadata exceptions mistaken for hosted parity | High, historical evidence only | profiles physical attnum slots 7/12/13: NOT IDENTICAL, logical parity scoped; pg_trgm raw ACL: reviewed missing explicit EXECUTE entries on exactly 31 functions, effective access matched locally. Neither exception proves Production security parity or permits Canonical ACL drift |
| Unpriced traffic, operational logs, retention and backup costs | Medium/high, UNKNOWN | Requote all-in total, assign alert owner; spending ceiling not a performance/cost guarantee |
| Keys/clock/version mismatch across instances | High, untested hosted | Compatible key overlap, clock monitoring, mixed-version rollback and corruption tests |
| Two API instances mistaken for full HA | Medium/high | Same-region/API redundancy only; Supabase availability, failover and recovery separately reviewed |

No Production data was exported; no provider account, API service, database, extension, role, Auth user, secret, migration or deployment was created/changed. No Docker/Postgres integration or genuine Auth test ran. No implementation, runtime flags, lockfile or frontend configuration changed.

## 10. Gate handoff

Gate A can approve a **conditional design direction and planning ceiling**, not resources. Gate B requires a separate written authorization for an isolated genuine Supabase Auth environment and test identities. Gate C requires separately reviewed operational database/credential/key provisioning and a minimally privileged caller role. Gate D requires dependency/image and privacy review; Gate E representative isolated load/failure evidence; Gate F a separately authorized fresh read-only Production preflight. Gate G controlled backend deployment and Gate H client activation require **independent** approvals. None is implied by a documentation merge.

Applicable verification for this document: exact ancestry, docs-only diff, relative-link existence, source/price traceability, secret-pattern inspection, unchanged implementation/lockfile/runtime flags, static contract and safety checks, typechecks, changed-file lint, and `git diff --check`. Database/HTTP Auth integration results remain historical or unverified, never inferred from those guards.

**VERIFIED repository checks on 2026-10-15:**

| Check | Result |
| --- | --- |
| `npm run typecheck`; `npm run typecheck:baseline` | PASS; baseline reported no known or new diagnostics |
| `node scripts/schema-contract-check.mjs`; `node scripts/contract-truth-check.mjs` | PASS |
| `node scripts/public-person-contract-check.mjs`; `node scripts/product-blueprint-v1-contract-check.mjs`; `node scripts/discovery-v1-contract-check.mjs` | PASS; privacy and closed Discovery boundaries preserved |
| `npm run test:production-writes`; `npm run test:fixture-isolation`; `npm run test:runtime-mode`; `npm run test:profile-privacy` | PASS; static/local checks, not Production probes |
| `npm run test:ui-engineering-readiness`; `npm run test:ui-platform-readiness` | PASS |
| `npm run lint:changed` | PASS; no changed TypeScript files |
| `npm run build` | PASS after permitting Vite's local temporary-file write in the managed worktree; no deployment. Existing outdated Browserslist-data warning retained, no dependency update |
| Relative document links, official source register, credential-pattern review | PASS: 13 repository-relative links resolve; 44 official-source URLs recorded; no credential values included |
| Exact baseline, documentation-only scope, unchanged runtime/configuration/lockfile, `git diff --check` | PASS; remote main rechecked against the exact approved SHA |

The complete implementation/integration suite was not rerun for this documentation-only change; applicable static guards above were run individually. No Docker/Postgres integration, real Auth test, Production query, dependency installation/upgrade or infrastructure command was executed. Earlier D1B test results are historical evidence, not new Gate A results.

## 11. Official source register

All entries checked **2026-10-15** using public pages only. Public pages can change; dated quotes above are evidence for this assessment, not a future purchase commitment. No console login or project access was used. Price units/regions/exclusions are in section 7.

| Ref | Official source |
| --- | --- |
| R1 | [Render regions](https://render.com/docs/regions) |
| R2 | [Render web services, ingress/TLS](https://render.com/docs/web-services) |
| R3 | [Node version selection](https://render.com/docs/node-version) |
| R4 | [Render scaling](https://render.com/docs/scaling) |
| R5 | [Current compute IDs and legacy mapping](https://render.com/docs/compute-plans) |
| R6 | [Render deploy and shutdown sequence](https://render.com/docs/deploys) |
| R7 | [Environment variables and secrets](https://render.com/docs/configure-environment-variables) |
| R8 | [Operational features by workspace plan](https://render.com/docs/platform-features-by-plan) |
| R9 | [Render rollback scope](https://render.com/docs/rollbacks) |
| R10 | [Dedicated outbound IP design](https://render.com/docs/dedicated-ips) |
| R11 | [Official $25/2 GB compute corroboration](https://render.com/docs/render-vs-heroku-comparison) |
| R12 | [2026 workspace/bandwidth pricing changes](https://render.com/blog/better-pricing-for-fast-growing-teams) |
| R13 | [Render price list](https://render.com/pricing) (dynamic body; indexed official price evidence for optional IP set) |
| F1 | [Fly regions](https://docs.fly.io/reference/regions) |
| F2 | [Machine runtime, concurrency and shutdown configuration](https://docs.fly.io/reference/configuration) |
| F3 | [Image deployment](https://docs.fly.io/launch/deploy) |
| F4 | [IPv4/IPv6 egress, app-scoped static addresses](https://docs.fly.io/networking/egress-ips) |
| F5 | [Autostop/autostart versus fixed Machine count](https://docs.fly.io/launch/autostop-autostart) |
| F6 | [Fly resource prices, including Singapore example](https://docs.fly.io/about/pricing) |
| F7 | [Fly TLS](https://docs.fly.io/networking/tls) |
| F8 | [Fly secrets](https://docs.fly.io/apps/secrets) |
| F9 | [Fly metrics/retention](https://docs.fly.io/monitoring/metrics) |
| G1 | [Cloud Run prices and regions](https://cloud.google.com/run/pricing) (retrieved service rates default to Iowa) |
| G2 | [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract) |
| G3 | [Minimum instances](https://docs.cloud.google.com/run/docs/configuring/min-instances) |
| G4 | [Maximum instances and overrun caveats](https://docs.cloud.google.com/run/docs/configuring/max-instances) |
| G5 | [Custom domains and external application LB](https://docs.cloud.google.com/run/docs/mapping-custom-domains) |
| G6 | [Secret Manager integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets) |
| G7 | [Cloud Run monitoring](https://docs.cloud.google.com/run/docs/monitoring) |
| G8 | [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging) |
| G9 | [Revision traffic and rollback](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration) |
| G10 | [Load-balancer pricing](https://cloud.google.com/load-balancing/pricing) |
| G11 | [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing) |
| S1 | [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| S2 | [Edge limits](https://supabase.com/docs/guides/functions/limits) |
| S3 | [Edge regions](https://supabase.com/docs/guides/functions/regional-invocation) |
| S4 | [Edge runtime architecture](https://supabase.com/docs/guides/functions/architecture) |
| S5 | [IPv4/IPv6 compatibility and add-on](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP) |
| S6 | [Pooling and backend/client limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits) |
| S7 | [Auth session semantics](https://supabase.com/docs/guides/auth/sessions) |
| S8 | [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys) |
| S9 | [Invocation package billing](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations) |
| S10 | [Supabase plan/compute/storage pricing](https://supabase.com/pricing) |
| S11 | [TLS cipher deprecation](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) |

## 12. Product Owner decision sheet

Every row is independent and **PENDING**. A research recommendation is not approval.

| Decision | Recommendation and alternatives | Cost / risk / evidence | What explicit approval would authorize | What remains prohibited |
| --- | --- | --- | --- | --- |
| A. API architecture | Persistent Node + existing Supabase, two trust-domain pools; defer Edge and on-demand rewrite | Best repository fit; hosting adapter and genuine Auth remain BLOCKED; code and platform docs verified | Adopt a conditional architecture direction for later planning | No endpoint, deployment, operational SQL or client activation |
| B. Provider / region | Render Pro, paid 1c-2g, conditional Singapore; Fly sin/direct IPv6 backup; Cloud Run deferred | Region/network UNKNOWN; current hosting-only pilot $51.75 single/$76.75 two; database-local fit and role proof required | Select a preferred candidate for a separately authorized isolated feasibility phase | No signup/purchase/provisioning, no Production connectivity or network changes |
| C. Budget | $200/month pilot ceiling, $300 only for later 10x decision; 70%/90% alerts; alternatively reduce scope/defer | Planning envelopes include reserves, actual total UNKNOWN; labor excluded; static IP/PITR can exceed ceiling | Set a planning constraint and require final vendor quote/owner sign-off | No spending, automatic upgrades or reuse of unknown credits |
| D. Operations owner | Appoint human primary/backup backend operator and security/database reviewer; alternative managed support with separate quote | Render 2-4 h/month pilot planning estimate; incident coverage and hourly rate UNKNOWN | Assign accountability for future approvals, monitoring, incident and rotation runbooks | Codex is not unattended on-call; no permissions/secret access granted by designation alone |
| E. PostgreSQL strategy | Validate two distinct logins over session pooling on Render; direct IPv6 on Fly backup; defer transaction mode | Pre/post-BEGIN/COMMIT identity assumptions verified in code; hosted identity UNKNOWN; 8/16 steady connections plus overlap/headroom | Approve the strategy and acceptance matrix as a later test target | No managed authenticator reset, service_role, BYPASSRLS, broad grants, transaction-pool URL substitution or schema apply |
| F. Genuine isolated Auth | Recommend separately authorizing Gate B with explicit resource/identity/cleanup limits; alternative remain blocked | Gross $35/month isolated environment reserve, actual Auth NOT VERIFIED; WeChat unsupported token path retained | Only a subsequent explicit Gate B authorization may permit creating/using isolated Auth resources | No Auth resource or user now; no Production Auth, WeChat changes, Gate C, backend rollout or client activation |

**STOP after the documentation-only Draft PR. Gate A architecture approval remains pending. Gate B: NOT AUTHORIZED. Gate C: NOT AUTHORIZED. D1C deployment: NO-GO. Production access/mutation: NO. Client activation: NO.**
