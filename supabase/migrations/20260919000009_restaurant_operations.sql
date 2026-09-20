-- Authored for operator application. No printer delivery or external effects.
CREATE TABLE public.kitchen_stations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, location_id uuid NOT NULL,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 64), is_active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, UNIQUE(id,business_id,location_id),
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
CREATE UNIQUE INDEX kitchen_station_name ON public.kitchen_stations(location_id,lower(btrim(name)));
CREATE TABLE public.station_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, location_id uuid NOT NULL, station_id uuid NOT NULL,
 item_id uuid, section_id uuid, CHECK(num_nonnulls(item_id,section_id)=1),
 FOREIGN KEY(station_id,business_id,location_id) REFERENCES public.kitchen_stations(id,business_id,location_id),
 FOREIGN KEY(item_id,business_id) REFERENCES public.menu_items(id,business_id),
 FOREIGN KEY(section_id,business_id) REFERENCES public.menu_sections(id,business_id)
);
CREATE UNIQUE INDEX station_route_item ON public.station_routes(station_id,item_id) WHERE item_id IS NOT NULL;
CREATE UNIQUE INDEX station_route_section ON public.station_routes(station_id,section_id) WHERE section_id IS NOT NULL;
CREATE INDEX station_route_branch ON public.station_routes(location_id,item_id,section_id);
CREATE TABLE public.branch_staff (
 business_id uuid NOT NULL, location_id uuid NOT NULL,user_id uuid NOT NULL,
 PRIMARY KEY(location_id,user_id),
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id),
 FOREIGN KEY(user_id,business_id) REFERENCES public.memberships(user_id,business_id)
);
ALTER TABLE public.orders ADD COLUMN is_rush boolean NOT NULL DEFAULT false,
 ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN accepted_at timestamptz, ADD COLUMN prep_started_at timestamptz,
 ADD COLUMN ready_at timestamptz, ADD COLUMN completed_at timestamptz;
ALTER TABLE public.restaurant_tables ADD COLUMN operational_state text NOT NULL DEFAULT 'available'
 CHECK(operational_state IN ('available','occupied','needs_attention','cleaning')),
 ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE TABLE public.order_item_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL,location_id uuid NOT NULL,
 order_id uuid NOT NULL,order_item_id uuid NOT NULL,station_id uuid,station_name text,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','preparing','ready','cancelled')),
 revision integer NOT NULL DEFAULT 1,started_at timestamptz,ready_at timestamptz,
 FOREIGN KEY(order_item_id,order_id,business_id) REFERENCES public.order_items(id,order_id,business_id) ON DELETE CASCADE,
 FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id),
 FOREIGN KEY(station_id,business_id,location_id) REFERENCES public.kitchen_stations(id,business_id,location_id),
 UNIQUE NULLS NOT DISTINCT(order_item_id,station_id)
);
CREATE INDEX item_tasks_branch ON public.order_item_tasks(location_id,station_id,order_id);
CREATE TABLE public.operation_preferences (
 business_id uuid NOT NULL,location_id uuid NOT NULL,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 new_orders boolean NOT NULL DEFAULT true,ready_orders boolean NOT NULL DEFAULT true,
 PRIMARY KEY(location_id,user_id),FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
CREATE TABLE public.restaurant_operation_history (
 id uuid PRIMARY KEY,business_id uuid NOT NULL,location_id uuid NOT NULL,
 actor_id uuid REFERENCES auth.users(id),action text NOT NULL,target_id uuid,payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
CREATE INDEX restaurant_history_branch ON public.restaurant_operation_history(location_id,created_at DESC,id);
CREATE TABLE public.printer_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL,location_id uuid NOT NULL,
 order_id uuid NOT NULL REFERENCES public.orders(id),kind text NOT NULL CHECK(kind IN ('submitted','ready','cancelled')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,kind),FOREIGN KEY(location_id,business_id) REFERENCES public.locations(id,business_id)
);
ALTER TABLE public.kitchen_signals ADD COLUMN ready_count bigint NOT NULL DEFAULT 0;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['kitchen_stations','station_routes','branch_staff','order_item_tasks','restaurant_operation_history','printer_events'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY operations_read ON public.%I FOR SELECT TO authenticated USING(public.has_business_role(business_id,ARRAY[''owner'',''admin'',''manager'',''staff'']))',t);
 END LOOP;
END; $$;
ALTER TABLE public.operation_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operation_preferences FROM anon,authenticated;
GRANT SELECT ON public.operation_preferences TO authenticated;
CREATE POLICY preferences_read ON public.operation_preferences FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_business_role(business_id,ARRAY['owner','admin','manager','staff']));

CREATE FUNCTION public.route_order_tasks(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;i public.order_items;r record;found_route boolean;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order;
 IF o.status='draft' THEN RETURN; END IF;
 FOR i IN SELECT * FROM public.order_items WHERE order_id=o.id LOOP
 IF EXISTS(SELECT 1 FROM public.order_item_tasks WHERE order_item_id=i.id) THEN CONTINUE; END IF;
 found_route:=false;
 -- Active item rules override category rules; a line may fan out to several stations.
 FOR r IN SELECT DISTINCT s.id,s.name FROM public.station_routes m JOIN public.kitchen_stations s ON s.id=m.station_id
 WHERE m.business_id=o.business_id AND m.location_id=o.location_id AND s.is_active AND (
 m.item_id=i.item_id OR (m.section_id=(SELECT section_id FROM public.menu_items WHERE id=i.item_id AND business_id=o.business_id)
 AND NOT EXISTS(SELECT 1 FROM public.station_routes x JOIN public.kitchen_stations xs ON xs.id=x.station_id WHERE x.location_id=o.location_id AND x.item_id=i.item_id AND xs.is_active))) ORDER BY s.id LOOP
 INSERT INTO public.order_item_tasks(business_id,location_id,order_id,order_item_id,station_id,station_name) VALUES(o.business_id,o.location_id,o.id,i.id,r.id,r.name) ON CONFLICT DO NOTHING;
 found_route:=true;
 END LOOP;
 IF NOT found_route THEN INSERT INTO public.order_item_tasks(business_id,location_id,order_id,order_item_id) VALUES(o.business_id,o.location_id,o.id,i.id) ON CONFLICT DO NOTHING; END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.route_order_tasks(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.stamp_order_operations() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 IF NEW.status='accepted' THEN NEW.accepted_at:=coalesce(NEW.accepted_at,now()); END IF;
 IF NEW.status='preparing' THEN NEW.prep_started_at:=coalesce(NEW.prep_started_at,now()); END IF;
 IF NEW.status='ready' THEN NEW.ready_at:=coalesce(NEW.ready_at,now()); END IF;
 IF NEW.status='completed' THEN NEW.completed_at:=coalesce(NEW.completed_at,now()); END IF;
 END IF; RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.stamp_order_operations() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stamp_operations BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.stamp_order_operations();
CREATE FUNCTION public.order_operations_effects() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 PERFORM public.route_order_tasks(NEW.id);
 IF NEW.status IN ('ready','completed','cancelled') THEN UPDATE public.order_item_tasks
 SET state=CASE WHEN NEW.status='cancelled' THEN 'cancelled' ELSE 'ready' END,
 ready_at=CASE WHEN NEW.status<>'cancelled' THEN coalesce(ready_at,now()) ELSE ready_at END,revision=revision+1
 WHERE order_id=NEW.id AND state NOT IN ('ready','cancelled'); END IF;
 INSERT INTO public.restaurant_operation_history(id,business_id,location_id,actor_id,action,target_id,payload)
 VALUES(gen_random_uuid(),NEW.business_id,NEW.location_id,auth.uid(),'order_status',NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status));
 IF NEW.status IN ('submitted','ready','cancelled') THEN
 INSERT INTO public.printer_events(business_id,location_id,order_id,kind) VALUES(NEW.business_id,NEW.location_id,NEW.id,NEW.status) ON CONFLICT DO NOTHING;
 END IF;
 IF NEW.status='ready' THEN UPDATE public.kitchen_signals SET ready_count=ready_count+1,revision=revision+1,updated_at=now() WHERE location_id=NEW.location_id; END IF;
 END IF;
 -- QR linkage is attached after submission by the existing wrapper.
 IF NEW.status NOT IN ('draft','completed','cancelled') AND NEW.table_id IS NOT NULL AND (OLD.table_id IS DISTINCT FROM NEW.table_id OR OLD.status='draft') THEN
 UPDATE public.restaurant_tables SET operational_state='occupied',revision=revision+1 WHERE id=NEW.table_id AND operational_state='available';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.order_operations_effects() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER restaurant_order_effects AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_operations_effects();

CREATE FUNCTION public.restaurant_operation(p_action_id uuid,p_business_id uuid,p_location_id uuid,p_action text,p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior public.restaurant_operation_history; target uuid; station public.kitchen_stations; task public.order_item_tasks;o public.orders;t public.restaurant_tables;uid uuid;rev integer;manager boolean;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) OR NOT EXISTS(SELECT 1 FROM public.locations l JOIN public.businesses b ON b.id=l.business_id WHERE l.id=p_location_id AND b.id=p_business_id AND l.status='active' AND b.status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_action_id IS NULL OR p_action IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_action_id::text,9));
 -- Same lock as content/submission serializes route edits against snapshot routing.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
 SELECT * INTO prior FROM public.restaurant_operation_history WHERE id=p_action_id;
 IF FOUND THEN
 IF prior.business_id=p_business_id AND prior.location_id=p_location_id AND prior.actor_id=auth.uid() AND prior.action=p_action AND prior.payload=p_payload THEN RETURN; END IF;
 RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 manager:=public.has_business_role(p_business_id,ARRAY['owner','admin','manager']);
 target:=(p_payload->>'id')::uuid;uid:=(p_payload->>'user_id')::uuid;rev:=(p_payload->>'revision')::integer;
 IF p_action IN ('station','route','roster','assign_order','assign_table') AND NOT manager THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='station' THEN
 IF target IS NULL OR length(btrim(p_payload->>'name')) NOT BETWEEN 1 AND 64 OR p_payload->>'name' IS NULL OR jsonb_typeof(p_payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 SELECT * INTO station FROM public.kitchen_stations WHERE id=target FOR UPDATE;
 IF FOUND THEN
 IF station.business_id<>p_business_id OR station.location_id<>p_location_id THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF station.revision IS DISTINCT FROM rev THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.kitchen_stations SET name=btrim(p_payload->>'name'),is_active=(p_payload->>'active')::boolean,revision=revision+1 WHERE id=target;
 ELSE
 IF rev IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 INSERT INTO public.kitchen_stations(id,business_id,location_id,name,is_active) VALUES(target,p_business_id,p_location_id,btrim(p_payload->>'name'),(p_payload->>'active')::boolean);
 END IF;
 ELSIF p_action='route' THEN
 IF NOT EXISTS(SELECT 1 FROM public.kitchen_stations WHERE id=(p_payload->>'station_id')::uuid AND business_id=p_business_id AND location_id=p_location_id AND (is_active OR p_payload->>'enabled'='false')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_payload->>'kind' IS NULL OR p_payload->>'kind' NOT IN ('item','section') OR target IS NULL OR jsonb_typeof(p_payload->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 IF (p_payload->>'enabled')::boolean AND NOT EXISTS(SELECT 1 FROM public.menu_sections s JOIN public.menu_locations ml ON ml.menu_id=s.menu_id WHERE s.business_id=p_business_id AND ml.location_id=p_location_id AND ml.is_enabled AND (s.id=target AND p_payload->>'kind'='section' OR p_payload->>'kind'='item' AND EXISTS(SELECT 1 FROM public.menu_items i WHERE i.id=target AND i.section_id=s.id AND i.business_id=p_business_id))) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF (p_payload->>'enabled')::boolean THEN
 INSERT INTO public.station_routes(business_id,location_id,station_id,item_id,section_id) VALUES(p_business_id,p_location_id,(p_payload->>'station_id')::uuid,CASE WHEN p_payload->>'kind'='item' THEN target END,CASE WHEN p_payload->>'kind'='section' THEN target END) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.station_routes WHERE business_id=p_business_id AND location_id=p_location_id AND station_id=(p_payload->>'station_id')::uuid AND (item_id=target OR section_id=target); END IF;
 ELSIF p_action='roster' THEN
 IF uid IS NULL OR jsonb_typeof(p_payload->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 IF (p_payload->>'enabled')::boolean THEN
 IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE user_id=uid AND business_id=p_business_id AND status='active' AND role IN ('owner','admin','manager','staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 INSERT INTO public.branch_staff VALUES(p_business_id,p_location_id,uid) ON CONFLICT DO NOTHING;
 ELSE
 DELETE FROM public.branch_staff WHERE location_id=p_location_id AND user_id=uid;
 UPDATE public.orders SET assigned_user_id=NULL,revision=revision+1 WHERE location_id=p_location_id AND assigned_user_id=uid AND status NOT IN ('completed','cancelled');
 UPDATE public.restaurant_tables SET assigned_user_id=NULL,revision=revision+1 WHERE location_id=p_location_id AND assigned_user_id=uid;
 END IF;
 ELSIF p_action IN ('rush','assign_order','task') THEN
 IF p_action='task' THEN
 SELECT * INTO task FROM public.order_item_tasks WHERE id=target AND business_id=p_business_id AND location_id=p_location_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=task.order_id FOR UPDATE;
 SELECT * INTO task FROM public.order_item_tasks WHERE id=target FOR UPDATE;
 IF task.revision IS DISTINCT FROM rev THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 IF o.status<>'preparing' OR NOT ((task.state='pending' AND p_payload->>'state'='preparing') OR (task.state='preparing' AND p_payload->>'state'='ready')) OR p_payload->>'state' IS NULL THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 UPDATE public.order_item_tasks SET state=p_payload->>'state',revision=revision+1,started_at=coalesce(started_at,now()),ready_at=CASE WHEN p_payload->>'state'='ready' THEN now() END WHERE id=target;
 ELSE
 SELECT * INTO o FROM public.orders WHERE id=target AND business_id=p_business_id AND location_id=p_location_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF o.revision IS DISTINCT FROM rev THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 IF o.status IN ('draft','completed','cancelled') THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 IF p_action='rush' THEN
 IF jsonb_typeof(p_payload->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 UPDATE public.orders SET is_rush=(p_payload->>'enabled')::boolean,revision=revision+1,updated_at=now() WHERE id=target;
 ELSE
 IF uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branch_staff bs JOIN public.memberships m USING(user_id,business_id) WHERE bs.location_id=p_location_id AND bs.user_id=uid AND m.status='active' AND m.role IN ('owner','admin','manager','staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.orders SET assigned_user_id=uid,revision=revision+1,updated_at=now() WHERE id=target;
 END IF; END IF;
 ELSIF p_action IN ('table_state','assign_table') THEN
 SELECT * INTO t FROM public.restaurant_tables WHERE id=target AND business_id=p_business_id AND location_id=p_location_id AND archived_at IS NULL AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF t.revision IS DISTINCT FROM rev THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 IF p_action='table_state' THEN
 IF p_payload->>'state' IS NULL OR p_payload->>'state' NOT IN ('available','occupied','needs_attention','cleaning') THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 IF p_payload->>'state' IN ('available','cleaning') AND EXISTS(SELECT 1 FROM public.orders WHERE table_id=t.id AND status IN ('submitted','accepted','preparing','ready')) THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.restaurant_tables SET operational_state=p_payload->>'state',revision=revision+1 WHERE id=target;
 ELSE
 IF uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branch_staff bs JOIN public.memberships m USING(user_id,business_id) WHERE bs.location_id=p_location_id AND bs.user_id=uid AND m.status='active' AND m.role IN ('owner','admin','manager','staff')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.restaurant_tables SET assigned_user_id=uid,revision=revision+1 WHERE id=target;
 END IF;
 ELSIF p_action='preferences' THEN
 IF jsonb_typeof(p_payload->'new_orders') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_payload->'ready_orders') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 INSERT INTO public.operation_preferences(business_id,location_id,user_id,new_orders,ready_orders) VALUES(p_business_id,p_location_id,auth.uid(),(p_payload->>'new_orders')::boolean,(p_payload->>'ready_orders')::boolean)
 ON CONFLICT(location_id,user_id) DO UPDATE SET new_orders=excluded.new_orders,ready_orders=excluded.ready_orders;
 ELSE RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 INSERT INTO public.restaurant_operation_history(id,business_id,location_id,actor_id,action,target_id,payload) VALUES(p_action_id,p_business_id,p_location_id,auth.uid(),p_action,target,p_payload);
 INSERT INTO public.kitchen_signals(business_id,location_id) VALUES(p_business_id,p_location_id) ON CONFLICT(location_id) DO UPDATE SET revision=public.kitchen_signals.revision+1,updated_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.restaurant_operation(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_operation(uuid,uuid,uuid,text,jsonb) TO authenticated;

CREATE FUNCTION public.restaurant_orders(p_business_id uuid,p_location_id uuid,p_status text DEFAULT 'active',p_offset integer DEFAULT 0,p_station uuid DEFAULT NULL,p_unassigned boolean DEFAULT false,p_mine boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) OR NOT EXISTS(SELECT 1 FROM public.businesses WHERE id=p_business_id AND status='active') OR NOT EXISTS(
 SELECT 1 FROM public.locations WHERE id=p_location_id AND business_id=p_business_id AND status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('active','submitted','accepted','preparing','ready','completed','cancelled') OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 IF p_station IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.kitchen_stations WHERE id=p_station AND business_id=p_business_id AND location_id=p_location_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 WITH matching AS (
 SELECT o.* FROM public.orders o WHERE o.business_id=p_business_id AND o.location_id=p_location_id
 AND (NOT p_mine OR o.assigned_user_id=auth.uid())
 AND (p_station IS NULL OR EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_id=o.id AND t.station_id=p_station))
 AND (NOT p_unassigned OR EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_id=o.id AND t.station_id IS NULL) OR NOT EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_id=o.id))
 AND CASE WHEN p_status='active' THEN o.status IN ('submitted','accepted','preparing','ready') ELSE o.status=p_status END
 ), page AS (
 SELECT * FROM matching ORDER BY is_rush DESC,
 CASE WHEN p_status IN ('completed','cancelled') THEN submitted_at END DESC,
 submitted_at,id LIMIT 50 OFFSET p_offset
 ) SELECT jsonb_build_object('ready_revision',coalesce((SELECT ready_count FROM public.kitchen_signals WHERE location_id=p_location_id),0),'incoming_revision',coalesce((SELECT submitted_count FROM public.kitchen_signals WHERE location_id=p_location_id),0),'total',(SELECT count(*) FROM matching),'orders',coalesce(jsonb_agg(jsonb_build_object(
 'is_rush',o.is_rush,'assigned_user_id',o.assigned_user_id,'accepted_at',o.accepted_at,'prep_started_at',o.prep_started_at,'ready_at',o.ready_at,'completed_at',o.completed_at,'id',o.id,'business_id',o.business_id,'location_id',o.location_id,'status',o.status,'revision',o.revision,
 'submitted_at',o.submitted_at,'customer_name',o.customer_name,'fulfillment_mode',o.fulfillment_mode,
 'table_name',o.table_name,'table_area',o.table_area,'cancellation_reason',o.cancellation_reason,
 'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'quantity',i.quantity,'name',i.name_i18n,'variant',i.variant_name_i18n,
 'tasks',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'station_id',t.station_id,'station_name',t.station_name,'state',t.state,'revision',t.revision) ORDER BY t.station_id NULLS LAST) FROM public.order_item_tasks t WHERE t.order_item_id=i.id AND (p_station IS NULL OR t.station_id=p_station) AND (NOT p_unassigned OR t.station_id IS NULL)),'[]'::jsonb),
 'modifiers',coalesce((SELECT jsonb_agg(jsonb_build_object('name',m.name_i18n,'group',m.group_name_i18n) ORDER BY m.id)
 FROM public.order_item_modifiers m WHERE m.order_id=o.id AND m.order_item_id=i.id),'[]'::jsonb)) ORDER BY i.sort_order,i.id)
 FROM public.order_items i WHERE i.order_id=o.id AND (p_station IS NULL OR EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_item_id=i.id AND t.station_id=p_station)) AND (NOT p_unassigned OR EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_item_id=i.id AND t.station_id IS NULL) OR NOT EXISTS(SELECT 1 FROM public.order_item_tasks t WHERE t.order_item_id=i.id))),'[]'::jsonb))),'[]'::jsonb)) INTO result FROM page o;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.restaurant_orders(uuid,uuid,text,integer,uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_orders(uuid,uuid,text,integer,uuid,boolean,boolean) TO authenticated;

CREATE FUNCTION public.restaurant_operations_context(p_business_id uuid,p_location_id uuid,p_history_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 -- Reuse the feed's active branch and staff authorization guard.
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) OR NOT EXISTS(SELECT 1 FROM public.locations l JOIN public.businesses b ON b.id=l.business_id WHERE l.id=p_location_id AND b.id=p_business_id AND l.status='active' AND b.status='active') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_history_offset IS NULL OR p_history_offset<0 OR p_history_offset>100000 THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object(
 'manager',public.has_business_role(p_business_id,ARRAY['owner','admin','manager']),
 'user_id',auth.uid(),
 'stations',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.name,s.id) FROM public.kitchen_stations s WHERE s.business_id=p_business_id AND s.location_id=p_location_id),'[]'::jsonb),
 'routes',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.station_routes r WHERE r.business_id=p_business_id AND r.location_id=p_location_id),'[]'::jsonb),
 'tables',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'state',t.operational_state,'assigned_user_id',t.assigned_user_id,'revision',t.revision) ORDER BY t.name,t.id) FROM public.restaurant_tables t WHERE t.business_id=p_business_id AND t.location_id=p_location_id AND t.archived_at IS NULL AND t.is_active),'[]'::jsonb),
 'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(nullif(p.full_name,''),m.user_id::text),'role',m.role,'in_branch',EXISTS(SELECT 1 FROM public.branch_staff bs WHERE bs.location_id=p_location_id AND bs.user_id=m.user_id)) ORDER BY p.full_name,m.user_id) FROM public.memberships m LEFT JOIN public.profiles p ON p.id=m.user_id WHERE m.business_id=p_business_id AND m.status='active' AND m.role IN ('owner','admin','manager','staff')),'[]'::jsonb),
 'catalog',coalesce((SELECT jsonb_agg(x ORDER BY x->>'id') FROM (
 SELECT jsonb_build_object('id',s.id,'name',s.name_i18n,'kind','section') x FROM public.menu_sections s WHERE s.business_id=p_business_id AND EXISTS(SELECT 1 FROM public.menu_locations ml WHERE ml.menu_id=s.menu_id AND ml.location_id=p_location_id AND ml.is_enabled)
 UNION ALL SELECT jsonb_build_object('id',i.id,'name',i.name_i18n,'kind','item') FROM public.menu_items i JOIN public.menu_sections s ON s.id=i.section_id WHERE i.business_id=p_business_id AND i.archived_at IS NULL AND EXISTS(SELECT 1 FROM public.menu_locations ml WHERE ml.menu_id=s.menu_id AND ml.location_id=p_location_id AND ml.is_enabled)
 ) c),'[]'::jsonb),
 'preferences',coalesce((SELECT jsonb_build_object('new_orders',new_orders,'ready_orders',ready_orders) FROM public.operation_preferences WHERE location_id=p_location_id AND user_id=auth.uid()),'{"new_orders":true,"ready_orders":true}'::jsonb),
 'history_total',(SELECT count(*) FROM public.restaurant_operation_history WHERE location_id=p_location_id AND business_id=p_business_id),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at DESC,h.id) FROM (SELECT id,actor_id,action,target_id,payload,created_at FROM public.restaurant_operation_history WHERE business_id=p_business_id AND location_id=p_location_id ORDER BY created_at DESC,id LIMIT 50 OFFSET p_history_offset) h),'[]'::jsonb),
 'printer_events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC,e.id) FROM (SELECT id,order_id,kind,version,created_at FROM public.printer_events WHERE business_id=p_business_id AND location_id=p_location_id ORDER BY created_at DESC,id LIMIT 50) e),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.restaurant_operations_context(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_operations_context(uuid,uuid,integer) TO authenticated;
