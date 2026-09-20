-- Operator-applied only. Kitchen signals contain no guest or order payload.
ALTER TABLE public.orders ADD COLUMN cancellation_reason text
 CHECK (cancellation_reason IS NULL OR (status='cancelled' AND length(btrim(cancellation_reason)) BETWEEN 1 AND 500));
CREATE INDEX orders_kitchen_queue ON public.orders(business_id,location_id,status,submitted_at,id);
CREATE TABLE public.kitchen_signals (
 location_id uuid PRIMARY KEY,
 business_id uuid NOT NULL,
 revision bigint NOT NULL DEFAULT 1,
 submitted_count bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id) ON DELETE CASCADE
);
ALTER TABLE public.kitchen_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY kitchen_signal_read ON public.kitchen_signals FOR SELECT TO authenticated
 USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','staff']));
REVOKE ALL ON public.kitchen_signals FROM anon,authenticated;
GRANT SELECT ON public.kitchen_signals TO authenticated;
CREATE FUNCTION public.signal_kitchen_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE incoming bigint:=0;
BEGIN
 IF NEW.status='submitted' THEN
 IF TG_OP='INSERT' THEN incoming:=1; ELSIF OLD.status='draft' THEN incoming:=1; END IF;
 END IF;
 IF NEW.status<>'draft' THEN
 INSERT INTO public.kitchen_signals(location_id,business_id,submitted_count) VALUES(NEW.location_id,NEW.business_id,incoming)
 ON CONFLICT(location_id) DO UPDATE SET revision=public.kitchen_signals.revision+1,submitted_count=public.kitchen_signals.submitted_count+incoming,updated_at=clock_timestamp();
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.signal_kitchen_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER kitchen_order_signal AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.signal_kitchen_order();
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_signals;

CREATE TABLE public.order_operations (
 id uuid PRIMARY KEY,
 business_id uuid NOT NULL REFERENCES public.businesses(id),
 location_id uuid NOT NULL,
 order_id uuid NOT NULL REFERENCES public.orders(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 expected_revision integer NOT NULL,
 target_status text NOT NULL,
 reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
ALTER TABLE public.order_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_operation_read ON public.order_operations FOR SELECT TO authenticated
 USING(public.has_business_role(business_id,ARRAY['owner','admin','manager','staff']));
REVOKE ALL ON public.order_operations FROM anon,authenticated;
GRANT SELECT ON public.order_operations TO authenticated;
CREATE FUNCTION public.operate_kitchen_order(p_action_id uuid,p_business_id uuid,p_location_id uuid,p_order_id uuid,p_revision integer,p_status text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; prior public.order_operations; reason text:=nullif(btrim(p_reason),'');
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id AND status='active') OR NOT EXISTS(
 SELECT 1 FROM public.locations WHERE id=p_location_id AND business_id=p_business_id AND status='active') THEN
 RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_action_id IS NULL OR p_status IS NULL OR (p_status='cancelled' AND (reason IS NULL OR length(reason)>500)) OR (p_status<>'cancelled' AND reason IS NOT NULL) THEN
 RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 -- Serialize retries of one operation before locking the order. Never permit an action UUID to be reused.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_action_id::text,8));
 SELECT * INTO prior FROM public.order_operations WHERE id=p_action_id;
 IF FOUND THEN
 IF prior.business_id=p_business_id AND prior.location_id=p_location_id AND prior.order_id=p_order_id AND prior.actor_id=auth.uid() AND prior.expected_revision=p_revision AND prior.target_status=p_status AND prior.reason IS NOT DISTINCT FROM reason THEN RETURN; END IF;
 RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND business_id=p_business_id AND location_id=p_location_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 -- Existing canonical transition and payment guard remain authoritative.
 PERFORM public.transition_order(p_order_id,p_business_id,p_revision,p_status);
 IF p_status='cancelled' THEN UPDATE public.orders SET cancellation_reason=reason WHERE id=p_order_id; END IF;
 INSERT INTO public.order_operations(id,business_id,location_id,order_id,actor_id,expected_revision,target_status,reason)
 VALUES(p_action_id,p_business_id,p_location_id,p_order_id,auth.uid(),p_revision,p_status,reason);
END; $$;
REVOKE ALL ON FUNCTION public.operate_kitchen_order(uuid,uuid,uuid,uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.operate_kitchen_order(uuid,uuid,uuid,uuid,integer,text,text) TO authenticated;

CREATE FUNCTION public.kitchen_orders(p_business_id uuid,p_location_id uuid,p_status text DEFAULT 'active',p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id AND status='active') OR NOT EXISTS(
 SELECT 1 FROM public.locations WHERE id=p_location_id AND business_id=p_business_id AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('active','submitted','accepted','preparing','ready','completed','cancelled') OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 WITH matching AS (
 SELECT o.* FROM public.orders o WHERE o.business_id=p_business_id AND o.location_id=p_location_id
 AND CASE WHEN p_status='active' THEN o.status IN ('submitted','accepted','preparing','ready') ELSE o.status=p_status END
 ), page AS (
 SELECT * FROM matching ORDER BY
 CASE WHEN p_status IN ('completed','cancelled') THEN submitted_at END DESC,
 submitted_at,id LIMIT 50 OFFSET p_offset
 ) SELECT jsonb_build_object('incoming_revision',coalesce((SELECT submitted_count FROM public.kitchen_signals WHERE location_id=p_location_id),0),'total',(SELECT count(*) FROM matching),'orders',coalesce(jsonb_agg(jsonb_build_object(
 'id',o.id,'business_id',o.business_id,'location_id',o.location_id,'status',o.status,'revision',o.revision,
 'submitted_at',o.submitted_at,'customer_name',o.customer_name,'fulfillment_mode',o.fulfillment_mode,
 'table_name',o.table_name,'table_area',o.table_area,'cancellation_reason',o.cancellation_reason,
 'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'quantity',i.quantity,'name',i.name_i18n,'variant',i.variant_name_i18n,
 'modifiers',coalesce((SELECT jsonb_agg(jsonb_build_object('name',m.name_i18n,'group',m.group_name_i18n) ORDER BY m.id)
 FROM public.order_item_modifiers m WHERE m.order_id=o.id AND m.order_item_id=i.id),'[]'::jsonb)) ORDER BY i.sort_order,i.id)
 FROM public.order_items i WHERE i.order_id=o.id),'[]'::jsonb))),'[]'::jsonb)) INTO result FROM page o;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.kitchen_orders(uuid,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kitchen_orders(uuid,uuid,text,integer) TO authenticated;
