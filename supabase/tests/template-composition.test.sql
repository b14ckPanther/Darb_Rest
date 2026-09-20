-- Requires operator-applied migration 12; local tests roll back all fixture changes.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('ea000000-0000-4000-8000-000000000001','composition-admin@db.example','{}'),
('ea000000-0000-4000-8000-000000000002','composition-staff@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
('ea000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','admin'),
('ea000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff');
-- Isolate test state; the transaction rolls back any existing local appearance.
DELETE FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
CREATE FUNCTION pg_temp.settings(t text DEFAULT 'signature') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('template',t,'version',1,'primary','#ffffff','accent','#123456','logo','','cover','','coverVideo','','density','balanced','images',true);
$$;
CREATE FUNCTION pg_temp.layout() RETURNS jsonb LANGUAGE sql AS $$
 SELECT '{"hero":"compact","focal":"top","navigation":"index","cards":"square","information":"after","cta":"outline","footer":"contact","surface":"ivory"}'::jsonb;
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',0,pg_temp.settings(),false),1,'Admin saves first draft');
SELECT ok((SELECT published IS NULL FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'Draft does not publish');
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1,pg_temp.settings('editorial'),true),2,'Publish atomically replaces snapshot');
SELECT is((SELECT published->>'template' FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'editorial','Published template persists');
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',2,pg_temp.settings('night'),false),3,'Save another draft');
SELECT is((SELECT published->>'template' FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'editorial','Draft changes remain private');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1,pg_temp.settings(),true)$$,'40001','conflict','Stale revision rejected');
SELECT throws_ok($$SELECT save_restaurant_appearance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',0,pg_temp.settings(),true)$$,'42501','forbidden','Cross tenant publication denied');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,pg_temp.settings()||'{"css":"unsafe"}',true)$$,'22023','invalid_settings','Arbitrary CSS denied');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,pg_temp.settings()||'{"cover":"javascript:alert(1)"}',true)$$,'22023','invalid_settings','Unsafe media denied');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,pg_temp.settings()||'{"primary":"red"}',true)$$,'22023','invalid_settings','Unsafe color denied');
SELECT throws_ok($$UPDATE restaurant_appearance SET published='{}'$$,'42501',NULL,'Direct publication forbidden');
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()),false),4,'Bounded layout draft persists');
SELECT ok((SELECT NOT(published ? 'layout') FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'Layout draft does not leak into published snapshot');
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',4,pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()),true),5,'Layout publishes atomically');
SELECT is((SELECT published FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()),'All palette and composition options persist in published snapshot');
SELECT is((SELECT draft FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()),'All palette and composition options persist in draft snapshot');
SELECT is((SELECT published->'layout'->>'focal' FROM restaurant_appearance WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'top','Focal choice retained');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',5,pg_temp.settings()||'{"layout":{}}',true)$$,'22023','invalid_settings','Partial controls rejected');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',5,pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()||'{"css":"unsafe"}'),true)$$,'22023','invalid_settings','Nested arbitrary CSS denied');
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',5,pg_temp.settings()||jsonb_build_object('layout',pg_temp.layout()||'{"hero":"9000px"}'),true)$$,'22023','invalid_settings','Unbounded hero rejected');
SELECT is(save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',5,pg_temp.settings(),true),6,'Legacy snapshot remains valid after composed appearance');
SELECT set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT save_restaurant_appearance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,pg_temp.settings(),true)$$,'42501','forbidden','Staff cannot publish');
SELECT is((SELECT count(*)::integer FROM restaurant_appearance),0,'Staff cannot inspect draft settings');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
