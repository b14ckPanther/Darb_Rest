BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('e8000000-0000-4000-8000-000000000001','kitchen-staff@db.example','{}'),
('e8000000-0000-4000-8000-000000000002','kitchen-reader@db.example','{}'),
('e8000000-0000-4000-8000-000000000003','kitchen-other@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
('e8000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff'),
('e8000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','read_only'),
('e8000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','staff');
INSERT INTO restaurant_tables(id,business_id,location_id,name) VALUES
('e8100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','Kitchen 8');
INSERT INTO orders(id,business_id,location_id,status,fulfillment_mode,customer_name,currency,subtotal_cents,cart,submitted_at) VALUES
('e8200000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','submitted','dine_in','KDS dine-in','ILS',3200,'[]',now()),
('e8200000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','submitted','takeaway','KDS takeaway','ILS',3200,'[]',now()),
('e8200000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c2222222-2222-2222-2222-222222222222','submitted','takeaway','Other branch','ILS',3200,'[]',now()),
('e8200000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','c3333333-3333-3333-3333-333333333333','submitted','takeaway','Other tenant','ILS',3200,'[]',now());
UPDATE orders SET table_id='e8100000-0000-4000-8000-000000000001',table_name='Kitchen 8',table_area='' WHERE id='e8200000-0000-4000-8000-000000000001';
CREATE FUNCTION pg_temp.feed() RETURNS jsonb LANGUAGE sql AS $$ SELECT kitchen_orders('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111'); $$;
CREATE FUNCTION pg_temp.op(target text,rev integer DEFAULT 1,aid uuid DEFAULT 'e8300000-0000-4000-8000-000000000001',reason text DEFAULT NULL,branch uuid DEFAULT 'c1111111-1111-1111-1111-111111111111',oid uuid DEFAULT 'e8200000-0000-4000-8000-000000000001') RETURNS void LANGUAGE sql AS $$
 SELECT operate_kitchen_order(aid,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',branch,oid,rev,target,reason);
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e8000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT pg_temp.feed()$$,'Staff can read kitchen');
SELECT ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pg_temp.feed()->'orders') o WHERE o->>'location_id'<>'c1111111-1111-1111-1111-111111111111'),'Only selected branch orders');
SELECT ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pg_temp.feed()->'orders') o WHERE o ? 'guest_token_hash' OR o ? 'customer_phone'),'No guest secrets or phone in kitchen projection');
SELECT is((SELECT o->>'table_name' FROM jsonb_array_elements(pg_temp.feed()->'orders') o WHERE o->>'id'='e8200000-0000-4000-8000-000000000001'),'Kitchen 8','Dine-in table snapshot visible');
SELECT is((SELECT o->>'table_name' FROM jsonb_array_elements(pg_temp.feed()->'orders') o WHERE o->>'id'='e8200000-0000-4000-8000-000000000002'),NULL::text,'Takeaway separate');
SELECT throws_ok($$SELECT pg_temp.op('ready')$$,'22023','invalid_transition','No impossible jump');
SELECT throws_ok($$SELECT pg_temp.op('accepted',1,gen_random_uuid(),NULL,'c2222222-2222-2222-2222-222222222222')$$,'42501','forbidden','Cannot mutate another branch order');
SELECT lives_ok($$SELECT pg_temp.op('accepted')$$,'Accept submitted');
SELECT lives_ok($$SELECT pg_temp.op('accepted')$$,'Exact operation replay is idempotent');
SELECT is((SELECT revision FROM orders WHERE id='e8200000-0000-4000-8000-000000000001'),2,'Replay does not increment revision');
SELECT throws_ok($$SELECT pg_temp.op('preparing',2)$$,'40001','conflict','Operation ID cannot change payload');
SELECT throws_ok($$SELECT pg_temp.op('preparing',1,gen_random_uuid())$$,'40001','conflict','Stale concurrent action rejected');
SELECT lives_ok($$SELECT pg_temp.op('preparing',2,'e8300000-0000-4000-8000-000000000002')$$,'Prepare accepted');
SELECT lives_ok($$SELECT pg_temp.op('ready',3,'e8300000-0000-4000-8000-000000000003')$$,'Ready after preparing');
SELECT lives_ok($$SELECT pg_temp.op('completed',4,'e8300000-0000-4000-8000-000000000004')$$,'Complete ready');
SELECT throws_ok($$SELECT pg_temp.op('cancelled',5,gen_random_uuid(),'Too late')$$,'22023','invalid_transition','Terminal status cannot cancel');
SELECT throws_ok($$SELECT pg_temp.op('cancelled',1,gen_random_uuid(),NULL,'c1111111-1111-1111-1111-111111111111','e8200000-0000-4000-8000-000000000002')$$,'22023','invalid_transition','Reason required');
SELECT lives_ok($$SELECT pg_temp.op('cancelled',1,gen_random_uuid(),'Sold out','c1111111-1111-1111-1111-111111111111','e8200000-0000-4000-8000-000000000002')$$,'Reject with reason');
SELECT is((SELECT cancellation_reason FROM orders WHERE id='e8200000-0000-4000-8000-000000000002'),'Sold out','Cancellation reason persisted');
SELECT ok(EXISTS(SELECT 1 FROM kitchen_signals WHERE location_id='c1111111-1111-1111-1111-111111111111' AND revision>1),'Changes update realtime signal');
SELECT throws_ok($$UPDATE kitchen_signals SET revision=0$$,'42501',NULL,'No direct client signal writes');
SELECT set_config('request.jwt.claim.sub','e8000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT pg_temp.feed()$$,'42501','forbidden','Read-only role excluded');
SELECT is((SELECT count(*)::integer FROM kitchen_signals),0,'Read-only cannot subscribe to signals');
SELECT set_config('request.jwt.claim.sub','e8000000-0000-4000-8000-000000000003',true);
SELECT throws_ok($$SELECT pg_temp.feed()$$,'42501','forbidden','Cross-tenant feed excluded');
SELECT throws_ok($$SELECT pg_temp.op('accepted')$$,'42501','forbidden','Cross-tenant replay excluded');
SELECT is((SELECT count(*)::integer FROM kitchen_signals WHERE business_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),0,'Cross-tenant signal RLS');
RESET ROLE;
SELECT ok(EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='kitchen_signals'),'Signals included in Realtime publication');
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT pg_temp.feed()$$,'42501',NULL,'Anonymous RPC forbidden');
SELECT * FROM finish();
ROLLBACK;
