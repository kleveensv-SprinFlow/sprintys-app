-- Migration: 20261002000002_storage_policies.sql
-- Description: Define strict RLS policies for Supabase Storage (avatars).

-- Ensure storage schema extensions and bucket exists if this is applied in a fresh environment
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled (default in Supabase, but safe to assert)
-- Usually storage.objects has RLS by default.

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 1. SELECT: Anyone can view avatars (bucket is public, but let's be explicit for objects)
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 2. INSERT: Users can only upload files to the avatars bucket if they own them.
-- In Supabase Storage, the `owner` column maps to auth.uid().
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid() = owner
);

-- 3. UPDATE: Users can only update their own avatars.
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid() = owner
);

-- 4. DELETE: Users can only delete their own avatars.
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid() = owner
);
