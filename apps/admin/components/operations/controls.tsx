"use client";
import { useRef, useState } from "react";
import { getDictionary, useTranslation } from "@darb-rest/i18n";
import { TASK_NEXT, type ItemTask, type KitchenOrder, type OperationStaff } from "@darb-rest/types";
import { changeRestaurantOperation } from "../../lib/actions/operations";
export function useOperation(location: string, done: () => void | Promise<void>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    retry = useRef<{ key: string; id: string } | null>(null);
  async function run(action: string, payload: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const key = JSON.stringify({ action, payload });
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    try {
      const r = await changeRestaurantOperation({
        action_id: retry.current.id,
        location_id: location,
        action,
        payload,
      });
      if (!r.ok) setError(t(`ordering.${r.error}` as Parameters<typeof t>[0]));
      else retry.current = null;
      await done();
      return r.ok;
    } catch {
      setError(t("operations.saveError"));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export function TaskControls({
  tasks,
  location,
  enabled,
  done,
}: {
  tasks: ItemTask[];
  location: string;
  enabled: boolean;
  done: () => Promise<void>;
}) {
  const { locale } = useTranslation();
  const L = getDictionary(locale).operations;
  const { busy, error, run } = useOperation(location, done);
  return (
    <div className="mt-3 space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-surface-elevated)] p-3 text-sm"
        >
          <span>
            <bdi>{task.station_name ?? L.unassigned}</bdi> · {L[task.state]}
          </span>
          {TASK_NEXT[task.state] && (
            <button
              disabled={busy || !enabled}
              className="min-h-11 rounded-xl border px-3 disabled:opacity-40"
              onClick={() =>
                void run("task", {
                  id: task.id,
                  revision: task.revision,
                  state: TASK_NEXT[task.state],
                })
              }
            >
              {L[TASK_NEXT[task.state]!]}
            </button>
          )}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function OrderOperationControls({
  order,
  manager,
  staff,
  enabled,
  done,
}: {
  order: KitchenOrder;
  manager: boolean;
  staff: OperationStaff[];
  enabled: boolean;
  done: () => Promise<void>;
}) {
  const { locale } = useTranslation();
  const L = getDictionary(locale).operations;
  const { busy, error, run } = useOperation(order.location_id, done);
  const active = !["draft", "completed", "cancelled"].includes(order.status);
  return (
    <div className="my-3 space-y-3 border-t pt-3">
      <button
        aria-pressed={!!order.is_rush}
        disabled={!enabled || busy || !active}
        className="min-h-11 rounded-xl border px-3 aria-pressed:bg-[var(--color-warning-bg)] disabled:opacity-40"
        onClick={() =>
          void run("rush", { id: order.id, revision: order.revision, enabled: !order.is_rush })
        }
      >
        {order.is_rush ? L.rush : L.normal}
      </button>
      <label className="block text-sm">
        {L.assign}
        <select
          className="mt-1 min-h-11 w-full rounded-xl border p-2"
          disabled={!manager || !enabled || busy || !active}
          value={order.assigned_user_id ?? ""}
          onChange={(e) =>
            void run("assign_order", {
              id: order.id,
              revision: order.revision,
              user_id: e.target.value || null,
            })
          }
        >
          <option value="">{L.unassign}</option>
          {staff
            .filter((s) => s.in_branch || s.user_id === order.assigned_user_id)
            .map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      <dl className="space-y-1 text-xs text-[var(--fg-muted)]">
        {(
          ["submitted_at", "accepted_at", "prep_started_at", "ready_at", "completed_at"] as const
        ).map(
          (key) =>
            order[key] && (
              <div key={key} className="flex flex-wrap justify-between gap-2">
                <dt>{key === "submitted_at" ? L.submitted : L[key]}</dt>
                <dd>
                  <time dateTime={order[key]!}>{new Date(order[key]!).toLocaleString(locale)}</time>
                </dd>
              </div>
            ),
        )}
      </dl>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
