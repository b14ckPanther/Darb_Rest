-- Phase 7: file-only migration. Application and verification are operator-controlled.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.restaurant_tables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES public.businesses(id),
 location_id uuid NOT NULL,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 64),
 area text NOT NULL DEFAULT '' CHECK(length(area)<=64),
 is_active boolean NOT NULL DEFAULT true,
 archived_at timestamptz,
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,business_id,location_id),
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
CREATE UNIQUE INDEX tables_location_name ON public.restaurant_tables(location_id,lower(btrim(name))) WHERE archived_at IS NULL;
CREATE INDEX tables_business_location ON public.restaurant_tables(business_id,location_id,created_at,id);
CREATE TABLE public.table_qr_tokens (
 table_id uuid PRIMARY KEY,
 business_id uuid NOT NULL,
 location_id uuid NOT NULL,
 token text NOT NULL UNIQUE CHECK(token ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(table_id,business_id,location_id) REFERENCES public.restaurant_tables(id,business_id,location_id)
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_tables,public.table_qr_tokens FROM anon,authenticated;
GRANT SELECT ON public.restaurant_tables,public.table_qr_tokens TO authenticated;
CREATE POLICY table_read ON public.restaurant_tables FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id));
CREATE POLICY table_token_read ON public.table_qr_tokens FOR SELECT TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager']));

CREATE FUNCTION public.manage_restaurant_table(p_business_id uuid,p_location_id uuid,p_id uuid,p_revision integer,p_action text,p_name text DEFAULT '',p_area text DEFAULT '',p_active boolean DEFAULT true)
RETURNS public.restaurant_tables LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.restaurant_tables;
BEGIN
 IF p_action IS NULL OR p_action NOT IN ('create','edit','archive','regenerate','revoke') THEN RAISE EXCEPTION 'invalid_table' USING ERRCODE='22023'; END IF;
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.locations WHERE id=p_location_id AND business_id=p_business_id AND status='active') THEN RAISE EXCEPTION 'invalid_table' USING ERRCODE='22023'; END IF;
 IF p_action='create' THEN
  IF p_revision IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
  SELECT * INTO t FROM public.restaurant_tables WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
   IF t.business_id=p_business_id AND t.location_id=p_location_id AND t.name=btrim(p_name) AND t.area=btrim(p_area) AND t.is_active=p_active AND t.archived_at IS NULL THEN RETURN t; END IF;
   RAISE EXCEPTION 'conflict' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.restaurant_tables(id,business_id,location_id,name,area,is_active) VALUES(p_id,p_business_id,p_location_id,btrim(p_name),btrim(p_area),p_active) RETURNING * INTO t;
 ELSE
  SELECT * INTO t FROM public.restaurant_tables WHERE id=p_id AND business_id=p_business_id AND location_id=p_location_id FOR UPDATE;
  IF NOT FOUND OR t.archived_at IS NOT NULL THEN RAISE EXCEPTION 'invalid_table' USING ERRCODE='22023'; END IF;
  IF t.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
  IF p_action='edit' THEN
   UPDATE public.restaurant_tables SET name=btrim(p_name),area=btrim(p_area),is_active=p_active WHERE id=p_id;
  ELSIF p_action='archive' THEN
   UPDATE public.restaurant_tables SET archived_at=now(),is_active=false WHERE id=p_id;
   DELETE FROM public.table_qr_tokens WHERE table_id=p_id;
  ELSIF p_action='revoke' THEN DELETE FROM public.table_qr_tokens WHERE table_id=p_id;
  ELSIF p_action<>'regenerate' THEN RAISE EXCEPTION 'invalid_table' USING ERRCODE='22023';
  END IF;
  UPDATE public.restaurant_tables SET revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO t;
 END IF;
 IF p_action IN ('create','regenerate') THEN
  INSERT INTO public.table_qr_tokens(table_id,business_id,location_id,token)
  VALUES(t.id,t.business_id,t.location_id,encode(extensions.gen_random_bytes(32),'hex'))
  ON CONFLICT(table_id) DO UPDATE SET token=EXCLUDED.token,created_at=now();
 END IF;
 RETURN t;
END; $$;
REVOKE ALL ON FUNCTION public.manage_restaurant_table(uuid,uuid,uuid,integer,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_restaurant_table(uuid,uuid,uuid,integer,text,text,text,boolean) TO authenticated;

-- Deliberately small public projection. Token is a revocable bearer capability, not a DB ID.
CREATE FUNCTION public.resolve_table_qr(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('table_id',t.id,'business_slug',b.slug,'location_slug',l.slug,'name',t.name,'area',t.area)
 FROM public.table_qr_tokens q JOIN public.restaurant_tables t ON t.id=q.table_id
 JOIN public.businesses b ON b.id=t.business_id JOIN public.locations l ON l.id=t.location_id AND l.business_id=b.id
 WHERE q.token=p_token AND p_token ~ '^[0-9a-f]{64}$' AND t.is_active AND t.archived_at IS NULL AND b.status='active' AND l.status='active';
$$;
REVOKE ALL ON FUNCTION public.resolve_table_qr(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_table_qr(text) TO service_role;

ALTER TABLE public.orders ADD COLUMN table_id uuid, ADD COLUMN table_name text, ADD COLUMN table_area text;
ALTER TABLE public.orders ADD CONSTRAINT orders_table_ownership FOREIGN KEY(table_id,business_id,location_id) REFERENCES public.restaurant_tables(id,business_id,location_id);
ALTER TABLE public.orders ADD CONSTRAINT orders_table_mode CHECK((table_id IS NULL AND table_name IS NULL AND table_area IS NULL) OR (table_id IS NOT NULL AND table_name IS NOT NULL AND table_area IS NOT NULL AND fulfillment_mode='dine_in'));
CREATE INDEX orders_table ON public.orders(table_id) WHERE table_id IS NOT NULL;

-- New gateway wraps the canonical pricing function. All table checks and snapshots share its transaction.
CREATE FUNCTION public.save_table_guest_order(
 p_id uuid,p_business_slug text,p_location_slug text,p_lines jsonb,p_customer_name text,p_customer_phone text,
 p_fulfillment_mode text,p_expected_subtotal_cents bigint,p_revision integer,p_submit boolean,p_guest_token text,p_table_token text
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bid uuid; lid uuid; t public.restaurant_tables; prior public.orders; o public.orders;
BEGIN
 IF p_guest_token IS NULL OR p_guest_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT b.id,l.id INTO bid,lid FROM public.businesses b JOIN public.locations l ON l.business_id=b.id
 WHERE b.slug=p_business_slug AND l.slug=p_location_slug AND b.status='active' AND l.status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(bid::text,0));
 IF p_table_token IS NOT NULL THEN
  SELECT x.* INTO t FROM public.restaurant_tables x JOIN public.table_qr_tokens q ON q.table_id=x.id
  WHERE q.token=p_table_token AND p_table_token ~ '^[0-9a-f]{64}$' AND x.business_id=bid AND x.location_id=lid AND x.is_active AND x.archived_at IS NULL
  FOR SHARE OF x,q;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_table' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_fulfillment_mode='takeaway' THEN t:=NULL; END IF;
 SELECT * INTO prior FROM public.orders WHERE id=p_id FOR UPDATE;
 IF prior.id IS NOT NULL AND (prior.business_id<>bid OR prior.location_id<>lid OR prior.guest_token_hash IS DISTINCT FROM encode(sha256(convert_to(p_guest_token,'UTF8')),'hex')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 -- Do not allow a submitted order's table to be changed by retrying with another valid QR.
 IF prior.id IS NOT NULL AND prior.status<>'draft' AND prior.table_id IS DISTINCT FROM t.id THEN RAISE EXCEPTION 'table_conflict' USING ERRCODE='22023'; END IF;
 -- Clear only an owned draft before switching to takeaway, satisfying the CHECK throughout.
 IF prior.status='draft' AND prior.guest_token_hash=encode(sha256(convert_to(p_guest_token,'UTF8')),'hex') AND prior.business_id=bid AND prior.location_id=lid THEN
  UPDATE public.orders SET table_id=NULL,table_name=NULL,table_area=NULL WHERE id=p_id;
 END IF;
 o:=public.save_guest_order(p_id,p_business_slug,p_location_slug,p_lines,p_customer_name,p_customer_phone,p_fulfillment_mode,p_expected_subtotal_cents,p_revision,p_submit,p_guest_token);
 IF prior.id IS NULL OR prior.status='draft' THEN
  UPDATE public.orders SET table_id=t.id,table_name=t.name,table_area=t.area WHERE id=p_id RETURNING * INTO o;
 END IF;
 RETURN o;
END; $$;
REVOKE ALL ON FUNCTION public.save_table_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_table_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,boolean,text,text) TO service_role;

CREATE FUNCTION public.checkout_table_guest_order(
 p_id uuid,p_business_slug text,p_location_slug text,p_lines jsonb,p_customer_name text,p_customer_phone text,
 p_fulfillment_mode text,p_expected_subtotal_cents bigint,p_revision integer,p_guest_token text,p_method text,p_provider text,p_table_token text
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.save_table_guest_order(p_id,p_business_slug,p_location_slug,p_lines,p_customer_name,p_customer_phone,p_fulfillment_mode,p_expected_subtotal_cents,p_revision,true,p_guest_token,p_table_token);
 -- The existing checkout validator recognizes this identical submitted order and reserves one payment.
 RETURN public.checkout_guest_order(p_id,p_business_slug,p_location_slug,p_lines,p_customer_name,p_customer_phone,p_fulfillment_mode,p_expected_subtotal_cents,p_revision,p_guest_token,p_method,p_provider);
END; $$;
REVOKE ALL ON FUNCTION public.checkout_table_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_table_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,text,text,text,text) TO service_role;
