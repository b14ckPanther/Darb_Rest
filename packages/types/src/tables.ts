import type { TenantRole } from "./roles";
export const TABLE_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export interface RestaurantTable {
  id: string;
  business_id: string;
  location_id: string;
  name: string;
  area: string;
  is_active: boolean;
  archived_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}
export interface PublicTableContext {
  table_id: string;
  business_slug: string;
  location_slug: string;
  name: string;
  area: string;
}
export const canManageTables = (role: TenantRole) => ["owner", "admin", "manager"].includes(role);
export function tableQrUrl(origin: string, locale: string, token: string) {
  if (!TABLE_TOKEN_PATTERN.test(token) || !["ar", "he", "en"].includes(locale))
    throw Error("invalid_table");
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw Error("invalid_origin");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw Error("invalid_origin");
  return `${url.origin}/${locale}/q/${token}`;
}
