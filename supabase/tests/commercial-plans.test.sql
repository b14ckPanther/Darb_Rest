-- Local-only test, after operator applies migration 16. Everything rolls back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,email) VALUES
 ('ec160000-0000-4000-8000-000000000001','commercial-admin@qa.example'),
 ('ec160000-0000-4000-8000-000000000002','commercial-tenant@qa.example');
INSERT INTO platform_admins(user_id) VALUES ('ec160000-0000-4000-8000-000000000001');
SELECT is((SELECT count(*)::integer FROM plans WHERE code='enterprise'),0,'Legacy code is absent');
SELECT is((SELECT count(*)::integer FROM plans WHERE code IN ('starter','pro','business')),3,'Exactly three canonical plans');
SELECT ok((SELECT bool_and(enabled) FROM plan_entitlements WHERE plan_id=(SELECT id FROM plans WHERE code='starter') AND feature_key IN ('custom_branding','menu_templates')),'Starter includes full branding and templates');
SELECT ok((SELECT bool_and(NOT enabled) FROM plan_entitlements WHERE plan_id=(SELECT id FROM plans WHERE code='starter') AND feature_key IN ('cart','whatsapp_ordering','reservation_requests')),'Starter excludes Pro actions');
SELECT ok((SELECT bool_and(enabled) FROM plan_entitlements WHERE plan_id=(SELECT id FROM plans WHERE code='pro') AND feature_key IN ('cart','whatsapp_ordering','reservation_requests')),'Pro includes lightweight actions');
SELECT ok(NOT EXISTS(SELECT 1 FROM plan_entitlements e JOIN plans p ON p.id=e.plan_id WHERE p.code IN ('starter','pro','business') AND e.feature_key IN ('online_ordering','online_payments','table_ordering','takeaway','advanced_analytics','custom_domains','inventory_tracking') AND e.enabled),'Dormant capabilities are not plan grants');
-- Arbitrary test prices, deliberately unrelated to launch defaults.
UPDATE plans SET monthly_price_ils=137.25,yearly_price_ils=987.65,is_active=true WHERE code='starter';
SET LOCAL ROLE anon;
SELECT is((SELECT (p->>'monthly_price_ils')::numeric FROM jsonb_array_elements(public_commercial_plans()) p WHERE p->>'code'='starter'),137.25::numeric,'Public monthly price follows DB');
SELECT is((SELECT (p->>'yearly_price_ils')::numeric FROM jsonb_array_elements(public_commercial_plans()) p WHERE p->>'code'='starter'),987.65::numeric,'Yearly price is independent');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','ec160000-0000-4000-8000-000000000002',true);
UPDATE plans SET monthly_price_ils=1 WHERE code='starter';
SELECT is((SELECT monthly_price_ils FROM plans WHERE code='starter'),137.25::numeric,'Tenant cannot edit pricing');
SELECT set_config('request.jwt.claim.sub','ec160000-0000-4000-8000-000000000001',true);
UPDATE plans SET monthly_price_ils=211.15,yearly_price_ils=1789.35,price_is_starting=true,display_order=7 WHERE code='starter';
SELECT is((SELECT monthly_price_ils FROM plans WHERE code='starter'),211.15::numeric,'Platform admin can edit pricing');
SELECT throws_ok($$UPDATE plans SET yearly_price_ils=-1 WHERE code='starter'$$,'23514',NULL,'Negative pricing rejected');
UPDATE plans SET is_active=false WHERE code='starter';
RESET ROLE;
SET LOCAL ROLE anon;
SELECT ok(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public_commercial_plans()) p WHERE p->>'code'='starter'),'Inactive plans excluded publicly');
SELECT ok(has_function_privilege('anon','public.public_commercial_plans()','EXECUTE'),'Anonymous can read safe catalog');
SELECT ok(NOT has_function_privilege('anon','public.submit_restaurant_application(jsonb)','EXECUTE'),'Anonymous cannot bypass submission protection');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT submit_restaurant_application('{"kind":"application","requested_plan_code":"starter"}')$$,'22023','inactive_or_invalid_plan','Stale plan rejected by persistence');
SELECT throws_ok($$SELECT submit_restaurant_application('{"kind":"application","requested_plan_code":"enterprise"}')$$,'22023','inactive_or_invalid_plan','Legacy plan rejected');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
