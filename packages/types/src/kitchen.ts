import type { ItemTask } from "./operations";
import type { ContentName } from "./content";
import type { OrderStatus } from "./orders";
export const KITCHEN_FILTERS = [
  "active",
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type KitchenFilter = (typeof KITCHEN_FILTERS)[number];
export interface KitchenOrder {
  is_rush?: boolean;
  assigned_user_id?: string | null;
  accepted_at?: string | null;
  prep_started_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  id: string;
  business_id: string;
  location_id: string;
  status: OrderStatus;
  revision: number;
  submitted_at: string;
  customer_name: string;
  fulfillment_mode: "dine_in" | "takeaway";
  table_name: string | null;
  table_area: string | null;
  cancellation_reason: string | null;
  items: {
    tasks?: ItemTask[];
    id: string;
    quantity: number;
    name: ContentName;
    variant: ContentName | null;
    modifiers: { name: ContentName; group: ContentName }[];
  }[];
}
export interface KitchenFeed {
  ready_revision?: number;
  incoming_revision: number;
  orders: KitchenOrder[];
  total: number;
}
export function kitchenMinutes(submitted: string, now: number) {
  return Math.max(0, Math.floor((now - Date.parse(submitted)) / 60000)) || 0;
}
export function isKitchenSignal(
  value: Record<string, unknown>,
  business: string,
  location: string,
) {
  return value.business_id === business && value.location_id === location;
}
/** IDs, not array positions or status changes, identify new arrivals. */
export function kitchenArrivals(previous: ReadonlySet<string>, orders: KitchenOrder[]) {
  return orders.filter((o) => o.status === "submitted" && !previous.has(o.id)).map((o) => o.id);
}
