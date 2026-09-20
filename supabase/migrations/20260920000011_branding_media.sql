-- Authored only: private, immutable optimized branding objects. No client deletion of live assets.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('restaurant-branding','restaurant-branding',false,5242880,ARRAY['image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE FUNCTION public.can_manage_branding_media(path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' THEN
 EXISTS(SELECT 1 FROM public.businesses b WHERE b.id::text=split_part(path,'/',1) AND b.status='active'
 AND public.has_business_role(b.id,ARRAY['owner','admin'])) ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.can_manage_branding_media(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_branding_media(text) TO authenticated;
CREATE POLICY branding_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='restaurant-branding' AND public.can_manage_branding_media(name));
CREATE POLICY branding_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='restaurant-branding' AND public.can_manage_branding_media(name));
-- Direct RPC callers cannot publish a foreign or missing managed object.
CREATE FUNCTION public.validate_branding_references() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE snapshot jsonb; k text; ref text; path text;
BEGIN
 FOREACH snapshot IN ARRAY ARRAY[NEW.draft,NEW.published] LOOP
  FOREACH k IN ARRAY ARRAY['logo','cover'] LOOP
   ref:=snapshot->>k;
   IF ref LIKE 'https://media.darb.invalid/%' THEN
    -- Use an anchored expression and tenant prefix; do not trust supplied URLs as paths.
    path:=replace(ref,'https://media.darb.invalid/branding/','');
    IF ref !~ '^https://media\.darb\.invalid/branding/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
      OR split_part(path,'/',1)<>NEW.business_id::text
      OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='restaurant-branding' AND name=path)
    THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
   END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_branding_references() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER branding_references BEFORE INSERT OR UPDATE ON public.restaurant_appearance
 FOR EACH ROW EXECUTE FUNCTION public.validate_branding_references();
