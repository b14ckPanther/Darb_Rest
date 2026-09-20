BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('e9000000-0000-4000-8000-000000000001','operations-manager@db.example','{}'),
('e9000000-0000-4000-8000-000000000002','operations-staff@db.example','{}'),
('e9000000-0000-4000-8000-000000000003','operations-other@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
('e9000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','manager'),
('e9000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff'),
('e9000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','manager');
INSERT INTO restaurant_tables(id,business_id,location_id,name) VALUES('e9400000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','Operations table');
CREATE FUNCTION pg_temp.op(action text,payload jsonb,aid uuid DEFAULT gen_random_uuid(),branch uuid DEFAULT 'c1111111-1111-1111-1111-111111111111') RETURNS void LANGUAGE sql AS $$
 SELECT restaurant_operation(aid,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',branch,action,payload);
$$;
CREATE FUNCTION pg_temp.submit(oid uuid) RETURNS public.orders LANGUAGE sql AS $$
 SELECT save_order(oid,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','[{"item_id":"d2000000-0000-4000-8000-000000000001","variant_id":null,"modifier_ids":[],"quantity":1}]','Operations guest','','dine_in',3200,0,true);
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000001","name":"Cold prep","active":true,"revision":0}')$$,'Manager creates station');
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000002","name":"Grill","active":true,"revision":0}')$$,'Second station');
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000003","name":"Bar","active":true,"revision":0}')$$,'Third station');
SELECT throws_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000001","name":"Spoof","active":true,"revision":1}',gen_random_uuid(),'c2222222-2222-2222-2222-222222222222')$$,'42501','forbidden','Cross-branch station edit rejected');
SELECT lives_ok($$SELECT pg_temp.op('route','{"id":"d1000000-0000-4000-8000-000000000001","station_id":"e9100000-0000-4000-8000-000000000001","kind":"section","enabled":true}')$$,'Category route configured');
SELECT lives_ok($$SELECT pg_temp.submit('e9200000-0000-4000-8000-000000000001')$$,'Submission routes category');
SELECT is((SELECT station_id FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000001'),'e9100000-0000-4000-8000-000000000001'::uuid,'Category routed to cold prep');
SELECT lives_ok($$SELECT pg_temp.op('route','{"id":"d2000000-0000-4000-8000-000000000001","station_id":"e9100000-0000-4000-8000-000000000002","kind":"item","enabled":true}')$$,'Item rule');
SELECT lives_ok($$SELECT pg_temp.op('route','{"id":"d2000000-0000-4000-8000-000000000001","station_id":"e9100000-0000-4000-8000-000000000003","kind":"item","enabled":true}')$$,'Item fans out');
SELECT lives_ok($$SELECT pg_temp.submit('e9200000-0000-4000-8000-000000000002')$$,'New submission snapshots item rules');
SELECT is((SELECT count(*)::integer FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002'),2,'Exactly two tasks, no category duplication');
SELECT is((SELECT count(*)::integer FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000001'),1,'Previous routing remains unchanged');
SELECT ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(restaurant_orders('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','active',0,'e9100000-0000-4000-8000-000000000002')->'orders') o WHERE o->>'id'='e9200000-0000-4000-8000-000000000001'),'Station feed excludes other stations');
SELECT lives_ok($$SELECT pg_temp.op('roster','{"user_id":"e9000000-0000-4000-8000-000000000002","enabled":true}')$$,'Manager adds active staff');
SELECT lives_ok($$SELECT pg_temp.op('assign_order','{"id":"e9200000-0000-4000-8000-000000000002","revision":1,"user_id":"e9000000-0000-4000-8000-000000000002"}')$$,'Manager assigns order');
SELECT throws_ok($$SELECT pg_temp.op('assign_table','{"id":"e9400000-0000-4000-8000-000000000001","revision":1,"user_id":"e9000000-0000-4000-8000-000000000003"}')$$,'42501','forbidden','Other tenant cannot be assigned');
SELECT lives_ok($$SELECT pg_temp.op('assign_table','{"id":"e9400000-0000-4000-8000-000000000001","revision":1,"user_id":"e9000000-0000-4000-8000-000000000002"}')$$,'Manager assigns table');
SELECT set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT pg_temp.op('roster','{"user_id":"e9000000-0000-4000-8000-000000000001","enabled":true}')$$,'42501','forbidden','Staff cannot manage roster');
SELECT throws_ok($$SELECT pg_temp.op('assign_order','{"id":"e9200000-0000-4000-8000-000000000002","revision":2,"user_id":null}')$$,'42501','forbidden','Staff cannot reassign');
SELECT lives_ok($$SELECT pg_temp.op('rush','{"id":"e9200000-0000-4000-8000-000000000002","revision":2,"enabled":true}','e9300000-0000-4000-8000-000000000001')$$,'Staff marks rush');
SELECT lives_ok($$SELECT pg_temp.op('rush','{"id":"e9200000-0000-4000-8000-000000000002","revision":2,"enabled":true}','e9300000-0000-4000-8000-000000000001')$$,'Rush retry idempotent');
SELECT is((SELECT revision FROM orders WHERE id='e9200000-0000-4000-8000-000000000002'),3,'Rush retry does not duplicate');
SELECT is(restaurant_orders('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111')->'orders'->0->>'id','e9200000-0000-4000-8000-000000000002','Rush sorts first');
SELECT throws_ok($$SELECT pg_temp.op('task',(SELECT jsonb_build_object('id',id,'revision',revision,'state','ready') FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002' ORDER BY id LIMIT 1))$$,'22023','invalid_transition','Cannot prepare submitted order or skip a task');
SELECT lives_ok($$SELECT transition_order('e9200000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,'accepted')$$,'Canonical acceptance preserved');
SELECT lives_ok($$SELECT transition_order('e9200000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',4,'preparing')$$,'Canonical preparation preserved');
SELECT lives_ok($$SELECT pg_temp.op('task',(SELECT jsonb_build_object('id',id,'revision',revision,'state','preparing') FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002' ORDER BY id LIMIT 1))$$,'One station starts item');
SELECT lives_ok($$SELECT pg_temp.op('task',(SELECT jsonb_build_object('id',id,'revision',revision,'state','ready') FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002' AND state='preparing'))$$,'One station finishes item');
SELECT is((SELECT count(*)::integer FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002' AND state='pending'),1,'Other station remains independent');
SELECT lives_ok($$SELECT transition_order('e9200000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',5,'ready')$$,'Legacy order ready remains supported');
SELECT is((SELECT count(*)::integer FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002' AND state='ready'),2,'Order ready completes remaining tasks');
SELECT ok((SELECT accepted_at IS NOT NULL AND prep_started_at IS NOT NULL AND ready_at IS NOT NULL FROM orders WHERE id='e9200000-0000-4000-8000-000000000002'),'Operational timestamps stamped');
SELECT is((SELECT count(*)::integer FROM printer_events WHERE order_id='e9200000-0000-4000-8000-000000000002'),2,'Submission and ready printer events created exactly once');
SELECT lives_ok($$SELECT transition_order('e9200000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',6,'completed')$$,'Completion uses canonical transition');
SELECT ok((SELECT completed_at IS NOT NULL FROM orders WHERE id='e9200000-0000-4000-8000-000000000002'),'Completion timestamp recorded');
SELECT lives_ok($$SELECT pg_temp.op('preferences','{"new_orders":false,"ready_orders":true}')$$,'Own notification preferences saved');
SELECT is((SELECT new_orders FROM operation_preferences WHERE location_id='c1111111-1111-1111-1111-111111111111' AND user_id=auth.uid()),false,'Preference persisted');
SELECT lives_ok($$SELECT pg_temp.op('table_state','{"id":"e9400000-0000-4000-8000-000000000001","revision":2,"state":"needs_attention"}')$$,'Staff requests table attention');
SELECT lives_ok($$SELECT pg_temp.op('table_state','{"id":"e9400000-0000-4000-8000-000000000001","revision":3,"state":"cleaning"}')$$,'Empty table can be cleaned');
SELECT throws_ok($$UPDATE order_item_tasks SET state='ready'$$,'42501',NULL,'Direct task writes denied');
SELECT throws_ok($$INSERT INTO printer_events(business_id,location_id,order_id,kind) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e9200000-0000-4000-8000-000000000002','ready')$$,'42501',NULL,'Clients cannot enqueue arbitrary printer events');
SELECT set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT restaurant_orders('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c2222222-2222-2222-2222-222222222222','active',0,'e9100000-0000-4000-8000-000000000002')$$,'42501','forbidden','Station filter cannot cross branches');
SELECT throws_ok($$SELECT pg_temp.op('rush','{"id":"e9200000-0000-4000-8000-000000000002","revision":6,"enabled":false}',gen_random_uuid(),'c2222222-2222-2222-2222-222222222222')$$,'42501','forbidden','Order operations cannot cross branches');
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000002","name":"Grill","active":false,"revision":1}')$$,'Deactivate station');
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000003","name":"Bar","active":false,"revision":1}')$$,'Deactivate second item station');
SELECT lives_ok($$SELECT pg_temp.submit('e9200000-0000-4000-8000-000000000003')$$,'Inactive item routes fall back to category');
SELECT is((SELECT station_id FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000003'),'e9100000-0000-4000-8000-000000000001'::uuid,'Active category receives future order');
SELECT lives_ok($$SELECT pg_temp.op('station','{"id":"e9100000-0000-4000-8000-000000000001","name":"Cold prep","active":false,"revision":1}')$$,'Deactivate category station');
SELECT lives_ok($$SELECT pg_temp.submit('e9200000-0000-4000-8000-000000000004')$$,'Unmapped order remains operable');
SELECT ok((SELECT station_id IS NULL FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000004'),'No active match yields unassigned task');
SELECT is((SELECT count(*)::integer FROM order_item_tasks WHERE order_id='e9200000-0000-4000-8000-000000000002'),2,'Deactivation preserves historical tasks');
SELECT lives_ok($$SELECT pg_temp.op('table_state','{"id":"e9400000-0000-4000-8000-000000000001","revision":4,"state":"available"}')$$,'Empty table released');
-- Attach a validated fixture table as owner to exercise the same occupancy trigger as the QR wrapper.
RESET ROLE;
UPDATE orders SET table_id='e9400000-0000-4000-8000-000000000001',table_name='Operations table',table_area=''
WHERE id='e9200000-0000-4000-8000-000000000004';
SET LOCAL ROLE authenticated;
SELECT is((SELECT operational_state FROM restaurant_tables WHERE id='e9400000-0000-4000-8000-000000000001'),'occupied','Dine-in linkage marks available table occupied');
SELECT throws_ok($$SELECT pg_temp.op('table_state',(SELECT jsonb_build_object('id',id,'revision',revision,'state','available') FROM restaurant_tables WHERE id='e9400000-0000-4000-8000-000000000001'))$$,'40001','conflict','Active order prevents table release');
SELECT set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM kitchen_stations WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),0,'Cross-tenant station RLS');
SELECT throws_ok($$SELECT restaurant_operations_context('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111')$$,'42501','forbidden','Cross-tenant context denied');
SELECT is((SELECT count(*)::integer FROM printer_events WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),0,'Printer events tenant-isolated');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
