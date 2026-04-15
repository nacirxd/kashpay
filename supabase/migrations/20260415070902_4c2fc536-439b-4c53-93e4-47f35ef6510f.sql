
-- Add status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add status to products  
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Create admin_sessions table
CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- No direct access to admin_sessions from client
CREATE POLICY "No public access to admin sessions"
  ON public.admin_sessions FOR SELECT
  USING (false);
