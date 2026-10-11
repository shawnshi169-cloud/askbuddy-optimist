-- LOCAL ONLY: invoked by the endpoint-pinned runner, never against Production.
BEGIN;
SET LOCAL statement_timeout = '45s';
SET LOCAL lock_timeout = '5s';
SET LOCAL plpgsql.check_asserts = on;

DO $$
DECLARE
  a uuid := 'e3d00000-0000-4000-8000-000000000001';
  b uuid := 'e3d00000-0000-4000-8000-000000000002';
  c uuid := 'e3d00000-0000-4000-8000-000000000003';
  t uuid := 'e3d00000-0000-4000-8000-000000000010';
  unrelated uuid := 'e3d00000-0000-4000-8000-000000000011';
  q uuid;
  e uuid;
  e_duplicate uuid;
  e_private uuid;
  e_deleted uuid;
  e_unrelated uuid;
  e_missing_person uuid;
  answer_live uuid;
  answer_deleted uuid;
  answer_hidden uuid;
  payload jsonb;
  role_name text;
  candidates uuid[];
  state text;
BEGIN
  INSERT INTO auth.users(id,email) VALUES
    (a,'ec3d0-local-a@example.invalid'),(b,'ec3d0-local-b@example.invalid'),(c,'ec3d0-local-c@example.invalid');
  INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) VALUES
    (t,'EC3D0 Local Portfolio'),(unrelated,'EC3D0 Local Unrelated');
  INSERT INTO public.canonical_topic_terms_v1(topic_id,term) VALUES (t,'EC3D0 Local Alias');

  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claim.sub',a::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  ASSERT auth.uid() = a, 'Question caller identity';
  q := (public.create_question_v1('Local portfolio question','Real synthetic portfolio context',
    'career-development',ARRAY[t],NULL)->>'questionId')::uuid;
  ASSERT public.get_question_detail_v1(q)->'question'->>'requesterPersonId' = a::text;

  PERFORM set_config('request.jwt.claim.sub',b::text,true);
  ASSERT auth.uid() = b, 'Experience caller identity';
  e := public.create_person_experience_v1('Portfolio project','Completed a portfolio project',p_visibility=>'public');
  e_duplicate := public.create_person_experience_v1('Second portfolio project','Another real local evidence row',p_visibility=>'public');
  e_private := public.create_person_experience_v1('Private portfolio','Private evidence is never public');
  e_deleted := public.create_person_experience_v1('Deleted portfolio','Deleted evidence is never public',p_visibility=>'public');
  e_unrelated := public.create_person_experience_v1('Unrelated activity','Not related to the requested topic',p_visibility=>'public');
  PERFORM public.set_experience_topics_v1(e,ARRAY[t]);
  PERFORM public.set_experience_topics_v1(e_duplicate,ARRAY[t]);
  PERFORM public.set_experience_topics_v1(e_private,ARRAY[t]);
  PERFORM public.set_experience_topics_v1(e_deleted,ARRAY[t]);
  PERFORM public.set_experience_topics_v1(e_unrelated,ARRAY[unrelated]);
  PERFORM public.delete_person_experience_v1(e_deleted);
  ASSERT public.get_experience_topics_v1(e_deleted)->'experience' = 'null'::jsonb;
  ASSERT EXISTS(SELECT 1 FROM public.person_experiences WHERE id=e_private), 'Owner RLS includes private rows';
  ASSERT EXISTS(SELECT 1 FROM public.person_experiences WHERE id=e_deleted), 'Owner RLS includes tombstones';
  answer_live := (public.create_answer_v1(q,'A genuinely relevant local portfolio answer')->>'answerId')::uuid;
  answer_deleted := (public.create_answer_v1(q,'Deleted answer')->>'answerId')::uuid;
  answer_hidden := (public.create_answer_v1(q,'Hidden answer')->>'answerId')::uuid;
  PERFORM public.delete_answer_v1(answer_deleted);

  PERFORM set_config('request.jwt.claim.sub',c::text,true);
  e_missing_person := public.create_person_experience_v1('Missing profile portfolio','No safe Person projection',p_visibility=>'public');
  PERFORM public.set_experience_topics_v1(e_missing_person,ARRAY[t]);
  PERFORM set_config('role','postgres',true);
  DELETE FROM public.profiles WHERE user_id=c;
  INSERT INTO public.experience_transitions(experience_id,person_id,from_label,to_label)
    VALUES(e,b,'First project','Portfolio delivery');
  INSERT INTO public.experience_claims(experience_id,person_id,claim_type,claim_value)
    VALUES(e,b,'role','LOCAL OWNER ONLY CLAIM');
  UPDATE public.answers_v1 SET moderation_visibility='hidden' WHERE id=answer_hidden;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    PERFORM set_config('role',role_name,true);
    PERFORM set_config('request.jwt.claim.role',role_name,true);
    PERFORM set_config('request.jwt.claim.sub',CASE WHEN role_name='anon' THEN '' ELSE a::text END,true);
    ASSERT auth.uid() IS NOT DISTINCT FROM CASE WHEN role_name='anon' THEN NULL::uuid ELSE a END;
    ASSERT public.resolve_canonical_topic_v1(E'  EC3D0   LOCAL ALIAS\t')->'topic'->>'topicId' = t::text;
    ASSERT public.resolve_canonical_topic_v1('unknown local term')->'topic' = 'null'::jsonb;
    ASSERT public.get_question_detail_v1(q)->'question'->'topicIds' = jsonb_build_array(t);
    ASSERT public.get_experience_topics_v1(e)->'experience'->'topicIds' = jsonb_build_array(t);
    ASSERT public.get_experience_topics_v1(e_private)->'experience' = 'null'::jsonb;
    ASSERT public.get_experience_topics_v1(e_deleted)->'experience' = 'null'::jsonb;
    payload := public.get_public_person_experiences_v1(b,50,0);
    ASSERT jsonb_array_length(payload->'experiences')=3;
    ASSERT EXISTS(SELECT 1 FROM jsonb_array_elements(payload->'experiences') x
      WHERE x->>'experienceId'=e::text AND x->>'personId'=b::text AND jsonb_array_length(x->'transitions')=1);
    ASSERT payload::text NOT LIKE '%LOCAL OWNER ONLY CLAIM%' AND payload::text NOT LIKE '%claimValue%';
    payload := public.get_public_person_profile_v1(b)->'person';
    ASSERT payload->>'userId'=b::text;
    ASSERT NOT (payload ?| ARRAY['phone','email','id','gender','cityCode','isVerified','isExpert']);
    ASSERT payload->'expertExtension'='null'::jsonb, 'Ordinary Person requires no Expert row';
    ASSERT public.get_public_person_profile_v1(c)->'person'='null'::jsonb;
    ASSERT NOT has_column_privilege('anon','public.experience_claims','claim_value','SELECT');

    -- Relational feasibility only, NOT a deployed Discovery query/ranker. Public filters are explicit.
    SELECT array_agg(person_id ORDER BY person_id) INTO candidates FROM (
      SELECT DISTINCT x.person_id FROM public.person_experiences x
      JOIN public.experience_topics_v1 xt ON xt.experience_id=x.id
      JOIN public.question_topics_v1 qt ON qt.topic_id=xt.topic_id AND qt.question_id=q
      WHERE x.visibility='public' AND x.deleted_at IS NULL
        AND public.get_public_person_profile_v1(x.person_id)->'person' <> 'null'::jsonb
    ) people;
    ASSERT candidates=ARRAY[b], 'Public topic-linked evidence, missing Person excluded, Person deduplicated';
    ASSERT NOT EXISTS(SELECT 1 FROM public.experience_topics_v1 xt
      WHERE xt.experience_id=e_unrelated AND xt.topic_id=t), 'Unrelated topic excluded';
    payload := public.list_question_answers_v1(q,'latest',20,0);
    ASSERT jsonb_array_length(payload->'answers')=1;
    ASSERT payload->'answers'->0->>'answerId'=answer_live::text;
    ASSERT payload->'answers'->0->>'authorPersonId'=b::text;
    ASSERT payload->'answers'->0->>'viewerHasMarkedHelpful'='false';
    RAISE NOTICE 'PASS %: positive Q/Topic/public Experience/Person; private/deleted/unrelated/missing excluded; dedup; safe projection; Answer visibility',role_name;
  END LOOP;

  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claim.sub',a::text,true);
  ASSERT (SELECT count(*) FROM public.experience_claims)=0, 'Non-owner Claim isolation';
  BEGIN
    PERFORM public.set_experience_topics_v1(e,ARRAY[unrelated]);
    RAISE EXCEPTION 'Non-owner mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'PT404' THEN NULL;
  END;
  PERFORM public.close_question_v1(q);
  ASSERT public.get_question_detail_v1(q)->'question'->>'status'='closed', 'Closed is publicly readable';
  PERFORM set_config('request.jwt.claim.sub',b::text,true);
  ASSERT (SELECT count(*) FROM public.experience_claims)=1, 'Owner retains private Claim';
  ASSERT jsonb_array_length(public.get_public_person_experiences_v1(b,50,0)->'experiences')=3,
    'Public projector excludes own private and deleted evidence';
  BEGIN
    PERFORM public.create_answer_v1(q,'Closed rejection');
    RAISE EXCEPTION 'Closed Question unexpectedly accepted answer';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;
  END;
  RAISE NOTICE 'PASS owner/non-owner isolation, Claim boundary, closed Question read/write distinction';

  PERFORM set_config('role','postgres',true);
  UPDATE public.canonical_topics_v1 SET status='deprecated' WHERE topic_id=t;
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claim.sub',b::text,true);
  ASSERT public.resolve_canonical_topic_v1('EC3D0 Local Alias')->'topic'='null'::jsonb;
  ASSERT public.get_experience_topics_v1(e)->'experience'->'topicIds'=jsonb_build_array(t);
  ASSERT public.get_question_detail_v1(q)->'question'->'topicIds'=jsonb_build_array(t);
  PERFORM public.set_experience_topics_v1(e,ARRAY[t]);
  BEGIN
    PERFORM public.set_experience_topics_v1(e_unrelated,ARRAY[t]);
    RAISE EXCEPTION 'New deprecated association unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'PT422' THEN
    GET STACKED DIAGNOSTICS state = MESSAGE_TEXT;
    ASSERT state='TOPIC_INVALID_OR_INACTIVE';
  END;
  ASSERT public.get_experience_topics_v1(e_unrelated)->'experience'->'topicIds'=jsonb_build_array(unrelated);
  RAISE NOTICE 'PASS deprecated: resolver excludes, historical Q/E links retained, new attachment rejected atomically';

  PERFORM set_config('role','postgres',true);
  UPDATE public.questions_v1 SET moderation_visibility='hidden' WHERE id=q;
  PERFORM set_config('role','anon',true);
  PERFORM set_config('request.jwt.claim.sub','',true);
  ASSERT public.get_question_detail_v1(q)->'question'='null'::jsonb;
  ASSERT (SELECT count(*) FROM public.question_topics_v1 WHERE question_id=q)=0;
  ASSERT public.list_question_answers_v1(q,'latest',20,0)->'answers'='[]'::jsonb;
  PERFORM set_config('role','postgres',true);
  UPDATE public.questions_v1 SET moderation_visibility='visible',deleted_at=clock_timestamp() WHERE id=q;
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claim.sub',a::text,true);
  ASSERT public.get_question_detail_v1(q)->'question'='null'::jsonb;
  RAISE NOTICE 'PASS hidden/deleted Question excludes parent, Topic links and public Answer branch';
  PERFORM set_config('role','postgres',true);
END;
$$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
