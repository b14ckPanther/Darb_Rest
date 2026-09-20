-- ==============================================================================
-- Darb REST: Server-Side Onboarding Draft Persistence
-- Migration: 20260918000003_onboarding_drafts.sql
-- Description: Creates onboarding_drafts table for server-side persistence of
--              in-progress restaurant and branch onboarding state per user.
--              Ensures no sensitive business data is stored only in cookies.
-- ==============================================================================

-- 1. Create onboarding_drafts table
CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step SMALLINT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_onboarding_drafts_user UNIQUE (user_id)
);

-- Index for rapid lookup by authenticated user
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user 
  ON public.onboarding_drafts(user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER set_onboarding_drafts_updated_at
  BEFORE UPDATE ON public.onboarding_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Enable Row Level Security
ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Authenticated users manage strictly their own draft record
CREATE POLICY "Users can view their own onboarding draft"
  ON public.onboarding_drafts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Users can insert their own onboarding draft"
  ON public.onboarding_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding draft"
  ON public.onboarding_drafts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own onboarding draft"
  ON public.onboarding_drafts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());
