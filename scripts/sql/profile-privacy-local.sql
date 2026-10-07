DO $test$
DECLARE
  v_role text;
  v_column text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF pg_catalog.has_table_privilege(v_role,'public.profiles','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected broad profiles privilege';
    END IF;
    FOREACH v_column IN ARRAY ARRAY['id','phone','gender','city_code','updated_at','is_verified','is_expert'] LOOP
      IF pg_catalog.has_column_privilege(v_role,'public.profiles',v_column,'SELECT') THEN
        RAISE EXCEPTION 'Unexpected private column SELECT';
      END IF;
    END LOOP;
  END LOOP;
  IF pg_catalog.has_function_privilege('anon','public.get_my_private_profile_v1()','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected anon EXECUTE';
  END IF;
END;
$test$;

SET LOCAL ROLE anon;
DO $test$
DECLARE
  v_column text;
BEGIN
  PERFORM user_id,nickname,avatar_url,cover_url,bio,city,school,industry,created_at FROM public.profiles;
  FOREACH v_column IN ARRAY ARRAY['id','phone','gender','city_code','updated_at','is_verified','is_expert'] LOOP
    BEGIN
      EXECUTE pg_catalog.format('SELECT %I FROM public.profiles LIMIT 0',v_column);
      RAISE EXCEPTION 'Private column unexpectedly readable';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  IF public.get_public_person_profile_v1('00000000-0000-4000-8000-000000000000') <> '{"person":null}'::jsonb THEN
    RAISE EXCEPTION 'Public Person missing response mismatch';
  END IF;
  IF pg_catalog.jsonb_typeof(public.search_app_content_v2('__privacy_local_no_match__',1)) <> 'object' THEN
    RAISE EXCEPTION 'Search V2 failed';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  v_column text;
BEGIN
  BEGIN
    PERFORM public.get_my_private_profile_v1();
    RAISE EXCEPTION 'Missing identity unexpectedly allowed';
  EXCEPTION WHEN SQLSTATE 'PT401' THEN
    IF SQLERRM <> 'AUTHENTICATION_REQUIRED' THEN RAISE; END IF;
  END;
  -- Claim context only: no Auth user or business fixture is created.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  IF public.get_my_private_profile_v1() <> '{"profile":null}'::jsonb THEN
    RAISE EXCEPTION 'Missing owner profile must return null';
  END IF;
  FOREACH v_column IN ARRAY ARRAY['id','user_id','phone','created_at','updated_at','is_verified','is_expert','gender','city_code','school','industry'] LOOP
    BEGIN
      EXECUTE pg_catalog.format('UPDATE public.profiles SET %I = DEFAULT WHERE false',v_column);
      RAISE EXCEPTION 'Forbidden column unexpectedly writable';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  BEGIN
    PERFORM phone FROM public.profiles;
    RAISE EXCEPTION 'Authenticated direct phone unexpectedly readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.profiles SET nickname=nickname,avatar_url=avatar_url,cover_url=cover_url,bio=bio,city=city WHERE false;
  IF pg_catalog.jsonb_typeof(public.search_app_content_v2('__privacy_local_no_match__',1)) <> 'object' THEN
    RAISE EXCEPTION 'Authenticated Search V2 failed';
  END IF;
END;
$test$;
RESET ROLE;
SELECT 'PROFILE_PRIVACY_LOCAL_PASS';
