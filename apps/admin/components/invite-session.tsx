"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@darb-rest/supabase/client";
import { activationLabels, type SupportedLocale } from "@darb-rest/i18n";
/** Supports Supabase's standard ConfirmationURL fragment without retaining tokens in history. */
export function InviteSession({
  locale,
  destination = "auth/accept-invite",
}: {
  locale: SupportedLocale;
  destination?: "auth/accept-invite" | "account";
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token"),
      refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;
    window.history.replaceState(null, "", window.location.pathname);
    void getBrowserClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setFailed(true);
        else window.location.replace(`/${locale}/${destination}`);
      });
  }, [locale, destination]);
  return failed ? <p role="alert">{activationLabels[locale].invalid}</p> : null;
}
