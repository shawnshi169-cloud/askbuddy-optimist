-- P1.1 WeChat Auth v1 identity mapping.
-- WeChat credentials remain server-side. This table is never client-readable.

BEGIN;

CREATE TABLE public.wechat_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id text NOT NULL,
  openid text NOT NULL,
  unionid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wechat_identities_app_openid_key UNIQUE (app_id, openid),
  CONSTRAINT wechat_identities_app_user_key UNIQUE (app_id, user_id),
  CONSTRAINT wechat_identities_app_id_length CHECK (char_length(app_id) BETWEEN 1 AND 64),
  CONSTRAINT wechat_identities_openid_length CHECK (char_length(openid) BETWEEN 1 AND 128),
  CONSTRAINT wechat_identities_unionid_length CHECK (
    unionid IS NULL OR char_length(unionid) BETWEEN 1 AND 128
  )
);

CREATE UNIQUE INDEX idx_wechat_identities_app_unionid
  ON public.wechat_identities(app_id, unionid)
  WHERE unionid IS NOT NULL;

CREATE INDEX idx_wechat_identities_user_id
  ON public.wechat_identities(user_id);

COMMENT ON TABLE public.wechat_identities IS
  'Sensitive server-only mapping from a WeChat Mini Program identity to auth.users.';
COMMENT ON COLUMN public.wechat_identities.openid IS
  'WeChat Mini Program scoped identifier. Never expose through public profiles or client APIs.';
COMMENT ON COLUMN public.wechat_identities.unionid IS
  'Optional WeChat Open Platform identifier. It is metadata, not the v1 primary identity key.';

ALTER TABLE public.wechat_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_identities FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wechat_identities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wechat_identities TO service_role;

DROP TRIGGER IF EXISTS trg_wechat_identities_updated_at ON public.wechat_identities;
CREATE TRIGGER trg_wechat_identities_updated_at
  BEFORE UPDATE ON public.wechat_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atomically preserves the first app_id/openid -> user_id mapping. A concurrent
-- caller can update last_login_at, but can never replace the owning auth user.
CREATE OR REPLACE FUNCTION public.claim_wechat_identity_v1(
  p_app_id text,
  p_openid text,
  p_unionid text,
  p_candidate_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  IF p_app_id IS NULL OR btrim(p_app_id) = ''
    OR p_openid IS NULL OR btrim(p_openid) = ''
    OR p_candidate_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid WeChat identity claim' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.wechat_identities (
    user_id,
    app_id,
    openid,
    unionid,
    last_login_at
  )
  VALUES (
    p_candidate_user_id,
    p_app_id,
    p_openid,
    NULLIF(btrim(p_unionid), ''),
    now()
  )
  ON CONFLICT (app_id, openid) DO UPDATE
  SET
    unionid = COALESCE(public.wechat_identities.unionid, EXCLUDED.unionid),
    last_login_at = now(),
    updated_at = now()
  RETURNING public.wechat_identities.user_id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_wechat_identity_v1(text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wechat_identity_v1(text, text, text, uuid)
  TO service_role;

COMMIT;
