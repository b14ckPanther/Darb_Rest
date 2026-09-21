-- V1: exclude retained operational modules from the public API surface.
-- Apply manually to LOCAL first. Matching application gates/UI are still required.
-- No rows, tables, function bodies, RLS policies or historical references are deleted.
BEGIN;

-- Tenant roles must not bypass the v1 application through direct PostgREST calls.
-- Server-side guest-order/payment RPCs are disabled too; v1 WhatsApp requests must
-- never invoke a retained stored-order/payment lifecycle.
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname = ANY(ARRAY[
      'save_order_core', 'save_order', 'save_guest_order', 'save_table_guest_order',
      'transition_order', 'operate_kitchen_order', 'kitchen_orders',
      'checkout_guest_order', 'checkout_table_guest_order',
      'attach_payment_reference', 'apply_payment_event', 'record_restaurant_payment',
      'restaurant_operation', 'restaurant_orders', 'restaurant_operations_context',
      'route_order_tasks', 'restaurant_analytics',
      'manage_restaurant_table', 'manage_business_domain', 'verify_business_domain'
    ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',target.signature);
  END LOOP;
END $$;

-- Also close direct tenant table reads/writes for dormant modules. The trusted
-- service role retains table access for preservation/diagnostics; it is never
-- exposed to customers. Existing trigger execution by the owner is unchanged.
REVOKE ALL ON TABLE
  public.orders, public.order_items, public.order_item_modifiers,
  public.payments, public.payment_events, public.guest_order_limits,
  public.order_operations, public.kitchen_stations, public.station_routes,
  public.branch_staff, public.order_item_tasks, public.operation_preferences,
  public.restaurant_operation_history, public.printer_events,
  public.restaurant_tables, public.business_domains
FROM PUBLIC, anon, authenticated;

-- Intentionally retain public menu reads, publication controls, catalog/pricing,
-- media authorization, abuse budgets, sitemap/hostname reads and existing opaque
-- QR resolution. QR links may still identify the correct public menu, never an
-- operational order lifecycle. Do not revoke public_order_menu or resolve_table_qr.
COMMIT;
