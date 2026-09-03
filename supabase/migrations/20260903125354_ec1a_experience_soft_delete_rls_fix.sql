-- Correct EC-1A owner soft-delete behavior discovered by the Production
-- rollback smoke. The original migration remains immutable in history.
--
-- SECURITY INVOKER mutations still rely on auth.uid(), RLS, and explicit
-- column grants. Owner RPC projections continue to filter deleted rows.

BEGIN;

DROP POLICY IF EXISTS person_experiences_authenticated_select_v1
  ON public.person_experiences;

CREATE POLICY person_experiences_authenticated_select_v1
  ON public.person_experiences
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = person_experiences.person_id
    OR (
      person_experiences.visibility = 'public'
      AND person_experiences.deleted_at IS NULL
    )
  );

-- PostgreSQL applies SELECT visibility while evaluating an UPDATE under RLS.
-- The owner must therefore retain owner-only visibility of a claim tombstone
-- for the SECURITY INVOKER soft-delete UPDATE to complete. Public access is
-- unchanged, and get_my_person_experiences_v1 still excludes deleted claims.
DROP POLICY IF EXISTS experience_claims_owner_select_v1
  ON public.experience_claims;

CREATE POLICY experience_claims_owner_select_v1
  ON public.experience_claims
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = experience_claims.person_id
    AND EXISTS (
      SELECT 1
      FROM public.person_experiences AS parent_experience
      WHERE parent_experience.id = experience_claims.experience_id
        AND parent_experience.person_id = experience_claims.person_id
        AND parent_experience.deleted_at IS NULL
    )
  );

-- Cover the full composite owner foreign keys. Existing indexes remain in
-- place because they serve ordering and active-claim lookup separately.
CREATE INDEX experience_transitions_experience_owner_idx
  ON public.experience_transitions(experience_id, person_id);

CREATE INDEX experience_claims_experience_owner_idx
  ON public.experience_claims(experience_id, person_id);

COMMIT;
