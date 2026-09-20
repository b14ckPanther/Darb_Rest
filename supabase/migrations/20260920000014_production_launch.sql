-- Operator-applied launch controls. Existing active restaurants retain visibility.
CREATE TABLE public.restaurant_launch (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
 is_public boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.restaurant_launch(business_id,is_public) SELECT id,status='active' FROM public.businesses;
ALTER TABLE public.restaurant_launch ENABLE ROW LEVEL SECURITY;
CREATE POLICY launch_read ON public.restaurant_launch FOR SELECT TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin']));
REVOKE ALL ON public.restaurant_launch FROM anon,authenticated;
GRANT SELECT ON public.restaurant_launch TO authenticated;
CREATE FUNCTION public.set_restaurant_launch(p_business_id uuid,p_public boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_public IS NULL OR NOT public.has_business_role(p_business_id,ARRAY['owner','admin']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 INSERT INTO public.restaurant_launch(business_id,is_public) VALUES(p_business_id,p_public) ON CONFLICT(business_id) DO UPDATE SET is_public=excluded.is_public,updated_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.set_restaurant_launch(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_restaurant_launch(uuid,boolean) TO authenticated;
CREATE TABLE public.business_domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 hostname text NOT NULL UNIQUE CHECK(length(hostname)<=253 AND hostname=lower(hostname) AND hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$'),
 verification_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
 verified_until timestamptz, active boolean NOT NULL DEFAULT false, canonical boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(NOT active OR verified_until IS NOT NULL),CHECK(NOT canonical OR active)
);
CREATE UNIQUE INDEX business_canonical_domain ON public.business_domains(business_id) WHERE canonical;
ALTER TABLE public.business_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY domains_read ON public.business_domains FOR SELECT TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin']));
REVOKE ALL ON public.business_domains FROM anon,authenticated;
GRANT SELECT ON public.business_domains TO authenticated;
CREATE FUNCTION public.manage_business_domain(p_business_id uuid,p_hostname text,p_action text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.business_domains;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,14));
 SELECT * INTO d FROM public.business_domains WHERE hostname=p_hostname FOR UPDATE;
 IF FOUND AND d.business_id<>p_business_id THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='register' THEN
  IF d.id IS NOT NULL THEN RETURN d.id; END IF;
  IF (SELECT count(*) FROM public.business_domains WHERE business_id=p_business_id)>=5 THEN RAISE EXCEPTION 'domain_limit'; END IF;
  INSERT INTO public.business_domains(business_id,hostname) VALUES(p_business_id,p_hostname) RETURNING * INTO d;
 ELSIF d.id IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
 ELSIF p_action='remove' THEN DELETE FROM public.business_domains WHERE id=d.id;
 ELSIF p_action='deactivate' THEN UPDATE public.business_domains SET active=false,canonical=false WHERE id=d.id;
 ELSIF p_action='activate' OR p_action='canonical' THEN
  IF d.verified_until IS NULL OR d.verified_until<=now() THEN RAISE EXCEPTION 'unverified'; END IF;
  IF p_action='canonical' THEN UPDATE public.business_domains SET canonical=false WHERE business_id=p_business_id; END IF;
  UPDATE public.business_domains SET active=true,canonical=CASE WHEN p_action='canonical' THEN true ELSE canonical END WHERE id=d.id;
 ELSE RAISE EXCEPTION 'invalid_action'; END IF;
 RETURN d.id;
END; $$;
REVOKE ALL ON FUNCTION public.manage_business_domain(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_business_domain(uuid,text,text) TO authenticated;
CREATE FUNCTION public.verify_business_domain(p_id uuid,p_token text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.business_domains SET verified_until=now()+interval '7 days' WHERE id=p_id AND verification_token=p_token;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.verify_business_domain(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_business_domain(uuid,text) TO service_role;
CREATE FUNCTION public.resolve_restaurant_host(p_hostname text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.slug FROM public.business_domains d JOIN public.businesses b ON b.id=d.business_id JOIN public.restaurant_launch l ON l.business_id=b.id
 WHERE d.hostname=p_hostname AND d.active AND d.verified_until>now() AND l.is_public AND b.status='active';
$$;
REVOKE ALL ON FUNCTION public.resolve_restaurant_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_restaurant_host(text) TO anon,authenticated,service_role;
-- Distributed, fixed-window budgets. Only server-side callers supply opaque keyed hashes.
CREATE TABLE public.public_request_budgets (key text PRIMARY KEY CHECK(length(key)=64),window_start timestamptz NOT NULL,hits integer NOT NULL);
ALTER TABLE public.public_request_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_request_budgets FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.consume_public_budget(p_key text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.public_request_budgets(key,window_start,hits) VALUES(p_key,date_trunc('minute',now()),1)
 ON CONFLICT(key) DO UPDATE SET window_start=date_trunc('minute',now()),hits=CASE WHEN public.public_request_budgets.window_start=date_trunc('minute',now()) THEN least(public.public_request_budgets.hits+1,61) ELSE 1 END RETURNING hits INTO n;
 DELETE FROM public.public_request_budgets WHERE window_start<now()-interval '1 day';
 RETURN n<=60;
END; $$;
REVOKE ALL ON FUNCTION public.consume_public_budget(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_budget(text) TO service_role;
CREATE INDEX public_budget_expiry ON public.public_request_budgets(window_start);
CREATE FUNCTION public.restaurant_sitemap(p_slug text DEFAULT NULL,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM (
 SELECT b.slug,l.slug AS branch,d.hostname AS canonical_host FROM public.businesses b
 JOIN public.restaurant_launch p ON p.business_id=b.id AND p.is_public
 JOIN public.locations l ON l.business_id=b.id AND l.status='active'
 LEFT JOIN public.business_domains d ON d.business_id=b.id AND d.canonical AND d.active AND d.verified_until>now()
 WHERE b.status='active' AND (p_slug IS NULL OR b.slug=p_slug) AND EXISTS(
 SELECT 1 FROM public.menu_locations ml JOIN public.menus m ON m.id=ml.menu_id AND m.business_id=b.id
 WHERE ml.location_id=l.id AND ml.is_enabled AND m.status='active' AND m.archived_at IS NULL)
 ORDER BY b.id,l.id LIMIT 500 OFFSET greatest(0,least(p_offset,50000))
 )s;
$$;
REVOKE ALL ON FUNCTION public.restaurant_sitemap(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_sitemap(text,integer) TO service_role;
