-- Authored only; apply through the operator's migration workflow.
CREATE TABLE public.restaurant_appearance (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
 draft jsonb NOT NULL,
 published jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(jsonb_typeof(draft)='object'),
 CHECK(published IS NULL OR jsonb_typeof(published)='object')
);
ALTER TABLE public.restaurant_appearance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_appearance FROM anon,authenticated;
GRANT SELECT ON public.restaurant_appearance TO authenticated;
CREATE POLICY appearance_read ON public.restaurant_appearance FOR SELECT TO authenticated
 USING(public.has_business_role(business_id,ARRAY['owner','admin']));

CREATE FUNCTION public.save_restaurant_appearance(p_business_id uuid,p_revision integer,p_settings jsonb,p_publish boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_row public.restaurant_appearance;k text;new_revision integer;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin']) OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_publish IS NULL OR p_revision IS NULL OR p_revision<0 OR jsonb_typeof(p_settings) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_settings))<>9 OR NOT (p_settings ?& ARRAY['template','version','primary','accent','logo','cover','coverVideo','density','images']) THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
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
