-- Phase 6. Apply locally for validation; remote application is operator-controlled.
CREATE TABLE public.payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE,
 business_id uuid NOT NULL,
 method text NOT NULL CHECK(method IN ('restaurant','online')),
 provider text NOT NULL CHECK(length(provider) BETWEEN 1 AND 64),
 provider_reference text,
 reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 recorded_at timestamptz,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 1000000000),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','authorized','paid','failed','cancelled','refunded')),
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(order_id,business_id) REFERENCES public.orders(id,business_id),
 UNIQUE(provider,provider_reference),
 CHECK((method='restaurant' AND provider='restaurant') OR (method='online' AND provider<>'restaurant'))
);
CREATE INDEX payments_business_order ON public.payments(business_id,order_id);
CREATE TABLE public.payment_events (
 provider text NOT NULL,
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 200),
 payment_id uuid NOT NULL REFERENCES public.payments(id),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
 status text NOT NULL CHECK(status IN ('authorized','paid','failed','cancelled','refunded')),
 outcome text NOT NULL CHECK(outcome IN ('applied','ignored')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,event_id)
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments,public.payment_events FROM anon,authenticated;
GRANT SELECT ON public.payments TO authenticated;
CREATE POLICY payment_read ON public.payments FOR SELECT TO authenticated USING(public.user_belongs_to_business(business_id));

-- Submission and payment reservation are one atomic operation. No amount parameter for payment.
CREATE FUNCTION public.checkout_guest_order(
 p_id uuid,p_business_slug text,p_location_slug text,p_lines jsonb,p_customer_name text,p_customer_phone text,
 p_fulfillment_mode text,p_expected_subtotal_cents bigint,p_revision integer,p_guest_token text,p_method text,p_provider text
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; p public.payments;
BEGIN
 IF p_method IS NULL OR p_method NOT IN ('restaurant','online') OR p_provider IS NULL OR
 (p_method='restaurant' AND p_provider<>'restaurant') OR (p_method='online' AND p_provider='restaurant') THEN
 RAISE EXCEPTION 'invalid_payment' USING ERRCODE='22023'; END IF;
 o:=public.save_guest_order(p_id,p_business_slug,p_location_slug,p_lines,p_customer_name,p_customer_phone,p_fulfillment_mode,p_expected_subtotal_cents,p_revision,true,p_guest_token);
 IF o.status='cancelled' THEN RAISE EXCEPTION 'order_locked' USING ERRCODE='22023'; END IF;
 SELECT * INTO p FROM public.payments WHERE order_id=o.id FOR UPDATE;
 IF FOUND THEN
  IF p.method<>p_method OR p.provider<>p_provider THEN RAISE EXCEPTION 'payment_conflict' USING ERRCODE='22023'; END IF;
  RETURN p;
 END IF;
 INSERT INTO public.payments(order_id,business_id,method,provider,amount_cents,currency)
 VALUES(o.id,o.business_id,p_method,p_provider,o.subtotal_cents,o.currency) RETURNING * INTO p;
 RETURN p;
END; $$;
REVOKE ALL ON FUNCTION public.checkout_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_guest_order(uuid,text,text,jsonb,text,text,text,bigint,integer,text,text,text) TO service_role;

CREATE FUNCTION public.attach_payment_reference(p_id uuid,p_provider text,p_reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p.provider<>p_provider OR p.method<>'online' OR p_reference IS NULL OR length(p_reference) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid_payment'; END IF;
 IF p.provider_reference IS NOT NULL AND p.provider_reference<>p_reference THEN RAISE EXCEPTION 'payment_conflict'; END IF;
 UPDATE public.payments SET provider_reference=p_reference WHERE id=p_id;
END; $$;
REVOKE ALL ON FUNCTION public.attach_payment_reference(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_payment_reference(uuid,text,text) TO service_role;

-- Only a signature-verified server callback reaches this gateway. Exact amount/currency/reference binding.
CREATE FUNCTION public.apply_payment_event(p_id uuid,p_provider text,p_reference text,p_event_id text,p_payload_hash text,p_status text,p_amount_cents bigint,p_currency text)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments; e public.payment_events; allowed boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_provider||':'||p_event_id,6));
 SELECT * INTO p FROM public.payments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p.method<>'online' OR p.provider IS DISTINCT FROM p_provider OR p.provider_reference IS DISTINCT FROM p_reference OR p_reference IS NULL
 OR p.amount_cents IS DISTINCT FROM p_amount_cents OR p.currency IS DISTINCT FROM p_currency THEN RAISE EXCEPTION 'invalid_payment' USING ERRCODE='22023'; END IF;
 SELECT * INTO e FROM public.payment_events WHERE provider=p_provider AND event_id=p_event_id;
 IF FOUND THEN
  IF e.payment_id<>p_id OR e.payload_hash IS DISTINCT FROM p_payload_hash THEN RAISE EXCEPTION 'payment_conflict' USING ERRCODE='22023'; END IF;
  RETURN p;
 END IF;
 IF p_status IS NULL OR p_status NOT IN ('authorized','paid','failed','cancelled','refunded') THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE='22023'; END IF;
 allowed := (p.status='pending' AND p_status IN ('authorized','paid','failed','cancelled')) OR
 (p.status='authorized' AND p_status IN ('paid','failed','cancelled')) OR
 (p.status IN ('failed','cancelled') AND p_status='paid') OR (p.status<>'refunded' AND p_status='refunded');
 -- Older/repeated notifications are recorded without downgrading paid/refunded states.
 INSERT INTO public.payment_events(provider,event_id,payment_id,payload_hash,status,outcome)
 VALUES(p_provider,p_event_id,p_id,p_payload_hash,p_status,CASE WHEN allowed THEN 'applied' ELSE 'ignored' END);
 IF allowed THEN UPDATE public.payments SET status=p_status,revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO p; END IF;
 RETURN p;
END; $$;
REVOKE ALL ON FUNCTION public.apply_payment_event(uuid,text,text,text,text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_event(uuid,text,text,text,text,text,bigint,text) TO service_role;

-- Unpaid online orders must not enter fulfillment. Payment and order status are independent.
CREATE FUNCTION public.guard_paid_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('accepted','preparing','ready','completed') AND NEW.status IS DISTINCT FROM OLD.status AND
 EXISTS(SELECT 1 FROM public.payments WHERE order_id=NEW.id AND method='online' AND status<>'paid') THEN
 RAISE EXCEPTION 'payment_required' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_paid_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_payment_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_paid_order();

-- Staff may acknowledge money received at the restaurant; this never calls an online gateway.
CREATE FUNCTION public.record_restaurant_payment(p_id uuid,p_business_id uuid,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments;
BEGIN
 IF NOT public.has_business_role(p_business_id,ARRAY['owner','admin','manager','staff']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.payments WHERE id=p_id AND business_id=p_business_id FOR UPDATE;
 IF NOT FOUND OR p.method<>'restaurant' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p.status='paid' THEN RETURN; END IF;
 IF p.revision IS DISTINCT FROM p_revision OR p.status<>'pending' THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.payments SET status='paid',revision=revision+1,updated_at=now(),recorded_by=auth.uid(),recorded_at=now() WHERE id=p_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_restaurant_payment(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_restaurant_payment(uuid,uuid,integer) TO authenticated;
