-- Migration: Get user by email RPC (Admin)
-- Description: Helper for service role to get a user ID from auth.users by email.

CREATE OR REPLACE FUNCTION public.fn_get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_get_user_id_by_email FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_user_id_by_email TO service_role;
