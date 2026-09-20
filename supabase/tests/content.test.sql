BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public,extensions;
SELECT plan(18);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('e0000000-0000-4000-8000-000000000001','editor@phase4-db.example','{"full_name":"Test editor"}'),
 ('e0000000-0000-4000-8000-000000000002','reader@phase4-db.example','{"full_name":"Test reader"}'),
 ('e0000000-0000-4000-8000-000000000003','staff@phase4-db.example','{"full_name":"Test staff"}');
INSERT INTO memberships(user_id,business_id,role) VALUES
 ('e0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','editor'),
 ('e0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','read_only'),
 ('e0000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff');
INSERT INTO menus(id,business_id,name_i18n) VALUES('e1000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','{"en":"Private other business"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e0000000-0000-4000-8000-000000000001',true);
SELECT is((SELECT count(*)::integer FROM menus WHERE business_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),0,'Other tenant content is invisible');
SELECT lives_ok($$INSERT INTO menus(business_id,name_i18n) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"he":"תפריט בדיקה"}')$$,'Editor creates own menu');
SELECT throws_ok($$INSERT INTO menus(business_id,name_i18n) VALUES('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','{"en":"Attack"}')$$,'42501',NULL,'Editor cannot create other tenant menu');
SELECT throws_ok($$INSERT INTO menu_locations(business_id,menu_id,location_id) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d0000000-0000-4000-8000-000000000001','c3333333-3333-3333-3333-333333333333')$$,'23503',NULL,'Assignment rejects cross-tenant branch');
SELECT throws_ok($$INSERT INTO menu_item_location_overrides(business_id,item_id,location_id,price_override) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','c3333333-3333-3333-3333-333333333333',10)$$,'23503',NULL,'Override rejects cross-tenant branch');
SELECT ok(can_access_menu_media('businesses/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/menu-items/d2000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001.webp',true),'Editor media path permitted');
SELECT ok(NOT can_access_menu_media('businesses/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/menu-items/d2000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001.webp',true),'Cross-tenant media path denied');
SELECT throws_ok($$INSERT INTO memberships(user_id,business_id,role) VALUES('e0000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','owner')$$,'42501',NULL,'Cannot self-enroll as another tenant owner');

SELECT throws_ok($$SELECT save_menu_content('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','[
 {"table":"menus","row":{"id":"e9000000-0000-4000-8000-000000000001","name_i18n":{"en":"Must roll back"}}},
 {"table":"menu_locations","row":{"id":"e9000000-0000-4000-8000-000000000002","menu_id":"e9000000-0000-4000-8000-000000000001","location_id":"c3333333-3333-3333-3333-333333333333"}}
]')$$,'23503',NULL,'Invalid child rolls back whole content batch');
SELECT is((SELECT count(*)::integer FROM menus WHERE id='e9000000-0000-4000-8000-000000000001'),0,'No partial menu after failed batch');
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name) VALUES('menu-media','businesses/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/menu-items/d2000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001.webp')$$,'42501',NULL,'Storage policy denies foreign tenant upload');
SELECT throws_ok($$SELECT save_menu_content('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','[{"table":"menus","delete":true,"id":"d0000000-0000-4000-8000-000000000001"}]')$$,'P0001',NULL,'Important content cannot be hard deleted through RPC');

SELECT throws_ok($$DELETE FROM menus WHERE id='d0000000-0000-4000-8000-000000000001'$$,'42501',NULL,'Direct API cannot delete menu history');
SELECT throws_ok($$DO $test$ BEGIN
 UPDATE modifier_groups SET min_select=3,max_select=3,is_required=true WHERE id='d4000000-0000-4000-8000-000000000001';
 SET CONSTRAINTS ALL IMMEDIATE;
 END $test$;$$,'23514',NULL,'Deferred constraint rejects impossible modifier capacity');
SELECT set_config('request.jwt.claim.sub','e0000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$INSERT INTO menus(business_id,name_i18n) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"en":"Read only attack"}')$$,'42501',NULL,'Read-only cannot write');
SELECT throws_ok($$SELECT set_menu_item_availability('d2000000-0000-4000-8000-000000000001',false)$$,'42501',NULL,'Read-only cannot change availability');
SELECT set_config('request.jwt.claim.sub','e0000000-0000-4000-8000-000000000003',true);
SELECT lives_ok($$SELECT set_menu_item_availability('d2000000-0000-4000-8000-000000000001',false)$$,'Staff can change availability');
SELECT throws_ok($$SELECT save_menu_content('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','[]')$$,'42501',NULL,'Staff cannot edit menu structure');
SELECT * FROM finish();
ROLLBACK;
