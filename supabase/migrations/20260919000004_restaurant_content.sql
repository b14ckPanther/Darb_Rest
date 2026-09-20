-- Phase 4: business-owned restaurant content. Historical migrations remain unchanged.
CREATE FUNCTION public.valid_content_name(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT jsonb_typeof(value) = 'object' AND EXISTS (SELECT 1 FROM jsonb_each_text(value) e WHERE e.key IN ('ar','he','en') AND length(btrim(e.value)) BETWEEN 1 AND 160)
 AND NOT EXISTS (SELECT 1 FROM jsonb_each(value) e WHERE e.key NOT IN ('ar','he','en') OR jsonb_typeof(e.value) <> 'string' OR length(e.value #>> '{}') > 160);
$$;
ALTER TABLE public.locations ADD CONSTRAINT locations_id_business_unique UNIQUE(id,business_id);
-- Initial ownership is created atomically by create_onboarding_business, not by self-enrollment into arbitrary tenants.
DROP POLICY "Initial owner self-assignment or Admins adding members" ON public.memberships;
CREATE POLICY "Authorized membership creation" ON public.memberships FOR INSERT TO authenticated
WITH CHECK(public.has_business_role(business_id, ARRAY['owner','admin']));

CREATE TABLE public.menus (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), description_i18n jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')), is_default boolean NOT NULL DEFAULT false, archived_at timestamptz, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id));
CREATE INDEX menus_business_sort ON public.menus(business_id,sort_order,id);
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.menus TO authenticated;
REVOKE ALL ON public.menus FROM anon;
CREATE POLICY content_read ON public.menus FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.menus FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER menus_updated BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.menu_sections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, menu_id uuid NOT NULL, name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), description_i18n jsonb NOT NULL DEFAULT '{}', is_visible boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), FOREIGN KEY(menu_id,business_id) REFERENCES public.menus(id,business_id) ON DELETE CASCADE, UNIQUE(id,menu_id,business_id));
CREATE INDEX menu_sections_business_sort ON public.menu_sections(business_id,sort_order,id);
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.menu_sections TO authenticated;
REVOKE ALL ON public.menu_sections FROM anon;
CREATE POLICY content_read ON public.menu_sections FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.menu_sections FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER menu_sections_updated BEFORE UPDATE ON public.menu_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.menu_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, section_id uuid NOT NULL, name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), description_i18n jsonb NOT NULL DEFAULT '{}', base_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(base_price>=0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), sku text, image_path text, is_visible boolean NOT NULL DEFAULT true, is_available boolean NOT NULL DEFAULT true, archived_at timestamptz, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), FOREIGN KEY(section_id,business_id) REFERENCES public.menu_sections(id,business_id) ON DELETE CASCADE);
CREATE INDEX menu_items_business_sort ON public.menu_items(business_id,sort_order,id);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.menu_items TO authenticated;
REVOKE ALL ON public.menu_items FROM anon;
CREATE POLICY content_read ON public.menu_items FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.menu_items FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.item_variants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, item_id uuid NOT NULL, name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), price numeric(12,2) NOT NULL CHECK(price>=0), is_available boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id) ON DELETE CASCADE);
CREATE INDEX item_variants_business_sort ON public.item_variants(business_id,sort_order,id);
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.item_variants TO authenticated;
REVOKE ALL ON public.item_variants FROM anon;
CREATE POLICY content_read ON public.item_variants FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.item_variants FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER item_variants_updated BEFORE UPDATE ON public.item_variants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.modifier_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), min_select integer NOT NULL DEFAULT 0 CHECK(min_select>=0), max_select integer NOT NULL DEFAULT 1 CHECK(max_select>=min_select), is_required boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), CHECK(is_required = (min_select>0)));
CREATE INDEX modifier_groups_business_sort ON public.modifier_groups(business_id,sort_order,id);
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.modifier_groups TO authenticated;
REVOKE ALL ON public.modifier_groups FROM anon;
CREATE POLICY content_read ON public.modifier_groups FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.modifier_groups FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER modifier_groups_updated BEFORE UPDATE ON public.modifier_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.modifiers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, modifier_group_id uuid NOT NULL, name_i18n jsonb NOT NULL CHECK(public.valid_content_name(name_i18n)), price_delta numeric(12,2) NOT NULL DEFAULT 0 CHECK(price_delta>=0), is_available boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), FOREIGN KEY(modifier_group_id,business_id) REFERENCES public.modifier_groups(id,business_id) ON DELETE CASCADE);
CREATE INDEX modifiers_business_sort ON public.modifiers(business_id,sort_order,id);
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.modifiers TO authenticated;
REVOKE ALL ON public.modifiers FROM anon;
CREATE POLICY content_read ON public.modifiers FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.modifiers FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER modifiers_updated BEFORE UPDATE ON public.modifiers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.menu_locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, menu_id uuid NOT NULL, location_id uuid NOT NULL, is_enabled boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), UNIQUE(menu_id,location_id), FOREIGN KEY(menu_id,business_id) REFERENCES public.menus(id,business_id) ON DELETE CASCADE, FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id) ON DELETE CASCADE);
CREATE INDEX menu_locations_business_sort ON public.menu_locations(business_id,sort_order,id);
ALTER TABLE public.menu_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.menu_locations TO authenticated;
REVOKE ALL ON public.menu_locations FROM anon;
CREATE POLICY content_read ON public.menu_locations FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.menu_locations FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER menu_locations_updated BEFORE UPDATE ON public.menu_locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.item_modifier_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, item_id uuid NOT NULL, modifier_group_id uuid NOT NULL, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), UNIQUE(item_id,modifier_group_id), FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id) ON DELETE CASCADE, FOREIGN KEY(modifier_group_id,business_id) REFERENCES public.modifier_groups(id,business_id) ON DELETE CASCADE);
CREATE INDEX item_modifier_groups_business_sort ON public.item_modifier_groups(business_id,sort_order,id);
ALTER TABLE public.item_modifier_groups ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.item_modifier_groups TO authenticated;
REVOKE ALL ON public.item_modifier_groups FROM anon;
CREATE POLICY content_read ON public.item_modifier_groups FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.item_modifier_groups FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER item_modifier_groups_updated BEFORE UPDATE ON public.item_modifier_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.item_dietary_tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, item_id uuid NOT NULL, code text NOT NULL CHECK(code IN ('vegetarian','vegan','gluten_free','spicy','halal','kosher')), sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), UNIQUE(item_id,code), FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id) ON DELETE CASCADE);
CREATE INDEX item_dietary_tags_business_sort ON public.item_dietary_tags(business_id,sort_order,id);
ALTER TABLE public.item_dietary_tags ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.item_dietary_tags TO authenticated;
REVOKE ALL ON public.item_dietary_tags FROM anon;
CREATE POLICY content_read ON public.item_dietary_tags FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.item_dietary_tags FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER item_dietary_tags_updated BEFORE UPDATE ON public.item_dietary_tags FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.item_allergens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, item_id uuid NOT NULL, code text NOT NULL CHECK(code IN ('gluten','milk','eggs','peanuts','tree_nuts','soy','sesame','fish','shellfish','mustard')), sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), UNIQUE(item_id,code), FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id) ON DELETE CASCADE);
CREATE INDEX item_allergens_business_sort ON public.item_allergens(business_id,sort_order,id);
ALTER TABLE public.item_allergens ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.item_allergens TO authenticated;
REVOKE ALL ON public.item_allergens FROM anon;
CREATE POLICY content_read ON public.item_allergens FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.item_allergens FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER item_allergens_updated BEFORE UPDATE ON public.item_allergens FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.menu_item_location_overrides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, item_id uuid NOT NULL, location_id uuid NOT NULL, is_visible_override boolean, is_available_override boolean, price_override numeric(12,2) CHECK(price_override>=0), sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,business_id), UNIQUE(item_id,location_id), FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id) ON DELETE CASCADE, FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id) ON DELETE CASCADE);
CREATE INDEX menu_item_location_overrides_business_sort ON public.menu_item_location_overrides(business_id,sort_order,id);
ALTER TABLE public.menu_item_location_overrides ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.menu_item_location_overrides TO authenticated;
REVOKE ALL ON public.menu_item_location_overrides FROM anon;
CREATE POLICY content_read ON public.menu_item_location_overrides FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id) OR public.is_platform_admin());
CREATE POLICY content_write ON public.menu_item_location_overrides FOR ALL TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor'])) WITH CHECK(public.has_business_role(business_id,ARRAY['owner','admin','manager','editor']));
CREATE TRIGGER menu_item_location_overrides_updated BEFORE UPDATE ON public.menu_item_location_overrides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE UNIQUE INDEX one_default_menu ON public.menus(business_id) WHERE is_default AND status <> 'archived';
CREATE INDEX sections_menu ON public.menu_sections(menu_id,sort_order);
CREATE INDEX items_section ON public.menu_items(section_id,sort_order);
CREATE INDEX variants_item ON public.item_variants(item_id,sort_order);
CREATE INDEX modifiers_group ON public.modifiers(modifier_group_id,sort_order);
CREATE INDEX menu_locations_location ON public.menu_locations(location_id);
CREATE INDEX item_groups_group ON public.item_modifier_groups(modifier_group_id);

-- Check modifier capacity at transaction end: group and options can be saved atomically.
CREATE FUNCTION public.check_modifier_capacity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE gid uuid; g public.modifier_groups;
BEGIN
 IF TG_TABLE_NAME='modifier_groups' THEN gid:=COALESCE(NEW.id,OLD.id); ELSE gid:=COALESCE(NEW.modifier_group_id,OLD.modifier_group_id); END IF;
 SELECT * INTO g FROM public.modifier_groups WHERE id=gid;
 IF FOUND AND (g.max_select > (SELECT count(*) FROM public.modifiers WHERE modifier_group_id=gid) OR g.min_select > (SELECT count(*) FROM public.modifiers WHERE modifier_group_id=gid AND is_available)) THEN RAISE EXCEPTION 'Invalid modifier selection capacity' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER modifier_capacity AFTER INSERT OR UPDATE ON public.modifier_groups DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_modifier_capacity();
CREATE CONSTRAINT TRIGGER option_capacity AFTER INSERT OR UPDATE OR DELETE ON public.modifiers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_modifier_capacity();

-- Private images: members may read; editors may upload only to an existing same-tenant item path.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('menu-media','menu-media',false,5242880,ARRAY['image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE FUNCTION public.can_access_menu_media(path text, writing boolean) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.menu_items i WHERE path ~ '^businesses/[0-9a-f-]{36}/menu-items/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 AND split_part(path,'/',2)=i.business_id::text AND split_part(path,'/',4)=i.id::text
 AND CASE WHEN writing THEN public.has_business_role(i.business_id,ARRAY['owner','admin','manager','editor']) ELSE public.user_belongs_to_business(i.business_id) OR public.is_platform_admin() END);
$$;
CREATE POLICY menu_media_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='menu-media' AND public.can_access_menu_media(name,false));
CREATE POLICY menu_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='menu-media' AND public.can_access_menu_media(name,true));
CREATE POLICY menu_media_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='menu-media' AND public.can_access_menu_media(name,true));

CREATE FUNCTION public.validate_item_image() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.image_path IS NOT NULL AND (split_part(NEW.image_path,'/',2) <> NEW.business_id::text OR split_part(NEW.image_path,'/',4) <> NEW.id::text OR NEW.image_path !~ '^businesses/[0-9a-f-]{36}/menu-items/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') THEN RAISE EXCEPTION 'Invalid item media path'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER item_image_path BEFORE INSERT OR UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.validate_item_image();

-- An atomic, bounded batch; caller remains subject to RLS. Table and column names are allowlisted.
CREATE FUNCTION public.save_menu_content(p_business_id uuid,p_operations jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE op jsonb; rowdata jsonb; tbl text; cols text; vals text; updates text; key text;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','editor']) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_operations)<>'array' OR jsonb_array_length(p_operations)>200 THEN RAISE EXCEPTION 'Invalid batch'; END IF;
 -- Serializes edits to avoid inconsistent modifier limits and competing defaults.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
 FOR op IN SELECT * FROM jsonb_array_elements(p_operations) LOOP
 tbl:=op->>'table';
 IF NOT tbl=ANY(ARRAY['menus','menu_sections','menu_items','item_variants','modifier_groups','modifiers','menu_locations','item_modifier_groups','item_dietary_tags','item_allergens','menu_item_location_overrides']) THEN RAISE EXCEPTION 'Invalid content table'; END IF;
 IF COALESCE((op->>'delete')::boolean,false) THEN
 IF tbl IN ('menus','menu_sections','menu_items') THEN RAISE EXCEPTION 'Archive important content instead'; END IF;
 EXECUTE format('DELETE FROM public.%I WHERE id=$1 AND business_id=$2',tbl) USING (op->>'id')::uuid,p_business_id;
 ELSE
 rowdata:=(op->'row') || jsonb_build_object('business_id',p_business_id);
 IF NOT rowdata ? 'id' THEN rowdata:=rowdata || jsonb_build_object('id',gen_random_uuid()); END IF;
 cols:=''; vals:=''; updates:='';
 FOR key IN SELECT jsonb_object_keys(rowdata) LOOP
 IF key IN ('created_at','updated_at') OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name=key) THEN RAISE EXCEPTION 'Invalid content column'; END IF;
 cols:=cols || format('%I,',key); vals:=vals || format('r.%I,',key);
 IF key NOT IN ('id','business_id') THEN updates:=updates || format('%I=EXCLUDED.%I,',key,key); END IF;
 END LOOP;
 IF updates='' THEN RAISE EXCEPTION 'Empty change'; END IF;
 EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r ON CONFLICT(id) DO UPDATE SET %s',tbl,rtrim(cols,','),rtrim(vals,','),tbl,rtrim(updates,',')) USING rowdata;
 END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.save_menu_content(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_menu_content(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.set_menu_item_availability(p_item_id uuid,p_available boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bid uuid;
BEGIN
 SELECT business_id INTO bid FROM public.menu_items WHERE id=p_item_id;
 IF bid IS NULL OR NOT public.has_business_role(bid,ARRAY['owner','admin','manager','editor','staff']) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.menu_items SET is_available=p_available WHERE id=p_item_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_menu_item_availability(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_menu_item_availability(uuid,boolean) TO authenticated;

-- No prior audit table exists: record only meaningful content lifecycle changes.
CREATE TABLE public.content_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 entity_table text NOT NULL, entity_id uuid NOT NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_audit_events FROM anon,authenticated;
GRANT SELECT ON public.content_audit_events TO authenticated;
CREATE POLICY content_audit_read ON public.content_audit_events FOR SELECT TO authenticated USING(public.has_business_role(business_id,ARRAY['owner','admin']));
CREATE INDEX content_audit_business_time ON public.content_audit_events(business_id,created_at DESC);
CREATE FUNCTION public.audit_menu_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; event text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='INSERT' THEN event:='created'; ELSIF TG_OP='DELETE' THEN event:='removed';
 ELSIF TG_TABLE_NAME='menu_locations' THEN
 IF (to_jsonb(OLD)-'updated_at'-'sort_order') IS NOT DISTINCT FROM (r-'updated_at'-'sort_order') THEN RETURN NULL; END IF;
 event:='assignment_changed';
 ELSIF (to_jsonb(OLD)->>'archived_at') IS DISTINCT FROM (r->>'archived_at') OR (TG_TABLE_NAME='menus' AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (r->>'status')) THEN event:='publication_changed';
 ELSE RETURN NULL; END IF;
 INSERT INTO public.content_audit_events(business_id,actor_id,entity_table,entity_id,action) VALUES((r->>'business_id')::uuid,auth.uid(),TG_TABLE_NAME,(r->>'id')::uuid,event);
 RETURN NULL;
END; $$;
CREATE TRIGGER menu_audit AFTER INSERT OR UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.audit_menu_content();
CREATE TRIGGER item_audit AFTER INSERT OR UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.audit_menu_content();
CREATE TRIGGER assignment_audit AFTER INSERT OR UPDATE OR DELETE ON public.menu_locations FOR EACH ROW EXECUTE FUNCTION public.audit_menu_content();

-- Prevent moving options between groups from bypassing the old group's capacity check.
CREATE FUNCTION public.keep_modifier_parent() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.modifier_group_id IS DISTINCT FROM OLD.modifier_group_id THEN RAISE EXCEPTION 'Recreate option to change group'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER modifier_parent BEFORE UPDATE ON public.modifiers FOR EACH ROW EXECUTE FUNCTION public.keep_modifier_parent();

-- Structural content is archived/hidden; direct API calls must not bypass that contract.
REVOKE DELETE ON public.menus,public.menu_sections,public.menu_items FROM authenticated;
