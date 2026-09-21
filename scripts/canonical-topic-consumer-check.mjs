import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { withTopicLocalContract } from "./lib/topic-local-contract.mjs";

// Captured real B2B rollback-contained Production payload, not an HTTP success.
// Every identity/fact in this fixture was synthetic and rolled back in B2B.
const stored = JSON.parse(readFileSync("scripts/fixtures/ec3b2b-question-with-topic.json", "utf8"));
await withTopicLocalContract(async (_qa, app, topic) => {
  const first = stored.topicIds[0];
  const second = first.replace(/10$/, "11");
  const input = {
    p_title: stored.title, p_context: stored.context, p_primary_channel: stored.primaryChannel,
    p_topic_ids: [second, first], p_deep_exchange_budget_max_cents: null,
  };
  for (const name of ["create_question_v1", "update_question_v1"]) {
    const request = name === "update_question_v1" ? { ...input, p_question_id: stored.questionId } : input;
    assert.deepEqual(app.QUESTION_ANSWER_V1_RPCS[name].parseParams(request), request);
    assert.deepEqual(topic.parseQuestionTopicWriteV1(name, request), request);
    for (const ids of [[first, first], [first, first.toUpperCase()], ["not-a-uuid"]]) {
      assert.throws(() => app.QUESTION_ANSWER_V1_RPCS[name].parseParams({ ...request, p_topic_ids: ids }));
    }
    assert.deepEqual(app.QUESTION_ANSWER_V1_RPCS[name].parseParams({ ...request, p_topic_ids: [] }).p_topic_ids, []);
    const many = Array.from({ length: 32 }, (_, i) => `e3b2b000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`);
    assert.deepEqual(app.QUESTION_ANSWER_V1_RPCS[name].parseParams({ ...request, p_topic_ids: many }).p_topic_ids, many);
  }
  assert.deepEqual(app.parseCanonicalQuestionDetailV1(stored), stored);
  assert.deepEqual(topic.parseQuestionWithTopicsV1(stored), stored);
  assert.deepEqual(app.QUESTION_ANSWER_V1_RPCS.get_question_detail_v1.parseResult(
    { question: stored }, { p_question_id: stored.questionId }).question, stored);
  assert.deepEqual(app.QUESTION_ANSWER_V1_RPCS.list_questions_v1.parseResult(
    { questions: [stored], nextOffset: null },
    { p_primary_channel: null, p_status: null, p_limit: 20, p_offset: 0 }).questions, [stored]);
  for (const ids of [[first, first], [first, first.toUpperCase()], ["not-a-uuid"], [second, first]]) {
    assert.throws(() => app.parseCanonicalQuestionDetailV1({ ...stored, topicIds: ids }));
    assert.throws(() => topic.parseQuestionWithTopicsV1({ ...stored, topicIds: ids }));
    assert.throws(() => app.QUESTION_ANSWER_V1_RPCS.list_questions_v1.parseResult(
      { questions: [{ ...stored, topicIds: ids }], nextOffset: null },
      { p_primary_channel: null, p_status: null, p_limit: 20, p_offset: 0 }));
  }
  assert.deepEqual(app.parseCanonicalQuestionDetailV1({ ...stored, topicIds: [first, second] }).topicIds, [first, second]);
  assert.equal(app.parseQuestionAnswerV1StableError({ code: "PT422", message: "TOPIC_INVALID_OR_INACTIVE" }).messageKey, "TOPIC_INVALID_OR_INACTIVE");
  assert.equal(app.parseQuestionAnswerV1StableError({ code: "PT422", message: "CANONICAL_TOPIC_NOT_READY" }), null);
  assert.equal(app.parseQuestionAnswerV1StableError({ code: "PT400", message: "TOPIC_INVALID_OR_INACTIVE" }), null);
  for (const rpc of Object.values(topic.CANONICAL_TOPIC_V1_RPCS)) {
    assert.equal(rpc.authenticationMeaning, "minimum-access-requirement");
    assert.equal(rpc.preserveCallerIdentity, true);
  }
});
console.log("PASS: Topic consumer input/output, B2B captured nonempty payload, stable errors and caller identity (offline only)");
