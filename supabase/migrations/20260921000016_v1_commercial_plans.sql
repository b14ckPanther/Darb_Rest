-- V1 commercial configuration. Apply manually; deploy the matching v1 application afterward.
-- Historical operational tables and data are deliberately preserved.
BEGIN;

-- Never silently merge two independently configured commercial plans.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.plans WHERE code = 'enterprise')
     AND EXISTS (SELECT 1 FROM public.plans WHERE code = 'business') THEN
    RAISE EXCEPTION 'Both enterprise and business exist; reconcile their ownership before applying migration 16';
  END IF;
END $$;
UPDATE public.plans SET code = 'business' WHERE code = 'enterprise';

ALTER TABLE public.plans
  ADD COLUMN monthly_price_ils numeric(12,2),
  ADD COLUMN yearly_price_ils numeric(12,2),
  ADD COLUMN price_is_starting boolean NOT NULL DEFAULT false,
  ADD COLUMN display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN public_features jsonb NOT NULL DEFAULT '{"en":[],"ar":[],"he":[]}',
  ADD COLUMN billing_note jsonb NOT NULL DEFAULT '{"en":"","ar":"","he":""}',
  ADD CONSTRAINT plans_monthly_price_valid CHECK (monthly_price_ils >= 0 AND monthly_price_ils <> 'NaN'::numeric),
  ADD CONSTRAINT plans_yearly_price_valid CHECK (yearly_price_ils >= 0 AND yearly_price_ils <> 'NaN'::numeric),
  ADD CONSTRAINT plans_display_order_valid CHECK (display_order >= 0),
  ADD CONSTRAINT plans_public_features_valid CHECK (
    jsonb_typeof(public_features) = 'object'
    AND public_features ?& ARRAY['en','ar','he']
    AND jsonb_typeof(public_features->'en') = 'array'
    AND jsonb_typeof(public_features->'ar') = 'array'
    AND jsonb_typeof(public_features->'he') = 'array'),
  ADD CONSTRAINT plans_billing_note_valid CHECK (
    jsonb_typeof(billing_note) = 'object'
    AND billing_note ?& ARRAY['en','ar','he']
    AND jsonb_typeof(billing_note->'en') = 'string'
    AND jsonb_typeof(billing_note->'ar') = 'string'
    AND jsonb_typeof(billing_note->'he') = 'string');

-- One-time commercial launch defaults, never runtime fallback prices.
INSERT INTO public.plans(id,code,name) VALUES
 ('11111111-1111-1111-1111-111111111111','starter','{"en":"Starter","ar":"الأساسية","he":"בסיסית"}'),
 ('22222222-2222-2222-2222-222222222222','pro','{"en":"Pro","ar":"الاحترافية","he":"מקצועית"}'),
 ('33333333-3333-3333-3333-333333333333','business','{"en":"Business","ar":"الأعمال","he":"עסקית"}')
ON CONFLICT(code) DO NOTHING;
UPDATE public.plans SET monthly_price_ils=149,yearly_price_ils=1490,display_order=1,
 name='{"en":"Starter","ar":"الأساسية","he":"בסיסית"}',
 description='{"en":"For restaurants and cafés that want a polished digital presence.","ar":"للمطاعم والمقاهي التي تريد حضوراً رقمياً أنيقاً.","he":"למסעדות ולבתי קפה שרוצים נוכחות דיגיטלית מוקפדת."}',
 public_features='{"en":["Premium digital menu experience","Complete restaurant branding","Beautiful menu templates","Multilingual guest experience","QR-first mobile access","Rich dish presentation and availability","Easy menu updates anytime"],"ar":["تجربة منيو رقمي راقية","هوية بصرية متكاملة للمطعم","قوالب منيو أنيقة","تجربة متعددة اللغات للضيوف","وصول سريع من الهاتف عبر QR","عرض غني للأطباق وحالة توفرها","تحديث المنيو بسهولة في أي وقت"],"he":["חוויית תפריט דיגיטלי מוקפדת","מיתוג מלא למסעדה","תבניות תפריט מעוצבות","חוויית אורחים רב־לשונית","גישה מהנייד באמצעות QR","תצוגת מנות עשירה וזמינות עדכנית","עדכון תפריט בקלות בכל עת"]}'
 WHERE code='starter';
UPDATE public.plans SET monthly_price_ils=249,yearly_price_ils=2490,display_order=2,
 name='{"en":"Pro","ar":"الاحترافية","he":"מקצועית"}',
 description='{"en":"For restaurants that want to turn menu visits into real customer actions.","ar":"للمطاعم التي تريد تحويل زيارات المنيو إلى تواصل فعلي مع العملاء.","he":"למסעדות שרוצות להפוך ביקורים בתפריט לפניות של לקוחות."}',
 public_features='{"en":["Everything in Starter","Structured WhatsApp ordering","Add-to-cart with live total","Customer details and order notes","Lightweight reservation requests","Priority support"],"ar":["كل مزايا الباقة الأساسية","طلبات منظمة عبر واتساب","سلة مع إجمالي محدث","بيانات العميل وملاحظات الطلب","طلبات حجز بسيطة","دعم ذو أولوية"],"he":["כל מה שכלול בבסיסית","בקשות הזמנה מסודרות בוואטסאפ","סל עם סכום מתעדכן","פרטי לקוח והערות להזמנה","בקשות פשוטות להזמנת מקום","תמיכה בעדיפות"]}'
 WHERE code='pro';
UPDATE public.plans SET monthly_price_ils=449,yearly_price_ils=4490,price_is_starting=true,display_order=3,
 name='{"en":"Business","ar":"الأعمال","he":"עסקית"}',
 description='{"en":"For growing restaurant brands managing multiple locations from one place.","ar":"للعلامات المتنامية التي تدير عدة فروع من مكان واحد.","he":"למותגי מסעדות בצמיחה שמנהלים מספר סניפים ממקום אחד."}',
 billing_note='{"en":"Pricing scales with locations.","ar":"تتغير الأسعار بحسب عدد الفروع.","he":"המחיר משתנה לפי מספר הסניפים."}',
 public_features='{"en":["Everything in Pro","Multi-location management","Branch-specific menus and settings","Centralized control across locations","Branch-specific WhatsApp destinations","Guided onboarding and priority support"],"ar":["كل مزايا الباقة الاحترافية","إدارة عدة فروع","منيو وإعدادات خاصة بكل فرع","تحكم مركزي بجميع الفروع","رقم واتساب خاص بكل فرع","إعداد بإرشاد الفريق ودعم ذو أولوية"],"he":["כל מה שכלול במקצועית","ניהול מספר סניפים","תפריטים והגדרות לכל סניף","שליטה מרכזית בכל הסניפים","מספר וואטסאפ נפרד לכל סניף","ליווי בהקמה ותמיכה בעדיפות"]}'
 WHERE code='business';
ALTER TABLE public.plans ADD CONSTRAINT plans_v1_prices_required CHECK (
 code NOT IN ('11111111-1111-1111-1111-111111111111','starter','pro','business') OR (monthly_price_ils IS NOT NULL AND yearly_price_ils IS NOT NULL));

-- Keep legacy rows for historical compatibility, but remove them from commercial grants.
UPDATE public.plan_entitlements SET enabled=false
 WHERE plan_id IN (SELECT id FROM public.plans WHERE code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business'))
 AND feature_key NOT IN ('digital_menu','qr_codes','custom_branding','menu_templates','cart','whatsapp_ordering','reservation_requests','multi_location');
INSERT INTO public.plan_entitlements(plan_id,feature_key,enabled,limit_value)
 SELECT p.id,f.key,
 CASE WHEN f.key IN ('digital_menu','qr_codes','custom_branding','menu_templates') THEN true
      WHEN f.key='multi_location' THEN p.code='business'
      ELSE p.code IN ('22222222-2222-2222-2222-222222222222','pro','business') END,
 CASE WHEN f.key='multi_location' THEN CASE WHEN p.code='business' THEN 2 ELSE 1 END ELSE NULL END
 FROM public.plans p CROSS JOIN unnest(ARRAY['digital_menu','qr_codes','custom_branding','menu_templates','cart','whatsapp_ordering','reservation_requests','multi_location']) AS f(key)
 WHERE p.code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business')
 ON CONFLICT(plan_id,feature_key) DO UPDATE SET enabled=excluded.enabled,limit_value=excluded.limit_value;

-- Destination is independent of a public contact phone. Tenant RLS continues to apply.
ALTER TABLE public.business_settings ADD COLUMN whatsapp_number text
 CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE public.locations ADD COLUMN whatsapp_number text
 CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');

-- Preserve application rows and existing plan UUID references while renaming the code.
ALTER TABLE public.restaurant_applications DROP CONSTRAINT restaurant_applications_requested_plan_code_check;
UPDATE public.restaurant_applications SET requested_plan_code='business' WHERE requested_plan_code='enterprise';
ALTER TABLE public.restaurant_applications ADD CONSTRAINT restaurant_applications_requested_plan_code_check
 CHECK (requested_plan_code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business'));

-- Restricted public projection: never expose inactive plans or dormant capabilities.
CREATE FUNCTION public.public_commercial_plans() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'code',p.code,'name',p.name,'description',p.description,
   'monthly_price_ils',p.monthly_price_ils,'yearly_price_ils',p.yearly_price_ils,
   'price_is_starting',p.price_is_starting,'display_order',p.display_order,
   'public_features',p.public_features,'billing_note',p.billing_note,
   'entitlements',(SELECT coalesce(jsonb_agg(jsonb_build_object('feature_key',e.feature_key,'enabled',e.enabled,'limit_value',e.limit_value) ORDER BY e.feature_key),'[]'::jsonb)
     FROM public.plan_entitlements e WHERE e.plan_id=p.id AND e.feature_key IN
     ('digital_menu','qr_codes','custom_branding','menu_templates','cart','whatsapp_ordering','reservation_requests','multi_location'))
 ) ORDER BY p.display_order,p.code),'[]'::jsonb)
 FROM public.plans p WHERE p.is_active AND p.code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business');
$$;
REVOKE ALL ON FUNCTION public.public_commercial_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_commercial_plans() TO anon,authenticated,service_role;

-- Reuse existing private application persistence; reject inactive/stale selections server-side.
CREATE OR REPLACE FUNCTION public.submit_restaurant_application(p_input jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_plan text := nullif(p_input->>'requested_plan_code','unsure');
BEGIN
 IF v_plan IS NOT NULL THEN
   PERFORM 1 FROM public.plans WHERE code=v_plan AND is_active AND code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business') FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'inactive_or_invalid_plan' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO public.restaurant_applications(kind,full_name,business_name,email,phone,city,business_type,branch_count,requested_plan_code,message,locale)
 VALUES(p_input->>'kind',btrim(p_input->>'full_name'),btrim(p_input->>'business_name'),lower(btrim(p_input->>'email')),coalesce(p_input->>'phone',''),p_input->>'city',p_input->>'business_type',(p_input->>'branch_count')::integer,v_plan,coalesce(p_input->>'message',''),p_input->>'locale')
 ON CONFLICT(kind,email,lower(btrim(business_name))) WHERE status='pending' DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_restaurant_application(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_restaurant_application(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.review_restaurant_application(p_id uuid,p_status text,p_internal_note text,p_plan text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('approved','rejected') OR p_internal_note IS NULL OR length(p_internal_note)>2000 THEN
   RAISE EXCEPTION 'invalid_review' USING ERRCODE='22023';
 END IF;
 IF p_plan IS NOT NULL THEN
   PERFORM 1 FROM public.plans WHERE code=p_plan AND is_active AND code IN ('11111111-1111-1111-1111-111111111111','starter','pro','business') FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'inactive_or_invalid_plan' USING ERRCODE='22023'; END IF;
 END IF;
 UPDATE public.restaurant_applications SET status=p_status,internal_note=btrim(p_internal_note),requested_plan_code=p_plan,
 reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=p_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'already_reviewed_or_missing' USING ERRCODE='40001'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_restaurant_application(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_restaurant_application(uuid,text,text,text) TO authenticated;
COMMIT;
