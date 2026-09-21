-- ==============================================================================
-- Darb REST: Seed Data for Local Development & Testing
-- Seed: seed.sql
-- ==============================================================================

-- LOCAL DEVELOPMENT ONLY. Mock dev sessions do not require auth.users or memberships.
-- Apply after all canonical migrations via supabase db reset --local; never seed the linked project.
BEGIN;

-- Commercial defaults and entitlements are initialized once by migration 16.
-- Do not overwrite administrator-edited prices or re-enable dormant features here.

-- 3. Sample Multi-Tenant Businesses (Restaurant & Café)
INSERT INTO public.businesses (id, slug, name, legal_name, business_type, status, plan_id) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'darb-bistro',
    '{"ar": "درب بيسترو", "he": "דרב ביסטרו", "en": "Darb Bistro"}'::jsonb,
    'Darb Bistro Ltd',
    'restaurant',
    'active',
    (SELECT id FROM public.plans WHERE code = 'business')
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'darb-artisan-cafe',
    '{"ar": "مقهى درب المختص", "he": "קפה דרב מובחר", "en": "Darb Artisan Café"}'::jsonb,
    'Darb Specialty Roasters LLC',
    'cafe',
    'active',
    (SELECT id FROM public.plans WHERE code = 'starter')
  )
ON CONFLICT (slug) DO NOTHING;

-- 4. Sample Business Settings
INSERT INTO public.business_settings (business_id, primary_color, accent_color) VALUES
  ((SELECT id FROM public.businesses WHERE slug = 'darb-bistro'), '#d97706', '#0284c7'),
  ((SELECT id FROM public.businesses WHERE slug = 'darb-artisan-cafe'), '#78350f', '#d97706')
ON CONFLICT (business_id) DO NOTHING;

-- 5. Sample Branch Locations
INSERT INTO public.locations (id, business_id, slug, name, address_line1, city, country, is_primary) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.businesses WHERE slug = 'darb-bistro'),
    'haifa-port',
    '{"ar": "فرع ميناء حيفا", "he": "סניף נמל חיפה", "en": "Haifa Port Branch"}'::jsonb,
    'Port Street 12',
    'Haifa',
    'IL',
    TRUE
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.businesses WHERE slug = 'darb-bistro'),
    'akko-old-city',
    '{"ar": "فرع عكا القديمة", "he": "סניף עכו העתיקה", "en": "Old City Akko Branch"}'::jsonb,
    'Old Harbor Promenade 4',
    'Akko',
    'IL',
    FALSE
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    (SELECT id FROM public.businesses WHERE slug = 'darb-artisan-cafe'),
    'nazareth-downtown',
    '{"ar": "فرع الناصرة مركز المدينة", "he": "סניף נצרת מרכז העיר", "en": "Nazareth Downtown Branch"}'::jsonb,
    'Paul VI Street 48',
    'Nazareth',
    'IL',
    TRUE
  )
ON CONFLICT (business_id, slug) DO NOTHING;

-- 6. Sample Operating Hours (ISO Day: 1=Mon, 2=Tue, ..., 7=Sun)
-- TIME '24:00' is end-of-day midnight and satisfies the canonical time-order check.
-- Resolve branch IDs by slug; stable hours IDs make reapplying this seed safe.
INSERT INTO public.location_operating_hours (id, location_id, day_of_week, open_time, close_time, is_closed)
SELECT md5(l.id::text || ':seed-hours:' || h.day_of_week::text)::uuid,
       l.id, h.day_of_week, h.open_time::time, h.close_time::time, h.is_closed
FROM (VALUES
  -- Haifa Port: Open Mon-Sat 08:00-23:00, Sun 10:00-22:00
  ('darb-bistro', 'haifa-port', 1, '08:00', '23:00', FALSE),
  ('darb-bistro', 'haifa-port', 2, '08:00', '23:00', FALSE),
  ('darb-bistro', 'haifa-port', 3, '08:00', '23:00', FALSE),
  ('darb-bistro', 'haifa-port', 4, '08:00', '23:00', FALSE),
  ('darb-bistro', 'haifa-port', 5, '08:00', '24:00', FALSE),
  ('darb-bistro', 'haifa-port', 6, '09:00', '24:00', FALSE),
  ('darb-bistro', 'haifa-port', 7, '10:00', '22:00', FALSE),
  -- Nazareth Downtown: Open Mon-Sun 07:30-22:00
  ('darb-artisan-cafe', 'nazareth-downtown', 1, '07:30', '22:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 2, '07:30', '22:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 3, '07:30', '22:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 4, '07:30', '22:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 5, '07:30', '23:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 6, '08:00', '23:00', FALSE),
  ('darb-artisan-cafe', 'nazareth-downtown', 7, '08:00', '21:00', FALSE)
) AS h(business_slug, location_slug, day_of_week, open_time, close_time, is_closed)
JOIN public.businesses b ON b.slug = h.business_slug
JOIN public.locations l ON l.business_id = b.id AND l.slug = h.location_slug
ON CONFLICT (id) DO UPDATE
SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, is_closed = EXCLUDED.is_closed;

COMMIT;

-- Phase 4: local-only restaurant content fixtures. No auth identities or remote writes.
BEGIN;
INSERT INTO public.menus(id,business_id,name_i18n,description_i18n,status,is_default,sort_order) VALUES
 ('d0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"ar":"على مهل","he":"בוקר בנחת","en":"Slow mornings"}','{"ar":"قهوة طازجة وأطباق موسمية","he":"קפה טרי ומנות עונתיות","en":"Fresh coffee, seasonal plates"}','active',true,0),
 ('d0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"ar":"قائمة المساء","he":"תפריט ערב","en":"Evening table"}','{}','draft',false,1)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.menu_locations(id,business_id,menu_id,location_id)
SELECT md5('menu:'||m.id::text||l.id::text)::uuid,m.business_id,m.id,l.id FROM public.menus m JOIN public.locations l ON l.business_id=m.business_id WHERE m.id IN ('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.menu_sections(id,business_id,menu_id,name_i18n,sort_order) VALUES
 ('d1000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d0000000-0000-4000-8000-000000000001','{"ar":"من المطبخ","he":"מהמטבח","en":"From the kitchen"}',0),
 ('d1000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d0000000-0000-4000-8000-000000000001','{"ar":"قهوة ومشروبات","he":"קפה ומשקאות","en":"Coffee & drinks"}',1),
 ('d1000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d0000000-0000-4000-8000-000000000002','{"ar":"أطباق للمشاركة","he":"מנות לחלוקה","en":"To share"}',0)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.menu_items(id,business_id,section_id,name_i18n,description_i18n,base_price,currency,sort_order) VALUES
 ('d2000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d1000000-0000-4000-8000-000000000001','{"ar":"لبنة وزعتر","he":"לבנה וזעתר","en":"Labneh & za’atar"}','{"ar":"زيت زيتون وخبز دافئ","he":"שמן זית ולחם חם","en":"Olive oil, warm bread, garden herbs"}',32,'ILS',0),
 ('d2000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d1000000-0000-4000-8000-000000000002','{"ar":"لاتيه","he":"לאטה","en":"House latte"}','{"ar":"إسبريسو وحليب مخملي","he":"אספרסו וחלב קטיפתי","en":"Espresso with silky steamed milk"}',15,'ILS',0),
 ('d2000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d1000000-0000-4000-8000-000000000003','{"ar":"خضار مشوية","he":"ירקות צלויים","en":"Roasted seasonal vegetables"}','{}',48,'ILS',0)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.item_variants(id,business_id,item_id,name_i18n,price,sort_order) VALUES
 ('d3000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000002','{"ar":"صغير","he":"קטן","en":"Small"}',15,0),
 ('d3000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000002','{"ar":"كبير","he":"גדול","en":"Large"}',19,1)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.modifier_groups(id,business_id,name_i18n,min_select,max_select,is_required) VALUES
 ('d4000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"ar":"اختر الحليب","he":"בחירת חלב","en":"Choose your milk"}',1,1,true) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.modifiers(id,business_id,modifier_group_id,name_i18n,price_delta,sort_order) VALUES
 ('d5000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d4000000-0000-4000-8000-000000000001','{"ar":"حليب عادي","he":"חלב רגיל","en":"Regular milk"}',0,0),
 ('d5000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d4000000-0000-4000-8000-000000000001','{"ar":"حليب الشوفان","he":"חלב שיבולת שועל","en":"Oat milk"}',3,1)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.item_modifier_groups(id,business_id,item_id,modifier_group_id) VALUES
 ('d6000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.item_dietary_tags(id,business_id,item_id,code) VALUES
 ('d7000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','vegetarian') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.item_allergens(id,business_id,item_id,code) VALUES
 ('d8000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','milk'),
 ('d8000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','d2000000-0000-4000-8000-000000000001','gluten') ON CONFLICT(id) DO NOTHING;
COMMIT;
