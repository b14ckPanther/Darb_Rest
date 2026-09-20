-- Authored only. Backward-compatible appearance options; no ordering/data changes.
CREATE OR REPLACE FUNCTION public.save_restaurant_appearance(p_business_id uuid,p_revision integer,p_settings jsonb,p_publish boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_row public.restaurant_appearance;k text;new_revision integer;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin']) OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_publish IS NULL OR p_revision IS NULL OR p_revision<0 OR jsonb_typeof(p_settings) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_settings)) NOT IN (9,10) OR (p_settings - ARRAY['template','version','primary','accent','logo','cover','coverVideo','density','images','layout']) <> '{}'::jsonb OR NOT (p_settings ?& ARRAY['template','version','primary','accent','logo','cover','coverVideo','density','images']) THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF p_settings->>'template' !~ '^[a-z][a-z0-9-]{0,63}$' OR
 jsonb_typeof(p_settings->'version') IS DISTINCT FROM 'number' OR (p_settings->>'version') !~ '^[0-9]+$' OR (p_settings->>'version')::integer NOT BETWEEN 1 AND 10000 OR
 p_settings->>'density' NOT IN ('airy','balanced','compact') OR jsonb_typeof(p_settings->'images') IS DISTINCT FROM 'boolean'
 THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 FOREACH k IN ARRAY ARRAY['template','primary','accent','logo','cover','coverVideo','density'] LOOP
 IF jsonb_typeof(p_settings->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['primary','accent'] LOOP
 IF p_settings->>k !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['logo','cover','coverVideo'] LOOP
 IF length(p_settings->>k)>2048 OR ((p_settings->>k)<>'' AND ((p_settings->>k) !~ '^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$' OR (p_settings->>k) ~ '[<>"\\]')) THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF p_settings ? 'layout' THEN
 IF jsonb_typeof(p_settings->'layout') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_settings->'layout'))<>8 OR NOT ((p_settings->'layout') ?& ARRAY['hero','focal','navigation','cards','information','cta','footer','surface']) THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'hero') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'hero' NOT IN ('template','compact','immersive') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'focal') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'focal' NOT IN ('center','top','bottom') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'navigation') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'navigation' NOT IN ('template','pills','index') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'cards') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'cards' NOT IN ('template','soft','square') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'information') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'information' NOT IN ('before','after') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'cta') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'cta' NOT IN ('filled','outline') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'footer') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'footer' NOT IN ('compact','contact') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_settings->'layout'->'surface') IS DISTINCT FROM 'string' OR p_settings->'layout'->>'surface' NOT IN ('template','ivory','white') THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,10));
 SELECT * INTO current_row FROM public.restaurant_appearance WHERE business_id=p_business_id FOR UPDATE;
 IF coalesce(current_row.revision,0)<>p_revision THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 new_revision:=p_revision+1;
 INSERT INTO public.restaurant_appearance(business_id,draft,published,revision,published_at)
 VALUES(p_business_id,p_settings,CASE WHEN p_publish THEN p_settings END,new_revision,CASE WHEN p_publish THEN now() END)
 ON CONFLICT(business_id) DO UPDATE SET draft=excluded.draft,
 published=CASE WHEN p_publish THEN excluded.draft ELSE restaurant_appearance.published END,
 published_at=CASE WHEN p_publish THEN now() ELSE restaurant_appearance.published_at END,
 revision=new_revision,updated_at=now();
 RETURN new_revision;
END; $$;
REVOKE ALL ON FUNCTION public.save_restaurant_appearance(uuid,integer,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_restaurant_appearance(uuid,integer,jsonb,boolean) TO authenticated;
