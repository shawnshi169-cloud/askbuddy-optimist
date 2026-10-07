-- Owner-private read is the only client path to phone. No target identity input.
CREATE FUNCTION public.get_my_private_profile_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'PT401', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;

  RETURN pg_catalog.jsonb_build_object('profile', (
    SELECT pg_catalog.jsonb_build_object(
      'userId', p.user_id,
      'nickname', p.nickname,
      'avatarUrl', p.avatar_url,
      'coverUrl', p.cover_url,
      'bio', p.bio,
      'phone', p.phone,
      'city', p.city
    )
    FROM public.profiles AS p
    WHERE p.user_id = v_user_id
  ));
END;
$function$;

ALTER FUNCTION public.get_my_private_profile_v1() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_private_profile_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile_v1() TO authenticated, service_role;

-- Keep existing row policies and trusted signup/WeChat creation paths unchanged.
-- Reset table AND column ACLs: a table grant would override a column restriction.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (
  id, user_id, nickname, avatar_url, bio, phone, created_at, updated_at,
  city, cover_url, city_code, gender, school, industry, is_expert, is_verified
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Existing Public Person V1 facts plus batched author/avatar enrichment.
GRANT SELECT (
  user_id, nickname, avatar_url, cover_url, bio, city, school, industry, created_at
) ON TABLE public.profiles TO anon, authenticated;

-- Only fields currently implemented by useUpdateProfile; updated_at stays DB-owned.
GRANT UPDATE (nickname, avatar_url, cover_url, bio, city)
ON TABLE public.profiles TO authenticated;
