-- Controlled acquisition. Apply manually; does not create accounts or businesses.
BEGIN;
CREATE TABLE public.restaurant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('application','inquiry')),
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 120),
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (length(email) <= 254 AND email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text NOT NULL DEFAULT '' CHECK (length(phone) <= 40),
  city text CHECK (length(btrim(city)) BETWEEN 1 AND 120),
  business_type text CHECK (business_type IN ('restaurant','cafe')),
  branch_count integer CHECK (branch_count BETWEEN 1 AND 10000),
  requested_plan_code text CHECK (requested_plan_code IN ('starter','pro','enterprise')),
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 2000),
  locale text NOT NULL CHECK (locale IN ('en','ar','he')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  internal_note text NOT NULL DEFAULT '' CHECK (length(internal_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'application' OR (city IS NOT NULL AND business_type IS NOT NULL AND branch_count IS NOT NULL AND length(regexp_replace(phone,'[^0-9]','','g')) >= 7)),
  CHECK (kind <> 'inquiry' OR length(btrim(message)) > 0),
  CHECK ((status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status <> 'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX applications_pending_identity ON public.restaurant_applications (kind, email, lower(btrim(business_name))) WHERE status = 'pending';
CREATE INDEX applications_review_queue ON public.restaurant_applications (reviewed_at NULLS FIRST, created_at DESC, id);
CREATE INDEX applications_status ON public.restaurant_applications (status, created_at DESC);
ALTER TABLE public.restaurant_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.restaurant_applications TO authenticated;
GRANT ALL ON public.restaurant_applications TO service_role;
CREATE POLICY applications_platform_read ON public.restaurant_applications FOR SELECT TO authenticated USING (public.is_platform_admin());

-- Only the server endpoint may submit, after validation and the shared request budget.
CREATE FUNCTION public.submit_restaurant_application(p_input jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.restaurant_applications(kind,full_name,business_name,email,phone,city,business_type,branch_count,requested_plan_code,message,locale)
  VALUES (p_input->>'kind',btrim(p_input->>'full_name'),btrim(p_input->>'business_name'),lower(btrim(p_input->>'email')),coalesce(p_input->>'phone',''),p_input->>'city',p_input->>'business_type',(p_input->>'branch_count')::integer,nullif(p_input->>'requested_plan_code','unsure'),coalesce(p_input->>'message',''),p_input->>'locale')
  ON CONFLICT (kind,email,lower(btrim(business_name))) WHERE status = 'pending' DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_restaurant_application(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_restaurant_application(jsonb) TO service_role;

CREATE FUNCTION public.review_restaurant_application(p_id uuid, p_status text, p_internal_note text, p_plan text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('approved','rejected') OR p_internal_note IS NULL OR length(p_internal_note)>2000 OR (p_plan IS NOT NULL AND p_plan NOT IN ('starter','pro','enterprise')) THEN
    RAISE EXCEPTION 'invalid_review' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurant_applications SET status=p_status, internal_note=btrim(p_internal_note), requested_plan_code=p_plan, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
  WHERE id=p_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'already_reviewed_or_missing' USING ERRCODE = '40001'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_restaurant_application(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_restaurant_application(uuid,text,text,text) TO authenticated;
COMMIT;
