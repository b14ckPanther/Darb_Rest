import type { Instrumentation } from "next";
import { validateProduction } from "@darb-rest/config";
export function register() {
  if (process.env.NEXT_PHASE !== "phase-production-build") validateProduction();
}
/** Deliberately omit raw errors, URLs, headers, cookies and request bodies. */
export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      application: "public",
      router: context.routerKind,
      at: new Date().toISOString(),
    }),
  );
};
