-- Run only after the operator applies migration 13. All fixtures roll back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email) VALUES ('eb000000-0000-4000-8000-000000000001','analytics@db.example'),('eb000000-0000-4000-8000-000000000002','analytics-staff@db.example');
INSERT INTO memberships(user_id,business_id,role) VALUES ('eb000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','read_only'),('eb000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','staff');
UPDATE businesses SET timezone='Asia/Jerusalem' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
INSERT INTO orders(id,business_id,location_id,status,fulfillment_mode,customer_name,currency,subtotal_cents,cart,submitted_at,prep_started_at,ready_at,completed_at,accepted_at) VALUES
('eb100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','completed','dine_in','Analytics fixture','ILS',3200,'[]','2001-01-01 22:15Z','2001-01-01 22:20Z','2001-01-01 22:30Z','2001-01-01 22:45Z','2001-01-01 22:16Z'),
('eb100000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','cancelled','takeaway','Analytics fixture','ILS',5000,'[]','2001-01-01 22:40Z',NULL,NULL,NULL,NULL),
('eb100000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','draft','dine_in','Analytics fixture','ILS',7000,'[]',NULL,NULL,NULL,NULL,NULL);
INSERT INTO payments(order_id,business_id,method,provider,amount_cents,currency,status) VALUES ('eb100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','restaurant','restaurant',3200,'ILS','paid'),('eb100000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','online','local',5000,'ILS','failed');
INSERT INTO order_items(order_id,business_id,item_id,name_i18n,quantity,base_unit_cents,modifier_unit_cents,line_total_cents,sort_order) VALUES ('eb100000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','{"en":"Snapshot"}',2,1500,100,3200,0);
INSERT INTO restaurant_operation_history(id,business_id,location_id,action,target_id,payload) VALUES (gen_random_uuid(),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','order_status','eb100000-0000-4000-8000-000000000002','{"from":"submitted","to":"cancelled"}');
INSERT INTO orders(id,business_id,location_id,status,fulfillment_mode,customer_name,currency,subtotal_cents,cart,submitted_at) VALUES
('eb100000-0000-4000-8000-000000000004','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c2222222-2222-2222-2222-222222222222','submitted','takeaway','Analytics fixture','USD',1000,'[]','2001-01-03 12:00Z'),
('eb100000-0000-4000-8000-000000000005','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','c1111111-1111-1111-1111-111111111111','submitted','dine_in','Analytics fixture','ILS',2000,'[]','2001-01-03 12:00Z');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eb000000-0000-4000-8000-000000000001',true);
CREATE FUNCTION pg_temp.report() RETURNS jsonb LANGUAGE sql AS $$ SELECT restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-02','2001-01-02'); $$;
CREATE FUNCTION pg_temp.summary() RETURNS jsonb LANGUAGE sql AS $$ SELECT r FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='summary'; $$;
SELECT is((pg_temp.summary()->>'orders')::int,2,'Business timezone boundaries include two submitted orders, not draft');
SELECT is((pg_temp.summary()->>'value_cents')::int,3200,'Cancelled value excluded');
SELECT is((pg_temp.summary()->>'paid_cents')::int,3200,'Only paid transactions collected');
SELECT is((pg_temp.summary()->>'cancelled')::int,1,'Cancellation count');
SELECT is((pg_temp.summary()->>'rejected')::int,1,'Cancellation before recorded acceptance');
SELECT is((pg_temp.summary()->>'prep_minutes')::numeric,10::numeric,'Preparation interval');
SELECT is((pg_temp.summary()->>'lifecycle_minutes')::numeric,30::numeric,'Completed lifecycle');
SELECT is((pg_temp.summary()->>'prep_samples')::int,1,'Missing timestamps excluded');
SELECT is((pg_temp.report()->'items'->0->>'quantity')::int,2,'Snapshot item quantity');
SELECT is((pg_temp.report()->'items'->0->>'value_cents')::int,3200,'Snapshot includes modifiers without join fanout');
SELECT is(jsonb_array_length(restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-01','2001-01-01')->'rows'),0,'Previous local day empty');
SELECT throws_ok($$SELECT restaurant_analytics('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','2001-01-02','2001-01-02')$$,'42501','forbidden','Foreign business denied');
SELECT throws_ok($$SELECT restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-02','2001-01-02','ffffffff-ffff-4fff-8fff-ffffffffffff')$$,'42501','forbidden','Foreign branch denied');
SELECT throws_ok($$SELECT restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-02','2000-01-02')$$,'22023','invalid_range','Invalid range denied');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-03','2001-01-03')->'rows') r WHERE r->>'kind'='summary'),2,'Currencies remain separate');
SELECT is((SELECT sum((r->>'orders')::int)::int FROM jsonb_array_elements(restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-03','2001-01-03','c1111111-1111-1111-1111-111111111111')->'rows') r WHERE r->>'kind'='summary'),1,'Branch filter excludes sibling orders');
SELECT is((SELECT r->>'currency' FROM jsonb_array_elements(restaurant_analytics('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','2001-01-03','2001-01-03','c2222222-2222-2222-2222-222222222222')->'rows') r WHERE r->>'kind'='summary'),'USD','Sibling branch has its own currency cohort');
SELECT is((SELECT (r->>'orders')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='payments' AND r->>'key'='failed'),1,'Failed payment breakdown');
SELECT is((SELECT (r->>'orders')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='methods' AND r->>'key'='restaurant'),1,'Restaurant payment method is separate from payment status');
SELECT is((SELECT (r->>'orders')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='fulfillment' AND r->>'key'='takeaway'),1,'Takeaway counted separately');
SELECT is((SELECT sum((r->>'orders')::int)::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='tables'),1,'Takeaway never contributes to table activity');
SELECT is((SELECT (r->>'orders')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='hours' AND r->>'key'='00'),2,'Busy hours use local midnight rather than UTC hour');
SELECT is((SELECT (r->>'orders')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='days' AND r->>'key'='2'),2,'Busy days use local Tuesday');
SELECT is((SELECT (r->>'value_cents')::int FROM jsonb_array_elements(pg_temp.report()->'rows') r WHERE r->>'kind'='branches' AND r->>'key'='c1111111-1111-1111-1111-111111111111'),3200,'Branch comparison excludes cancelled value');
SELECT is((pg_temp.summary()->>'cancelled')::numeric/(pg_temp.summary()->>'orders')::numeric,0.5::numeric,'Cancellation rate denominator includes all submitted orders');
SELECT is((pg_temp.summary()->>'rejected')::numeric/(pg_temp.summary()->>'orders')::numeric,0.5::numeric,'Audited rejection rate');
SELECT set_config('request.jwt.claim.sub','eb000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT pg_temp.report()$$,'42501','forbidden','Staff denied');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
