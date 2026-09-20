-- Phase 11: operator-applied aggregates only. No order/payment mutation.
CREATE INDEX orders_analytics_submitted ON public.orders(business_id,submitted_at,location_id) WHERE submitted_at IS NOT NULL AND status <> 'draft';
CREATE INDEX restaurant_history_rejections ON public.restaurant_operation_history(business_id,target_id) WHERE action='order_status' AND payload->>'from'='submitted' AND payload->>'to'='cancelled';
CREATE FUNCTION public.restaurant_analytics(p_business_id uuid,p_from date,p_to date,p_location_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='10s' AS $$
DECLARE tz text; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','read_only']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT timezone INTO tz FROM public.businesses WHERE id=p_business_id AND status='active';
 IF tz IS NULL OR (p_location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.locations WHERE id=p_location_id AND business_id=p_business_id)) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>365 THEN RAISE EXCEPTION 'invalid_range' USING ERRCODE='22023'; END IF;
 WITH selected AS MATERIALIZED (
 SELECT o.*,coalesce(p.method,'none') AS payment_method,coalesce(p.status,'none') AS payment_status,
 CASE WHEN p.status='paid' THEN p.amount_cents ELSE 0 END AS paid_cents,
 (o.submitted_at AT TIME ZONE tz) AS local_time,
 CASE WHEN o.ready_at>=o.prep_started_at AND o.status<>'cancelled' THEN extract(epoch FROM o.ready_at-o.prep_started_at)/60 END AS prep_minutes,
 CASE WHEN o.completed_at>=o.submitted_at AND o.status='completed' THEN extract(epoch FROM o.completed_at-o.submitted_at)/60 END AS lifecycle_minutes,
 (o.status='cancelled' AND EXISTS(SELECT 1 FROM public.restaurant_operation_history h WHERE h.business_id=o.business_id AND h.target_id=o.id AND h.action='order_status' AND h.payload->>'from'='submitted' AND h.payload->>'to'='cancelled')) AS rejected
 FROM public.orders o LEFT JOIN public.payments p ON p.order_id=o.id AND p.business_id=o.business_id
 WHERE o.business_id=p_business_id AND (p_location_id IS NULL OR o.location_id=p_location_id)
 AND o.status<>'draft' AND o.submitted_at >= (p_from::timestamp AT TIME ZONE tz)
 AND o.submitted_at < ((p_to+1)::timestamp AT TIME ZONE tz)
 ), dimensions AS (
 SELECT s.*,d.kind,d.key FROM selected s CROSS JOIN LATERAL (VALUES
 ('summary','all'),('daily',to_char(s.local_time,'YYYY-MM-DD')),
 ('hours',lpad(extract(hour FROM s.local_time)::text,2,'0')),
 ('days',extract(isodow FROM s.local_time)::text),('branches',s.location_id::text),
 ('fulfillment',s.fulfillment_mode),('payments',s.payment_status),('methods',s.payment_method),
 ('tables',CASE WHEN s.fulfillment_mode='dine_in' THEN coalesce(s.table_id::text,'none') END)
 ) d(kind,key) WHERE d.key IS NOT NULL
 ), aggregates AS (
 SELECT kind,key,currency,count(*) AS orders,count(*) FILTER(WHERE status='cancelled') AS cancelled,
 count(*) FILTER(WHERE rejected) AS rejected,
 coalesce(sum(subtotal_cents) FILTER(WHERE status<>'cancelled'),0) AS value_cents,
 count(*) FILTER(WHERE status<>'cancelled') AS value_orders,
 sum(paid_cents) AS paid_cents,avg(prep_minutes) AS prep_minutes,count(prep_minutes) AS prep_samples,
 avg(lifecycle_minutes) AS lifecycle_minutes,count(lifecycle_minutes) AS lifecycle_samples
 FROM dimensions GROUP BY kind,key,currency
 ), table_names AS (
 SELECT DISTINCT ON (table_id) table_id,table_name FROM selected WHERE table_id IS NOT NULL AND fulfillment_mode='dine_in' ORDER BY table_id,submitted_at DESC,id
 ), named AS (
 SELECT a.*,CASE WHEN a.kind='branches' THEN l.name
 WHEN a.kind='tables' AND t.table_id IS NOT NULL THEN jsonb_build_object('en',t.table_name,'ar',t.table_name,'he',t.table_name) END AS name
 FROM aggregates a LEFT JOIN public.locations l ON a.kind='branches' AND l.id::text=a.key AND l.business_id=p_business_id
 LEFT JOIN table_names t ON a.kind='tables' AND t.table_id::text=a.key
 ), items AS (
 SELECT i.item_id,s.currency,(array_agg(i.name_i18n ORDER BY s.submitted_at DESC,s.id))[1] AS name,
 sum(i.quantity) AS quantity,sum(i.line_total_cents) AS value_cents
 FROM selected s JOIN public.order_items i ON i.order_id=s.id AND i.business_id=p_business_id
 WHERE s.status<>'cancelled' GROUP BY i.item_id,s.currency
 ) SELECT jsonb_build_object('timezone',tz,'rows',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY kind,key,currency) FROM named n),'[]'::jsonb),
 'items',coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM (SELECT * FROM items ORDER BY quantity DESC,item_id,currency LIMIT 50) i),'[]'::jsonb),
 'item_count',(SELECT count(*) FROM items)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.restaurant_analytics(uuid,date,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_analytics(uuid,date,date,uuid) TO authenticated;
