import { ViewTransition, type ReactNode } from "react";
import type { SupportedLocale } from "@darb-rest/i18n";

import { Footer } from "../footer";
import { Header } from "../header";
import { ArrivalHandoff } from "./arrival-handoff";
import "./marketing.css";

/**
 * Shared chrome for Darb-owned marketing pages. The `.rest-site` scope carries the Darb route
 * theme so tenant restaurant pages keep their own identity.
 */
export function MarketingShell({
  arrival = false,
  children,
  locale,
  solid = false,
}: {
  arrival?: boolean;
  children: ReactNode;
  locale: SupportedLocale;
  solid?: boolean;
}) {
  return (
    <div className="rest-site">
      {arrival ? <ArrivalHandoff /> : null}
      <Header solid={solid} />
      <ViewTransition enter="rs-page-in" exit="rs-page-out" default="none">
        {children}
      </ViewTransition>
      <Footer locale={locale} />
    </div>
  );
}
