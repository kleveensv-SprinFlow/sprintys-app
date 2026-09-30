-- Migration: Add coach_philosophy to profiles
ALTER TABLE profiles ADD COLUMN coach_philosophy TEXT;
