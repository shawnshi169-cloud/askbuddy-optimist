-- Recognize service-role PostgREST calls across supported JWT claim formats.
-- RPC-specific EXECUTE grants and internal authorization guards remain unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(auth.role(), '') = 'service_role';
$$;

COMMIT;
