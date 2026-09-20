import type { TenantRole } from "./roles";
import type { ContentName } from "./content";
export const canViewAnalytics = (role: TenantRole) =>
  ["owner", "admin", "manager", "read_only"].includes(role);
export interface AnalyticsRow {
  kind:
    | "summary"
    | "daily"
    | "hours"
    | "days"
    | "branches"
    | "fulfillment"
    | "payments"
    | "methods"
    | "tables";
  key: string;
  currency: string;
  name: ContentName | null;
  orders: number;
  cancelled: number;
  rejected: number;
  value_cents: number;
  value_orders: number;
  paid_cents: number;
  prep_minutes: number | null;
  prep_samples: number;
  lifecycle_minutes: number | null;
  lifecycle_samples: number;
}
export interface AnalyticsReport {
  timezone: string;
  rows: AnalyticsRow[];
  items: {
    item_id: string;
    currency: string;
    name: ContentName;
    quantity: number;
    value_cents: number;
  }[];
  item_count: number;
}
export function validAnalyticsRange(from: string, to: string) {
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  return (
    date(from) &&
    date(to) &&
    Date.parse(to) >= Date.parse(from) &&
    Date.parse(to) - Date.parse(from) <= 365 * 86400000
  );
}
export function csvCell(value: string | number) {
  const text = String(value);
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}
