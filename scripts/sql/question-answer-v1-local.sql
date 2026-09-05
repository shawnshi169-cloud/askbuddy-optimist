\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.check_true(p_ok boolean, p_name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', p_name; END IF;
  RAISE NOTICE 'PASS: %', p_name;
END;
$$;
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_state text, p_key text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text; v_message text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_state <> p_state OR (p_key IS NOT NULL AND v_message <> p_key) THEN
      RAISE EXCEPTION 'Unexpected error: % / %, expected % / %', v_state, v_message, p_state, p_key;
    END IF;
    RAISE NOTICE 'PASS expected error: % / %', p_state, coalesce(p_key, 'database guard');
    RETURN;
  END;
  RAISE EXCEPTION 'Expected error not raised: %', p_sql;
END;
$$;

-- Fixed LOCAL-only identities; the enclosing transaction rolls back auth/profile trigger rows too.
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'ec2-a@example.invalid', '{"nickname":"EC2 Person A"}'),
  ('e2000000-0000-4000-8000-000000000002', 'ec2-b@example.invalid', '{"nickname":"EC2 Person B"}'),
  ('e2000000-0000-4000-8000-000000000003', 'ec2-c@example.invalid', '{"nickname":"EC2 Person C"}');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM public.experts WHERE user_id IN
  ('e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000003')), 'ordinary Persons have no expert extension');

SELECT pg_temp.check_true(count(*) = 5 AND bool_and(relrowsecurity AND relforcerowsecurity), '5 relations ENABLE/FORCE RLS')
FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN
  ('questions_v1','answers_v1','answer_replies_v1','answer_helpful_marks_v1','answer_helpful_public_facts_v1');
SELECT pg_temp.check_true(count(*) = 12 AND bool_and(NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=""']), '12 public RPC invoker / empty path')
FROM pg_proc AS p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN
  ('create_question_v1','update_question_v1','close_question_v1','get_question_detail_v1','list_questions_v1',
  'create_answer_v1','delete_answer_v1','list_question_answers_v1','set_answer_helpful_v1',
  'create_answer_reply_v1','delete_answer_reply_v1','list_answer_replies_v1');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM pg_proc AS p,
  LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS acl
  WHERE p.pronamespace = 'ec2_private'::regnamespace AND (p.prosecdef OR acl.grantee = 0)), 'private helpers invoker / no PUBLIC execute');
SELECT pg_temp.check_true(bool_and(p.proconfig @> ARRAY['search_path=""']), 'all private helper/trigger paths empty')
FROM pg_proc AS p WHERE p.pronamespace = 'ec2_private'::regnamespace;
SELECT pg_temp.check_true(NOT EXISTS (
  SELECT 1 FROM pg_constraint AS c
  WHERE c.contype = 'f' AND c.conrelid IN ('public.questions_v1'::regclass,'public.answers_v1'::regclass,
    'public.answer_replies_v1'::regclass,'public.answer_helpful_marks_v1'::regclass,'public.answer_helpful_public_facts_v1'::regclass)
  AND NOT EXISTS (SELECT 1 FROM pg_index AS i WHERE i.indrelid = c.conrelid
    AND i.indisvalid AND i.indisready AND i.indpred IS NULL
    AND ARRAY(SELECT key FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(key,n)
      WHERE n <= cardinality(c.conkey) ORDER BY n) = c.conkey)
), 'every new FK has an unconditional leading-column index');
SELECT pg_temp.check_true(NOT has_table_privilege(role_name, relation_name, 'SELECT'), 'no table SELECT: ' || role_name || '/' || relation_name)
FROM unnest(ARRAY['anon','authenticated']) AS role_name CROSS JOIN unnest(ARRAY[
 'public.questions_v1','public.answers_v1','public.answer_replies_v1','public.answer_helpful_marks_v1','public.answer_helpful_public_facts_v1']) AS relation_name;
SELECT pg_temp.check_true(NOT has_column_privilege('anon','public.answer_helpful_public_facts_v1','mark_id','SELECT')
  AND NOT has_column_privilege('authenticated','public.answer_helpful_public_facts_v1','mark_id','SELECT'), 'public fact mark_id not selectable');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT public.create_question_v1('Question A', 'Required context', 'education-learning', '{}', 6900) ->> 'questionId' AS qid \gset
SELECT pg_temp.check_true((SELECT requester_person_id = auth.uid() FROM public.questions_v1 WHERE id = :'qid'), 'question derives auth.uid');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','context','education-learning',ARRAY['e2000000-0000-4000-8000-000000000099']::uuid[],null)$s$, 'PT422', 'CANONICAL_TOPIC_NOT_READY');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','context','education-learning',NULL,null)$s$, 'PT422', 'CANONICAL_TOPIC_NOT_READY');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','','education-learning','{}',null)$s$, 'PT400', 'INVALID_INPUT');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','c','bad-channel','{}',null)$s$, 'PT400', 'INVALID_INPUT');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','c','education-learning','{}',0)$s$, 'PT400', 'INVALID_INPUT');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','c','education-learning','{}',9007199254740992)$s$, 'PT400', 'INVALID_INPUT');
SELECT pg_temp.expect_error($s$INSERT INTO public.questions_v1(title,context,primary_channel) VALUES ('x',' ','education-learning')$s$, '23514');
SELECT pg_temp.expect_error($s$INSERT INTO public.questions_v1(title,context,primary_channel,deep_exchange_budget_max_cents) VALUES ('x','c','education-learning',-1)$s$, '23514');
SELECT pg_temp.expect_error($s$INSERT INTO public.questions_v1(title,context,primary_channel,requester_person_id) VALUES ('x','c','education-learning','e2000000-0000-4000-8000-000000000002')$s$, '42501');
SELECT pg_temp.expect_error($s$INSERT INTO public.questions_v1(title,context,primary_channel,status) VALUES ('x','c','education-learning','closed')$s$, '42501');
SELECT public.update_question_v1(:'qid', 'Question edited', 'Context edited', 'career-development', '{}', 9007199254740991);
SELECT pg_temp.expect_error(format('UPDATE public.questions_v1 SET moderation_visibility = ''hidden'' WHERE id = %L', :'qid'), '42501');
SELECT pg_temp.expect_error(format('UPDATE public.questions_v1 SET id = gen_random_uuid() WHERE id = %L', :'qid'), '42501');
SELECT pg_temp.expect_error(format('UPDATE public.questions_v1 SET created_at = now() WHERE id = %L', :'qid'), '42501');
SELECT pg_temp.expect_error(format('UPDATE public.questions_v1 SET deleted_at = now() WHERE id = %L', :'qid'), '42501');
SELECT pg_temp.expect_error(format('DELETE FROM public.questions_v1 WHERE id = %L', :'qid'), '42501');

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.expect_error(format('SELECT public.close_question_v1(%L)', :'qid'), 'PT404', 'TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''x'',''c'',''education-learning'',''{}'',null)', :'qid'), 'PT404', 'TARGET_NOT_FOUND_OR_INACCESSIBLE');
UPDATE public.questions_v1 SET title = 'cross-user mutation', status = 'closed' WHERE id = :'qid';
SELECT pg_temp.check_true((SELECT title = 'Question edited' AND status = 'open' FROM public.questions_v1 WHERE id = :'qid'), 'direct cross-user question UPDATE affects zero rows');
SELECT public.create_answer_v1(:'qid', 'Answer B') ->> 'answerId' AS aid \gset
SELECT pg_temp.expect_error(format('INSERT INTO public.answers_v1(question_id,body,author_person_id) VALUES (%L,''spoof'',''e2000000-0000-4000-8000-000000000001'')', :'qid'), '42501');
SELECT pg_temp.expect_error(format('SELECT public.set_answer_helpful_v1(%L,true)', :'aid'), 'PT403', 'SELF_HELPFUL_FORBIDDEN');
SELECT pg_temp.check_true((public.set_answer_helpful_v1(:'aid',false)->>'helpfulCount')::int = 0, 'self false no-op');
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_helpful_marks_v1(answer_id) VALUES (%L)', :'aid'), 'PT403', 'SELF_HELPFUL_FORBIDDEN');
SELECT pg_temp.expect_error(format('UPDATE public.answers_v1 SET body = ''changed'' WHERE id = %L', :'aid'), '42501');
SELECT pg_temp.expect_error(format('UPDATE public.answers_v1 SET question_id = gen_random_uuid() WHERE id = %L', :'aid'), '42501');

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000003', true);
SELECT public.create_answer_reply_v1(:'aid', 'Reply C') ->> 'replyId' AS rid \gset
SELECT public.create_answer_reply_v1(:'aid', 'Reply C retained') ->> 'replyId' AS rid2 \gset
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_replies_v1(answer_id,body,author_person_id) VALUES (%L,''spoof'',''e2000000-0000-4000-8000-000000000001'')', :'aid'), '42501');
SELECT pg_temp.expect_error(format('SELECT public.delete_answer_v1(%L)', :'aid'), 'PT404', 'TARGET_NOT_FOUND_OR_INACCESSIBLE');
UPDATE public.answers_v1 SET deleted_at = now() WHERE id = :'aid';
SELECT pg_temp.check_true((SELECT deleted_at IS NULL FROM public.answers_v1 WHERE id = :'aid'), 'direct cross-user answer soft-delete affects zero rows');
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_helpful_public_facts_v1(mark_id,answer_id) VALUES (gen_random_uuid(),%L)', :'aid'), '42501');

-- Candidate gate: require pairing at transaction boundary even for direct writes.
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_helpful_marks_v1(answer_id) VALUES (%L); SET CONSTRAINTS ALL IMMEDIATE', :'aid'), '23503');
SELECT pg_temp.check_true((public.set_answer_helpful_v1(:'aid',true)->>'helpfulCount')::int = 1, 'C Helpful true real count');
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT pg_temp.check_true((public.set_answer_helpful_v1(:'aid',true)->>'helpfulCount')::int = 1, 'duplicate true idempotent');
SELECT pg_temp.expect_error(format('DELETE FROM public.answer_helpful_public_facts_v1 WHERE answer_id = %L; SET CONSTRAINTS ALL IMMEDIATE', :'aid'), '23503');
SELECT pg_temp.check_true((public.set_answer_helpful_v1(:'aid',false)->>'helpfulCount')::int = 0, 'false removes pair');
SELECT pg_temp.check_true((public.set_answer_helpful_v1(:'aid',false)->>'helpfulCount')::int = 0, 'duplicate false idempotent');
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SELECT pg_temp.expect_error(format('SELECT public.delete_answer_reply_v1(%L)', :'rid'), 'PT404', 'TARGET_NOT_FOUND_OR_INACCESSIBLE');
UPDATE public.answer_replies_v1 SET deleted_at = now() WHERE id = :'rid';
SELECT pg_temp.check_true((SELECT deleted_at IS NULL FROM public.answer_replies_v1 WHERE id = :'rid'), 'direct cross-user reply soft-delete affects zero rows');
SELECT public.set_answer_helpful_v1(:'aid',true);
SELECT pg_temp.check_true((public.list_question_answers_v1(:'qid','comprehensive',10,0)->'answers'->0->>'viewerHasMarkedHelpful')::boolean, 'caller-own Helpful=true');
SELECT pg_temp.expect_error('SELECT mark_id FROM public.answer_helpful_public_facts_v1', '42501');
SELECT pg_temp.check_true((public.get_question_detail_v1(:'qid')->'question'->>'answerCount')::int = 1, 'answerCount real');
SELECT pg_temp.check_true((public.list_question_answers_v1(:'qid','latest',10,0)->'answers'->0->>'replyCount')::int = 2, 'replyCount real');
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','get_question_detail_v1','params',jsonb_build_object('p_question_id',:'qid'),
  'result',public.get_question_detail_v1(:'qid'))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_questions_v1','params',jsonb_build_object('p_primary_channel',NULL,'p_status',NULL,'p_limit',10,'p_offset',0),
  'result',public.list_questions_v1(NULL,NULL,10,0))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_question_answers_v1','params',jsonb_build_object('p_question_id',:'qid','p_order','comprehensive','p_limit',10,'p_offset',0),
  'result',public.list_question_answers_v1(:'qid','comprehensive',10,0))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_answer_replies_v1','params',jsonb_build_object('p_answer_id',:'aid','p_limit',10,'p_offset',0),
  'result',public.list_answer_replies_v1(:'aid',10,0))::text;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT pg_temp.check_true((public.list_question_answers_v1(:'qid','latest',10,0)->'answers'->0->>'viewerHasMarkedHelpful')::boolean = false, 'anon viewer=false');
SELECT pg_temp.check_true((public.list_question_answers_v1(:'qid','latest',10,0)->'answers'->0->>'helpfulCount')::int = 1, 'anon count global real');
SELECT pg_temp.expect_error('SELECT person_id FROM public.answer_helpful_marks_v1', '42501');
SELECT pg_temp.expect_error('SELECT mark_id FROM public.answer_helpful_public_facts_v1', '42501');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('x','c','education-learning','{}',null)$s$, '42501');
SELECT pg_temp.expect_error($s$INSERT INTO public.questions_v1(title,context,primary_channel) VALUES ('x','c','education-learning')$s$, '42501');
SELECT pg_temp.expect_error(format('INSERT INTO public.answers_v1(question_id,body) VALUES (%L,''anon'')', :'qid'), '42501');
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_replies_v1(answer_id,body) VALUES (%L,''anon'')', :'aid'), '42501');
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','get_question_detail_v1','params',jsonb_build_object('p_question_id',:'qid'),
  'result',public.get_question_detail_v1(:'qid'))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_questions_v1','params',jsonb_build_object('p_primary_channel',NULL,'p_status',NULL,'p_limit',10,'p_offset',0),
  'result',public.list_questions_v1(NULL,NULL,10,0))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_question_answers_v1','params',jsonb_build_object('p_question_id',:'qid','p_order','latest','p_limit',10,'p_offset',0),
  'result',public.list_question_answers_v1(:'qid','latest',10,0))::text;
SELECT 'EC2_DTO|' || jsonb_build_object('rpc','list_answer_replies_v1','params',jsonb_build_object('p_answer_id',:'aid','p_limit',10,'p_offset',0),
  'result',public.list_answer_replies_v1(:'aid',10,0))::text;
SELECT pg_temp.check_true(public.get_question_detail_v1('e2000000-0000-4000-8000-000000000099') = '{"question":null}'::jsonb, 'missing detail null');
SELECT pg_temp.check_true(public.list_question_answers_v1('e2000000-0000-4000-8000-000000000099','latest',10,0) = '{"answers":[],"nextOffset":null}'::jsonb, 'missing answers empty');
SELECT pg_temp.check_true(jsonb_array_length(public.list_answer_replies_v1(:'aid',10,0)->'replies') = 2, 'anon replies visible');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT pg_temp.check_true((public.list_question_answers_v1(:'qid','latest',10,0)->'answers'->0->>'viewerHasMarkedHelpful')::boolean = false, 'other viewer=false');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.answer_helpful_marks_v1), 'other viewer cannot read A mark');
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000001', true);
SELECT public.close_question_v1(:'qid');
SELECT pg_temp.check_true(public.close_question_v1(:'qid')->>'status' = 'closed', 'repeat close idempotent');
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''Question edited'',''Context edited'',''career-development'',''{}'',9007199254740991)', :'qid'), 'PT409', 'QUESTION_CLOSED');
SELECT pg_temp.expect_error(format('UPDATE public.questions_v1 SET status = ''open'' WHERE id = %L', :'qid'), 'PT409', 'QUESTION_CLOSED');
SELECT pg_temp.check_true(public.get_question_detail_v1(:'qid')->'question'->>'status' = 'closed', 'closed detail still readable');
SELECT public.set_answer_helpful_v1(:'aid',false);
SELECT public.set_answer_helpful_v1(:'aid',true);
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.expect_error(format('SELECT public.create_answer_v1(%L,''late'')', :'qid'), 'PT409', 'QUESTION_CLOSED');
SELECT pg_temp.expect_error(format('INSERT INTO public.answers_v1(question_id,body) VALUES (%L,''late direct'')', :'qid'), 'PT409', 'QUESTION_CLOSED');
SELECT pg_temp.expect_error(format('SELECT public.create_answer_reply_v1(%L,''late'')', :'aid'), 'PT409', 'QUESTION_CLOSED');
SELECT pg_temp.expect_error(format('INSERT INTO public.answer_replies_v1(answer_id,body) VALUES (%L,''late direct'')', :'aid'), 'PT409', 'QUESTION_CLOSED');
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000003', true);
SELECT public.delete_answer_reply_v1(:'rid');
SELECT pg_temp.check_true(jsonb_array_length(public.list_answer_replies_v1(:'aid',10,0)->'replies') = 1, 'reply soft-delete on closed question');
SELECT pg_temp.check_true((SELECT deleted_at IS NOT NULL FROM public.answer_replies_v1 WHERE id = :'rid'), 'own reply tombstone storage retained');
SELECT set_config('request.jwt.claim.sub', 'e2000000-0000-4000-8000-000000000002', true);
SELECT public.delete_answer_v1(:'aid');
SELECT pg_temp.check_true((SELECT deleted_at IS NOT NULL FROM public.answers_v1 WHERE id = :'aid'), 'own answer tombstone retained');
SELECT pg_temp.check_true(jsonb_array_length(public.list_question_answers_v1(:'qid','latest',10,0)->'answers') = 0, 'normal owner projection hides deleted answer');
SELECT pg_temp.expect_error(format('UPDATE public.answers_v1 SET deleted_at = NULL WHERE id = %L', :'aid'), 'PT403', 'IMMUTABLE_FIELD');
SELECT pg_temp.expect_error(format('DELETE FROM public.answers_v1 WHERE id = %L', :'aid'), '42501');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.check_true(jsonb_array_length(public.list_answer_replies_v1(:'aid',10,0)->'replies') = 0, 'deleted answer hides entire reply branch');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.answers_v1 WHERE id = :'aid'), 'anon cannot read answer tombstone');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.answer_helpful_public_facts_v1 WHERE answer_id = :'aid'), 'no public Helpful projection for deleted answer');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) = 2 FROM public.answer_replies_v1 WHERE answer_id = :'aid'), 'reply storage not cascade deleted');

-- Moderation and deterministic pagination use privileged LOCAL setup, not client capabilities.
INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,created_at) VALUES
 ('e2100000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','q1','c','hobbies-skills','2030-01-01'),
 ('e2100000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000001','q2','c','hobbies-skills','2030-01-01'),
 ('e2100000-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000001','q3','c','hobbies-skills','2029-01-01');
INSERT INTO public.answers_v1(id,question_id,author_person_id,body,created_at) VALUES
 ('e2200000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002','a1','2030-01-01'),
 ('e2200000-0000-4000-8000-000000000002','e2100000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002','a2','2030-01-01'),
 ('e2200000-0000-4000-8000-000000000003','e2100000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002','a3','2029-01-01');
INSERT INTO public.answer_replies_v1(id,answer_id,author_person_id,body,created_at) VALUES
 ('e2300000-0000-4000-8000-000000000001','e2200000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000003','r1','2029-01-01'),
 ('e2300000-0000-4000-8000-000000000002','e2200000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000003','r2','2029-01-01'),
 ('e2300000-0000-4000-8000-000000000003','e2200000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000003','r3','2030-01-01');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2000000-0000-4000-8000-000000000001',true);
SELECT public.set_answer_helpful_v1('e2200000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.check_true(public.list_questions_v1('hobbies-skills',NULL,2,0)->'questions'->0->>'questionId' = 'e2100000-0000-4000-8000-000000000001', 'question order tie id asc');
SELECT pg_temp.check_true(public.list_questions_v1('hobbies-skills',NULL,2,0)->>'nextOffset' = '2', 'page hasMore real');
SELECT pg_temp.check_true(public.list_questions_v1('hobbies-skills',NULL,2,2)->'nextOffset' = 'null'::jsonb, 'last page nextOffset null');
SELECT pg_temp.check_true(public.list_questions_v1('hobbies-skills',NULL,2,50) = '{"questions":[],"nextOffset":null}'::jsonb, 'past end empty');
SELECT pg_temp.check_true(public.list_question_answers_v1('e2100000-0000-4000-8000-000000000001','comprehensive',2,0)->'answers'->0->>'answerId' = 'e2200000-0000-4000-8000-000000000003', 'comprehensive Helpful precedes time');
SELECT pg_temp.check_true(public.list_question_answers_v1('e2100000-0000-4000-8000-000000000001','latest',2,0)->'answers'->0->>'answerId' = 'e2200000-0000-4000-8000-000000000001', 'latest time then id');
SELECT pg_temp.check_true(public.list_question_answers_v1('e2100000-0000-4000-8000-000000000001','latest',2,0)->>'nextOffset' = '2'
 AND public.list_question_answers_v1('e2100000-0000-4000-8000-000000000001','latest',2,2)->'nextOffset' = 'null'::jsonb, 'answer pagination real end');
SELECT pg_temp.check_true(public.list_answer_replies_v1('e2200000-0000-4000-8000-000000000001',2,0)->'replies'->0->>'replyId' = 'e2300000-0000-4000-8000-000000000001', 'reply chronological tie id asc');
SELECT pg_temp.check_true(public.list_answer_replies_v1('e2200000-0000-4000-8000-000000000001',2,0)->>'nextOffset' = '2'
 AND public.list_answer_replies_v1('e2200000-0000-4000-8000-000000000001',2,2)->'nextOffset' = 'null'::jsonb, 'reply pagination real end');
SELECT pg_temp.expect_error($s$SELECT public.list_questions_v1(NULL,NULL,101,0)$s$, 'PT400', 'INVALID_INPUT');
RESET ROLE;
UPDATE public.answer_replies_v1 SET moderation_visibility = 'hidden' WHERE id = 'e2300000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true(jsonb_array_length(public.list_answer_replies_v1('e2200000-0000-4000-8000-000000000001',10,0)->'replies') = 2, 'hidden reply only itself excluded');
RESET ROLE;
UPDATE public.answers_v1 SET moderation_visibility = 'hidden' WHERE id = 'e2200000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true(jsonb_array_length(public.list_answer_replies_v1('e2200000-0000-4000-8000-000000000001',10,0)->'replies') = 0, 'hidden answer branch excluded');
RESET ROLE;
UPDATE public.questions_v1 SET moderation_visibility = 'hidden' WHERE id = 'e2100000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true(public.get_question_detail_v1('e2100000-0000-4000-8000-000000000001') = '{"question":null}'::jsonb, 'hidden question detail null');
SELECT pg_temp.check_true(jsonb_array_length(public.list_question_answers_v1('e2100000-0000-4000-8000-000000000001','latest',10,0)->'answers') = 0, 'hidden question entire branch excluded');
RESET ROLE;
DELETE FROM public.profiles WHERE user_id = 'e2000000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
SELECT pg_temp.check_true(public.get_question_detail_v1(:'qid')->'question'->'requester' = 'null'::jsonb, 'missing public profile summary null without fake fallback');
RESET ROLE;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email LIKE 'ec2-%@example.invalid')
  AND NOT EXISTS (SELECT 1 FROM public.questions_v1) AND NOT EXISTS (SELECT 1 FROM public.answers_v1)
  AND NOT EXISTS (SELECT 1 FROM public.answer_replies_v1) AND NOT EXISTS (SELECT 1 FROM public.answer_helpful_marks_v1)
  AND NOT EXISTS (SELECT 1 FROM public.answer_helpful_public_facts_v1)
  THEN 'PERSISTENT_LOCAL_SMOKE_ROWS=0' ELSE 'PERSISTENT_LOCAL_SMOKE_ROWS_NOT_ZERO' END;
