-- Manual application prerequisite. No Auth users, emails or external payments are created here.
-- Preserve dormant restaurant-order payments: customer billing uses separate tables.
BEGIN;
CREATE SEQUENCE public.customer_payment_reference_seq START 1000;
REVOKE ALL ON SEQUENCE public.customer_payment_reference_seq FROM PUBLIC,anon,authenticated;

CREATE TABLE public.platform_billing_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 bit_enabled boolean NOT NULL DEFAULT false,
 bit_phone text NOT NULL DEFAULT '+972507147134' CHECK(bit_phone ~ '^\+[1-9][0-9]{7,14}$'),
 bank_enabled boolean NOT NULL DEFAULT false,
 bank_account_holder text NOT NULL DEFAULT '' CHECK(length(bank_account_holder)<=200),
 bank_name text NOT NULL DEFAULT '' CHECK(length(bank_name)<=200),
 bank_number text NOT NULL DEFAULT '' CHECK(length(bank_number)<=40),
 bank_branch text NOT NULL DEFAULT '' CHECK(length(bank_branch)<=40),
 bank_account_number text NOT NULL DEFAULT '' CHECK(length(bank_account_number)<=80),
 bank_iban text NOT NULL DEFAULT '' CHECK(length(bank_iban)<=80),
 bit_instructions jsonb NOT NULL DEFAULT '{"en":"","ar":"","he":""}' CHECK(jsonb_typeof(bit_instructions)='object'),
 bank_instructions jsonb NOT NULL DEFAULT '{"en":"","ar":"","he":""}' CHECK(jsonb_typeof(bank_instructions)='object'),
 payment_due_days integer NOT NULL DEFAULT 7 CHECK(payment_due_days BETWEEN 1 AND 365),
 sender_name text NOT NULL DEFAULT 'Darb REST' CHECK(length(btrim(sender_name)) BETWEEN 1 AND 120),
 support_email text CHECK(support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT bank_enabled OR (length(btrim(bank_account_holder))>0 AND length(btrim(bank_name))>0 AND length(btrim(bank_branch))>0 AND length(btrim(bank_account_number))>0))
);
INSERT INTO public.platform_billing_settings(id) VALUES(true);
ALTER TABLE public.restaurant_applications ADD COLUMN customer_safe_message text NOT NULL DEFAULT '' CHECK(length(customer_safe_message)<=1000);

CREATE TABLE public.customer_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL UNIQUE REFERENCES public.restaurant_applications(id),
 plan_id uuid NOT NULL REFERENCES public.plans(id),
 plan_code text NOT NULL CHECK(plan_code IN ('starter','pro','business')),
 plan_name jsonb NOT NULL CHECK(jsonb_typeof(plan_name)='object'),
 billing_cycle text NOT NULL CHECK(billing_cycle IN ('monthly','yearly')),
 agreed_amount_ils numeric(12,2) NOT NULL CHECK(agreed_amount_ils>0 AND agreed_amount_ils<1000000000),
 catalog_amount_ils numeric(12,2) NOT NULL CHECK(catalog_amount_ils>=0 AND catalog_amount_ils<1000000000),
 currency text NOT NULL DEFAULT 'ILS' CHECK(currency='ILS'),
 payment_reference text NOT NULL UNIQUE DEFAULT ('DR-' || nextval('public.customer_payment_reference_seq')),
 customer_email text NOT NULL CHECK(customer_email=lower(btrim(customer_email))),
 customer_name text NOT NULL,
 business_name text NOT NULL,
 locale text NOT NULL CHECK(locale IN ('en','ar','he')),
 approved_by uuid NOT NULL REFERENCES auth.users(id),
 approved_at timestamptz NOT NULL DEFAULT now(),
 payment_due_at timestamptz NOT NULL,
 UNIQUE(id,payment_reference)
);
CREATE TABLE public.manual_customer_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agreement_id uuid NOT NULL REFERENCES public.customer_agreements(id),
 payment_reference text NOT NULL,
 purpose text NOT NULL DEFAULT 'initial' CHECK(purpose IN ('initial','renewal')),
 expected_amount_ils numeric(12,2) NOT NULL CHECK(expected_amount_ils>0 AND expected_amount_ils<1000000000),
 paid_amount_ils numeric(12,2) CHECK(paid_amount_ils>0 AND paid_amount_ils<1000000000),
 currency text NOT NULL DEFAULT 'ILS' CHECK(currency='ILS'),
 method text CHECK(method IN ('bit','bank_transfer')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','void')),
 external_reference text NOT NULL DEFAULT '' CHECK(length(external_reference)<=200),
 accounting_reference text NOT NULL DEFAULT '' CHECK(length(accounting_reference)<=200),
 internal_note text NOT NULL DEFAULT '' CHECK(length(internal_note)<=2000),
 confirmed_by uuid REFERENCES auth.users(id),
 confirmed_at timestamptz,
 period_start timestamptz,
 period_end timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(agreement_id,payment_reference) REFERENCES public.customer_agreements(id,payment_reference),
 CHECK((status='confirmed' AND paid_amount_ils IS NOT NULL AND method IS NOT NULL AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL) OR (status<>'confirmed' AND confirmed_at IS NULL AND confirmed_by IS NULL)),
 CHECK(purpose<>'renewal' OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end>period_start))
);
CREATE UNIQUE INDEX one_initial_customer_payment ON public.manual_customer_payments(agreement_id) WHERE purpose='initial' AND status<>'void';
CREATE UNIQUE INDEX one_customer_renewal_period ON public.manual_customer_payments(agreement_id,period_start) WHERE purpose='renewal' AND status<>'void';
CREATE INDEX customer_payments_queue ON public.manual_customer_payments(status,created_at);

CREATE TABLE public.customer_activations (
 agreement_id uuid PRIMARY KEY REFERENCES public.customer_agreements(id),
 user_id uuid REFERENCES auth.users(id),
 invite_state text NOT NULL DEFAULT 'not_sent' CHECK(invite_state IN ('not_sent','sending','sent','failed','unknown','existing_account')),
 invite_attempt_id uuid,
 invite_attempts integer NOT NULL DEFAULT 0 CHECK(invite_attempts>=0),
 invite_claimed_at timestamptz,
 invite_sent_at timestamptz,
 invite_error_code text CHECK(length(invite_error_code)<=100),
 activated_at timestamptz,
 business_id uuid UNIQUE REFERENCES public.businesses(id),
 onboarded_at timestamptz,
 instruction_token_hash text UNIQUE CHECK(instruction_token_hash ~ '^[a-f0-9]{64}$'),
 instruction_token_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((instruction_token_hash IS NULL)=(instruction_token_expires_at IS NULL)),
 CHECK(activated_at IS NULL OR user_id IS NOT NULL),
 CHECK((business_id IS NULL)=(onboarded_at IS NULL)),
 CHECK(business_id IS NULL OR activated_at IS NOT NULL),
 CHECK(invite_state<>'sending' OR (invite_attempt_id IS NOT NULL AND invite_claimed_at IS NOT NULL)),
 CHECK(invite_state<>'sent' OR (invite_sent_at IS NOT NULL AND user_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_unfinished_customer_activation ON public.customer_activations(user_id) WHERE activated_at IS NOT NULL AND business_id IS NULL;
CREATE INDEX customer_activation_user ON public.customer_activations(user_id);
CREATE TABLE public.customer_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agreement_id uuid NOT NULL UNIQUE REFERENCES public.customer_agreements(id),
 business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id),
 plan_id uuid NOT NULL REFERENCES public.plans(id),
 billing_cycle text NOT NULL CHECK(billing_cycle IN ('monthly','yearly')),
 agreed_amount_ils numeric(12,2) NOT NULL CHECK(agreed_amount_ils>0 AND agreed_amount_ils<1000000000),
 currency text NOT NULL DEFAULT 'ILS' CHECK(currency='ILS'),
 status text NOT NULL CHECK(status IN ('pending_activation','active','past_due','cancelled')),
 started_at timestamptz,
 current_period_start timestamptz,
 current_period_end timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((current_period_start IS NULL)=(current_period_end IS NULL)),
 CHECK(current_period_end>current_period_start),
 CHECK(status<>'active' OR (started_at IS NOT NULL AND current_period_start IS NOT NULL))
);
CREATE TABLE public.customer_mail_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.restaurant_applications(id),
 agreement_id uuid REFERENCES public.customer_agreements(id),
 kind text NOT NULL CHECK(kind IN ('received','approval','rejection','invitation')),
 deduplication_key text NOT NULL UNIQUE CHECK(length(deduplication_key) BETWEEN 1 AND 200),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','sending','sent','failed','unknown')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 claimed_at timestamptz,
 claim_id uuid,
 provider_reference text CHECK(length(provider_reference)<=300),
 error_code text CHECK(length(error_code)<=100),
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state<>'sent' OR sent_at IS NOT NULL),
 CHECK(state<>'sending' OR (claim_id IS NOT NULL AND claimed_at IS NOT NULL))
);
CREATE INDEX customer_mail_queue ON public.customer_mail_outbox(state,created_at);
CREATE TABLE public.customer_commercial_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 record_table text NOT NULL,
 record_id text NOT NULL,
 action text NOT NULL,
 actor_id uuid REFERENCES auth.users(id),
 occurred_at timestamptz NOT NULL DEFAULT now()
);

-- No anonymous/customer access. Server-side code must check platform privilege before using
-- service_role; customer projections must be purpose limited and authenticate the linked user.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['platform_billing_settings','customer_agreements','manual_customer_payments','customer_activations','customer_subscriptions','customer_mail_outbox','customer_commercial_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY platform_read ON public.%I FOR SELECT TO authenticated USING (public.is_platform_admin())',t);
 END LOOP;
END $$;
REVOKE UPDATE,DELETE,TRUNCATE ON public.customer_commercial_audit FROM service_role;
GRANT USAGE ON SEQUENCE public.customer_commercial_audit_id_seq TO service_role;

CREATE FUNCTION public.customer_agreement_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'immutable_agreement' USING ERRCODE='22023'; END $$;
CREATE TRIGGER immutable_agreement BEFORE UPDATE OR DELETE ON public.customer_agreements FOR EACH ROW EXECUTE FUNCTION public.customer_agreement_immutable();
CREATE FUNCTION public.audit_customer_commercial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.customer_commercial_audit(record_table,record_id,action,actor_id)
 VALUES(TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(NEW)->>'agreement_id'),TG_OP,auth.uid());
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['platform_billing_settings','customer_agreements','manual_customer_payments','customer_activations','customer_subscriptions','customer_mail_outbox'] LOOP
  EXECUTE format('CREATE TRIGGER commercial_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_customer_commercial()',t);
 END LOOP;
END $$;

CREATE FUNCTION public.approve_customer_application(p_application uuid,p_plan uuid,p_cycle text,p_amount numeric DEFAULT NULL,p_confirm_starting boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.restaurant_applications; p public.plans; v_id uuid; ref text; amount numeric; catalog numeric; due_days integer;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.restaurant_applications WHERE id=p_application FOR UPDATE;
 IF NOT FOUND OR a.kind<>'application' OR a.status='rejected' THEN RAISE EXCEPTION 'invalid_application' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.customer_agreements WHERE application_id=a.id) THEN RAISE EXCEPTION 'already_agreed' USING ERRCODE='40001'; END IF;
 SELECT * INTO p FROM public.plans WHERE id=p_plan AND is_active AND code IN ('starter','pro','business') FOR SHARE;
 IF NOT FOUND OR p_cycle IS NULL OR p_cycle NOT IN ('monthly','yearly') THEN RAISE EXCEPTION 'invalid_terms' USING ERRCODE='22023'; END IF;
 IF p.price_is_starting AND (p_confirm_starting IS DISTINCT FROM true OR p_amount IS NULL) THEN RAISE EXCEPTION 'confirm_starting_amount' USING ERRCODE='22023'; END IF;
 catalog:=CASE WHEN p_cycle='yearly' THEN p.yearly_price_ils ELSE p.monthly_price_ils END;
 amount:=coalesce(p_amount,catalog);
 IF amount IS NULL OR NOT (amount>0 AND amount<1000000000) OR amount<>round(amount,2) THEN RAISE EXCEPTION 'invalid_amount' USING ERRCODE='22023'; END IF;
 SELECT payment_due_days INTO due_days FROM public.platform_billing_settings WHERE id=true;
 INSERT INTO public.customer_agreements(application_id,plan_id,plan_code,plan_name,billing_cycle,agreed_amount_ils,catalog_amount_ils,customer_email,customer_name,business_name,locale,approved_by,payment_due_at)
 VALUES(a.id,p.id,p.code,p.name,p_cycle,amount,catalog,a.email,a.full_name,a.business_name,a.locale,auth.uid(),now()+make_interval(days=>due_days)) RETURNING id,payment_reference INTO v_id,ref;
 UPDATE public.restaurant_applications SET status='approved',requested_plan_code=p.code,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=a.id;
 INSERT INTO public.manual_customer_payments(agreement_id,payment_reference,expected_amount_ils) VALUES(v_id,ref,amount);
 INSERT INTO public.customer_activations(agreement_id) VALUES(v_id);
 INSERT INTO public.customer_mail_outbox(application_id,agreement_id,kind,deduplication_key) VALUES(a.id,v_id,'approval','approval:'||v_id);
 RETURN v_id;
END $$;
CREATE FUNCTION public.confirm_customer_payment(p_payment uuid,p_amount numeric,p_method text,p_external_reference text DEFAULT '',p_note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payment public.manual_customer_payments;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO payment FROM public.manual_customer_payments WHERE id=p_payment FOR UPDATE;
 IF NOT FOUND OR payment.status<>'pending' THEN RAISE EXCEPTION 'already_confirmed_or_void' USING ERRCODE='40001'; END IF;
 IF p_amount IS NULL OR NOT(p_amount>=payment.expected_amount_ils AND p_amount<1000000000) OR p_amount<>round(p_amount,2) OR p_method IS NULL OR p_method NOT IN ('bit','bank_transfer') THEN RAISE EXCEPTION 'invalid_payment' USING ERRCODE='22023'; END IF;
 UPDATE public.manual_customer_payments SET status='confirmed',paid_amount_ils=p_amount,method=p_method,external_reference=coalesce(p_external_reference,''),internal_note=coalesce(p_note,''),confirmed_by=auth.uid(),confirmed_at=now() WHERE id=p_payment;
END $$;
CREATE FUNCTION public.guard_customer_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.customer_agreements;
BEGIN
 IF TG_OP='UPDATE' AND OLD.status<>'pending' THEN RAISE EXCEPTION 'immutable_payment' USING ERRCODE='22023'; END IF;
 IF TG_OP='UPDATE' AND (NEW.agreement_id,NEW.purpose,NEW.payment_reference,NEW.expected_amount_ils,NEW.period_start,NEW.period_end) IS DISTINCT FROM (OLD.agreement_id,OLD.purpose,OLD.payment_reference,OLD.expected_amount_ils,OLD.period_start,OLD.period_end) THEN RAISE EXCEPTION 'immutable_payment_terms' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.customer_agreements WHERE id=NEW.agreement_id;
 IF NEW.purpose='initial' AND NEW.expected_amount_ils<>a.agreed_amount_ils THEN RAISE EXCEPTION 'payment_terms_mismatch' USING ERRCODE='22023'; END IF;
 IF NEW.status='confirmed' AND NEW.paid_amount_ils<NEW.expected_amount_ils THEN RAISE EXCEPTION 'invalid_payment' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_transition_guard BEFORE INSERT OR UPDATE ON public.manual_customer_payments FOR EACH ROW EXECUTE FUNCTION public.guard_customer_payment();

CREATE FUNCTION public.guard_customer_activation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.customer_agreements; u auth.users;
BEGIN
 SELECT * INTO a FROM public.customer_agreements WHERE id=NEW.agreement_id;
 IF TG_OP='UPDATE' AND (NEW.agreement_id<>OLD.agreement_id OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id) OR (OLD.activated_at IS NOT NULL AND NEW.activated_at IS DISTINCT FROM OLD.activated_at) OR (OLD.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id)) THEN RAISE EXCEPTION 'immutable_activation_identity' USING ERRCODE='22023'; END IF;
 IF NEW.user_id IS NOT NULL OR NEW.invite_state<>'not_sent' THEN
  PERFORM 1 FROM public.manual_customer_payments WHERE agreement_id=a.id AND purpose='initial' AND status='confirmed';
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_required' USING ERRCODE='42501'; END IF;
 END IF;
 IF NEW.user_id IS NOT NULL THEN
  SELECT * INTO u FROM auth.users WHERE id=NEW.user_id;
  IF NOT FOUND OR lower(btrim(u.email)) IS DISTINCT FROM a.customer_email THEN RAISE EXCEPTION 'customer_identity_mismatch' USING ERRCODE='42501'; END IF;
  IF NEW.activated_at IS NOT NULL AND u.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'verified_account_required' USING ERRCODE='42501'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER activation_guard BEFORE INSERT OR UPDATE ON public.customer_activations FOR EACH ROW EXECUTE FUNCTION public.guard_customer_activation();

-- Keep existing atomic onboarding RPC; enforce the commercial gate underneath it.
CREATE FUNCTION public.guard_customer_business() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.customer_agreements;
BEGIN
 IF auth.uid() IS NULL OR public.is_platform_admin() THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN RAISE EXCEPTION 'approved_plan_locked' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 SELECT g.* INTO a FROM public.customer_agreements g JOIN public.customer_activations c ON c.agreement_id=g.id
 WHERE c.user_id=auth.uid() AND c.activated_at IS NOT NULL AND c.business_id IS NULL FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'paid_activation_required' USING ERRCODE='42501'; END IF;
 IF NEW.plan_id IS DISTINCT FROM a.plan_id THEN RAISE EXCEPTION 'approved_plan_locked' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_business_gate BEFORE INSERT OR UPDATE OF plan_id ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.guard_customer_business();
CREATE FUNCTION public.link_customer_business() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.customer_agreements;
BEGIN
 IF auth.uid() IS NULL OR public.is_platform_admin() THEN RETURN NEW; END IF;
 SELECT g.* INTO a FROM public.customer_agreements g JOIN public.customer_activations c ON c.agreement_id=g.id
 WHERE c.user_id=auth.uid() AND c.activated_at IS NOT NULL AND c.business_id IS NULL FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'paid_activation_required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.customer_subscriptions(agreement_id,business_id,plan_id,billing_cycle,agreed_amount_ils,status,started_at,current_period_start,current_period_end)
 VALUES(a.id,NEW.id,a.plan_id,a.billing_cycle,a.agreed_amount_ils,'active',now(),now(),now()+CASE WHEN a.billing_cycle='yearly' THEN interval '1 year' ELSE interval '1 month' END);
 UPDATE public.customer_activations SET business_id=NEW.id,onboarded_at=now() WHERE agreement_id=a.id;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_business_link AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.link_customer_business();
REVOKE INSERT ON public.businesses FROM authenticated,anon;

CREATE FUNCTION public.queue_application_received() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.kind='application' THEN
  INSERT INTO public.customer_mail_outbox(application_id,kind,deduplication_key) VALUES(NEW.id,'received','received:'||NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER application_received_mail AFTER INSERT ON public.restaurant_applications FOR EACH ROW EXECUTE FUNCTION public.queue_application_received();

REVOKE ALL ON FUNCTION public.approve_customer_application(uuid,uuid,text,numeric,boolean),public.confirm_customer_payment(uuid,numeric,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.approve_customer_application(uuid,uuid,text,numeric,boolean),public.confirm_customer_payment(uuid,numeric,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.customer_agreement_immutable(),public.audit_customer_commercial(),public.guard_customer_payment(),public.guard_customer_activation(),public.guard_customer_business(),public.link_customer_business(),public.queue_application_received() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
