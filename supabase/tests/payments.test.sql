BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(35);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('e6000000-0000-4000-8000-000000000001','payment-staff@db.example','{}'),
 ('e6000000-0000-4000-8000-000000000002','payment-other@db.example','{}');
INSERT INTO memberships(user_id,business_id,role) VALUES
 ('e6000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff'),
 ('e6000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','staff');
CREATE FUNCTION pg_temp.checkout(total bigint DEFAULT 4400, method text DEFAULT 'online', token text DEFAULT repeat('a',64)) RETURNS public.payments LANGUAGE sql AS $$
 SELECT checkout_guest_order('e6100000-0000-4000-8000-000000000001','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',
 'Payment guest','','dine_in',total,0,token,method,CASE WHEN method='online' THEN 'local-test' ELSE 'restaurant' END);
$$;
CREATE FUNCTION pg_temp.event(eid text,state text,total bigint DEFAULT 4400,cur text DEFAULT 'ILS',hash text DEFAULT repeat('a',64)) RETURNS public.payments LANGUAGE sql AS $$
 SELECT apply_payment_event(id,'local-test','test_'||id::text,eid,hash,state,total,cur) FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001';
$$;
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT pg_temp.checkout(1)$$,'22023','price_changed','Tampered total rejected');
SELECT is((SELECT count(*)::integer FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),0,'No payment after rejected cart');
SELECT lives_ok($$SELECT pg_temp.checkout()$$,'Checkout creates validated order and payment atomically');
SELECT is((SELECT amount_cents FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),4400::bigint,'Payment amount is server order amount');
SELECT lives_ok($$SELECT pg_temp.checkout()$$,'Duplicate submission succeeds idempotently');
SELECT is((SELECT count(*)::integer FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),1,'Only one payment intent exists');
SELECT throws_ok($$SELECT pg_temp.checkout(4400,'restaurant')$$,'22023','payment_conflict','Cannot switch payment method on submitted order');
SELECT throws_ok($$SELECT pg_temp.checkout(4400,'online',repeat('b',64))$$,'42501','forbidden','Another guest cannot reuse checkout');
SELECT lives_ok($$SELECT attach_payment_reference(id,'local-test','test_'||id::text) FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'$$,'Attach stable provider reference');
SELECT throws_ok($$SELECT pg_temp.event('bad-total','paid',1)$$,'22023','invalid_payment','Callback amount mismatch rejected');
SELECT throws_ok($$SELECT pg_temp.event('bad-currency','paid',4400,'USD')$$,'22023','invalid_payment','Callback currency mismatch rejected');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT transition_order('e6100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1,'accepted')$$,'22023','payment_required','Unpaid online order cannot enter preparation');
SELECT is((SELECT count(*)::integer FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),1,'Same tenant can read payment');
SELECT throws_ok($$UPDATE payments SET status='paid'$$,'42501',NULL,'Direct authenticated payment writes forbidden');
SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::integer FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),0,'Other tenant cannot read payment');
SELECT throws_ok($$SELECT apply_payment_event(gen_random_uuid(),'local-test','x','e',repeat('a',64),'paid',4400,'ILS')$$,'42501',NULL,'Authenticated user cannot forge callback RPC');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT pg_temp.event('event-1','authorized')$$,'Authorization callback applied');
SELECT lives_ok($$SELECT pg_temp.event('event-2','paid')$$,'Paid callback applied');
SELECT lives_ok($$SELECT pg_temp.event('event-2','paid')$$,'Duplicate callback acknowledged');
SELECT is((SELECT count(*)::integer FROM payment_events WHERE payment_id IN (SELECT id FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001')),2,'Duplicate callback has one event record');
SELECT throws_ok($$SELECT pg_temp.event('event-2','paid',4400,'ILS',repeat('b',64))$$,'22023','payment_conflict','Reused event ID with altered payload rejected');
SELECT lives_ok($$SELECT pg_temp.event('event-3','failed')$$,'Late failure recorded safely');
SELECT is((SELECT status FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),'paid','Late failure cannot downgrade a paid payment');
SELECT lives_ok($$SELECT pg_temp.event('event-4','refunded')$$,'Full refund callback accepted');
SELECT is((SELECT status FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),'refunded','Refund state persisted');
SELECT lives_ok($$SELECT pg_temp.event('late-paid','paid')$$,'Late capture event is acknowledged after refund');
SELECT is((SELECT status FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),'refunded','Refund cannot regress to paid');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'$$,'42501',NULL,'Anonymous cannot read payments');
SELECT throws_ok($$SELECT * FROM payment_events$$,'42501',NULL,'Anonymous cannot read callback records');
RESET ROLE;
SELECT checkout_guest_order('e6100000-0000-4000-8000-000000000002','darb-bistro','haifa-port',
 '[{"item_id":"d2000000-0000-4000-8000-000000000002","variant_id":"d3000000-0000-4000-8000-000000000002","modifier_ids":["d5000000-0000-4000-8000-000000000002"],"quantity":2}]',
 'Cash guest','','dine_in',4400,0,repeat('c',64),'restaurant','restaurant');
CREATE FUNCTION pg_temp.record_cash() RETURNS void LANGUAGE sql AS $$
 SELECT record_restaurant_payment(id,business_id,revision) FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000002';
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT pg_temp.record_cash()$$,'Staff can acknowledge restaurant payment');
SELECT lives_ok($$SELECT pg_temp.record_cash()$$,'Restaurant acknowledgment is idempotent');
SELECT is((SELECT status FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000002'),'paid','Restaurant payment is recorded');
SELECT is((SELECT recorded_by FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000002'),'e6000000-0000-4000-8000-000000000001'::uuid,'Manual collection has an actor');
SELECT throws_ok($$SELECT record_restaurant_payment((SELECT id FROM payments WHERE order_id='e6100000-0000-4000-8000-000000000001'),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1)$$,'42501','forbidden','Staff cannot manually mark online payment paid');
SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT record_restaurant_payment(gen_random_uuid(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1)$$,'42501','forbidden','Other tenant cannot acknowledge restaurant payment');
SELECT * FROM finish();
ROLLBACK;
