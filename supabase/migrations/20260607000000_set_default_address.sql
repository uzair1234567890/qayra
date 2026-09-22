-- Atomic set-default-address RPC: both updates run in one transaction,
-- eliminating the race window where all addresses are false simultaneously.
CREATE OR REPLACE FUNCTION public.set_default_address(p_profile_id uuid, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE addresses SET is_default = false WHERE profile_id = p_profile_id;
  UPDATE addresses SET is_default = true  WHERE id = p_id AND profile_id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_address TO authenticated;
