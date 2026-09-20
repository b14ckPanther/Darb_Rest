-- ==============================================================================
-- Darb REST: Core Multi-Tenant Database Schema Migration
-- Migration: 20260918000001_core_schema.sql
-- Description: Profiles, Platform Admins, Plans, Entitlements, Businesses,
--              Business Settings, Locations, Memberships, Overrides & RLS.
-- ==============================================================================

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_locale IN ('ar', 'he', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Platform Admins Table (Strictly isolated super-admin privileges)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Commercial Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name JSONB NOT NULL, -- Localized: {"ar": "...", "he": "...", "en": "..."}
  description JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Plan Entitlements Table (Booleans and Numeric Limits)
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value INTEGER, -- NULL = unlimited or boolean feature; >0 = quota (e.g. max branches)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_feature UNIQUE (plan_id, feature_key)
);

CREATE TRIGGER set_plan_entitlements_updated_at
  BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Businesses Table (The Core Multi-Tenant Boundary)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name JSONB NOT NULL, -- Localized: {"ar": "...", "he": "...", "en": "..."}
  legal_name TEXT,
  business_type TEXT NOT NULL DEFAULT 'restaurant' CHECK (business_type IN ('restaurant', 'cafe')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
  default_locale TEXT NOT NULL DEFAULT 'ar' CHECK (default_locale IN ('ar', 'he', 'en')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
  currency TEXT NOT NULL DEFAULT 'ILS',
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);

CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Business Settings Table (1:1 with businesses)
CREATE TABLE IF NOT EXISTS public.business_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  primary_color TEXT,
  accent_color TEXT,
  logo_url TEXT,
  cover_url TEXT,
  cover_video_url TEXT,
  phone_public TEXT,
  email_public TEXT,
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  cancellation_policy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Locations / Branches Table
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name JSONB NOT NULL,
  phone TEXT,
  email TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state_region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'IL',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  timezone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'temporarily_closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_location_slug UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_locations_business_id ON public.locations(business_id);

CREATE TRIGGER set_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Memberships Table (Maps Users to Businesses with Granular Roles)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'staff', 'read_only')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_business_membership UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_business_id ON public.memberships(business_id);

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Business Feature Overrides Table
CREATE TABLE IF NOT EXISTS public.business_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  limit_value INTEGER,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_feature_override UNIQUE (business_id, feature_key)
);

CREATE TRIGGER set_business_feature_overrides_updated_at
  BEFORE UPDATE ON public.business_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- SECURITY DEFINER Helper Functions (Safe Search Path & Non-Recursive Lookups)
-- ==============================================================================

-- Check if user is a platform super admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Check if authenticated user belongs to a business
CREATE OR REPLACE FUNCTION public.user_belongs_to_business(target_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE business_id = target_business_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Get user's active role inside a business
CREATE OR REPLACE FUNCTION public.get_user_business_role(target_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.memberships
  WHERE business_id = target_business_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Check if user has specific minimum role inside a business
CREATE OR REPLACE FUNCTION public.has_business_role(target_business_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  v_role := public.get_user_business_role(target_business_id);
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Trigger ensuring a business never loses its last active owner
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  IF OLD.role = 'owner' AND (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (NEW.role <> 'owner' OR NEW.status <> 'active'))) THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.memberships
    WHERE business_id = OLD.business_id
      AND role = 'owner'
      AND status = 'active'
      AND id <> OLD.id;

    IF v_owner_count = 0 THEN
      RAISE EXCEPTION 'Operation prohibited: A business must retain at least one active owner.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER check_last_owner_before_delete
  BEFORE DELETE OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();

-- Trigger for auto-creating a profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_preferred_locale TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_preferred_locale := COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'ar');

  IF v_preferred_locale NOT IN ('ar', 'he', 'en') THEN
    v_preferred_locale := 'ar';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, preferred_locale)
  VALUES (NEW.id, v_full_name, NEW.phone, v_preferred_locale)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_feature_overrides ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_admin());

-- 2. Platform Admins RLS
CREATE POLICY "Platform admins can view admin table"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin());

-- 3. Plans & Entitlements RLS
CREATE POLICY "Authenticated users can read plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage plans"
  ON public.plans FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read plan entitlements"
  ON public.plan_entitlements FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Platform admins can manage plan entitlements"
  ON public.plan_entitlements FOR ALL
  USING (public.is_platform_admin());

-- 4. Businesses RLS
CREATE POLICY "Members can view their businesses"
  ON public.businesses FOR SELECT
  USING (public.user_belongs_to_business(id) OR public.is_platform_admin());

CREATE POLICY "Authenticated users can register new businesses"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Owners and Admins can update their business"
  ON public.businesses FOR UPDATE
  USING (public.has_business_role(id, ARRAY['owner', 'admin']) OR public.is_platform_admin())
  WITH CHECK (public.has_business_role(id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

CREATE POLICY "Owners can delete their business"
  ON public.businesses FOR DELETE
  USING (public.has_business_role(id, ARRAY['owner']) OR public.is_platform_admin());

-- 5. Business Settings RLS
CREATE POLICY "Members can view business settings"
  ON public.business_settings FOR SELECT
  USING (public.user_belongs_to_business(business_id) OR public.is_platform_admin());

CREATE POLICY "Owners and Admins can update business settings"
  ON public.business_settings FOR UPDATE
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin())
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

CREATE POLICY "Owners and Admins can insert business settings"
  ON public.business_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

-- 6. Locations / Branches RLS
CREATE POLICY "Members can view business locations"
  ON public.locations FOR SELECT
  USING (public.user_belongs_to_business(business_id) OR public.is_platform_admin());

CREATE POLICY "Managers, Admins and Owners can manage locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'manager']) OR public.is_platform_admin());

CREATE POLICY "Managers, Admins and Owners can update locations"
  ON public.locations FOR UPDATE
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'manager']) OR public.is_platform_admin())
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'manager']) OR public.is_platform_admin());

CREATE POLICY "Owners and Admins can delete locations"
  ON public.locations FOR DELETE
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

-- 7. Memberships RLS
CREATE POLICY "Members can view colleagues in same business"
  ON public.memberships FOR SELECT
  USING (public.user_belongs_to_business(business_id) OR user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Initial owner self-assignment or Admins adding members"
  ON public.memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow user creating their initial business ownership
    (user_id = auth.uid() AND role = 'owner')
    OR public.has_business_role(business_id, ARRAY['owner', 'admin'])
    OR public.is_platform_admin()
  );

CREATE POLICY "Owners and Admins can update memberships"
  ON public.memberships FOR UPDATE
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin())
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

CREATE POLICY "Owners and Admins can remove memberships"
  ON public.memberships FOR DELETE
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']) OR public.is_platform_admin());

-- 8. Business Feature Overrides RLS
CREATE POLICY "Members can view business feature overrides"
  ON public.business_feature_overrides FOR SELECT
  USING (public.user_belongs_to_business(business_id) OR public.is_platform_admin());

CREATE POLICY "Platform admins manage business overrides"
  ON public.business_feature_overrides FOR ALL
  USING (public.is_platform_admin());
