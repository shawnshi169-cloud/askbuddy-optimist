-- EC-1A Canonical Experience v1.
-- Additive only: no legacy expert data is copied or reclassified.

BEGIN;

CREATE TABLE public.person_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  experience_kind text NOT NULL DEFAULT 'other',
  start_year smallint,
  start_month smallint,
  end_year smallint,
  end_month smallint,
  is_current boolean NOT NULL DEFAULT false,
  location_label text,
  city text,
  city_code text,
  can_share text[] NOT NULL DEFAULT '{}'::text[],
  visibility text NOT NULL DEFAULT 'private',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT person_experiences_identity_unique UNIQUE (id, person_id),
  CONSTRAINT person_experiences_title_check CHECK (btrim(title) <> ''),
  CONSTRAINT person_experiences_description_check CHECK (btrim(description) <> ''),
  CONSTRAINT person_experiences_kind_check CHECK (
    experience_kind IN ('education', 'work', 'project', 'life', 'skill', 'journey', 'other')
  ),
  CONSTRAINT person_experiences_visibility_check CHECK (
    visibility IN ('public', 'private')
  ),
  CONSTRAINT person_experiences_start_year_check CHECK (
    start_year IS NULL OR start_year BETWEEN 1 AND 9999
  ),
  CONSTRAINT person_experiences_end_year_check CHECK (
    end_year IS NULL OR end_year BETWEEN 1 AND 9999
  ),
  CONSTRAINT person_experiences_start_month_check CHECK (
    start_month IS NULL OR start_month BETWEEN 1 AND 12
  ),
  CONSTRAINT person_experiences_end_month_check CHECK (
    end_month IS NULL OR end_month BETWEEN 1 AND 12
  ),
  CONSTRAINT person_experiences_month_precision_check CHECK (
    (start_month IS NULL OR start_year IS NOT NULL)
    AND (end_month IS NULL OR end_year IS NOT NULL)
  ),
  CONSTRAINT person_experiences_current_time_check CHECK (
    NOT is_current OR (end_year IS NULL AND end_month IS NULL)
  ),
  CONSTRAINT person_experiences_time_order_check CHECK (
    start_year IS NULL
    OR end_year IS NULL
    OR start_year < end_year
    OR (
      start_year = end_year
      AND (start_month IS NULL OR end_month IS NULL OR start_month <= end_month)
    )
  ),
  CONSTRAINT person_experiences_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT person_experiences_can_share_null_check CHECK (
    array_position(can_share, NULL) IS NULL
  )
);

CREATE TABLE public.experience_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL,
  person_id uuid NOT NULL,
  from_label text NOT NULL,
  to_label text NOT NULL,
  occurred_year smallint,
  occurred_month smallint,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_transitions_experience_owner_fkey
    FOREIGN KEY (experience_id, person_id)
    REFERENCES public.person_experiences(id, person_id)
    ON DELETE CASCADE,
  CONSTRAINT experience_transitions_from_label_check CHECK (btrim(from_label) <> ''),
  CONSTRAINT experience_transitions_to_label_check CHECK (btrim(to_label) <> ''),
  CONSTRAINT experience_transitions_direction_check CHECK (
    btrim(from_label) <> btrim(to_label)
  ),
  CONSTRAINT experience_transitions_year_check CHECK (
    occurred_year IS NULL OR occurred_year BETWEEN 1 AND 9999
  ),
  CONSTRAINT experience_transitions_month_check CHECK (
    occurred_month IS NULL OR occurred_month BETWEEN 1 AND 12
  ),
  CONSTRAINT experience_transitions_month_precision_check CHECK (
    occurred_month IS NULL OR occurred_year IS NOT NULL
  ),
  CONSTRAINT experience_transitions_sort_order_check CHECK (sort_order >= 0)
);

CREATE TABLE public.experience_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL,
  person_id uuid NOT NULL,
  claim_type text NOT NULL,
  claim_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT experience_claims_experience_owner_fkey
    FOREIGN KEY (experience_id, person_id)
    REFERENCES public.person_experiences(id, person_id)
    ON DELETE CASCADE,
  CONSTRAINT experience_claims_type_check CHECK (
    claim_type IN (
      'education_institution',
      'education_degree',
      'education_field_of_study',
      'employer',
      'role',
      'professional_credential'
    )
  ),
  CONSTRAINT experience_claims_value_check CHECK (btrim(claim_value) <> '')
);

CREATE INDEX person_experiences_owner_active_order_idx
  ON public.person_experiences(person_id, sort_order, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX person_experiences_public_order_idx
  ON public.person_experiences(person_id, sort_order, created_at DESC, id)
  WHERE visibility = 'public' AND deleted_at IS NULL;

CREATE INDEX experience_transitions_experience_order_idx
  ON public.experience_transitions(experience_id, sort_order, id);

CREATE INDEX experience_claims_experience_active_idx
  ON public.experience_claims(experience_id, created_at, id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS person_experiences_updated_at_v1 ON public.person_experiences;
CREATE TRIGGER person_experiences_updated_at_v1
  BEFORE UPDATE ON public.person_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS experience_transitions_updated_at_v1 ON public.experience_transitions;
CREATE TRIGGER experience_transitions_updated_at_v1
  BEFORE UPDATE ON public.experience_transitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS experience_claims_updated_at_v1 ON public.experience_claims;
CREATE TRIGGER experience_claims_updated_at_v1
  BEFORE UPDATE ON public.experience_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.person_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_experiences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experience_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_transitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experience_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_claims FORCE ROW LEVEL SECURITY;

CREATE POLICY person_experiences_anon_select_v1
  ON public.person_experiences
  FOR SELECT
  TO anon
  USING (visibility = 'public' AND deleted_at IS NULL);

CREATE POLICY person_experiences_authenticated_select_v1
  ON public.person_experiences
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (visibility = 'public' OR (SELECT auth.uid()) = person_id)
  );

CREATE POLICY person_experiences_owner_insert_v1
  ON public.person_experiences
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = person_id AND deleted_at IS NULL);

CREATE POLICY person_experiences_owner_update_v1
  ON public.person_experiences
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = person_id AND deleted_at IS NULL)
  WITH CHECK ((SELECT auth.uid()) = person_id);

CREATE POLICY experience_transitions_anon_select_v1
  ON public.experience_transitions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_transitions.experience_id
        AND experience.person_id = experience_transitions.person_id
        AND experience.visibility = 'public'
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_transitions_authenticated_select_v1
  ON public.experience_transitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_transitions.experience_id
        AND experience.person_id = experience_transitions.person_id
        AND experience.deleted_at IS NULL
        AND (
          experience.visibility = 'public'
          OR (SELECT auth.uid()) = experience_transitions.person_id
        )
    )
  );

CREATE POLICY experience_transitions_owner_insert_v1
  ON public.experience_transitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = person_id
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_transitions.experience_id
        AND experience.person_id = experience_transitions.person_id
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_transitions_owner_update_v1
  ON public.experience_transitions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = person_id)
  WITH CHECK (
    (SELECT auth.uid()) = person_id
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_transitions.experience_id
        AND experience.person_id = experience_transitions.person_id
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_transitions_owner_delete_v1
  ON public.experience_transitions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = person_id
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_claims.experience_id
        AND experience.person_id = experience_claims.person_id
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_claims_owner_select_v1
  ON public.experience_claims
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = person_id
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_claims.experience_id
        AND experience.person_id = experience_claims.person_id
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_claims_owner_insert_v1
  ON public.experience_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = person_id
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_claims.experience_id
        AND experience.person_id = experience_claims.person_id
        AND experience.deleted_at IS NULL
    )
  );

CREATE POLICY experience_claims_owner_update_v1
  ON public.experience_claims
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = person_id AND deleted_at IS NULL)
  WITH CHECK (
    (SELECT auth.uid()) = person_id
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = experience_id
        AND experience.person_id = person_id
        AND experience.deleted_at IS NULL
    )
  );

REVOKE ALL ON TABLE public.person_experiences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.experience_transitions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.experience_claims FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.person_experiences TO anon, authenticated;
GRANT INSERT (
  person_id, title, description, experience_kind, start_year, start_month,
  end_year, end_month, is_current, location_label, city, city_code, can_share,
  visibility, sort_order
) ON public.person_experiences TO authenticated;
GRANT UPDATE (
  title, description, experience_kind, start_year, start_month, end_year,
  end_month, is_current, location_label, city, city_code, can_share, visibility,
  sort_order, deleted_at
) ON public.person_experiences TO authenticated;

GRANT SELECT ON TABLE public.experience_transitions TO anon, authenticated;
GRANT INSERT (
  experience_id, person_id, from_label, to_label, occurred_year, occurred_month, sort_order
) ON public.experience_transitions TO authenticated;
GRANT UPDATE (
  from_label, to_label, occurred_year, occurred_month, sort_order
) ON public.experience_transitions TO authenticated;
GRANT DELETE ON TABLE public.experience_transitions TO authenticated;

GRANT SELECT ON TABLE public.experience_claims TO authenticated;
GRANT INSERT (experience_id, person_id, claim_type, claim_value)
  ON public.experience_claims TO authenticated;
GRANT UPDATE (claim_type, claim_value, deleted_at)
  ON public.experience_claims TO authenticated;

GRANT ALL ON TABLE public.person_experiences TO service_role;
GRANT ALL ON TABLE public.experience_transitions TO service_role;
GRANT ALL ON TABLE public.experience_claims TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_person_experiences_v1(
  p_person_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_experiences jsonb;
  v_has_more boolean;
BEGIN
  IF p_person_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_PERSON';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_PAGINATION';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'experienceId', experience.id,
        'personId', experience.person_id,
        'title', experience.title,
        'description', experience.description,
        'kind', experience.experience_kind,
        'timeRange', jsonb_build_object(
          'startYear', experience.start_year,
          'startMonth', experience.start_month,
          'endYear', experience.end_year,
          'endMonth', experience.end_month,
          'isCurrent', experience.is_current
        ),
        'location', CASE
          WHEN experience.location_label IS NULL
            AND experience.city IS NULL
            AND experience.city_code IS NULL
          THEN NULL
          ELSE jsonb_build_object(
            'label', experience.location_label,
            'city', experience.city,
            'cityCode', experience.city_code
          )
        END,
        'canShare', to_jsonb(experience.can_share),
        'visibility', 'public',
        'transitions', coalesce(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'transitionId', transition.id,
                'experienceId', transition.experience_id,
                'personId', transition.person_id,
                'fromLabel', transition.from_label,
                'toLabel', transition.to_label,
                'occurredYear', transition.occurred_year,
                'occurredMonth', transition.occurred_month,
                'sortOrder', transition.sort_order
              ) ORDER BY transition.sort_order, transition.id
            )
            FROM public.experience_transitions AS transition
            WHERE transition.experience_id = experience.id
              AND transition.person_id = experience.person_id
          ),
          '[]'::jsonb
        ),
        'sortOrder', experience.sort_order,
        'createdAt', experience.created_at,
        'updatedAt', experience.updated_at
      ) ORDER BY experience.sort_order, experience.created_at DESC, experience.id
    ),
    '[]'::jsonb
  )
  INTO v_experiences
  FROM (
    SELECT
      item.id,
      item.person_id,
      item.title,
      item.description,
      item.experience_kind,
      item.start_year,
      item.start_month,
      item.end_year,
      item.end_month,
      item.is_current,
      item.location_label,
      item.city,
      item.city_code,
      item.can_share,
      item.visibility,
      item.sort_order,
      item.created_at,
      item.updated_at
    FROM public.person_experiences AS item
    WHERE item.person_id = p_person_id
      AND item.visibility = 'public'
      AND item.deleted_at IS NULL
    ORDER BY item.sort_order, item.created_at DESC, item.id
    LIMIT p_limit OFFSET p_offset
  ) AS experience;

  SELECT EXISTS (
    SELECT 1
    FROM public.person_experiences AS item
    WHERE item.person_id = p_person_id
      AND item.visibility = 'public'
      AND item.deleted_at IS NULL
    ORDER BY item.sort_order, item.created_at DESC, item.id
    OFFSET (p_offset + p_limit)
    LIMIT 1
  ) INTO v_has_more;

  RETURN jsonb_build_object(
    'personId', p_person_id,
    'experiences', v_experiences,
    'page', jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'hasMore', v_has_more
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_person_experience_v1(
  p_title text,
  p_description text,
  p_kind text DEFAULT 'other',
  p_start_year integer DEFAULT NULL,
  p_start_month integer DEFAULT NULL,
  p_end_year integer DEFAULT NULL,
  p_end_month integer DEFAULT NULL,
  p_is_current boolean DEFAULT false,
  p_location_label text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_city_code text DEFAULT NULL,
  p_can_share text[] DEFAULT '{}'::text[],
  p_visibility text DEFAULT 'private',
  p_sort_order integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_experience_id uuid;
  v_sort_order integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = ''
    OR p_description IS NULL OR btrim(p_description) = ''
  THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_CONTENT';
  END IF;

  IF p_can_share IS NULL
    OR EXISTS (
      SELECT 1
      FROM unnest(p_can_share) AS item(value)
      WHERE item.value IS NULL OR btrim(item.value) = ''
    )
  THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_CAN_SHARE';
  END IF;

  IF p_sort_order IS NULL THEN
    SELECT coalesce(max(item.sort_order) + 1, 0)
    INTO v_sort_order
    FROM public.person_experiences AS item
    WHERE item.person_id = v_uid
      AND item.deleted_at IS NULL;
  ELSE
    v_sort_order := p_sort_order;
  END IF;

  INSERT INTO public.person_experiences (
    person_id,
    title,
    description,
    experience_kind,
    start_year,
    start_month,
    end_year,
    end_month,
    is_current,
    location_label,
    city,
    city_code,
    can_share,
    visibility,
    sort_order
  )
  VALUES (
    v_uid,
    btrim(p_title),
    btrim(p_description),
    p_kind,
    p_start_year,
    p_start_month,
    p_end_year,
    p_end_month,
    p_is_current,
    nullif(btrim(p_location_label), ''),
    nullif(btrim(p_city), ''),
    nullif(btrim(p_city_code), ''),
    ARRAY(SELECT btrim(share.value) FROM unnest(p_can_share) AS share(value)),
    p_visibility,
    v_sort_order
  )
  RETURNING id INTO v_experience_id;

  RETURN v_experience_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_person_experience_v1(
  p_experience_id uuid,
  p_title text,
  p_description text,
  p_kind text,
  p_start_year integer,
  p_start_month integer,
  p_end_year integer,
  p_end_month integer,
  p_is_current boolean,
  p_location_label text,
  p_city text,
  p_city_code text,
  p_can_share text[],
  p_visibility text,
  p_sort_order integer
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_experience_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF p_experience_id IS NULL
    OR p_title IS NULL OR btrim(p_title) = ''
    OR p_description IS NULL OR btrim(p_description) = ''
  THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_INPUT';
  END IF;
  IF p_can_share IS NULL
    OR EXISTS (
      SELECT 1
      FROM unnest(p_can_share) AS item(value)
      WHERE item.value IS NULL OR btrim(item.value) = ''
    )
  THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_CAN_SHARE';
  END IF;

  UPDATE public.person_experiences AS experience
  SET
    title = btrim(p_title),
    description = btrim(p_description),
    experience_kind = p_kind,
    start_year = p_start_year,
    start_month = p_start_month,
    end_year = p_end_year,
    end_month = p_end_month,
    is_current = p_is_current,
    location_label = nullif(btrim(p_location_label), ''),
    city = nullif(btrim(p_city), ''),
    city_code = nullif(btrim(p_city_code), ''),
    can_share = ARRAY(
      SELECT btrim(share.value)
      FROM unnest(p_can_share) AS share(value)
    ),
    visibility = p_visibility,
    sort_order = p_sort_order
  WHERE experience.id = p_experience_id
    AND experience.person_id = v_uid
    AND experience.deleted_at IS NULL
  RETURNING experience.id INTO v_experience_id;

  IF v_experience_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  RETURN v_experience_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_person_experience_visibility_v1(
  p_experience_id uuid,
  p_visibility text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_experience_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF p_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_VISIBILITY';
  END IF;

  UPDATE public.person_experiences AS experience
  SET visibility = p_visibility
  WHERE experience.id = p_experience_id
    AND experience.person_id = v_uid
    AND experience.deleted_at IS NULL
  RETURNING experience.id INTO v_experience_id;

  IF v_experience_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  RETURN v_experience_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_person_experiences_v1(
  p_experience_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_requested_count integer;
  v_owned_count integer;
  v_updated_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF p_experience_ids IS NULL OR array_position(p_experience_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_ORDER';
  END IF;

  SELECT count(*), count(DISTINCT item.id)
  INTO v_requested_count, v_owned_count
  FROM unnest(p_experience_ids) AS item(id);

  IF v_requested_count <> v_owned_count THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_ORDER';
  END IF;

  SELECT count(*)
  INTO v_owned_count
  FROM public.person_experiences AS experience
  WHERE experience.person_id = v_uid
    AND experience.deleted_at IS NULL
    AND experience.id = ANY(p_experience_ids);

  IF v_owned_count <> v_requested_count THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  WITH requested AS (
    SELECT item.id, (item.ordinality - 1)::integer AS sort_order
    FROM unnest(p_experience_ids) WITH ORDINALITY AS item(id, ordinality)
  )
  UPDATE public.person_experiences AS experience
  SET sort_order = requested.sort_order
  FROM requested
  WHERE experience.id = requested.id
    AND experience.person_id = v_uid
    AND experience.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_person_experience_v1(
  p_experience_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_experience_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  UPDATE public.person_experiences AS experience
  SET deleted_at = now()
  WHERE experience.id = p_experience_id
    AND experience.person_id = v_uid
    AND experience.deleted_at IS NULL
  RETURNING experience.id INTO v_experience_id;

  IF v_experience_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  RETURN v_experience_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_experience_transition_v1(
  p_experience_id uuid,
  p_from_label text,
  p_to_label text,
  p_occurred_year integer DEFAULT NULL,
  p_occurred_month integer DEFAULT NULL,
  p_sort_order integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_transition_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.person_experiences AS experience
    WHERE experience.id = p_experience_id
      AND experience.person_id = v_uid
      AND experience.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  INSERT INTO public.experience_transitions (
    experience_id,
    person_id,
    from_label,
    to_label,
    occurred_year,
    occurred_month,
    sort_order
  )
  VALUES (
    p_experience_id,
    v_uid,
    btrim(p_from_label),
    btrim(p_to_label),
    p_occurred_year,
    p_occurred_month,
    p_sort_order
  )
  RETURNING id INTO v_transition_id;

  RETURN v_transition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_experience_transition_v1(
  p_transition_id uuid,
  p_from_label text,
  p_to_label text,
  p_occurred_year integer,
  p_occurred_month integer,
  p_sort_order integer
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_transition_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  UPDATE public.experience_transitions AS transition
  SET
    from_label = btrim(p_from_label),
    to_label = btrim(p_to_label),
    occurred_year = p_occurred_year,
    occurred_month = p_occurred_month,
    sort_order = p_sort_order
  WHERE transition.id = p_transition_id
    AND transition.person_id = v_uid
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = transition.experience_id
        AND experience.person_id = transition.person_id
        AND experience.deleted_at IS NULL
    )
  RETURNING transition.id INTO v_transition_id;

  IF v_transition_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_TRANSITION_NOT_FOUND';
  END IF;

  RETURN v_transition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_experience_transition_v1(
  p_transition_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_transition_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  DELETE FROM public.experience_transitions AS transition
  WHERE transition.id = p_transition_id
    AND transition.person_id = v_uid
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = transition.experience_id
        AND experience.person_id = transition.person_id
        AND experience.deleted_at IS NULL
    )
  RETURNING transition.id INTO v_transition_id;

  IF v_transition_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_TRANSITION_NOT_FOUND';
  END IF;

  RETURN v_transition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_experience_claim_v1(
  p_experience_id uuid,
  p_claim_type text,
  p_value text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_claim_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.person_experiences AS experience
    WHERE experience.id = p_experience_id
      AND experience.person_id = v_uid
      AND experience.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND';
  END IF;

  INSERT INTO public.experience_claims (
    experience_id,
    person_id,
    claim_type,
    claim_value
  )
  VALUES (
    p_experience_id,
    v_uid,
    p_claim_type,
    btrim(p_value)
  )
  RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_experience_claim_v1(
  p_claim_id uuid,
  p_claim_type text,
  p_value text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_claim_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  UPDATE public.experience_claims AS claim
  SET
    claim_type = p_claim_type,
    claim_value = btrim(p_value)
  WHERE claim.id = p_claim_id
    AND claim.person_id = v_uid
    AND claim.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = claim.experience_id
        AND experience.person_id = claim.person_id
        AND experience.deleted_at IS NULL
    )
  RETURNING claim.id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_CLAIM_NOT_FOUND';
  END IF;

  RETURN v_claim_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_experience_claim_v1(
  p_claim_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_claim_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;

  UPDATE public.experience_claims AS claim
  SET deleted_at = now()
  WHERE claim.id = p_claim_id
    AND claim.person_id = v_uid
    AND claim.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS experience
      WHERE experience.id = claim.experience_id
        AND experience.person_id = claim.person_id
        AND experience.deleted_at IS NULL
    )
  RETURNING claim.id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_CLAIM_NOT_FOUND';
  END IF;

  RETURN v_claim_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_person_experiences_v1(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_experiences jsonb;
  v_has_more boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'EXPERIENCE_UNAUTHORIZED';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'EXPERIENCE_INVALID_PAGINATION';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'experienceId', experience.id,
        'personId', experience.person_id,
        'title', experience.title,
        'description', experience.description,
        'kind', experience.experience_kind,
        'timeRange', jsonb_build_object(
          'startYear', experience.start_year,
          'startMonth', experience.start_month,
          'endYear', experience.end_year,
          'endMonth', experience.end_month,
          'isCurrent', experience.is_current
        ),
        'location', CASE
          WHEN experience.location_label IS NULL
            AND experience.city IS NULL
            AND experience.city_code IS NULL
          THEN NULL
          ELSE jsonb_build_object(
            'label', experience.location_label,
            'city', experience.city,
            'cityCode', experience.city_code
          )
        END,
        'canShare', to_jsonb(experience.can_share),
        'visibility', experience.visibility,
        'transitions', coalesce(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'transitionId', transition.id,
                'experienceId', transition.experience_id,
                'personId', transition.person_id,
                'fromLabel', transition.from_label,
                'toLabel', transition.to_label,
                'occurredYear', transition.occurred_year,
                'occurredMonth', transition.occurred_month,
                'sortOrder', transition.sort_order
              ) ORDER BY transition.sort_order, transition.id
            )
            FROM public.experience_transitions AS transition
            WHERE transition.experience_id = experience.id
              AND transition.person_id = experience.person_id
          ),
          '[]'::jsonb
        ),
        'claims', coalesce(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'claimId', claim.id,
                'experienceId', claim.experience_id,
                'personId', claim.person_id,
                'claimType', claim.claim_type,
                'value', claim.claim_value,
                'createdAt', claim.created_at,
                'updatedAt', claim.updated_at
              ) ORDER BY claim.created_at, claim.id
            )
            FROM public.experience_claims AS claim
            WHERE claim.experience_id = experience.id
              AND claim.person_id = experience.person_id
              AND claim.deleted_at IS NULL
          ),
          '[]'::jsonb
        ),
        'sortOrder', experience.sort_order,
        'createdAt', experience.created_at,
        'updatedAt', experience.updated_at
      ) ORDER BY experience.sort_order, experience.created_at DESC, experience.id
    ),
    '[]'::jsonb
  )
  INTO v_experiences
  FROM (
    SELECT
      item.id,
      item.person_id,
      item.title,
      item.description,
      item.experience_kind,
      item.start_year,
      item.start_month,
      item.end_year,
      item.end_month,
      item.is_current,
      item.location_label,
      item.city,
      item.city_code,
      item.can_share,
      item.visibility,
      item.sort_order,
      item.created_at,
      item.updated_at
    FROM public.person_experiences AS item
    WHERE item.person_id = v_uid
      AND item.deleted_at IS NULL
    ORDER BY item.sort_order, item.created_at DESC, item.id
    LIMIT p_limit OFFSET p_offset
  ) AS experience;

  SELECT EXISTS (
    SELECT 1
    FROM public.person_experiences AS item
    WHERE item.person_id = v_uid
      AND item.deleted_at IS NULL
    ORDER BY item.sort_order, item.created_at DESC, item.id
    OFFSET (p_offset + p_limit)
    LIMIT 1
  ) INTO v_has_more;

  RETURN jsonb_build_object(
    'personId', v_uid,
    'experiences', v_experiences,
    'page', jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'hasMore', v_has_more
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_person_experiences_v1(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_person_experiences_v1(integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_person_experience_v1(
  text, text, text, integer, integer, integer, integer, boolean,
  text, text, text, text[], text, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_person_experience_v1(
  uuid, text, text, text, integer, integer, integer, integer, boolean,
  text, text, text, text[], text, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_person_experience_visibility_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reorder_person_experiences_v1(uuid[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_person_experience_v1(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_experience_transition_v1(
  uuid, text, text, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_experience_transition_v1(
  uuid, text, text, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_experience_transition_v1(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_experience_claim_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_experience_claim_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_experience_claim_v1(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_person_experiences_v1(uuid, integer, integer)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_my_person_experiences_v1(integer, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_person_experience_v1(
  text, text, text, integer, integer, integer, integer, boolean,
  text, text, text, text[], text, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_person_experience_v1(
  uuid, text, text, text, integer, integer, integer, integer, boolean,
  text, text, text, text[], text, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_person_experience_visibility_v1(uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_person_experiences_v1(uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_person_experience_v1(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_experience_transition_v1(
  uuid, text, text, integer, integer, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_experience_transition_v1(
  uuid, text, text, integer, integer, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_experience_transition_v1(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_experience_claim_v1(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_experience_claim_v1(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_experience_claim_v1(uuid)
  TO authenticated, service_role;

COMMIT;
