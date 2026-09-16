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
  BEGIN EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    IF v_state <> p_state OR (p_key IS NOT NULL AND v_message <> p_key) THEN
      RAISE EXCEPTION 'Unexpected % / %, expected % / %', v_state, v_message, p_state, p_key;
    END IF;
    RAISE NOTICE 'PASS expected: % / %', p_state, coalesce(p_key, 'constraint/ACL');
    RETURN;
  END;
  RAISE EXCEPTION 'Expected error not raised: %', p_sql;
END;
$$;

INSERT INTO auth.users(id,email) VALUES
  ('e3b10000-0000-4000-8000-000000000001','topic-local-a@example.invalid'),
  ('e3b10000-0000-4000-8000-000000000002','topic-local-b@example.invalid');
INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) VALUES
  ('e3b10000-0000-4000-8000-000000000010','  LOCAL   Topic A  '),
  ('e3b10000-0000-4000-8000-000000000011','本地合成主题'),
  ('e3b10000-0000-4000-8000-000000000012','Local Topic C');
INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES
  ('e3b10000-0000-4000-8000-000000000010','LOCAL alias');
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topics_v1(canonical_name) VALUES ('local ALIAS')$s$,'23505');
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES ('e3b10000-0000-4000-8000-000000000011','local topic a')$s$,'23505');
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES ('e3b10000-0000-4000-8000-000000000011','local ALIAS')$s$,'23505');
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES ('e3b10000-0000-4000-8000-000000000010','  local alias ')$s$,'23505');
SELECT pg_temp.expect_error($s$DELETE FROM public.canonical_topic_terms_v1 WHERE normalized_term='local topic a'; SET CONSTRAINTS ALL IMMEDIATE$s$,'23503');
SELECT pg_temp.expect_error($s$DELETE FROM public.canonical_topics_v1 WHERE topic_id='e3b10000-0000-4000-8000-000000000012'$s$,'PT403','TOPIC_HARD_DELETE_FORBIDDEN');

SELECT pg_temp.check_true(count(*)=4 AND bool_and(relrowsecurity AND relforcerowsecurity),'four FORCE RLS relations')
  FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN
  ('canonical_topics_v1','canonical_topic_terms_v1','question_topics_v1','experience_topics_v1');
SELECT pg_temp.check_true(NOT has_table_privilege(role_name,table_name,'SELECT'),'column-only SELECT '||role_name||'/'||table_name)
  FROM unnest(ARRAY['anon','authenticated']) AS role_name CROSS JOIN unnest(ARRAY[
    'public.canonical_topics_v1','public.canonical_topic_terms_v1','public.question_topics_v1','public.experience_topics_v1']) AS table_name;
SELECT pg_temp.check_true(bool_and(NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=""'])
  AND NOT bool_or(EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0)),
  'new functions INVOKER / empty path / no PUBLIC EXECUTE') FROM pg_proc AS p
  WHERE p.pronamespace='ec3_topic_private'::regnamespace OR (p.pronamespace='public'::regnamespace AND
    p.proname IN ('resolve_canonical_topic_v1','get_experience_topics_v1','set_experience_topics_v1'));
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.contype='f' AND c.conrelid IN
  ('public.canonical_topics_v1'::regclass,'public.canonical_topic_terms_v1'::regclass,
   'public.question_topics_v1'::regclass,'public.experience_topics_v1'::regclass)
  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid AND i.indisvalid AND i.indpred IS NULL
    AND ARRAY(SELECT key FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(key,n)
      WHERE n<=cardinality(c.conkey) ORDER BY n)=c.conkey)), 'all FK leading-column indexes');

SET LOCAL ROLE anon;
SELECT pg_temp.check_true(public.resolve_canonical_topic_v1(E'\tLOCAL  topic A\n')->'topic'->>'topicId'='e3b10000-0000-4000-8000-000000000010','canonical normalization');
SELECT pg_temp.check_true(public.resolve_canonical_topic_v1('LOCAL alias')->'topic'->>'topicId'='e3b10000-0000-4000-8000-000000000010','alias normalization');
SELECT pg_temp.check_true(public.resolve_canonical_topic_v1('本地合成主题')->'topic'->>'topicId'='e3b10000-0000-4000-8000-000000000011','Chinese exact term');
SELECT pg_temp.check_true(public.resolve_canonical_topic_v1('unknown-local-term')->'topic'='null'::jsonb,'unresolved no creation');
SELECT pg_temp.check_true((SELECT count(*) FROM public.canonical_topics_v1)=3,'resolver no side effects');
SELECT 'TOPIC_DTO|' || jsonb_build_object('rpc','resolve_canonical_topic_v1','params',jsonb_build_object('p_term','local alias'),
  'result',public.resolve_canonical_topic_v1('local alias'))::text;
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topics_v1(canonical_name) VALUES ('spoof')$s$,'42501');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topics_v1(canonical_name) VALUES ('spoof')$s$,'42501');
SELECT pg_temp.expect_error($s$INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES ('e3b10000-0000-4000-8000-000000000010','spoof')$s$,'42501');
SELECT pg_temp.expect_error($s$UPDATE public.canonical_topics_v1 SET status='deprecated'$s$,'42501');
SELECT public.create_question_v1('empty','context','education-learning','{}',null)->>'questionId' AS empty_q \gset
SELECT pg_temp.check_true(public.get_question_detail_v1(:'empty_q')->'question'->'topicIds'='[]'::jsonb,'old/empty Question []');
SELECT public.create_question_v1('multiple','context','education-learning',ARRAY[
  'e3b10000-0000-4000-8000-000000000011','e3b10000-0000-4000-8000-000000000010']::uuid[],6900)->>'questionId' AS q \gset
SELECT pg_temp.check_true(public.get_question_detail_v1(:'q')->'question'->'topicIds'=
  '["e3b10000-0000-4000-8000-000000000010","e3b10000-0000-4000-8000-000000000011"]'::jsonb,'real sorted topics');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('failed atomic','context','education-learning',ARRAY['e3b10000-0000-4000-8000-000000000099']::uuid[],null)$s$,'PT422','TOPIC_INVALID_OR_INACTIVE');
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.questions_v1 WHERE title='failed atomic'),'failed create leaves no row');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('duplicate','context','education-learning',ARRAY['e3b10000-0000-4000-8000-000000000010','e3b10000-0000-4000-8000-000000000010']::uuid[],null)$s$,'PT400','INVALID_INPUT');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('null','context','education-learning',NULL,null)$s$,'PT400','INVALID_INPUT');
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''failed edit'',''context'',''education-learning'',ARRAY[''e3b10000-0000-4000-8000-000000000099'']::uuid[],null)',:'q'),'PT422','TOPIC_INVALID_OR_INACTIVE');
SELECT pg_temp.check_true(public.get_question_detail_v1(:'q')->'question'->>'title'='multiple','failed desired-state update rolls back content');
SELECT public.update_question_v1(:'q','edited','context','career-development',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[],null);
SELECT pg_temp.check_true(jsonb_array_length(public.get_question_detail_v1(:'q')->'question'->'topicIds')=1,'desired state removes only omitted links');
SELECT 'TOPIC_QUESTION|' || (public.get_question_detail_v1(:'q')->'question')::text;
SELECT pg_temp.check_true(EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_questions_v1(NULL,NULL,100,0)->'questions') item
  WHERE item->>'questionId'=:'q' AND item->'topicIds'='["e3b10000-0000-4000-8000-000000000010"]'::jsonb),'list uses actual topics');

RESET ROLE;
INSERT INTO public.person_experiences(id,person_id,title,description,visibility) VALUES
  ('e3b10000-0000-4000-8000-000000000020','e3b10000-0000-4000-8000-000000000001','public','synthetic','public'),
  ('e3b10000-0000-4000-8000-000000000021','e3b10000-0000-4000-8000-000000000001','private','synthetic','private');
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000020')->'experience'->'topicIds'='[]'::jsonb,'Experience zero topics');
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000020',ARRAY['e3b10000-0000-4000-8000-000000000011','e3b10000-0000-4000-8000-000000000010']::uuid[]);
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000021',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[]);
SELECT pg_temp.check_true((SELECT count(*) FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000021')=1,'owner sees private associations');
SELECT 'TOPIC_DTO|' || jsonb_build_object('rpc','get_experience_topics_v1','params',jsonb_build_object('p_experience_id','e3b10000-0000-4000-8000-000000000021'),
  'result',public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000021'))::text;

RESET ROLE;
UPDATE public.canonical_topics_v1 SET status='deprecated' WHERE topic_id='e3b10000-0000-4000-8000-000000000010';
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true(public.resolve_canonical_topic_v1('local alias')->'topic'='null'::jsonb,'deprecated resolver unresolved');
SELECT public.update_question_v1(:'q','retained deprecated','context','career-development',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[],null);
SELECT pg_temp.check_true(public.get_question_detail_v1(:'q')->'question'->'topicIds'='["e3b10000-0000-4000-8000-000000000010"]'::jsonb,'deprecated Question history retained');
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000020',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[]);
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000020')->'experience'->'topicIds'='["e3b10000-0000-4000-8000-000000000010"]'::jsonb,'deprecated Experience history retained');
SELECT pg_temp.expect_error(format('INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES (%L,''e3b10000-0000-4000-8000-000000000010'')',:'empty_q'),'PT422','TOPIC_INVALID_OR_INACTIVE');
SELECT pg_temp.expect_error($s$SELECT public.create_question_v1('deprecated new','context','education-learning',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[],null)$s$,'PT422','TOPIC_INVALID_OR_INACTIVE');
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000020','{}');
SELECT pg_temp.expect_error($s$SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000020',ARRAY['e3b10000-0000-4000-8000-000000000010']::uuid[])$s$,'PT422','TOPIC_INVALID_OR_INACTIVE');
SELECT pg_temp.expect_error($s$INSERT INTO public.experience_topics_v1(experience_id,topic_id) VALUES ('e3b10000-0000-4000-8000-000000000020','e3b10000-0000-4000-8000-000000000010')$s$,'PT422','TOPIC_INVALID_OR_INACTIVE');

SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000002',true);
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''other'',''context'',''career-development'',''{}'',null)',:'q'),'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.expect_error(format('INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES (%L,''e3b10000-0000-4000-8000-000000000012'')',:'q'),'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.expect_error($s$SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000020','{}')$s$,'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000021')->'experience'='null'::jsonb,'other user private RPC hidden');
SELECT pg_temp.check_true((SELECT count(*) FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000021')=0,'other user private direct hidden');

SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000001',true);
SELECT public.close_question_v1(:'q');
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''closed'',''context'',''career-development'',''{}'',null)',:'q'),'PT409','QUESTION_CLOSED');
SELECT pg_temp.expect_error(format('INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES (%L,''e3b10000-0000-4000-8000-000000000012'')',:'q'),'PT409','QUESTION_CLOSED');
DELETE FROM public.question_topics_v1 WHERE question_id=:'q';
SELECT pg_temp.check_true(public.get_question_detail_v1(:'q')->'question'->'topicIds'='["e3b10000-0000-4000-8000-000000000010"]'::jsonb,'closed direct delete changes zero rows');
SELECT public.delete_person_experience_v1('e3b10000-0000-4000-8000-000000000021');
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000021')->'experience'='null'::jsonb,'owner tombstone has no normal topics');
SELECT pg_temp.expect_error($s$SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000021','{}')$s$,'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');

RESET ROLE;
UPDATE public.questions_v1 SET moderation_visibility='hidden' WHERE id=:'q';
UPDATE public.questions_v1 SET deleted_at=clock_timestamp() WHERE id=:'empty_q';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''hidden'',''context'',''career-development'',''{}'',null)',:'q'),'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.expect_error(format('SELECT public.update_question_v1(%L,''deleted'',''context'',''career-development'',''{}'',null)',:'empty_q'),'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT pg_temp.check_true((SELECT count(*) FROM public.question_topics_v1 WHERE question_id=:'q')=0,'owner hidden parent links not readable');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.check_true((SELECT count(*) FROM public.question_topics_v1 WHERE question_id=:'q')=0,'anon hidden Question links absent');
SELECT pg_temp.check_true(public.get_question_detail_v1(:'q')->'question'='null'::jsonb,'hidden detail null');
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000021')->'experience'='null'::jsonb,'anon private/deleted Experience absent');
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000020')->'experience'->'topicIds'='[]'::jsonb,'anon public Experience readable');
SELECT pg_temp.check_true((SELECT count(*) FROM public.canonical_topics_v1)=3,'no implicit Topic creation');

-- Preserve the existing EC-1 parent lifecycle; all fixtures and temporary changes roll back.
RESET ROLE;
SELECT pg_temp.check_true((SELECT confdeltype='c' FROM pg_constraint
  WHERE conrelid='public.experience_topics_v1'::regclass AND conname='experience_topics_v1_experience_id_fkey'),
  'Experience parent FK cascades');
SELECT pg_temp.check_true((SELECT confdeltype='r' FROM pg_constraint
  WHERE conrelid='public.experience_topics_v1'::regclass AND conname='experience_topics_v1_topic_id_fkey'),
  'Topic root FK remains RESTRICT');
SELECT pg_temp.check_true(NOT has_table_privilege('authenticated','public.person_experiences','DELETE')
  AND NOT has_table_privilege('anon','public.person_experiences','DELETE'), 'no ordinary parent hard-delete privilege');
INSERT INTO auth.users(id,email) VALUES ('e3b10000-0000-4000-8000-000000000003','topic-local-cascade@example.invalid');
INSERT INTO public.person_experiences(id,person_id,title,description,visibility) VALUES
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000001','hard delete','synthetic','public'),
  ('e3b10000-0000-4000-8000-000000000031','e3b10000-0000-4000-8000-000000000001','service delete','synthetic','private'),
  ('e3b10000-0000-4000-8000-000000000032','e3b10000-0000-4000-8000-000000000003','account delete','synthetic','private'),
  ('e3b10000-0000-4000-8000-000000000033','e3b10000-0000-4000-8000-000000000001','soft delete','synthetic','public');
INSERT INTO public.experience_transitions(experience_id,person_id,from_label,to_label)
  SELECT e.id,e.person_id,'local before','local after' FROM public.person_experiences e
  WHERE e.id IN ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031',
    'e3b10000-0000-4000-8000-000000000032','e3b10000-0000-4000-8000-000000000033');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000001',true);
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000030',ARRAY['e3b10000-0000-4000-8000-000000000012']::uuid[]);
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000031',ARRAY['e3b10000-0000-4000-8000-000000000012']::uuid[]);
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000033',ARRAY['e3b10000-0000-4000-8000-000000000012']::uuid[]);
SELECT pg_temp.expect_error($s$DELETE FROM public.person_experiences WHERE id='e3b10000-0000-4000-8000-000000000030'$s$,'42501');
WITH removed AS (DELETE FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000031' RETURNING experience_id)
  SELECT pg_temp.check_true(count(*)=1,'ordinary owner association delete still works') FROM removed;
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000031',ARRAY['e3b10000-0000-4000-8000-000000000012']::uuid[]);
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000003',true);
SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000032',ARRAY['e3b10000-0000-4000-8000-000000000012']::uuid[]);
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000002',true);
SELECT pg_temp.expect_error($s$DELETE FROM public.person_experiences WHERE id='e3b10000-0000-4000-8000-000000000030'$s$,'42501');
WITH removed AS (DELETE FROM public.experience_topics_v1 WHERE experience_id IN
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031') RETURNING experience_id)
  SELECT pg_temp.check_true(count(*)=0,'non-owner association delete changes zero rows') FROM removed;
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000031')->'experience'='null'::jsonb,
  'private parent remains hidden from other user');
SELECT pg_temp.expect_error($s$SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000031','{}')$s$,'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000001',true);
SELECT pg_temp.check_true((SELECT count(*) FROM public.experience_topics_v1 WHERE experience_id IN
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031'))=2,'non-owner attempts left both associations intact');
SELECT public.delete_person_experience_v1('e3b10000-0000-4000-8000-000000000033');
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000033')->'experience'='null'::jsonb,
  'soft-deleted public Experience topics hidden from owner');
SELECT pg_temp.expect_error($s$SELECT public.set_experience_topics_v1('e3b10000-0000-4000-8000-000000000033','{}')$s$,'PT404','TARGET_NOT_FOUND_OR_INACCESSIBLE');
SELECT set_config('request.jwt.claim.sub','e3b10000-0000-4000-8000-000000000002',true);
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000033')->'experience'='null'::jsonb,
  'soft-deleted topics hidden from other user');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.check_true(public.get_experience_topics_v1('e3b10000-0000-4000-8000-000000000033')->'experience'='null'::jsonb,
  'soft-deleted topics hidden from anon');
RESET ROLE;
SELECT pg_temp.check_true(auth.uid() IS NULL,'privileged parent lifecycle has no owner JWT');
-- A privileged direct child DELETE with a still-existing parent must NOT use the cascade exception.
SELECT pg_temp.expect_error($s$DELETE FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000030'$s$,'PT401','AUTHENTICATION_REQUIRED');
DELETE FROM public.person_experiences WHERE id='e3b10000-0000-4000-8000-000000000030';
SET LOCAL ROLE service_role;
DELETE FROM public.person_experiences WHERE id='e3b10000-0000-4000-8000-000000000031';
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.person_experiences WHERE id IN
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031'))
  AND NOT EXISTS(SELECT 1 FROM public.experience_topics_v1 WHERE experience_id IN
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031'))
  AND NOT EXISTS(SELECT 1 FROM public.experience_transitions WHERE experience_id IN
  ('e3b10000-0000-4000-8000-000000000030','e3b10000-0000-4000-8000-000000000031')),
  'privileged Experience parent hard delete cascades old/new children');
DELETE FROM auth.users WHERE id='e3b10000-0000-4000-8000-000000000003';
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM auth.users WHERE id='e3b10000-0000-4000-8000-000000000003')
  AND NOT EXISTS(SELECT 1 FROM public.person_experiences WHERE id='e3b10000-0000-4000-8000-000000000032')
  AND NOT EXISTS(SELECT 1 FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000032')
  AND NOT EXISTS(SELECT 1 FROM public.experience_transitions WHERE experience_id='e3b10000-0000-4000-8000-000000000032'),
  'account cascade removes Experience and old/new children');
SELECT pg_temp.check_true(EXISTS(SELECT 1 FROM public.canonical_topics_v1
  WHERE topic_id='e3b10000-0000-4000-8000-000000000012' AND status='active'),'parent cleanup retains canonical Topic root');
SELECT pg_temp.check_true(EXISTS(SELECT 1 FROM public.person_experiences
  WHERE id='e3b10000-0000-4000-8000-000000000033' AND deleted_at IS NOT NULL)
  AND (SELECT count(*) FROM public.experience_topics_v1 WHERE experience_id='e3b10000-0000-4000-8000-000000000033')=1
  AND (SELECT count(*) FROM public.experience_transitions WHERE experience_id='e3b10000-0000-4000-8000-000000000033')=1,
  'soft delete retains parent and child storage');
ROLLBACK;
SELECT 'PERSISTENT_TOPIC_SQL_SMOKE_ROWS=' || (SELECT count(*) FROM auth.users WHERE id IN
 ('e3b10000-0000-4000-8000-000000000001','e3b10000-0000-4000-8000-000000000002','e3b10000-0000-4000-8000-000000000003'));
