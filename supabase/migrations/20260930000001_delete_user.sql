-- Migration: Create delete_user function
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.users. The user's ID is retrieved from the JWT token.
  -- The ON DELETE CASCADE on public.profiles will handle deleting the profile.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
