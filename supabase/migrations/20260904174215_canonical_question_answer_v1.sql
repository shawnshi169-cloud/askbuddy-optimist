BEGIN;

CREATE SCHEMA ec2_private;
REVOKE ALL ON SCHEMA ec2_private FROM PUBLIC;
GRANT USAGE ON SCHEMA ec2_private TO anon, authenticated;

CREATE TABLE public.questions_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_person_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (btrim(title) <> ''),
  context text NOT NULL CHECK (btrim(context) <> ''),
  primary_channel text NOT NULL CHECK (primary_channel IN (
    'education-learning', 'career-development', 'lifestyle-services', 'hobbies-skills'
  )),
  deep_exchange_budget_max_cents bigint CHECK (
    deep_exchange_budget_max_cents > 0 AND deep_exchange_budget_max_cents <= 9007199254740991
  ),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  moderation_visibility text NOT NULL DEFAULT 'visible' CHECK (moderation_visibility IN ('visible', 'hidden')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.answers_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions_v1(id) ON DELETE RESTRICT,
  author_person_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (btrim(body) <> ''),
  moderation_visibility text NOT NULL DEFAULT 'visible' CHECK (moderation_visibility IN ('visible', 'hidden')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.answer_replies_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.answers_v1(id) ON DELETE RESTRICT,
  author_person_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (btrim(body) <> ''),
  moderation_visibility text NOT NULL DEFAULT 'visible' CHECK (moderation_visibility IN ('visible', 'hidden')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.answer_helpful_marks_v1 (
  mark_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.answers_v1(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (answer_id, person_id),
  UNIQUE (mark_id, answer_id)
);

CREATE TABLE public.answer_helpful_public_facts_v1 (
  mark_id uuid PRIMARY KEY,
  answer_id uuid NOT NULL REFERENCES public.answers_v1(id) ON DELETE RESTRICT,
  UNIQUE (mark_id, answer_id),
  CONSTRAINT helpful_fact_mark_v1_fkey FOREIGN KEY (mark_id, answer_id)
    REFERENCES public.answer_helpful_marks_v1(mark_id, answer_id)
    DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE public.answer_helpful_marks_v1
  ADD CONSTRAINT helpful_mark_fact_v1_fkey FOREIGN KEY (mark_id, answer_id)
    REFERENCES public.answer_helpful_public_facts_v1(mark_id, answer_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX questions_v1_requester_idx ON public.questions_v1(requester_person_id);
CREATE INDEX questions_v1_list_idx ON public.questions_v1(created_at DESC, id ASC)
  WHERE deleted_at IS NULL AND moderation_visibility = 'visible';
CREATE INDEX questions_v1_channel_list_idx ON public.questions_v1(primary_channel, status, created_at DESC, id ASC)
  WHERE deleted_at IS NULL AND moderation_visibility = 'visible';
CREATE INDEX answers_v1_question_order_idx ON public.answers_v1(question_id, created_at DESC, id ASC);
CREATE INDEX answers_v1_author_idx ON public.answers_v1(author_person_id);
CREATE INDEX answer_replies_v1_answer_order_idx ON public.answer_replies_v1(answer_id, created_at ASC, id ASC);
CREATE INDEX answer_replies_v1_author_idx ON public.answer_replies_v1(author_person_id);
CREATE INDEX answer_helpful_marks_v1_person_idx ON public.answer_helpful_marks_v1(person_id);
CREATE INDEX answer_helpful_public_facts_v1_answer_idx ON public.answer_helpful_public_facts_v1(answer_id);

ALTER TABLE public.questions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.answers_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.answer_replies_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_replies_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.answer_helpful_marks_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_helpful_marks_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.answer_helpful_public_facts_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_helpful_public_facts_v1 FORCE ROW LEVEL SECURITY;

-- Explicit parent predicates also constrain owners; normal RPCs never project tombstones.
CREATE POLICY questions_v1_read ON public.questions_v1 FOR SELECT TO anon, authenticated
  USING (moderation_visibility = 'visible' AND deleted_at IS NULL);
CREATE POLICY questions_v1_insert ON public.questions_v1 FOR INSERT TO authenticated
  WITH CHECK (requester_person_id = (SELECT auth.uid()) AND status = 'open'
    AND moderation_visibility = 'visible' AND deleted_at IS NULL);
CREATE POLICY questions_v1_update ON public.questions_v1 FOR UPDATE TO authenticated
  USING (requester_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible' AND deleted_at IS NULL)
  WITH CHECK (requester_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible' AND deleted_at IS NULL);

CREATE POLICY answers_v1_read ON public.answers_v1 FOR SELECT TO anon, authenticated
  USING (moderation_visibility = 'visible'
    AND (deleted_at IS NULL OR author_person_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = answers_v1.question_id
      AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL));
CREATE POLICY answers_v1_insert ON public.answers_v1 FOR INSERT TO authenticated
  WITH CHECK (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible' AND deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = answers_v1.question_id
      AND q.status = 'open' AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL));
CREATE POLICY answers_v1_update ON public.answers_v1 FOR UPDATE TO authenticated
  USING (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible'
    AND EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = answers_v1.question_id
      AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL))
  WITH CHECK (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible'
    AND EXISTS (SELECT 1 FROM public.questions_v1 AS q WHERE q.id = answers_v1.question_id
      AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL));

CREATE POLICY answer_replies_v1_read ON public.answer_replies_v1 FOR SELECT TO anon, authenticated
  USING (moderation_visibility = 'visible'
    AND (deleted_at IS NULL OR author_person_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_replies_v1.answer_id
      AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL));
CREATE POLICY answer_replies_v1_insert ON public.answer_replies_v1 FOR INSERT TO authenticated
  WITH CHECK (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible' AND deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a JOIN public.questions_v1 AS q ON q.id = a.question_id
      WHERE a.id = answer_replies_v1.answer_id AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL
        AND q.status = 'open' AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL));
CREATE POLICY answer_replies_v1_update ON public.answer_replies_v1 FOR UPDATE TO authenticated
  USING (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible'
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_replies_v1.answer_id
      AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL))
  WITH CHECK (author_person_id = (SELECT auth.uid()) AND moderation_visibility = 'visible'
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_replies_v1.answer_id
      AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL));

CREATE POLICY helpful_marks_v1_read ON public.answer_helpful_marks_v1 FOR SELECT TO authenticated
  USING (person_id = (SELECT auth.uid()));
CREATE POLICY helpful_marks_v1_insert ON public.answer_helpful_marks_v1 FOR INSERT TO authenticated
  WITH CHECK (person_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_helpful_marks_v1.answer_id
      AND a.author_person_id <> (SELECT auth.uid()) AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible'));
CREATE POLICY helpful_marks_v1_delete ON public.answer_helpful_marks_v1 FOR DELETE TO authenticated
  USING (person_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_helpful_marks_v1.answer_id
      AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible'));
CREATE POLICY helpful_facts_v1_read ON public.answer_helpful_public_facts_v1 FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.answers_v1 AS a WHERE a.id = answer_helpful_public_facts_v1.answer_id
    AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible'));
CREATE POLICY helpful_facts_v1_insert ON public.answer_helpful_public_facts_v1 FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.answer_helpful_marks_v1 AS m
    WHERE m.mark_id = answer_helpful_public_facts_v1.mark_id
      AND m.answer_id = answer_helpful_public_facts_v1.answer_id AND m.person_id = (SELECT auth.uid())));
CREATE POLICY helpful_facts_v1_delete ON public.answer_helpful_public_facts_v1 FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.answer_helpful_marks_v1 AS m
    WHERE m.mark_id = answer_helpful_public_facts_v1.mark_id
      AND m.answer_id = answer_helpful_public_facts_v1.answer_id AND m.person_id = (SELECT auth.uid())));

REVOKE ALL ON TABLE public.questions_v1, public.answers_v1, public.answer_replies_v1,
  public.answer_helpful_marks_v1, public.answer_helpful_public_facts_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, requester_person_id, title, context, primary_channel, deep_exchange_budget_max_cents,
  status, moderation_visibility, deleted_at, created_at, updated_at) ON public.questions_v1 TO anon, authenticated;
GRANT SELECT (id, question_id, author_person_id, body, moderation_visibility, deleted_at, created_at, updated_at)
  ON public.answers_v1 TO anon, authenticated;
GRANT SELECT (id, answer_id, author_person_id, body, moderation_visibility, deleted_at, created_at, updated_at)
  ON public.answer_replies_v1 TO anon, authenticated;
GRANT SELECT (mark_id, answer_id, person_id, created_at) ON public.answer_helpful_marks_v1 TO authenticated;
GRANT SELECT (answer_id) ON public.answer_helpful_public_facts_v1 TO anon, authenticated;
GRANT INSERT (title, context, primary_channel, deep_exchange_budget_max_cents) ON public.questions_v1 TO authenticated;
GRANT UPDATE (title, context, primary_channel, deep_exchange_budget_max_cents, status) ON public.questions_v1 TO authenticated;
GRANT INSERT (question_id, body) ON public.answers_v1 TO authenticated;
GRANT UPDATE (deleted_at) ON public.answers_v1 TO authenticated;
GRANT INSERT (answer_id, body) ON public.answer_replies_v1 TO authenticated;
GRANT UPDATE (deleted_at) ON public.answer_replies_v1 TO authenticated;
GRANT INSERT (answer_id) ON public.answer_helpful_marks_v1 TO authenticated;
GRANT DELETE ON public.answer_helpful_marks_v1 TO authenticated;
GRANT INSERT (mark_id, answer_id) ON public.answer_helpful_public_facts_v1 TO authenticated;
GRANT DELETE ON public.answer_helpful_public_facts_v1 TO authenticated;

CREATE FUNCTION ec2_private.lock_question(p_id uuid, p_open boolean)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE SQLSTATE 'PT409' USING MESSAGE = 'UNSUPPORTED_TRANSACTION_ISOLATION';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ec2-question:' || p_id::text, 0));
  SELECT q.status INTO v_status FROM public.questions_v1 AS q
    WHERE q.id = p_id AND q.moderation_visibility = 'visible' AND q.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  IF p_open AND v_status <> 'open' THEN RAISE SQLSTATE 'PT409' USING MESSAGE = 'QUESTION_CLOSED'; END IF;
  RETURN v_status;
END;
$$;

CREATE FUNCTION ec2_private.lock_answer(p_id uuid, p_open boolean)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_question uuid; v_author uuid;
BEGIN
  SELECT a.question_id INTO v_question FROM public.answers_v1 AS a
    WHERE a.id = p_id AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  PERFORM ec2_private.lock_question(v_question, p_open);
  -- Fresh statement after acquiring the question lock, not a pre-lock snapshot.
  SELECT a.author_person_id INTO v_author FROM public.answers_v1 AS a
    WHERE a.id = p_id AND a.moderation_visibility = 'visible' AND a.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  RETURN v_author;
END;
$$;

CREATE FUNCTION ec2_private.guard_question()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Privileged moderation is not an ordinary-client capability. No user-controlled GUC bypass.
  IF CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.requester_person_id IS DISTINCT FROM auth.uid() THEN
    RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'open' OR NEW.moderation_visibility <> 'visible' OR NEW.deleted_at IS NOT NULL THEN
      RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
    END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    -- UPDATE already owns a non-key row lock. Child FK KEY SHARE does not conflict with it.
    -- Do not acquire an advisory lock before this UPDATE in the close RPC.
    PERFORM ec2_private.lock_question(OLD.id, false);
    IF ROW(NEW.id, NEW.requester_person_id, NEW.created_at, NEW.moderation_visibility, NEW.deleted_at)
      IS DISTINCT FROM ROW(OLD.id, OLD.requester_person_id, OLD.created_at, OLD.moderation_visibility, OLD.deleted_at) THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE = 'IMMUTABLE_FIELD';
    END IF;
    IF OLD.status = 'closed' AND (NEW.status <> 'closed' OR
      ROW(NEW.title, NEW.context, NEW.primary_channel, NEW.deep_exchange_budget_max_cents)
      IS DISTINCT FROM ROW(OLD.title, OLD.context, OLD.primary_channel, OLD.deep_exchange_budget_max_cents)) THEN
      RAISE SQLSTATE 'PT409' USING MESSAGE = 'QUESTION_CLOSED';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ec2_private.guard_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.author_person_id IS DISTINCT FROM auth.uid() THEN
    RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE';
  END IF;
  PERFORM ec2_private.lock_question(NEW.question_id, TG_OP = 'INSERT');
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL OR NEW.moderation_visibility <> 'visible' THEN
      RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
    END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    IF ROW(NEW.id, NEW.question_id, NEW.author_person_id, NEW.body, NEW.created_at, NEW.moderation_visibility)
      IS DISTINCT FROM ROW(OLD.id, OLD.question_id, OLD.author_person_id, OLD.body, OLD.created_at, OLD.moderation_visibility)
      OR NEW.deleted_at IS NULL THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE = 'IMMUTABLE_FIELD';
    END IF;
    NEW.deleted_at := coalesce(OLD.deleted_at, clock_timestamp());
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ec2_private.guard_question_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF CURRENT_USER NOT IN ('postgres', 'supabase_admin', 'service_role') AND OLD.status <> 'open' THEN
    RAISE SQLSTATE 'PT409' USING MESSAGE = 'QUESTION_CLOSED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION ec2_private.guard_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.author_person_id IS DISTINCT FROM auth.uid() THEN
    RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE';
  END IF;
  PERFORM ec2_private.lock_answer(NEW.answer_id, TG_OP = 'INSERT');
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL OR NEW.moderation_visibility <> 'visible' THEN
      RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
    END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    IF ROW(NEW.id, NEW.answer_id, NEW.author_person_id, NEW.body, NEW.created_at, NEW.moderation_visibility)
      IS DISTINCT FROM ROW(OLD.id, OLD.answer_id, OLD.author_person_id, OLD.body, OLD.created_at, OLD.moderation_visibility)
      OR NEW.deleted_at IS NULL THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE = 'IMMUTABLE_FIELD';
    END IF;
    NEW.deleted_at := coalesce(OLD.deleted_at, clock_timestamp());
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ec2_private.guard_helpful_mark()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_author uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ec2_private.lock_answer(OLD.answer_id, false);
    IF OLD.person_id IS DISTINCT FROM auth.uid() THEN
      RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE';
    END IF;
    RETURN OLD;
  END IF;
  v_author := ec2_private.lock_answer(NEW.answer_id, false);
  IF NEW.person_id IS DISTINCT FROM auth.uid() THEN
    RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE';
  END IF;
  IF v_author = auth.uid() THEN RAISE SQLSTATE 'PT403' USING MESSAGE = 'SELF_HELPFUL_FORBIDDEN'; END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ec2_private.guard_helpful_fact()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ec2_private.lock_answer(OLD.answer_id, false);
    RETURN OLD;
  END IF;
  PERFORM ec2_private.lock_answer(NEW.answer_id, false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER questions_v1_guard BEFORE INSERT OR UPDATE ON public.questions_v1
  FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_question();
CREATE TRIGGER questions_v1_guard_edit BEFORE UPDATE OF title, context, primary_channel, deep_exchange_budget_max_cents
  ON public.questions_v1 FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_question_edit();
CREATE TRIGGER answers_v1_guard BEFORE INSERT OR UPDATE ON public.answers_v1
  FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_answer();
CREATE TRIGGER answer_replies_v1_guard BEFORE INSERT OR UPDATE ON public.answer_replies_v1
  FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_reply();
CREATE TRIGGER helpful_marks_v1_guard BEFORE INSERT OR DELETE ON public.answer_helpful_marks_v1
  FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_helpful_mark();
CREATE TRIGGER helpful_facts_v1_guard BEFORE INSERT OR DELETE ON public.answer_helpful_public_facts_v1
  FOR EACH ROW EXECUTE FUNCTION ec2_private.guard_helpful_fact();

CREATE FUNCTION ec2_private.validate_question(p_title text, p_context text, p_channel text, p_topics uuid[], p_budget bigint)
RETURNS void LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_topics IS NULL OR cardinality(p_topics) <> 0 THEN
    RAISE SQLSTATE 'PT422' USING MESSAGE = 'CANONICAL_TOPIC_NOT_READY';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' OR p_context IS NULL OR btrim(p_context) = ''
    OR p_channel IS NULL OR p_channel NOT IN ('education-learning','career-development','lifestyle-services','hobbies-skills')
    OR (p_budget IS NOT NULL AND (p_budget <= 0 OR p_budget > 9007199254740991)) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
END;
$$;
CREATE FUNCTION ec2_private.validate_page(p_limit integer, p_offset integer)
RETURNS void LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
END;
$$;

CREATE FUNCTION ec2_private.person_summary(p_person uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT CASE WHEN value IS NULL OR value = 'null'::jsonb THEN NULL ELSE jsonb_build_object(
    'userId', value -> 'userId', 'displayName', value -> 'displayName', 'avatarUrl', value -> 'avatarUrl'
  ) END FROM (SELECT public.get_public_person_profile_v1(p_person) -> 'person' AS value) AS safe;
$$;
CREATE FUNCTION ec2_private.viewer_helpful(p_answer uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.answer_helpful_marks_v1 AS m
    WHERE m.answer_id = p_answer AND m.person_id = auth.uid());
END;
$$;

CREATE FUNCTION ec2_private.question_detail(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'questionId', q.id, 'requesterPersonId', q.requester_person_id, 'title', q.title, 'context', q.context,
    'primaryChannel', q.primary_channel, 'topicIds', '[]'::jsonb,
    'deepExchangeBudgetMaxCents', q.deep_exchange_budget_max_cents, 'status', q.status,
    'createdAt', q.created_at, 'updatedAt', q.updated_at,
    'requester', ec2_private.person_summary(q.requester_person_id),
    'answerCount', (SELECT count(*) FROM public.answers_v1 AS a WHERE a.question_id = q.id
      AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible')
  ) FROM public.questions_v1 AS q WHERE q.id = p_id AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
$$;

CREATE FUNCTION public.create_question_v1(p_title text, p_context text, p_primary_channel text,
  p_topic_ids uuid[], p_deep_exchange_budget_max_cents bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE = 'AUTHENTICATION_REQUIRED'; END IF;
  PERFORM ec2_private.validate_question(p_title, p_context, p_primary_channel, p_topic_ids, p_deep_exchange_budget_max_cents);
  INSERT INTO public.questions_v1(title, context, primary_channel, deep_exchange_budget_max_cents)
    VALUES (p_title, p_context, p_primary_channel, p_deep_exchange_budget_max_cents) RETURNING id INTO v_id;
  RETURN jsonb_build_object('questionId', v_id);
END;
$$;
CREATE FUNCTION public.update_question_v1(p_question_id uuid, p_title text, p_context text, p_primary_channel text,
  p_topic_ids uuid[], p_deep_exchange_budget_max_cents bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM ec2_private.validate_question(p_title, p_context, p_primary_channel, p_topic_ids, p_deep_exchange_budget_max_cents);
  UPDATE public.questions_v1 AS q SET title = p_title, context = p_context, primary_channel = p_primary_channel,
    deep_exchange_budget_max_cents = p_deep_exchange_budget_max_cents
    WHERE q.id = p_question_id AND q.requester_person_id = auth.uid() AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  RETURN jsonb_build_object('questionId', p_question_id);
END;
$$;
CREATE FUNCTION public.close_question_v1(p_question_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.questions_v1 AS q SET status = 'closed' WHERE q.id = p_question_id
    AND q.requester_person_id = auth.uid() AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  RETURN jsonb_build_object('questionId', p_question_id, 'status', 'closed');
END;
$$;
CREATE FUNCTION public.get_question_detail_v1(p_question_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('question', ec2_private.question_detail(p_question_id));
$$;
CREATE FUNCTION public.list_questions_v1(p_primary_channel text, p_status text, p_limit integer, p_offset integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_rows jsonb; v_count integer;
BEGIN
  PERFORM ec2_private.validate_page(p_limit, p_offset);
  IF (p_primary_channel IS NOT NULL AND p_primary_channel NOT IN ('education-learning','career-development','lifestyle-services','hobbies-skills'))
    OR (p_status IS NOT NULL AND p_status NOT IN ('open', 'closed')) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT';
  END IF;
  WITH page AS MATERIALIZED (
    SELECT q.id, q.created_at FROM public.questions_v1 AS q
    WHERE q.deleted_at IS NULL AND q.moderation_visibility = 'visible'
      AND (p_primary_channel IS NULL OR q.primary_channel = p_primary_channel)
      AND (p_status IS NULL OR q.status = p_status)
    ORDER BY q.created_at DESC, q.id ASC LIMIT p_limit + 1 OFFSET p_offset
  ), items AS (
    SELECT p.id, p.created_at FROM page AS p ORDER BY p.created_at DESC, p.id ASC LIMIT p_limit
  ) SELECT coalesce(jsonb_agg(ec2_private.question_detail(i.id) ORDER BY i.created_at DESC, i.id ASC), '[]'::jsonb),
      (SELECT count(*) FROM page) INTO v_rows, v_count FROM items AS i;
  RETURN jsonb_build_object('questions', v_rows, 'nextOffset',
    CASE WHEN v_count > p_limit THEN p_offset::bigint + jsonb_array_length(v_rows) ELSE NULL END);
END;
$$;

CREATE FUNCTION public.create_answer_v1(p_question_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_body IS NULL OR btrim(p_body) = '' THEN RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT'; END IF;
  PERFORM ec2_private.lock_question(p_question_id, true);
  INSERT INTO public.answers_v1(question_id, body) VALUES (p_question_id, p_body) RETURNING id INTO v_id;
  RETURN jsonb_build_object('answerId', v_id);
END;
$$;
CREATE FUNCTION public.delete_answer_v1(p_answer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.answers_v1 AS a SET deleted_at = clock_timestamp() WHERE a.id = p_answer_id
    AND a.author_person_id = auth.uid() AND a.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  RETURN jsonb_build_object('answerId', p_answer_id);
END;
$$;
CREATE FUNCTION public.list_question_answers_v1(p_question_id uuid, p_order text, p_limit integer, p_offset integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_rows jsonb; v_count integer;
BEGIN
  PERFORM ec2_private.validate_page(p_limit, p_offset);
  IF p_order IS NULL OR p_order NOT IN ('comprehensive', 'latest') THEN RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT'; END IF;
  WITH page AS MATERIALIZED (
    SELECT a.id, a.question_id, a.author_person_id, a.body, a.created_at, a.updated_at,
      (SELECT count(*) FROM public.answer_helpful_public_facts_v1 AS f WHERE f.answer_id = a.id) AS helpful_count
    FROM public.answers_v1 AS a JOIN public.questions_v1 AS q ON q.id = a.question_id
    WHERE a.question_id = p_question_id AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible'
      AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible'
    ORDER BY CASE WHEN p_order = 'comprehensive' THEN
      (SELECT count(*) FROM public.answer_helpful_public_facts_v1 AS f WHERE f.answer_id = a.id) ELSE 0 END DESC,
      a.created_at DESC, a.id ASC LIMIT p_limit + 1 OFFSET p_offset
  ), items AS (
    SELECT p.id, p.question_id, p.author_person_id, p.body, p.created_at, p.updated_at, p.helpful_count
    FROM page AS p ORDER BY CASE WHEN p_order = 'comprehensive' THEN p.helpful_count ELSE 0 END DESC,
      p.created_at DESC, p.id ASC LIMIT p_limit
  ) SELECT coalesce(jsonb_agg(jsonb_build_object(
    'answerId', i.id, 'questionId', i.question_id, 'authorPersonId', i.author_person_id,
    'author', ec2_private.person_summary(i.author_person_id), 'body', i.body,
    'helpfulCount', i.helpful_count, 'viewerHasMarkedHelpful', ec2_private.viewer_helpful(i.id),
    'replyCount', (SELECT count(*) FROM public.answer_replies_v1 AS r WHERE r.answer_id = i.id
      AND r.deleted_at IS NULL AND r.moderation_visibility = 'visible'),
    'createdAt', i.created_at, 'updatedAt', i.updated_at
  ) ORDER BY CASE WHEN p_order = 'comprehensive' THEN i.helpful_count ELSE 0 END DESC, i.created_at DESC, i.id ASC), '[]'::jsonb),
    (SELECT count(*) FROM page) INTO v_rows, v_count FROM items AS i;
  RETURN jsonb_build_object('answers', v_rows, 'nextOffset',
    CASE WHEN v_count > p_limit THEN p_offset::bigint + jsonb_array_length(v_rows) ELSE NULL END);
END;
$$;

CREATE FUNCTION public.set_answer_helpful_v1(p_answer_id uuid, p_is_helpful boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_author uuid; v_mark uuid; v_count bigint;
BEGIN
  IF p_is_helpful IS NULL THEN RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT'; END IF;
  v_author := ec2_private.lock_answer(p_answer_id, false);
  IF p_is_helpful AND v_author = auth.uid() THEN RAISE SQLSTATE 'PT403' USING MESSAGE = 'SELF_HELPFUL_FORBIDDEN'; END IF;
  SELECT m.mark_id INTO v_mark FROM public.answer_helpful_marks_v1 AS m
    WHERE m.answer_id = p_answer_id AND m.person_id = auth.uid();
  IF p_is_helpful AND v_mark IS NULL THEN
    INSERT INTO public.answer_helpful_marks_v1(answer_id) VALUES (p_answer_id) RETURNING mark_id INTO v_mark;
    INSERT INTO public.answer_helpful_public_facts_v1(mark_id, answer_id) VALUES (v_mark, p_answer_id);
  ELSIF NOT p_is_helpful AND v_mark IS NOT NULL THEN
    -- RLS selects only the caller's fact for deletion; no public SELECT(mark_id) is needed.
    DELETE FROM public.answer_helpful_public_facts_v1 AS f WHERE f.answer_id = p_answer_id;
    DELETE FROM public.answer_helpful_marks_v1 AS m WHERE m.answer_id = p_answer_id AND m.person_id = auth.uid();
  END IF;
  SELECT count(*) INTO v_count FROM public.answer_helpful_public_facts_v1 AS f WHERE f.answer_id = p_answer_id;
  RETURN jsonb_build_object('answerId', p_answer_id, 'helpfulCount', v_count,
    'viewerHasMarkedHelpful', ec2_private.viewer_helpful(p_answer_id));
END;
$$;

CREATE FUNCTION public.create_answer_reply_v1(p_answer_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_body IS NULL OR btrim(p_body) = '' THEN RAISE SQLSTATE 'PT400' USING MESSAGE = 'INVALID_INPUT'; END IF;
  PERFORM ec2_private.lock_answer(p_answer_id, true);
  INSERT INTO public.answer_replies_v1(answer_id, body) VALUES (p_answer_id, p_body) RETURNING id INTO v_id;
  RETURN jsonb_build_object('replyId', v_id);
END;
$$;
CREATE FUNCTION public.delete_answer_reply_v1(p_reply_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.answer_replies_v1 AS r SET deleted_at = clock_timestamp() WHERE r.id = p_reply_id
    AND r.author_person_id = auth.uid() AND r.moderation_visibility = 'visible';
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE = 'TARGET_NOT_FOUND_OR_INACCESSIBLE'; END IF;
  RETURN jsonb_build_object('replyId', p_reply_id);
END;
$$;
CREATE FUNCTION public.list_answer_replies_v1(p_answer_id uuid, p_limit integer, p_offset integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_rows jsonb; v_count integer;
BEGIN
  PERFORM ec2_private.validate_page(p_limit, p_offset);
  WITH page AS MATERIALIZED (
    SELECT r.id, r.answer_id, r.author_person_id, r.body, r.created_at, r.updated_at
    FROM public.answer_replies_v1 AS r JOIN public.answers_v1 AS a ON a.id = r.answer_id
      JOIN public.questions_v1 AS q ON q.id = a.question_id
    WHERE r.answer_id = p_answer_id AND r.deleted_at IS NULL AND r.moderation_visibility = 'visible'
      AND a.deleted_at IS NULL AND a.moderation_visibility = 'visible'
      AND q.deleted_at IS NULL AND q.moderation_visibility = 'visible'
    ORDER BY r.created_at ASC, r.id ASC LIMIT p_limit + 1 OFFSET p_offset
  ), items AS (
    SELECT p.id, p.answer_id, p.author_person_id, p.body, p.created_at, p.updated_at
    FROM page AS p ORDER BY p.created_at ASC, p.id ASC LIMIT p_limit
  ) SELECT coalesce(jsonb_agg(jsonb_build_object(
    'replyId', i.id, 'answerId', i.answer_id, 'authorPersonId', i.author_person_id,
    'author', ec2_private.person_summary(i.author_person_id), 'body', i.body,
    'createdAt', i.created_at, 'updatedAt', i.updated_at
  ) ORDER BY i.created_at ASC, i.id ASC), '[]'::jsonb),
    (SELECT count(*) FROM page) INTO v_rows, v_count FROM items AS i;
  RETURN jsonb_build_object('replies', v_rows, 'nextOffset',
    CASE WHEN v_count > p_limit THEN p_offset::bigint + jsonb_array_length(v_rows) ELSE NULL END);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ec2_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ec2_private.lock_question(uuid,boolean), ec2_private.lock_answer(uuid,boolean),
  ec2_private.validate_question(text,text,text,uuid[],bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION ec2_private.validate_page(integer,integer), ec2_private.person_summary(uuid),
  ec2_private.viewer_helpful(uuid), ec2_private.question_detail(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.create_question_v1(text,text,text,uuid[],bigint),
  public.update_question_v1(uuid,text,text,text,uuid[],bigint), public.close_question_v1(uuid),
  public.get_question_detail_v1(uuid), public.list_questions_v1(text,text,integer,integer),
  public.create_answer_v1(uuid,text), public.delete_answer_v1(uuid),
  public.list_question_answers_v1(uuid,text,integer,integer), public.set_answer_helpful_v1(uuid,boolean),
  public.create_answer_reply_v1(uuid,text), public.delete_answer_reply_v1(uuid),
  public.list_answer_replies_v1(uuid,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_detail_v1(uuid), public.list_questions_v1(text,text,integer,integer),
  public.list_question_answers_v1(uuid,text,integer,integer), public.list_answer_replies_v1(uuid,integer,integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_question_v1(text,text,text,uuid[],bigint),
  public.update_question_v1(uuid,text,text,text,uuid[],bigint), public.close_question_v1(uuid),
  public.create_answer_v1(uuid,text), public.delete_answer_v1(uuid), public.set_answer_helpful_v1(uuid,boolean),
  public.create_answer_reply_v1(uuid,text), public.delete_answer_reply_v1(uuid) TO authenticated;

COMMIT;
