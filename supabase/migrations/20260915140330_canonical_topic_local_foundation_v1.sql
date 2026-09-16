BEGIN;

CREATE SCHEMA ec3_topic_private;
REVOKE ALL ON SCHEMA ec3_topic_private FROM PUBLIC;
GRANT USAGE ON SCHEMA ec3_topic_private TO anon, authenticated, service_role;

-- ASCII case folding and C-locale whitespace only; Chinese and punctuation are preserved.
CREATE FUNCTION ec3_topic_private.normalize_term(p_term text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path = '' AS $$
  SELECT translate(btrim(regexp_replace(p_term COLLATE "C", '[[:space:]]+', ' ', 'g')),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz');
$$;

CREATE TABLE public.canonical_topics_v1 (
  topic_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (ec3_topic_private.normalize_term(canonical_name)) STORED,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (normalized_name <> ''),
  UNIQUE (topic_id, normalized_name)
);
CREATE TABLE public.canonical_topic_terms_v1 (
  term text NOT NULL,
  normalized_term text GENERATED ALWAYS AS (ec3_topic_private.normalize_term(term)) STORED PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.canonical_topics_v1(topic_id) ON DELETE RESTRICT,
  CHECK (normalized_term <> ''),
  UNIQUE (topic_id, normalized_term)
);
-- Canonical names and aliases cannot occupy separate collision domains. Every root must own its name.
ALTER TABLE public.canonical_topics_v1 ADD CONSTRAINT canonical_topics_v1_name_term_fkey
  FOREIGN KEY (topic_id, normalized_name)
  REFERENCES public.canonical_topic_terms_v1(topic_id, normalized_term) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.question_topics_v1 (
  question_id uuid NOT NULL REFERENCES public.questions_v1(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL REFERENCES public.canonical_topics_v1(topic_id) ON DELETE RESTRICT,
  PRIMARY KEY (question_id, topic_id)
);
CREATE TABLE public.experience_topics_v1 (
  experience_id uuid NOT NULL REFERENCES public.person_experiences(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL REFERENCES public.canonical_topics_v1(topic_id) ON DELETE RESTRICT,
  PRIMARY KEY (experience_id, topic_id)
);
CREATE INDEX question_topics_v1_topic_question_idx ON public.question_topics_v1(topic_id, question_id);
CREATE INDEX experience_topics_v1_topic_experience_idx ON public.experience_topics_v1(topic_id, experience_id);

ALTER TABLE public.canonical_topics_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_topics_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_topic_terms_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_topic_terms_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.question_topics_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_topics_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experience_topics_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_topics_v1 FORCE ROW LEVEL SECURITY;

CREATE POLICY canonical_topics_v1_read ON public.canonical_topics_v1 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY canonical_topic_terms_v1_read ON public.canonical_topic_terms_v1 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY question_topics_v1_read ON public.question_topics_v1 FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = question_topics_v1.question_id
    AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible'));
CREATE POLICY question_topics_v1_insert ON public.question_topics_v1 FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = question_topics_v1.question_id
    AND q.requester_person_id = (SELECT auth.uid()) AND q.status = 'open'
    AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible')
    AND EXISTS (SELECT 1 FROM public.canonical_topics_v1 AS t WHERE t.topic_id = question_topics_v1.topic_id AND t.status = 'active'));
CREATE POLICY question_topics_v1_delete ON public.question_topics_v1 FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = question_topics_v1.question_id
    AND q.requester_person_id = (SELECT auth.uid()) AND q.status = 'open'
    AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible'));
CREATE POLICY experience_topics_v1_read ON public.experience_topics_v1 FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.person_experiences AS e WHERE e.id = experience_topics_v1.experience_id
    AND e.deleted_at IS NULL AND (e.visibility = 'public' OR e.person_id = (SELECT auth.uid()))));
CREATE POLICY experience_topics_v1_insert ON public.experience_topics_v1 FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.person_experiences AS e WHERE e.id = experience_topics_v1.experience_id
    AND e.person_id = (SELECT auth.uid()) AND e.deleted_at IS NULL)
    AND EXISTS (SELECT 1 FROM public.canonical_topics_v1 AS t WHERE t.topic_id = experience_topics_v1.topic_id AND t.status = 'active'));
CREATE POLICY experience_topics_v1_delete ON public.experience_topics_v1 FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.person_experiences AS e WHERE e.id = experience_topics_v1.experience_id
    AND e.person_id = (SELECT auth.uid()) AND e.deleted_at IS NULL));

REVOKE ALL ON TABLE public.canonical_topics_v1, public.canonical_topic_terms_v1,
  public.question_topics_v1, public.experience_topics_v1 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (topic_id, canonical_name, normalized_name, status, created_at, updated_at)
  ON public.canonical_topics_v1 TO anon, authenticated, service_role;
GRANT SELECT (term, normalized_term, topic_id) ON public.canonical_topic_terms_v1 TO anon, authenticated, service_role;
GRANT SELECT (question_id, topic_id) ON public.question_topics_v1 TO anon, authenticated, service_role;
GRANT SELECT (experience_id, topic_id) ON public.experience_topics_v1 TO anon, authenticated, service_role;
GRANT INSERT (question_id, topic_id), DELETE ON public.question_topics_v1 TO authenticated;
GRANT INSERT (experience_id, topic_id), DELETE ON public.experience_topics_v1 TO authenticated;
-- Future governed server work only. No ordinary-client root/alias mutation RPC, no root hard delete.
GRANT INSERT (topic_id, canonical_name, status), UPDATE (canonical_name, status)
  ON public.canonical_topics_v1 TO service_role;
GRANT INSERT (term, topic_id), DELETE ON public.canonical_topic_terms_v1 TO service_role;

CREATE FUNCTION ec3_topic_private.guard_root()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE SQLSTATE 'PT403' USING MESSAGE = 'TOPIC_HARD_DELETE_FORBIDDEN'; END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.topic_id, NEW.created_at) IS DISTINCT FROM ROW(OLD.topic_id, OLD.created_at) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'IMMUTABLE_FIELD';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ec3-topic:' || NEW.topic_id::text, 0));
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE FUNCTION ec3_topic_private.ensure_canonical_term()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Rename retains the previous term as an alias; conflicting ownership fails atomically.
  IF NOT EXISTS (SELECT 1 FROM public.canonical_topic_terms_v1 AS t
    WHERE t.topic_id = NEW.topic_id AND t.normalized_term = NEW.normalized_name) THEN
    INSERT INTO public.canonical_topic_terms_v1(term, topic_id) VALUES (NEW.canonical_name, NEW.topic_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER canonical_topics_v1_guard BEFORE INSERT OR UPDATE OR DELETE ON public.canonical_topics_v1
  FOR EACH ROW EXECUTE FUNCTION ec3_topic_private.guard_root();
CREATE TRIGGER canonical_topics_v1_term AFTER INSERT OR UPDATE OF canonical_name ON public.canonical_topics_v1
  FOR EACH ROW EXECUTE FUNCTION ec3_topic_private.ensure_canonical_term();

CREATE FUNCTION ec3_topic_private.validate_ids(p_ids uuid[])
RETURNS void LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_ids IS NULL OR (cardinality(p_ids) > 0 AND (array_ndims(p_ids) <> 1 OR array_lower(p_ids, 1) <> 1))
    OR array_position(p_ids, NULL) IS NOT NULL
    OR cardinality(p_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_ids) AS input(id)) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
END;
$$;
CREATE FUNCTION ec3_topic_private.require_active(p_topic uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE SQLSTATE 'PT409' USING MESSAGE = 'UNSUPPORTED_TRANSACTION_ISOLATION';
  END IF;
  -- Serialize deprecation vs new links without granting clients UPDATE on the root for row locks.
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('ec3-topic:' || p_topic::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.canonical_topics_v1 AS t WHERE t.topic_id = p_topic AND t.status = 'active') THEN
    RAISE SQLSTATE 'PT422' USING MESSAGE = 'TOPIC_INVALID_OR_INACTIVE';
  END IF;
END;
$$;
CREATE FUNCTION ec3_topic_private.lock_question_owner(p_question uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  -- Same row -> EC-2 advisory order as update/close; the existing edit trigger rejects closed parents.
  UPDATE public.questions_v1 AS q SET title = q.title WHERE q.id = p_question
    AND q.requester_person_id = auth.uid() AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
END;
$$;
CREATE FUNCTION ec3_topic_private.lock_experience_owner(p_experience uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE SQLSTATE 'PT409' USING MESSAGE = 'UNSUPPORTED_TRANSACTION_ISOLATION';
  END IF;
  PERFORM e.id FROM public.person_experiences AS e WHERE e.id = p_experience
    AND e.person_id = auth.uid() AND e.deleted_at IS NULL FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
END;
$$;
CREATE FUNCTION ec3_topic_private.guard_question_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ec3_topic_private.lock_question_owner(OLD.question_id);
    RETURN OLD;
  END IF;
  PERFORM ec3_topic_private.lock_question_owner(NEW.question_id);
  PERFORM ec3_topic_private.require_active(NEW.topic_id);
  RETURN NEW;
END;
$$;
CREATE FUNCTION ec3_topic_private.guard_experience_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ec3_topic_private.lock_experience_owner(OLD.experience_id);
    RETURN OLD;
  END IF;
  PERFORM ec3_topic_private.lock_experience_owner(NEW.experience_id);
  PERFORM ec3_topic_private.require_active(NEW.topic_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER question_topics_v1_guard BEFORE INSERT OR DELETE ON public.question_topics_v1
  FOR EACH ROW EXECUTE FUNCTION ec3_topic_private.guard_question_link();
CREATE TRIGGER experience_topics_v1_guard BEFORE INSERT OR DELETE ON public.experience_topics_v1
  FOR EACH ROW EXECUTE FUNCTION ec3_topic_private.guard_experience_link();

CREATE FUNCTION ec3_topic_private.replace_question_topics(p_question uuid, p_ids uuid[])
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM ec3_topic_private.validate_ids(p_ids);
  PERFORM ec3_topic_private.lock_question_owner(p_question);
  FOR v_id IN SELECT input.id FROM unnest(p_ids) AS input(id) ORDER BY input.id LOOP
    IF NOT EXISTS (SELECT 1 FROM public.question_topics_v1 AS l WHERE l.question_id = p_question AND l.topic_id = v_id) THEN
      PERFORM ec3_topic_private.require_active(v_id);
    END IF;
  END LOOP;
  DELETE FROM public.question_topics_v1 AS l WHERE l.question_id = p_question AND NOT (l.topic_id = ANY(p_ids));
  INSERT INTO public.question_topics_v1(question_id, topic_id)
    SELECT p_question, input.id FROM unnest(p_ids) AS input(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.question_topics_v1 AS l WHERE l.question_id = p_question AND l.topic_id = input.id)
    ORDER BY input.id;
END;
$$;
CREATE FUNCTION public.set_experience_topics_v1(p_experience_id uuid, p_topic_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM ec3_topic_private.validate_ids(p_topic_ids);
  PERFORM ec3_topic_private.lock_experience_owner(p_experience_id);
  FOR v_id IN SELECT input.id FROM unnest(p_topic_ids) AS input(id) ORDER BY input.id LOOP
    IF NOT EXISTS (SELECT 1 FROM public.experience_topics_v1 AS l WHERE l.experience_id = p_experience_id AND l.topic_id = v_id) THEN
      PERFORM ec3_topic_private.require_active(v_id);
    END IF;
  END LOOP;
  DELETE FROM public.experience_topics_v1 AS l WHERE l.experience_id = p_experience_id AND NOT (l.topic_id = ANY(p_topic_ids));
  INSERT INTO public.experience_topics_v1(experience_id, topic_id)
    SELECT p_experience_id, input.id FROM unnest(p_topic_ids) AS input(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.experience_topics_v1 AS l WHERE l.experience_id = p_experience_id AND l.topic_id = input.id)
    ORDER BY input.id;
  RETURN jsonb_build_object('experienceId', p_experience_id, 'topicIds',
    (SELECT coalesce(jsonb_agg(l.topic_id ORDER BY l.topic_id), '[]'::jsonb)
      FROM public.experience_topics_v1 AS l WHERE l.experience_id = p_experience_id));
END;
$$;
CREATE FUNCTION public.get_experience_topics_v1(p_experience_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('experience', (SELECT jsonb_build_object('experienceId', e.id, 'topicIds',
    (SELECT coalesce(jsonb_agg(l.topic_id ORDER BY l.topic_id), '[]'::jsonb)
      FROM public.experience_topics_v1 AS l WHERE l.experience_id = e.id))
    FROM public.person_experiences AS e WHERE e.id = p_experience_id AND e.deleted_at IS NULL
      AND (e.visibility = 'public' OR e.person_id = (SELECT auth.uid()))));
$$;
CREATE FUNCTION public.resolve_canonical_topic_v1(p_term text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_topic jsonb;
BEGIN
  IF p_term IS NULL OR ec3_topic_private.normalize_term(p_term) = '' THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
  SELECT jsonb_build_object('topicId', t.topic_id, 'canonicalName', t.canonical_name, 'status', t.status,
    'aliases', (SELECT coalesce(jsonb_agg(a.term ORDER BY a.normalized_term COLLATE "C"), '[]'::jsonb)
      FROM public.canonical_topic_terms_v1 AS a WHERE a.topic_id = t.topic_id AND a.normalized_term <> t.normalized_name))
    INTO v_topic FROM public.canonical_topic_terms_v1 AS term JOIN public.canonical_topics_v1 AS t ON t.topic_id = term.topic_id
    WHERE term.normalized_term = ec3_topic_private.normalize_term(p_term) AND t.status = 'active';
  RETURN jsonb_build_object('topic', v_topic);
END;
$$;

-- Exact EC-2 signatures and response envelopes stay unchanged. Only the reserved Topic field unlocks locally.
CREATE OR REPLACE FUNCTION ec2_private.validate_question(p_title text, p_context text, p_channel text, p_topics uuid[], p_budget bigint)
RETURNS void LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM ec3_topic_private.validate_ids(p_topics);
  IF p_title IS NULL OR btrim(p_title) = '' OR p_context IS NULL OR btrim(p_context) = ''
    OR p_channel IS NULL OR p_channel NOT IN ('education-learning','career-development','lifestyle-services','hobbies-skills')
    OR (p_budget IS NOT NULL AND (p_budget <= 0 OR p_budget > 9007199254740991)) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.create_question_v1(p_title text, p_context text, p_primary_channel text,
  p_topic_ids uuid[], p_deep_exchange_budget_max_cents bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  PERFORM ec2_private.validate_question(p_title, p_context, p_primary_channel, p_topic_ids, p_deep_exchange_budget_max_cents);
  INSERT INTO public.questions_v1(title, context, primary_channel, deep_exchange_budget_max_cents)
    VALUES (p_title, p_context, p_primary_channel, p_deep_exchange_budget_max_cents) RETURNING id INTO v_id;
  PERFORM ec3_topic_private.replace_question_topics(v_id, p_topic_ids);
  RETURN jsonb_build_object('questionId', v_id);
END;
$$;
CREATE OR REPLACE FUNCTION public.update_question_v1(p_question_id uuid, p_title text, p_context text, p_primary_channel text,
  p_topic_ids uuid[], p_deep_exchange_budget_max_cents bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  PERFORM ec2_private.validate_question(p_title, p_context, p_primary_channel, p_topic_ids, p_deep_exchange_budget_max_cents);
  UPDATE public.questions_v1 AS q SET title = p_title, context = p_context, primary_channel = p_primary_channel,
    deep_exchange_budget_max_cents = p_deep_exchange_budget_max_cents
    WHERE q.id = p_question_id AND q.requester_person_id = auth.uid() AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  PERFORM ec3_topic_private.replace_question_topics(p_question_id, p_topic_ids);
  RETURN jsonb_build_object('questionId', p_question_id);
END;
$$;
CREATE OR REPLACE FUNCTION ec2_private.question_detail(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'questionId', q.id, 'requesterPersonId', q.requester_person_id, 'title', q.title, 'context', q.context,
    'primaryChannel', q.primary_channel, 'topicIds',
      (SELECT coalesce(jsonb_agg(l.topic_id ORDER BY l.topic_id), '[]'::jsonb) FROM public.question_topics_v1 AS l WHERE l.question_id = q.id),
    'deepExchangeBudgetMaxCents', q.deep_exchange_budget_max_cents, 'status', q.status,
    'createdAt', q.created_at, 'updatedAt', q.updated_at,
    'requester', ec2_private.person_summary(q.requester_person_id),
    'answerCount', (SELECT count(*) FROM public.answers_v1 AS a WHERE a.question_id = q.id
      AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible')
  ) FROM public.questions_v1 AS q WHERE q.id = p_id AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ec3_topic_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ec3_topic_private.normalize_term(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ec3_topic_private.validate_ids(uuid[]), ec3_topic_private.require_active(uuid),
  ec3_topic_private.lock_question_owner(uuid), ec3_topic_private.lock_experience_owner(uuid),
  ec3_topic_private.replace_question_topics(uuid,uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_canonical_topic_v1(text), public.get_experience_topics_v1(uuid),
  public.set_experience_topics_v1(uuid,uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_canonical_topic_v1(text), public.get_experience_topics_v1(uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_experience_topics_v1(uuid,uuid[]) TO authenticated;

COMMIT;
