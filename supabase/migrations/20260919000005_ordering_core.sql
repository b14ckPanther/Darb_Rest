-- Phase 5: authoritative ordering with immutable submitted snapshots.
CREATE TABLE public.orders (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  location_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_token_hash text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','accepted','preparing','ready','completed','cancelled')),
  fulfillment_mode text NOT NULL CHECK (fulfillment_mode IN ('dine_in','takeaway')),
  customer_name text NOT NULL CHECK (length(btrim(customer_name)) BETWEEN 1 AND 100),
  customer_phone text NOT NULL DEFAULT '' CHECK (length(customer_phone) <= 32),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents BETWEEN 0 AND 1000000000),
  cart jsonb NOT NULL CHECK (jsonb_typeof(cart) = 'array'),
  revision integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,business_id),
  FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
CREATE INDEX orders_business_time ON public.orders(business_id,created_at DESC,id);
CREATE INDEX orders_creator_drafts ON public.orders(created_by,business_id,location_id) WHERE status='draft';
CREATE INDEX orders_location_status ON public.orders(location_id,status,created_at DESC);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  business_id uuid NOT NULL,
  item_id uuid NOT NULL,
  variant_id uuid,
  name_i18n jsonb NOT NULL,
  variant_name_i18n jsonb,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  base_unit_cents bigint NOT NULL CHECK (base_unit_cents >= 0),
  modifier_unit_cents bigint NOT NULL CHECK (modifier_unit_cents >= 0),
  line_total_cents bigint NOT NULL CHECK (line_total_cents = (base_unit_cents+modifier_unit_cents)*quantity),
  sort_order integer NOT NULL,
  UNIQUE(id,order_id,business_id),
  FOREIGN KEY(order_id,business_id) REFERENCES public.orders(id,business_id) ON DELETE CASCADE
);
CREATE INDEX order_items_order ON public.order_items(order_id,sort_order);
CREATE TABLE public.order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL,
  order_id uuid NOT NULL,
  business_id uuid NOT NULL,
  modifier_id uuid NOT NULL,
  group_name_i18n jsonb NOT NULL,
  name_i18n jsonb NOT NULL,
  price_cents bigint NOT NULL CHECK(price_cents>=0),
  FOREIGN KEY(order_item_id,order_id,business_id) REFERENCES public.order_items(id,order_id,business_id) ON DELETE CASCADE
);
CREATE INDEX order_modifiers_order ON public.order_item_modifiers(order_id,order_item_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders,public.order_items,public.order_item_modifiers FROM anon,authenticated;
GRANT SELECT ON public.orders,public.order_items,public.order_item_modifiers TO authenticated;
CREATE POLICY order_read ON public.orders FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id));
CREATE POLICY order_item_read ON public.order_items FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id));
CREATE POLICY order_modifier_read ON public.order_item_modifiers FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id));

-- All prices come from the database. Client prices are only a stale-price/tampering check.
CREATE FUNCTION public.save_order_core(
 p_id uuid, p_business_id uuid, p_location_id uuid, p_lines jsonb,
 p_customer_name text, p_customer_phone text, p_fulfillment_mode text,
 p_expected_subtotal_cents bigint, p_revision integer, p_submit boolean, p_guest_token text
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 existing public.orders; result public.orders; line jsonb; item record; variant public.item_variants;
 ov public.menu_item_location_overrides; grp record; opt record; ids uuid[]; mid uuid;
 lineid uuid; qty integer; n integer:=0; base bigint; extras bigint; total bigint:=0;
 cur text; selected_count integer; variant_count integer; item_uuid uuid; variant_uuid uuid;
BEGIN
 IF p_guest_token IS NULL AND (auth.uid() IS NULL OR NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','editor','staff'])) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
 END IF;
 IF p_guest_token IS NOT NULL AND p_guest_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_submit IS NULL OR p_revision IS NULL OR p_revision<0 OR
    p_expected_subtotal_cents IS NULL OR p_expected_subtotal_cents<0 OR
    p_fulfillment_mode IS NULL OR p_fulfillment_mode NOT IN ('dine_in','takeaway') OR
    p_customer_name IS NULL OR length(btrim(p_customer_name)) NOT BETWEEN 1 AND 100 OR
    p_customer_phone IS NULL OR length(p_customer_phone)>32 OR
    (p_customer_phone<>'' AND p_customer_phone !~ '^[+0-9 ()-]{5,32}$') OR
    (p_fulfillment_mode='takeaway' AND length(btrim(p_customer_phone))<5) OR
    p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines) NOT BETWEEN 0 AND 50 OR (p_submit AND jsonb_array_length(p_lines)=0) THEN
  RAISE EXCEPTION 'invalid_cart' USING ERRCODE='22023';
 END IF;
 -- Same lock as content batches: never interleave menu edits and order pricing.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
 SELECT * INTO existing FROM public.orders WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF existing.business_id<>p_business_id OR existing.location_id<>p_location_id OR (CASE WHEN p_guest_token IS NULL THEN existing.created_by IS DISTINCT FROM auth.uid() OR existing.guest_token_hash IS NOT NULL ELSE existing.guest_token_hash IS DISTINCT FROM encode(sha256(convert_to(p_guest_token,'UTF8')),'hex') END) THEN
   RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF existing.status<>'draft' THEN
   IF p_submit AND existing.cart=p_lines AND existing.subtotal_cents=p_expected_subtotal_cents
     AND existing.customer_name=btrim(p_customer_name) AND existing.customer_phone=btrim(p_customer_phone)
     AND existing.fulfillment_mode=p_fulfillment_mode THEN RETURN existing; END IF;
   RAISE EXCEPTION 'order_locked' USING ERRCODE='22023';
  END IF;
  IF existing.revision<>p_revision THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 ELSE
  IF p_revision<>0 THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 END IF;
 SELECT b.currency INTO cur FROM public.businesses b
 JOIN public.locations l ON l.business_id=b.id
 WHERE b.id=p_business_id AND b.status='active' AND l.id=p_location_id AND l.status='active'
 FOR SHARE OF b,l;
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable' USING ERRCODE='22023'; END IF;
 IF existing.id IS NULL THEN
  INSERT INTO public.orders(id,business_id,location_id,created_by,guest_token_hash,fulfillment_mode,customer_name,customer_phone,currency,subtotal_cents,cart)
  VALUES(p_id,p_business_id,p_location_id,CASE WHEN p_guest_token IS NULL THEN auth.uid() ELSE NULL END,CASE WHEN p_guest_token IS NOT NULL THEN encode(sha256(convert_to(p_guest_token,'UTF8')),'hex') END,p_fulfillment_mode,btrim(p_customer_name),btrim(p_customer_phone),cur,0,p_lines);
 ELSE
  DELETE FROM public.order_items WHERE order_id=p_id;
 END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
  IF jsonb_typeof(line)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(line) k WHERE k NOT IN ('item_id','variant_id','modifier_ids','quantity')) OR
    jsonb_typeof(line->'quantity') IS DISTINCT FROM 'number' OR (line->>'quantity') !~ '^[0-9]+$' OR
    jsonb_typeof(line->'modifier_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(line->'modifier_ids')>100 THEN
   RAISE EXCEPTION 'invalid_cart' USING ERRCODE='22023';
  END IF;
  item_uuid:=(line->>'item_id')::uuid; variant_uuid:=(line->>'variant_id')::uuid; qty:=(line->>'quantity')::integer;
  IF qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'invalid_cart' USING ERRCODE='22023'; END IF;
  SELECT i.* INTO item FROM public.menu_items i
    JOIN public.menu_sections s ON s.id=i.section_id AND s.business_id=i.business_id
    JOIN public.menus m ON m.id=s.menu_id AND m.business_id=i.business_id
    JOIN public.menu_locations ml ON ml.menu_id=m.id AND ml.business_id=i.business_id AND ml.location_id=p_location_id
    WHERE i.id=item_uuid AND i.business_id=p_business_id AND i.archived_at IS NULL
      AND s.is_visible AND m.status='active' AND m.archived_at IS NULL AND ml.is_enabled
    FOR SHARE OF i,s,m,ml;
  IF NOT FOUND THEN RAISE EXCEPTION 'unavailable' USING ERRCODE='22023'; END IF;
  SELECT * INTO ov FROM public.menu_item_location_overrides WHERE item_id=item_uuid AND location_id=p_location_id FOR SHARE;
  IF NOT COALESCE(ov.is_visible_override,item.is_visible) OR NOT COALESCE(ov.is_available_override,item.is_available) OR item.currency<>cur THEN
   RAISE EXCEPTION 'unavailable' USING ERRCODE='22023';
  END IF;
  base:=(COALESCE(ov.price_override,item.base_price)*100)::bigint;
  SELECT count(*) INTO variant_count FROM public.item_variants WHERE item_id=item_uuid;
  variant:=NULL;
  IF variant_count>0 THEN
   SELECT * INTO variant FROM public.item_variants WHERE id=variant_uuid AND item_id=item_uuid AND business_id=p_business_id AND is_available FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'invalid_variant' USING ERRCODE='22023'; END IF;
   base:=(variant.price*100)::bigint;
  ELSIF variant_uuid IS NOT NULL THEN RAISE EXCEPTION 'invalid_variant' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(array_agg(v::uuid),ARRAY[]::uuid[]) INTO ids FROM jsonb_array_elements_text(line->'modifier_ids') v;
  IF cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'invalid_modifiers' USING ERRCODE='22023'; END IF;
  FOR grp IN SELECT g.* FROM public.modifier_groups g JOIN public.item_modifier_groups ig ON ig.modifier_group_id=g.id
    WHERE ig.item_id=item_uuid AND ig.business_id=p_business_id FOR SHARE OF g,ig LOOP
   SELECT count(*) INTO selected_count FROM public.modifiers WHERE id=ANY(ids) AND modifier_group_id=grp.id AND is_available;
   IF selected_count<grp.min_select OR selected_count>grp.max_select OR (grp.is_required AND selected_count=0) THEN
    RAISE EXCEPTION 'invalid_modifiers' USING ERRCODE='22023';
   END IF;
  END LOOP;
  extras:=0;
  FOREACH mid IN ARRAY ids LOOP
   SELECT m.*,g.name_i18n AS group_name INTO opt FROM public.modifiers m
     JOIN public.modifier_groups g ON g.id=m.modifier_group_id
     JOIN public.item_modifier_groups ig ON ig.modifier_group_id=g.id AND ig.item_id=item_uuid
     WHERE m.id=mid AND m.business_id=p_business_id AND ig.business_id=p_business_id AND m.is_available
     FOR SHARE OF m,g,ig;
   IF NOT FOUND THEN RAISE EXCEPTION 'invalid_modifiers' USING ERRCODE='22023'; END IF;
   extras:=extras+(opt.price_delta*100)::bigint;
  END LOOP;
  lineid:=gen_random_uuid();
  INSERT INTO public.order_items(id,order_id,business_id,item_id,variant_id,name_i18n,variant_name_i18n,quantity,base_unit_cents,modifier_unit_cents,line_total_cents,sort_order)
  VALUES(lineid,p_id,p_business_id,item_uuid,variant_uuid,item.name_i18n,variant.name_i18n,qty,base,extras,(base+extras)*qty,n);
  INSERT INTO public.order_item_modifiers(order_item_id,order_id,business_id,modifier_id,group_name_i18n,name_i18n,price_cents)
  SELECT lineid,p_id,p_business_id,m.id,g.name_i18n,m.name_i18n,(m.price_delta*100)::bigint
  FROM public.modifiers m JOIN public.modifier_groups g ON g.id=m.modifier_group_id WHERE m.id=ANY(ids);
  total:=total+(base+extras)*qty; n:=n+1;
 END LOOP;
 IF total<>p_expected_subtotal_cents THEN RAISE EXCEPTION 'price_changed' USING ERRCODE='22023'; END IF;
 IF total>1000000000 THEN RAISE EXCEPTION 'invalid_cart' USING ERRCODE='22023'; END IF;
 UPDATE public.orders SET subtotal_cents=total,currency=cur,cart=p_lines,
   fulfillment_mode=p_fulfillment_mode,customer_name=btrim(p_customer_name),customer_phone=btrim(p_customer_phone),
   status=CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END,
   submitted_at=CASE WHEN p_submit THEN now() ELSE NULL END,
   revision=CASE WHEN existing.id IS NULL THEN 1 ELSE existing.revision+1 END,updated_at=now()
 WHERE id=p_id RETURNING * INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.save_order_core(uuid,uuid,uuid,jsonb,text,text,text,bigint,integer,boolean,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.save_order(
 p_id uuid,p_business_id uuid,p_location_id uuid,p_lines jsonb,p_customer_name text,p_customer_phone text,
 p_fulfillment_mode text,p_expected_subtotal_cents bigint,p_revision integer,p_submit boolean
) RETURNS public.orders LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT public.save_order_core(p_id,p_business_id,p_location_id,p_lines,p_customer_name,p_customer_phone,
 p_fulfillment_mode,p_expected_subtotal_cents,p_revision,p_submit,NULL);
$$;
REVOKE ALL ON FUNCTION public.save_order(uuid,uuid,uuid,jsonb,text,text,text,bigint,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_order(uuid,uuid,uuid,jsonb,text,text,text,bigint,integer,boolean) TO authenticated;

CREATE FUNCTION public.transition_order(p_id uuid,p_business_id uuid,p_revision integer,p_status text)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
 END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_id AND business_id=p_business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF o.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 IF p_status IS NULL OR NOT (
   (o.status='submitted' AND p_status IN ('accepted','cancelled')) OR
   (o.status='accepted' AND p_status IN ('preparing','cancelled')) OR
   (o.status='preparing' AND p_status IN ('ready','cancelled')) OR
   (o.status='ready' AND p_status IN ('completed','cancelled'))
 ) THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 UPDATE public.orders SET status=p_status,revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO o;
 RETURN o;
END; $$;
REVOKE ALL ON FUNCTION public.transition_order(uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid,uuid,integer,text) TO authenticated;

-- Guest mutation gateway is server-only. Raw database anon credentials cannot place orders.
CREATE TABLE public.guest_order_limits (
 token_hash text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1
);
ALTER TABLE public.guest_order_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_order_limits FROM anon,authenticated;
CREATE FUNCTION public.save_guest_order(
 p_id uuid,p_business_slug text,p_location_slug text,p_lines jsonb,p_customer_name text,p_customer_phone text,
 p_fulfillment_mode text,p_expected_subtotal_cents bigint,p_revision integer,p_submit boolean,p_guest_token text
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bid uuid; lid uuid; attempts integer; tokenhash text;
BEGIN
 IF p_guest_token IS NULL OR p_guest_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT b.id,l.id INTO bid,lid FROM public.businesses b JOIN public.locations l ON l.business_id=b.id
 WHERE b.slug=p_business_slug AND l.slug=p_location_slug AND b.status='active' AND l.status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable' USING ERRCODE='22023'; END IF;
 tokenhash:=encode(sha256(convert_to(p_guest_token,'UTF8')),'hex');
 INSERT INTO public.guest_order_limits(token_hash) VALUES(tokenhash)
 ON CONFLICT(token_hash) DO UPDATE SET
  attempts=CASE WHEN guest_order_limits.window_start<now()-interval '10 minutes' THEN 1 ELSE guest_order_limits.attempts+1 END,
  window_start=CASE WHEN guest_order_limits.window_start<now()-interval '10 minutes' THEN now() ELSE guest_order_limits.window_start END
 RETURNING guest_order_limits.attempts INTO attempts;
 IF attempts>30 THEN RAISE EXCEPTION 'rate_limited' USING ERRCODE='22023'; END IF;
 RETURN public.save_order_core(p_id,bid,lid,p_lines,p_customer_name,p_customer_phone,p_fulfillment_mode,
   p_expected_subtotal_cents,p_revision,p_submit,p_guest_token);
END; $$;
REVOKE ALL ON FUNCTION public.save_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,boolean,text) TO service_role;
CREATE INDEX orders_guest ON public.orders(guest_token_hash,business_id,location_id,updated_at DESC) WHERE guest_token_hash IS NOT NULL;

-- One bounded relational read, projected to customer-visible active branch content.
CREATE FUNCTION public.public_order_menu(p_business_slug text,p_location_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE bid uuid; lid uuid; result jsonb;
BEGIN
 SELECT b.id,l.id INTO bid,lid FROM public.businesses b JOIN public.locations l ON l.business_id=b.id
 WHERE b.slug=p_business_slug AND l.slug=p_location_slug AND b.status='active' AND l.status='active';
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF (SELECT count(*) FROM public.menu_items WHERE business_id=bid)>5000 THEN RAISE EXCEPTION 'catalog_limit'; END IF;
 WITH menus AS (
  SELECT m.* FROM public.menus m JOIN public.menu_locations ml ON ml.menu_id=m.id
  WHERE m.business_id=bid AND m.status='active' AND m.archived_at IS NULL AND ml.location_id=lid AND ml.is_enabled
 ), sections AS (
  SELECT s.* FROM public.menu_sections s JOIN menus m ON m.id=s.menu_id WHERE s.is_visible
 ), items AS (
  SELECT i.* FROM public.menu_items i JOIN sections s ON s.id=i.section_id
  LEFT JOIN public.menu_item_location_overrides o ON o.item_id=i.id AND o.location_id=lid
  WHERE i.archived_at IS NULL AND COALESCE(o.is_visible_override,i.is_visible)
 ), links AS (
  SELECT ig.* FROM public.item_modifier_groups ig JOIN items i ON i.id=ig.item_id
 ), groups AS (
  SELECT g.* FROM public.modifier_groups g WHERE EXISTS(SELECT 1 FROM links l WHERE l.modifier_group_id=g.id)
 )
 SELECT jsonb_build_object(
  'business',(SELECT jsonb_build_object('id',id,'name',name,'currency',currency,'slug',slug) FROM public.businesses WHERE id=bid),
  'locations',(SELECT jsonb_build_array(jsonb_build_object('id',id,'name',name,'slug',slug)) FROM public.locations WHERE id=lid),
  'branding',(SELECT jsonb_build_object('logo_url',logo_url,'primary_color',primary_color,'accent_color',accent_color) FROM public.business_settings WHERE business_id=bid),
  'content',jsonb_build_object(
   'menus',COALESCE((SELECT jsonb_agg(m) FROM menus m),'[]'),
   'menu_locations',COALESCE((SELECT jsonb_agg(ml) FROM public.menu_locations ml JOIN menus m ON m.id=ml.menu_id WHERE ml.location_id=lid),'[]'),
   'menu_sections',COALESCE((SELECT jsonb_agg(s) FROM sections s),'[]'),
   'menu_items',COALESCE((SELECT jsonb_agg(to_jsonb(i)||'{"sku":null}') FROM items i),'[]'),
   'item_variants',COALESCE((SELECT jsonb_agg(v) FROM public.item_variants v JOIN items i ON i.id=v.item_id),'[]'),
   'modifier_groups',COALESCE((SELECT jsonb_agg(g) FROM groups g),'[]'),
   'modifiers',COALESCE((SELECT jsonb_agg(o) FROM public.modifiers o JOIN groups g ON g.id=o.modifier_group_id),'[]'),
   'item_modifier_groups',COALESCE((SELECT jsonb_agg(l) FROM links l),'[]'),
   'item_dietary_tags',COALESCE((SELECT jsonb_agg(t) FROM public.item_dietary_tags t JOIN items i ON i.id=t.item_id),'[]'),
   'item_allergens',COALESCE((SELECT jsonb_agg(a) FROM public.item_allergens a JOIN items i ON i.id=a.item_id),'[]'),
   'menu_item_location_overrides',COALESCE((SELECT jsonb_agg(o) FROM public.menu_item_location_overrides o JOIN items i ON i.id=o.item_id WHERE o.location_id=lid),'[]')
  )
 ) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.public_order_menu(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_order_menu(text,text) TO service_role;
