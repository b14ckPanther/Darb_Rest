-- ==============================================================================
-- Darb REST: Business & Branch Onboarding & Operating Hours
-- Migration: 20260918000002_onboarding_and_hours.sql
-- Description: Location Operating Hours table, onboarding step tracking,
--              RLS policies, and atomic onboarding business creation function.
-- ==============================================================================

-- 1. Add onboarding_step tracking column to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1;

-- 2. Location Operating Hours Table
-- Normalized schedule per branch location
-- day_of_week follows ISO convention: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
CREATE TABLE IF NOT EXISTS public.location_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  open_time TIME NOT NULL DEFAULT '08:00',
  close_time TIME NOT NULL DEFAULT '22:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_order CHECK (is_closed OR open_time <= close_time)
);

CREATE INDEX IF NOT EXISTS idx_operating_hours_location 
  ON public.location_operating_hours(location_id, day_of_week);

CREATE TRIGGER set_location_operating_hours_updated_at
  BEFORE UPDATE ON public.location_operating_hours
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Row Level Security for Operating Hours
ALTER TABLE public.location_operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view operating hours"
  ON public.location_operating_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_operating_hours.location_id
        AND (public.user_belongs_to_business(l.business_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "Managers, Admins and Owners can manage operating hours"
  ON public.location_operating_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_operating_hours.location_id
        AND (public.has_business_role(l.business_id, ARRAY['owner', 'admin', 'manager']) OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_operating_hours.location_id
        AND (public.has_business_role(l.business_id, ARRAY['owner', 'admin', 'manager']) OR public.is_platform_admin())
    )
  );

-- 4. Atomic Onboarding Business Creation Function
-- Ensures business, settings, owner membership, first location, and hours are created in one transaction
CREATE OR REPLACE FUNCTION public.create_onboarding_business(
  p_slug TEXT,
  p_name JSONB,
  p_legal_name TEXT,
  p_business_type TEXT,
  p_default_locale TEXT,
  p_timezone TEXT,
  p_currency TEXT,
  p_plan_id UUID,
  p_primary_color TEXT,
  p_accent_color TEXT,
  p_phone_public TEXT,
  p_email_public TEXT,
  p_website_url TEXT,
  p_instagram_url TEXT,
  p_facebook_url TEXT,
  p_branch_slug TEXT,
  p_branch_name JSONB,
  p_branch_phone TEXT,
  p_branch_email TEXT,
  p_branch_address_line1 TEXT,
  p_branch_city TEXT,
  p_branch_country TEXT,
  p_hours JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_location_id UUID;
  v_hour_record JSONB;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: Only authenticated users can complete onboarding.';
  END IF;

  -- 1. Create Business
  INSERT INTO public.businesses (
    slug,
    name,
    legal_name,
    business_type,
    status,
    default_locale,
    timezone,
    currency,
    plan_id,
    onboarding_step
  ) VALUES (
    p_slug,
    p_name,
    p_legal_name,
    p_business_type,
    'active',
    p_default_locale,
    p_timezone,
    p_currency,
    p_plan_id,
    7
  )
  RETURNING id INTO v_business_id;

  -- 2. Create Business Settings
  INSERT INTO public.business_settings (
    business_id,
    primary_color,
    accent_color,
    phone_public,
    email_public,
    website_url,
    instagram_url,
    facebook_url
  ) VALUES (
    v_business_id,
    p_primary_color,
    p_accent_color,
    p_phone_public,
    p_email_public,
    p_website_url,
    p_instagram_url,
    p_facebook_url
  );

  -- 3. Create Owner Membership for the Authenticated Creator
  INSERT INTO public.memberships (
    user_id,
    business_id,
    role,
    status
  ) VALUES (
    v_user_id,
    v_business_id,
    'owner',
    'active'
  );

  -- 4. Create First Primary Branch Location
  INSERT INTO public.locations (
    business_id,
    slug,
    name,
    phone,
    email,
    address_line1,
    city,
    country,
    is_primary,
    status
  ) VALUES (
    v_business_id,
    p_branch_slug,
    p_branch_name,
    p_branch_phone,
    p_branch_email,
    p_branch_address_line1,
    p_branch_city,
    COALESCE(p_branch_country, 'IL'),
    TRUE,
    'active'
  )
  RETURNING id INTO v_location_id;

  -- 5. Insert Operating Hours if provided
  IF p_hours IS NOT NULL AND jsonb_array_length(p_hours) > 0 THEN
    FOR v_hour_record IN SELECT * FROM jsonb_array_elements(p_hours)
    LOOP
      INSERT INTO public.location_operating_hours (
        location_id,
        day_of_week,
        open_time,
        close_time,
        is_closed
      ) VALUES (
        v_location_id,
        (v_hour_record->>'day_of_week')::SMALLINT,
        COALESCE((v_hour_record->>'open_time')::TIME, '08:00'::TIME),
        COALESCE((v_hour_record->>'close_time')::TIME, '22:00'::TIME),
        COALESCE((v_hour_record->>'is_closed')::BOOLEAN, FALSE)
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'business_id', v_business_id,
    'slug', p_slug,
    'location_id', v_location_id,
    'status', 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
