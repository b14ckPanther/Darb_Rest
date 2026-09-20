import type { ContentName } from "./content";
export const TABLE_STATES = ["available", "occupied", "needs_attention", "cleaning"] as const;
export type TableState = (typeof TABLE_STATES)[number];
export type TaskState = "pending" | "preparing" | "ready" | "cancelled";
export const TASK_NEXT: Record<TaskState, TaskState | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: null,
  cancelled: null,
};
export interface ItemTask {
  id: string;
  station_id: string | null;
  station_name: string | null;
  state: TaskState;
  revision: number;
}
export interface Station {
  id: string;
  name: string;
  is_active: boolean;
  revision: number;
}
export interface OperationStaff {
  user_id: string;
  name: string;
  role: string;
  in_branch: boolean;
}
export interface NotificationPreferences {
  new_orders: boolean;
  ready_orders: boolean;
}
export interface PrinterEvent {
  id: string;
  order_id: string;
  kind: "submitted" | "ready" | "cancelled";
  version: 1;
  created_at: string;
}
/** Future trusted server adapter. Events are references to immutable snapshots, never raw printer commands. */
export interface PrinterEventSink {
  accept(event: PrinterEvent, scope: { businessId: string; locationId: string }): Promise<void>;
}
export interface OperationsContext {
  manager: boolean;
  user_id: string;
  stations: Station[];
  routes: { id: string; station_id: string; item_id: string | null; section_id: string | null }[];
  tables: {
    id: string;
    name: string;
    state: TableState;
    assigned_user_id: string | null;
    revision: number;
  }[];
  staff: OperationStaff[];
  catalog: { id: string; name: ContentName; kind: "item" | "section" }[];
  preferences: NotificationPreferences;
  history_total: number;
  history: {
    id: string;
    actor_id: string | null;
    action: string;
    target_id: string | null;
    payload: Record<string, unknown>;
    created_at: string;
  }[];
  printer_events: PrinterEvent[];
}
