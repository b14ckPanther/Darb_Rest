-- Run only after the operator applies migration 7 to the local test database.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(33);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('e7000000-0000-4000-8000-000000000001','table-manager@db.example','{}'),
 ('e7000000-0000-4000-8000-000000000002','table-other@db.example','{}'),
 ('e7000000-0000-4000-8000-000000000003','table-staff@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
 ('e7000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','manager'),
 ('e7000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','manager'),
 ('e7000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e7000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT manage_restaurant_table('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e7100000-0000-4000-8000-000000000001',0,'create','12','Patio',true)$$,'Manager creates scoped table');
SELECT ok((SELECT token ~ '^[a-f0-9]{64}$' FROM table_qr_tokens WHERE table_id='e7100000-0000-4000-8000-000000000001'),'QR has 256-bit token encoding');
SELECT throws_ok($$UPDATE restaurant_tables SET name='Spoof'$$,'42501',NULL,'Direct edits denied');
SELECT set_config('request.jwt.claim.sub','e7000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::integer FROM restaurant_tables),0,'Other tenant cannot read tables');
SELECT is((SELECT count(*)::integer FROM table_qr_tokens),0,'Other tenant cannot read QR capabilities');
SELECT throws_ok($$SELECT manage_restaurant_table('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e7100000-0000-4000-8000-000000000001',1,'revoke')$$,'42501','forbidden','Other tenant cannot revoke QR');
SELECT set_config('request.jwt.claim.sub','e7000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM table_qr_tokens),0,'Staff cannot read QR capabilities');
SELECT throws_ok($$SELECT manage_restaurant_table('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e7100000-0000-4000-8000-000000000001',1,'revoke')$$,'42501','forbidden','Staff cannot manage tables');
RESET ROLE;
CREATE TEMP TABLE original_qr AS SELECT token FROM table_qr_tokens WHERE table_id='e7100000-0000-4000-8000-000000000001';
CREATE FUNCTION pg_temp.save_table(oid uuid,mode text DEFAULT 'dine_in',tok text DEFAULT NULL,branch text DEFAULT 'haifa-port') RETURNS public.orders LANGUAGE sql AS $$
 SELECT save_table_guest_order(oid,'darb-bistro',branch,
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',
 'Table guest','+972501234567',mode,4400,0,true,repeat('a',64),tok);
$$;
SELECT is(resolve_table_qr((SELECT token FROM original_qr))->>'location_slug','haifa-port','QR resolves correct branch');
SELECT is(resolve_table_qr('1'),NULL::jsonb,'Predictable ID is not a QR capability');
SELECT lives_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000001','dine_in',(SELECT token FROM original_qr))$$,'Dine-in order validates QR');
SELECT is((SELECT table_id FROM orders WHERE id='e7200000-0000-4000-8000-000000000001'),'e7100000-0000-4000-8000-000000000001'::uuid,'Order linked to exact table');
SELECT is((SELECT table_name FROM orders WHERE id='e7200000-0000-4000-8000-000000000001'),'12','Table name snapshot saved');
SELECT lives_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000002','takeaway',(SELECT token FROM original_qr))$$,'Takeaway supported from QR');
SELECT is((SELECT table_id FROM orders WHERE id='e7200000-0000-4000-8000-000000000002'),NULL::uuid,'Takeaway carries no table');
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000003','dine_in',(SELECT token FROM original_qr),'akko-old-city')$$,'22023','invalid_table','Branch URL tampering rejected');
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000003','dine_in',repeat('f',64))$$,'22023','invalid_table','Unknown token rejected');
INSERT INTO restaurant_tables(id,business_id,location_id,name) VALUES
 ('e7100000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','c3333333-3333-3333-3333-333333333333','Other tenant'),
 ('e7100000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','Another table');
INSERT INTO table_qr_tokens(table_id,business_id,location_id,token) VALUES
 ('e7100000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','c3333333-3333-3333-3333-333333333333',repeat('b',64)),
 ('e7100000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111',repeat('c',64));
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000003','dine_in',repeat('b',64))$$,'22023','invalid_table','Another tenant QR cannot link an order');
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000001','dine_in',repeat('c',64))$$,'22023','table_conflict','Submitted table cannot be changed with another valid QR');
CREATE FUNCTION pg_temp.draft_table(mode text,rev integer) RETURNS public.orders LANGUAGE sql AS $$
 SELECT save_table_guest_order('e7200000-0000-4000-8000-000000000010','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]','Table guest','+972501234567',mode,4400,rev,false,repeat('a',64),(SELECT token FROM original_qr));
$$;
SELECT lives_ok($$SELECT pg_temp.draft_table('dine_in',0)$$,'Table draft saves');
SELECT lives_ok($$SELECT pg_temp.draft_table('takeaway',1)$$,'Table draft can switch to takeaway');
SELECT is((SELECT table_id FROM orders WHERE id='e7200000-0000-4000-8000-000000000010'),NULL::uuid,'Draft switch clears table linkage');
SELECT lives_ok($$SELECT checkout_table_guest_order('e7200000-0000-4000-8000-000000000011','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]','Table guest','+972501234567','dine_in',4400,0,repeat('a',64),'restaurant','restaurant',(SELECT token FROM original_qr))$$,'Table checkout reserves payment');
SELECT is((SELECT p.amount_cents FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.id='e7200000-0000-4000-8000-000000000011' AND o.table_id='e7100000-0000-4000-8000-000000000001'),4400::bigint,'Checkout retains table and authoritative payment amount');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e7000000-0000-4000-8000-000000000001',true);
-- Occupancy changes also increment revision; read the current version before QR management.
SELECT lives_ok($$SELECT manage_restaurant_table('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e7100000-0000-4000-8000-000000000001',(SELECT revision FROM restaurant_tables WHERE id='e7100000-0000-4000-8000-000000000001'),'regenerate')$$,'Manager regenerates token');
RESET ROLE;
SELECT is(resolve_table_qr((SELECT token FROM original_qr)),NULL::jsonb,'Regeneration invalidates old token');
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000003','dine_in',(SELECT token FROM original_qr))$$,'22023','invalid_table','Stale open cart cannot use rotated token');
UPDATE restaurant_tables SET name='Renamed',is_active=false WHERE id='e7100000-0000-4000-8000-000000000001';
SELECT is(resolve_table_qr((SELECT token FROM table_qr_tokens WHERE table_id='e7100000-0000-4000-8000-000000000001')),NULL::jsonb,'Inactive table cannot resolve');
SELECT throws_ok($$SELECT pg_temp.save_table('e7200000-0000-4000-8000-000000000020','dine_in',(SELECT token FROM table_qr_tokens WHERE table_id='e7100000-0000-4000-8000-000000000001'))$$,'22023','invalid_table','Inactive table cannot accept a stale cart');
SELECT is((SELECT table_name FROM orders WHERE id='e7200000-0000-4000-8000-000000000001'),'12','Historical table name survives rename');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT manage_restaurant_table('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','e7100000-0000-4000-8000-000000000001',(SELECT revision FROM restaurant_tables WHERE id='e7100000-0000-4000-8000-000000000001'),'archive')$$,'Archive preserves existing order linkage');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM table_qr_tokens WHERE table_id='e7100000-0000-4000-8000-000000000001'),0,'Archive revokes token');
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT resolve_table_qr(repeat('a',64))$$,'42501',NULL,'Anonymous cannot call raw database QR gateway');
SELECT * FROM finish();
ROLLBACK;
