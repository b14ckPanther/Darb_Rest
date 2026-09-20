import type { Instrumentation } from "next";
import { validateProduction } from "@darb-rest/config";
export function register() {
  if (process.env.NEXT_PHASE !== "phase-production-build") validateProduction(process.env, "admin");
}
export const onRequestError: Instrumentation.onRequestError = () => {
  console.error(
    JSON.stringify({ event: "request_failed", application: "admin", at: new Date().toISOString() }),
  );
};
