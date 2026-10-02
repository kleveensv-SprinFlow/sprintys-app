-- Migration: 20261002000001_fix_role_spoofing.sql
-- Description: Fix role spoofing vulnerability in handle_new_user trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  -- Validate role strictly to prevent privilege escalation
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'athlete');
  
  -- If a malicious user sends an unexpected role (like 'admin'), fallback to 'athlete'
  IF v_role NOT IN ('athlete', 'coach') THEN
    v_role := 'athlete';
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilisateur'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
