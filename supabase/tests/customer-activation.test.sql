-- Run locally only after the operator applies migration 18. No email/network calls.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('ec180000-0000-4000-8000-000000000001','billing-admin@qa.example',now()),
 ('ec180000-0000-4000-8000-000000000002','billing-customer@qa.example',now());
INSERT INTO platform_admins(user_id) VALUES('ec180000-0000-4000-8000-000000000001');
INSERT INTO restaurant_applications(id,kind,full_name,business_name,email,phone,city,business_type,branch_count,locale)
VALUES('ec180000-0000-4000-8000-000000000003','application','Test customer','Test cafe','billing-customer@qa.example','+972501111111','Test city','cafe',1,'en');
UPDATE plans SET monthly_price_ils=181.35,yearly_price_ils=1821.40,is_active=true WHERE code='pro';
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM platform_billing_settings$$,'42501',NULL,'Anonymous cannot read bank settings');
SELECT throws_ok($$SELECT approve_customer_application('ec180000-0000-4000-8000-000000000003',(SELECT id FROM plans WHERE code='pro'),'yearly',null,false)$$,'42501',NULL,'Anonymous cannot approve');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','ec180000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::integer FROM platform_billing_settings),0,'Tenant cannot read settings');
SELECT throws_ok($$SELECT approve_customer_application('ec180000-0000-4000-8000-000000000003',(SELECT id FROM plans WHERE code='pro'),'yearly',null,false)$$,'42501','forbidden','Tenant cannot approve');
SELECT set_config('request.jwt.claim.sub','ec180000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT approve_customer_application('ec180000-0000-4000-8000-000000000003',(SELECT id FROM plans WHERE code='pro'),'yearly',null,false)$$,'Platform approval');
SELECT is((SELECT agreed_amount_ils FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003'),1821.40::numeric,'Uses live yearly price');
SELECT matches((SELECT payment_reference FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003'),'^DR-[0-9]+$','Human readable reference');
SELECT is((SELECT count(*)::integer FROM customer_mail_outbox WHERE application_id='ec180000-0000-4000-8000-000000000003' AND kind='approval' AND state='queued'),1,'Approval queues email without claiming sent');
UPDATE plans SET yearly_price_ils=9999 WHERE code='pro';
SELECT is((SELECT agreed_amount_ils FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003'),1821.40::numeric,'Snapshot survives price changes');
SELECT throws_ok($$SELECT approve_customer_application('ec180000-0000-4000-8000-000000000003',(SELECT id FROM plans WHERE code='pro'),'monthly',null,false)$$,'40001','already_agreed','Duplicate approval rejected');
SELECT throws_ok($$SELECT confirm_customer_payment((SELECT id FROM manual_customer_payments WHERE agreement_id=(SELECT id FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003')),1,'bit','','')$$,'22023','invalid_payment','Partial amount cannot activate');
SELECT lives_ok($$SELECT confirm_customer_payment((SELECT id FROM manual_customer_payments WHERE agreement_id=(SELECT id FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003')),1821.40,'bit','test sender','test internal')$$,'Explicit payment confirmation');
SELECT throws_ok($$SELECT confirm_customer_payment((SELECT id FROM manual_customer_payments WHERE agreement_id=(SELECT id FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003')),1821.40,'bit','','')$$,'40001','already_confirmed_or_void','Duplicate payment confirmation rejected');
SELECT is((SELECT status FROM customer_subscriptions WHERE agreement_id=(SELECT id FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003')),NULL::text,'Payment alone creates no business/subscription');
RESET ROLE;
SELECT throws_ok($$UPDATE customer_agreements SET agreed_amount_ils=1$$,'22023','immutable_agreement','Agreement is immutable even for maintenance writes');
SELECT is((SELECT count(*)::integer FROM customer_commercial_audit WHERE record_table='manual_customer_payments' AND action='UPDATE' AND record_id=(SELECT id::text FROM manual_customer_payments WHERE agreement_id=(SELECT id FROM customer_agreements WHERE application_id='ec180000-0000-4000-8000-000000000003'))),1,'Payment action audited');
SELECT * FROM finish();
ROLLBACK;
