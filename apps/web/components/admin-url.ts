import { APP_PORTS } from "@darb-rest/config";
export const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `http://localhost:${APP_PORTS.ADMIN}`;
