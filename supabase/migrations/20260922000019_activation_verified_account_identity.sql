-- Account email changes must not invalidate an already verified commercial identity.
-- Additive correction to migration 18; apply manually. No agreement or Auth data is changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_customer_activation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 a public.customer_agreements;
 u auth.users;
 identity_already_verified boolean := false;
BEGIN
 SELECT * INTO a FROM public.customer_agreements WHERE id=NEW.agreement_id;
 IF TG_OP='UPDATE' THEN
  IF NEW.agreement_id<>OLD.agreement_id
     OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id)
     OR (OLD.activated_at IS NOT NULL AND NEW.activated_at IS DISTINCT FROM OLD.activated_at)
     OR (OLD.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id) THEN
   RAISE EXCEPTION 'immutable_activation_identity' USING ERRCODE='22023';
  END IF;
  -- The initial association was checked against the immutable agreement recipient.
  -- Subsequent verified Auth email changes must not replace that historical recipient.
  identity_already_verified := OLD.activated_at IS NOT NULL
    AND OLD.user_id IS NOT NULL AND NEW.user_id=OLD.user_id;
 END IF;
 IF NEW.user_id IS NOT NULL OR NEW.invite_state<>'not_sent' THEN
  PERFORM 1 FROM public.manual_customer_payments
   WHERE agreement_id=a.id AND purpose='initial' AND status='confirmed';
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_required' USING ERRCODE='42501'; END IF;
 END IF;
 IF NEW.user_id IS NOT NULL THEN
  SELECT * INTO u FROM auth.users WHERE id=NEW.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer_identity_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT identity_already_verified AND lower(btrim(u.email)) IS DISTINCT FROM a.customer_email THEN
   RAISE EXCEPTION 'customer_identity_mismatch' USING ERRCODE='42501';
  END IF;
  IF NEW.activated_at IS NOT NULL AND u.email_confirmed_at IS NULL THEN
   RAISE EXCEPTION 'verified_account_required' USING ERRCODE='42501';
  END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_customer_activation() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
