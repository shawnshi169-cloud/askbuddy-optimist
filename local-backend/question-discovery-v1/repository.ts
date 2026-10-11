import { z } from "zod";
import { cardSchema, DiscoveryError, LIMITS, uuid, type Request } from "./contract";
import type { QuestionDiscoveryCardV1Target } from "../../packages/shared-types/src/discovery-v1";

export type Caller = { role: "anon"; userId: null } | { role: "authenticated"; userId: string };
export interface QuestionRepository {
  identity(): Promise<Caller>;
  recall(request: Request, caller: Caller): Promise<string[]>;
  hydrate(ids: readonly string[], request: Request, caller: Caller): Promise<QuestionDiscoveryCardV1Target[]>;
}
// Must be an exclusively leased, trusted caller-scoped connection, never a privileged bypass connection.
// No request field can set role/JWT claims. A future authenticated transport must supply this adapter.
export type BoundQuery = (sql: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

const callerSql = `SELECT current_user::text AS role, auth.uid()::text AS "userId"`;
const topicSql = `($2::uuid IS NULL OR EXISTS (SELECT 1 FROM public.canonical_topics_v1 t
  WHERE t.topic_id=$2::uuid AND t.status='active'))`;
const publicPredicate = `q.deleted_at IS NULL AND q.moderation_visibility='visible'
  AND ($1::text IS NULL OR q.primary_channel=$1::text)
  AND ($2::uuid IS NULL OR EXISTS (SELECT 1 FROM public.question_topics_v1 qt
    WHERE qt.question_id=q.id AND qt.topic_id=$2::uuid))`;
const callerPredicate = `current_user::text=$4::text AND auth.uid() IS NOT DISTINCT FROM $5::uuid
  AND current_user IN ('anon','authenticated')`;

// cap+1 distinguishes a complete identity set from overflow. No OFFSET or silent truncation.
export const CANDIDATE_SQL = `WITH caller AS (${callerSql}), candidates AS MATERIALIZED (
  SELECT q.id, q.created_at FROM public.questions_v1 q
  WHERE ${callerPredicate} AND ${topicSql} AND ${publicPredicate}
  ORDER BY q.created_at DESC, q.id ASC LIMIT $3::integer
) SELECT (SELECT row_to_json(caller) FROM caller) AS caller, ${topicSql} AS "topicValid",
  COALESCE((SELECT jsonb_agg(id ORDER BY created_at DESC,id ASC) FROM candidates),'[]'::jsonb) AS ids`;

// Three bounded set operations: eligible IDs, visible Answer counts, current Topic projections.
// Snapshot order wins over any later created_at changes. No profile or legacy table read.
export const HYDRATE_SQL = `WITH caller AS (${callerSql}), eligible AS MATERIALIZED (
  SELECT q.id,q.title,q.context,q.primary_channel,q.deep_exchange_budget_max_cents,q.created_at,q.status,i.ordinal
  FROM unnest($3::uuid[]) WITH ORDINALITY i(id,ordinal) JOIN public.questions_v1 q ON q.id=i.id
  WHERE ${callerPredicate} AND ${topicSql} AND ${publicPredicate}
), counts AS (
  SELECT a.question_id,count(*) AS total FROM public.answers_v1 a JOIN eligible e ON e.id=a.question_id
  WHERE a.deleted_at IS NULL AND a.moderation_visibility='visible' GROUP BY a.question_id
), topics AS (
  SELECT qt.question_id,jsonb_agg(qt.topic_id ORDER BY qt.topic_id ASC) AS ids
  FROM public.question_topics_v1 qt JOIN eligible e ON e.id=qt.question_id GROUP BY qt.question_id
), cards AS (
  SELECT e.ordinal,jsonb_build_object('questionId',e.id,'title',e.title,'primaryChannel',e.primary_channel,
    'topicIds',COALESCE(t.ids,'[]'::jsonb),'deepExchangeBudgetMaxCents',e.deep_exchange_budget_max_cents,
    'createdAt',e.created_at,'status',e.status,'contextExcerpt',left(e.context,240),
    'answerCount',COALESCE(c.total,0)) AS card
  FROM eligible e LEFT JOIN counts c ON c.question_id=e.id LEFT JOIN topics t ON t.question_id=e.id
) SELECT (SELECT row_to_json(caller) FROM caller) AS caller,${topicSql} AS "topicValid",
  COALESCE((SELECT jsonb_agg(card ORDER BY ordinal) FROM cards),'[]'::jsonb) AS items`;

function parseCaller(value: unknown): Caller {
  const result = z.discriminatedUnion("role", [
    z.object({ role: z.literal("anon"), userId: z.null() }).strict(),
    z.object({ role: z.literal("authenticated"), userId: uuid }).strict(),
  ]).safeParse(value);
  if (!result.success) throw new DiscoveryError("UNTRUSTED_CALLER_CONTEXT");
  return result.data;
}
function assertContext(row: Record<string, unknown> | undefined, expected: Caller) {
  const actual = parseCaller(row?.caller);
  if (actual.role !== expected.role || actual.userId !== expected.userId)
    throw new DiscoveryError("UNTRUSTED_CALLER_CONTEXT");
  if (row?.topicValid !== true) throw new DiscoveryError("TOPIC_INVALID_OR_INACTIVE");
}
function parameters(request: Request, caller: Caller, selection: unknown): unknown[] {
  return [request.scope.kind === "channel" ? request.scope.primaryChannel : null,
    request.topicId, selection, caller.role, caller.userId];
}

export class SqlQuestionRepository implements QuestionRepository {
  constructor(private readonly query: BoundQuery) {}
  async identity(): Promise<Caller> {
    return parseCaller((await this.query(callerSql, [])).rows[0]);
  }
  async recall(request: Request, caller: Caller): Promise<string[]> {
    const row = (await this.query(CANDIDATE_SQL, parameters(request, caller, LIMITS.candidates + 1))).rows[0];
    assertContext(row, caller);
    const result = z.array(uuid).max(LIMITS.candidates + 1).safeParse(row.ids);
    if (!result.success || new Set(result.data).size !== result.data.length)
      throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    if (result.data.length > LIMITS.candidates) throw new DiscoveryError("SNAPSHOT_CAPACITY_EXCEEDED");
    return result.data;
  }
  async hydrate(ids: readonly string[], request: Request, caller: Caller): Promise<QuestionDiscoveryCardV1Target[]> {
    if (ids.length > LIMITS.page) throw new DiscoveryError("INVALID_PAGE_LIMIT");
    const row = (await this.query(HYDRATE_SQL, parameters(request, caller, ids))).rows[0];
    assertContext(row, caller);
    const result = z.array(cardSchema).max(LIMITS.page).safeParse(row.items);
    if (!result.success) throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    const positions = result.data.map(card => ids.indexOf(card.questionId));
    if (positions.some((position, index) => position < 0 || (index > 0 && position <= positions[index - 1])))
      throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    return result.data;
  }
}
