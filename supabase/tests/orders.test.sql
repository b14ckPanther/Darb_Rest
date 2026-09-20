BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(34);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('e5000000-0000-4000-8000-000000000001','order-staff@db.example','{}'),
 ('e5000000-0000-4000-8000-000000000002','order-reader@db.example','{}'),
 ('e5000000-0000-4000-8000-000000000003','order-other@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
 ('e5000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff'),
 ('e5000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','read_only'),
 ('e5000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','staff');
CREATE FUNCTION pg_temp.order_test(lines jsonb,total bigint,oid uuid DEFAULT 'e5100000-0000-4000-8000-000000000001',rev integer DEFAULT 0,submit boolean DEFAULT false)
RETURNS public.orders LANGUAGE sql AS $$
 SELECT public.save_order(oid,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111',lines,'Local test','','dine_in',total,rev,submit);
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',4400)$$,'Persist validated draft');
SELECT is((SELECT subtotal_cents FROM orders WHERE id='e5100000-0000-4000-8000-000000000001'),4400::bigint,'Variant plus modifier multiplied by quantity');
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000001","variant_id":null,"modifier_ids":[],"quantity":1}]',1,'e5100000-0000-4000-8000-000000000002')$$,'22023','price_changed','Tampered total rejected');
SELECT is((SELECT count(*)::integer FROM orders WHERE id='e5100000-0000-4000-8000-000000000002'),0,'Rejected total leaves no partial order');
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":null,"modifier_ids":[],"quantity":1}]',1500,'e5100000-0000-4000-8000-000000000002')$$,'22023','invalid_variant','Required variant enforced');
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":[],"quantity":1}]',1500,'e5100000-0000-4000-8000-000000000002')$$,'22023','invalid_modifiers','Required modifier enforced');
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":["d5000000-0000-4000-8000-000000000001","d5000000-0000-4000-8000-000000000002"],"quantity":1}]',1800,'e5100000-0000-4000-8000-000000000002')$$,'22023','invalid_modifiers','Maximum modifier enforced');
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000003","variant_id":null,"modifier_ids":[],"quantity":1}]',4800,'e5100000-0000-4000-8000-000000000002')$$,'22023','unavailable','Draft menu cannot be ordered');
SELECT lives_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',4400,'e5100000-0000-4000-8000-000000000001',1,true)$$,'Draft submits with current pricing');
SELECT lives_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',4400,'e5100000-0000-4000-8000-000000000001',1,true)$$,'Retry does not create another order');
SELECT is((SELECT count(*)::integer FROM order_items WHERE order_id='e5100000-0000-4000-8000-000000000001'),1,'Retry preserves one snapshot line');
SELECT throws_ok($$UPDATE orders SET subtotal_cents=1 WHERE id='e5100000-0000-4000-8000-000000000001'$$,'42501',NULL,'Direct total mutation denied');
SELECT lives_ok($$SELECT transition_order('e5100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',2,'accepted')$$,'Staff accepts submitted order');
SELECT throws_ok($$SELECT transition_order('e5100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,'completed')$$,'22023','invalid_transition','Cannot skip preparation states');
SELECT set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM orders WHERE id='e5100000-0000-4000-8000-000000000001'),0,'Other tenant cannot read order');
SELECT is((SELECT count(*)::integer FROM order_items WHERE order_id='e5100000-0000-4000-8000-000000000001'),0,'Other tenant cannot read snapshots');
SELECT throws_ok($$SELECT transition_order('e5100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,'preparing')$$,'42501','forbidden','Other tenant cannot update order');
SELECT set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT transition_order('e5100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,'preparing')$$,'42501','forbidden','Read-only cannot update status');
RESET ROLE;
UPDATE menu_items SET name_i18n='{"en":"Changed name"}',base_price=99 WHERE id='d2000000-0000-4000-8000-000000000002';
SELECT is((SELECT name_i18n->>'en' FROM order_items WHERE order_id='e5100000-0000-4000-8000-000000000001'),'House latte','Historical item name is immutable');
SELECT is((SELECT line_total_cents FROM order_items WHERE order_id='e5100000-0000-4000-8000-000000000001'),4400::bigint,'Historical price is immutable');
INSERT INTO menu_item_location_overrides(business_id,item_id,location_id,price_override) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','c1111111-1111-1111-1111-111111111111',12.5);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000001","variant_id":null,"modifier_ids":[],"quantity":2}]',2500,'e5100000-0000-4000-8000-000000000003')$$,'Branch price overrides base');
RESET ROLE;
UPDATE menu_item_location_overrides SET is_available_override=false WHERE item_id='d2000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000001","variant_id":null,"modifier_ids":[],"quantity":2}]',2500,'e5100000-0000-4000-8000-000000000004')$$,'22023','unavailable','Branch unavailable rejected');
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM orders$$,'42501',NULL,'Anonymous cannot read customer data');
SELECT throws_ok($$SELECT public_order_menu('darb-bistro','haifa-port')$$,'42501',NULL,'Anonymous has no raw public database gateway');
RESET ROLE;
SELECT ok((SELECT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public_order_menu('darb-bistro','haifa-port')->'content'->'menus') m WHERE m->>'status'<>'active')),'Public projection excludes draft menus');

SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT save_guest_order(
 'e5900000-0000-4000-8000-000000000001','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":["d5000000-0000-4000-8000-000000000001"],"quantity":1}]',
 'Guest test','','dine_in',1500,0,false,repeat('a',64))$$,'Guest draft persists without an account');
SELECT throws_ok($$SELECT save_guest_order(
 'e5900000-0000-4000-8000-000000000001','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":["d5000000-0000-4000-8000-000000000001"],"quantity":1}]',
 'Guest test','','dine_in',1500,1,false,repeat('b',64))$$,'42501','forbidden','Different guest cannot hijack known order ID');
SELECT is((SELECT created_by::text FROM orders WHERE id='e5900000-0000-4000-8000-000000000001'),NULL::text,'Guest creates no auth account');
SELECT lives_ok($$SELECT save_guest_order('e5900000-0000-4000-8000-000000000001','darb-bistro','haifa-port','[]','Guest test','','dine_in',0,1,false,repeat('a',64))$$,'Removing last item can persist an empty draft');
SELECT throws_ok($$SELECT save_guest_order('e5900000-0000-4000-8000-000000000001','darb-bistro','haifa-port','[]','Guest test','','dine_in',0,2,true,repeat('a',64))$$,'22023','invalid_cart','Empty draft cannot submit');
RESET ROLE;

UPDATE menu_items SET is_visible=false WHERE id='d2000000-0000-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":["d5000000-0000-4000-8000-000000000001"],"quantity":1}]',1500,'e5100000-0000-4000-8000-000000000006')$$,'22023','unavailable','Hidden item cannot submit');
RESET ROLE;
SELECT ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public_order_menu('darb-bistro','haifa-port')->'content'->'menu_items') i WHERE i->>'id'='d2000000-0000-4000-8000-000000000002'),'Hidden item never reaches public projection');
UPDATE menu_items SET is_visible=true WHERE id='d2000000-0000-4000-8000-000000000002';
UPDATE modifiers SET is_available=false WHERE id='d5000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT pg_temp.order_test('[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000001","modifier_ids":["d5000000-0000-4000-8000-000000000001"],"quantity":1}]',1500,'e5100000-0000-4000-8000-000000000006')$$,'22023','invalid_modifiers','Unavailable option cannot be selected');
SELECT throws_ok($$SELECT save_order('e5100000-0000-4000-8000-000000000006','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c3333333-3333-3333-3333-333333333333','[{"item_id":"d2000000-0000-4000-8000-000000000001","variant_id":null,"modifier_ids":[],"quantity":1}]','Test','','dine_in',3200,0,true)$$,'22023','unavailable','Foreign tenant branch cannot receive order');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
