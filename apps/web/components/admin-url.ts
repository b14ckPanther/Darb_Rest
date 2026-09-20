import { APP_PORTS, PRODUCTION_DOMAIN } from "@darb-rest/config";

export const adminUrl =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  (process.env.NODE_ENV === "production"
    ? `https://admin.${PRODUCTION_DOMAIN}`
    : `http://localhost:${APP_PORTS.ADMIN}`);
