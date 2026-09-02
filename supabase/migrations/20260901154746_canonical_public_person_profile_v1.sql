CREATE OR REPLACE FUNCTION public.get_public_person_profile_v1(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'person',
    (
      SELECT jsonb_build_object(
        'userId', p.user_id,
        'displayName', nullif(btrim(p.nickname), ''),
        'avatarUrl', p.avatar_url,
        'coverUrl', p.cover_url,
        'bio', p.bio,
        'city', p.city,
        'school', p.school,
        'industry', p.industry,
        'joinedAt', p.created_at,
        'contributionSummary', jsonb_build_object(
          'answerCount', (
            SELECT count(*)
            FROM public.answers AS a
            WHERE a.author_id = p.user_id
              AND coalesce(a.is_hidden, false) = false
              AND a.status IN ('active', 'accepted')
          ),
          'postCount', (
            SELECT count(*)
            FROM public.posts AS post
            WHERE post.author_id = p.user_id
              AND post.status = 'active'
              AND post.visibility = 'public'
          )
        ),
        'expertExtension', (
          SELECT jsonb_build_object(
            'headline', e.headline,
            'intro', e.intro,
            'expertiseSummary', e.expertise_summary
          )
          FROM public.experts AS e
          WHERE e.user_id = p.user_id
            AND e.profile_status = 'active'
            AND e.is_active IS TRUE
          LIMIT 1
        )
      )
      FROM public.profiles AS p
      WHERE p.user_id = p_user_id
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_person_profile_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_person_profile_v1(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_person_profile_v1(uuid)
  TO anon, authenticated, service_role;
