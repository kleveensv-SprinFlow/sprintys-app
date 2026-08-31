-- Add status column to team_members to support the pending/approved flow
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing members to be approved
UPDATE public.team_members SET status = 'approved' WHERE status IS NULL OR status = 'pending';
