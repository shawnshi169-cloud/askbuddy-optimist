-- Explicitly authorized maintenance verification only. No new identities/fixtures.
-- Existing profile updates never change values and the entire transaction rolls back.
BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
DO $test$
DECLARE
  v_owner uuid;
  v_other uuid;
  v_person uuid;
  v_expected jsonb;
  v_actual jsonb;
  v_public jsonb;
  v_column text;
  v_rows integer;
  v_people integer := 0;
BEGIN
  SELECT p.user_id INTO STRICT v_owner FROM public.profiles p ORDER BY p.phone IS NULL, p.user_id LIMIT 1;
  SELECT p.user_id INTO STRICT v_other FROM public.profiles p WHERE p.user_id<>v_owner ORDER BY p.user_id LIMIT 1;
  SELECT pg_catalog.jsonb_build_object('profile',pg_catalog.jsonb_build_object(
    'userId',p.user_id,'nickname',p.nickname,'avatarUrl',p.avatar_url,
    'coverUrl',p.cover_url,'bio',p.bio,'phone',p.phone,'city',p.city))
  INTO v_expected FROM public.profiles p WHERE p.user_id=v_owner;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='public.get_my_private_profile_v1()'::regprocedure AND
    (p.pronargs<>0 OR NOT p.prosecdef OR p.provolatile<>'s' OR p.proconfig<>ARRAY['search_path=""'])) THEN
    RAISE EXCEPTION 'Owner RPC security metadata mismatch';
  END IF;
  IF pg_catalog.has_function_privilege('anon','public.get_my_private_profile_v1()','EXECUTE') THEN
    RAISE EXCEPTION 'Owner RPC anon EXECUTE must be denied by metadata';
  END IF;

  -- Compare public responses without exporting profile content, including ordinary and expert people.
  FOR v_person IN SELECT p.user_id FROM public.profiles p LOOP
    v_public := public.get_public_person_profile_v1(v_person);
    SET LOCAL ROLE anon;
    v_actual := public.get_public_person_profile_v1(v_person);
    IF v_actual IS DISTINCT FROM v_public THEN RAISE EXCEPTION 'Anon Public Person regression'; END IF;
    SET LOCAL ROLE authenticated;
    PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_owner::text,true);
    v_actual := public.get_public_person_profile_v1(v_person);
    IF v_actual IS DISTINCT FROM v_public THEN RAISE EXCEPTION 'Authenticated Public Person regression'; END IF;
    RESET ROLE;
    v_people := v_people+1;
  END LOOP;
  IF v_people=0 THEN RAISE EXCEPTION 'Existing Public Person coverage required'; END IF;

  SET LOCAL ROLE anon;
  PERFORM user_id,nickname,avatar_url,cover_url,bio,city,school,industry,created_at FROM public.profiles LIMIT 1;
  FOREACH v_column IN ARRAY ARRAY['id','phone','gender','city_code','updated_at','is_verified','is_expert'] LOOP
    BEGIN
      EXECUTE pg_catalog.format('SELECT %I FROM public.profiles LIMIT 0',v_column);
      RAISE EXCEPTION 'Anon private column unexpectedly readable';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  IF public.get_public_person_profile_v1('00000000-0000-4000-8000-000000000000') <> '{"person":null}'::jsonb THEN
    RAISE EXCEPTION 'Missing Public Person regression';
  END IF;
  IF pg_catalog.jsonb_typeof(public.search_app_content_v2('__privacy_cutover_no_match__',1)) <> 'object' THEN
    RAISE EXCEPTION 'Anon Search V2 regression';
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','',true);
  PERFORM pg_catalog.set_config('request.jwt.claims','{}',true);
  BEGIN
    PERFORM public.get_my_private_profile_v1();
    RAISE EXCEPTION 'Missing uid unexpectedly allowed';
  EXCEPTION WHEN SQLSTATE 'PT401' THEN
    IF SQLERRM <> 'AUTHENTICATION_REQUIRED' THEN RAISE; END IF;
  END;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_owner::text,true);
  v_actual := public.get_my_private_profile_v1();
  IF v_actual IS DISTINCT FROM v_expected THEN RAISE EXCEPTION 'Private owner projection mismatch'; END IF;
  FOREACH v_person IN ARRAY ARRAY[v_owner,v_other] LOOP
    BEGIN
      PERFORM phone FROM public.profiles WHERE user_id=v_person;
      RAISE EXCEPTION 'Authenticated own/cross-user direct phone unexpectedly readable';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  FOREACH v_column IN ARRAY ARRAY['id','user_id','phone','created_at','updated_at','is_verified','is_expert','gender','city_code','school','industry'] LOOP
    IF pg_catalog.has_column_privilege('authenticated','public.profiles',v_column,'UPDATE') THEN
      RAISE EXCEPTION 'Forbidden column UPDATE privilege';
    END IF;
    BEGIN
      EXECUTE pg_catalog.format('UPDATE public.profiles SET %I = %I WHERE user_id=$1',v_column,v_column) USING v_owner;
      RAISE EXCEPTION 'Forbidden direct owner UPDATE unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  UPDATE public.profiles SET nickname=nickname,avatar_url=avatar_url,cover_url=cover_url,bio=bio,city=city WHERE user_id=v_owner;
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>1 THEN RAISE EXCEPTION 'Approved owner edit failed'; END IF;
  IF public.get_my_private_profile_v1() IS DISTINCT FROM v_expected THEN RAISE EXCEPTION 'Owner values unexpectedly changed'; END IF;
  UPDATE public.profiles SET nickname=nickname WHERE user_id=v_other;
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>0 THEN RAISE EXCEPTION 'Cross-user edit unexpectedly allowed'; END IF;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_other::text,true);
  IF (public.get_my_private_profile_v1()->'profile'->>'userId') IS DISTINCT FROM v_other::text THEN
    RAISE EXCEPTION 'Owner RPC viewer isolation failed';
  END IF;
  IF pg_catalog.jsonb_typeof(public.search_app_content_v2('__privacy_cutover_no_match__',1)) <> 'object' THEN
    RAISE EXCEPTION 'Authenticated Search V2 regression';
  END IF;
  RESET ROLE;
END;
$test$;
ROLLBACK;
SELECT 'PROFILE_PRIVACY_PRODUCTION_ROLE_SMOKE_ROLLED_BACK' AS result;
