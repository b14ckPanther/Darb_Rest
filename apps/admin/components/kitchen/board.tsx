"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getDictionary, useTranslation } from "@darb-rest/i18n";
import { ContentText } from "@darb-rest/ui";
import { getBrowserClient } from "@darb-rest/supabase/client";
import {
  KITCHEN_FILTERS,
  isKitchenSignal,
  kitchenArrivals,
  kitchenMinutes,
  nextOrderStatuses,
  type KitchenFilter,
  type KitchenOrder,
  type KitchenFeed,
} from "@darb-rest/types";
import { OrderOperationControls, TaskControls } from "../operations/controls";
import type { OperationStaff, NotificationPreferences } from "@darb-rest/types";
export interface AdvancedKitchen {
  stationId: string | null;
  unassigned: boolean;
  mine: boolean;
  manager: boolean;
  staff: OperationStaff[];
  preferences: NotificationPreferences;
}
import { operateKitchen } from "../../lib/actions/kitchen";
export function KitchenBoard({
  businessId,
  locationId,
  advanced,
}: {
  businessId: string;
  locationId: string;
  advanced?: AdvancedKitchen;
}) {
  const { locale } = useTranslation();
  const { kitchen: L, ordering: O } = getDictionary(locale);
  const [filter, setFilter] = useState<KitchenFilter>("active");
  const [offset, setOffset] = useState(0);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label={O.status}>
        {KITCHEN_FILTERS.map((s) => (
          <button
            key={s}
            aria-pressed={filter === s}
            className="min-h-11 rounded-xl border px-4 text-sm aria-pressed:bg-[var(--darb-green-deep)] aria-pressed:text-white"
            onClick={() => {
              setFilter(s);
              setOffset(0);
            }}
          >
            {s === "active" ? L.active : O[s]}
          </button>
        ))}
      </div>
      <KitchenQueue
        key={`${filter}:${offset}`}
        businessId={businessId}
        locationId={locationId}
        filter={filter}
        offset={offset}
        setOffset={setOffset}
        advanced={advanced}
      />
    </section>
  );
}
function KitchenQueue({
  businessId,
  locationId,
  filter,
  offset,
  setOffset,
  advanced,
}: {
  businessId: string;
  locationId: string;
  filter: KitchenFilter;
  offset: number;
  setOffset: (n: number) => void;
  advanced?: AdvancedKitchen;
}) {
  const { locale, t } = useTranslation();
  const { kitchen: L, ordering: O, tables: T, operations: A } = getDictionary(locale);
  const [orders, setOrders] = useState<KitchenOrder[]>([]),
    [total, setTotal] = useState(0),
    [fresh, setFresh] = useState(false),
    [live, setLive] = useState(false),
    [newIds, setNewIds] = useState<string[]>([]),
    [newCount, setNewCount] = useState(0),
    [readyCount, setReadyCount] = useState(0),
    [now, setNow] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [cancelling, setCancelling] = useState(false),
    [sound, setSound] = useState(false);
  const soundRef = useRef<AudioContext | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reload = useRef<() => Promise<void>>(async () => {});
  const lock = useRef(false);
  const retry = useRef<{ key: string; id: string } | null>(null);
  const selectedOrder = orders.find((o) => o.id === selected);
  const beep = useCallback(() => {
    const ctx = soundRef.current;
    if (!ctx || ctx.state !== "running") return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);
  useEffect(
    () => () => {
      void soundRef.current?.close();
    },
    [],
  );
  const stationId = advanced?.stationId ?? null;
  const unassigned = advanced?.unassigned ?? false,
    mine = advanced?.mine ?? false;
  const enhanced = !!advanced;
  const notifyNew = advanced?.preferences.new_orders ?? true,
    notifyReady = advanced?.preferences.ready_orders ?? false;
  useEffect(() => {
    let disposed = false,
      inflight = false,
      again = false,
      initialized = false;
    const seen = new Set<string>();
    let lastIncoming: number | null = null,
      lastReady: number | null = null;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      if (disposed) return;
      if (inflight) {
        again = true;
        return;
      }
      inflight = true;
      try {
        const response = await fetch(
          `${enhanced ? "/api/operations" : "/api/kitchen"}?${new URLSearchParams({ location: locationId, status: filter, offset: String(offset), ...(enhanced ? { view: "orders", station: stationId ?? "", unassigned: String(unassigned), mine: String(mine) } : {}) })}`,
          { cache: "no-store", signal: AbortSignal.timeout(10000) },
        );
        const r = (await response.json()) as
          { ok: true; feed: KitchenFeed } | { ok: false; error: string };
        if (disposed) return;
        if (r.ok) {
          const scoped = r.feed.orders.filter(
            (o) => o.business_id === businessId && o.location_id === locationId,
          );
          if (initialized) {
            const arrivals = kitchenArrivals(seen, scoped);
            if (arrivals.length && notifyNew) {
              setNewIds((ids) => [...new Set([...ids, ...arrivals])]);
            }
          }
          scoped.forEach((o) => seen.add(o.id));
          if (notifyNew && lastIncoming !== null && r.feed.incoming_revision > lastIncoming) {
            const delta = r.feed.incoming_revision - lastIncoming;
            setNewCount((n) => n + delta);
            beep();
          }
          if (notifyReady && lastReady !== null && (r.feed.ready_revision ?? 0) > lastReady) {
            const delta = (r.feed.ready_revision ?? 0) - lastReady;
            setReadyCount((n) => n + delta);
            beep();
          }
          lastReady = r.feed.ready_revision ?? 0;
          lastIncoming = r.feed.incoming_revision;
          initialized = true;
          setOrders(scoped);
          setTotal(r.feed.total);
          setFresh(true);
          setNow(Date.now());
        } else {
          setFresh(false);
          if (r.error === "forbidden") setOrders([]);
        }
      } catch {
        if (!disposed) setFresh(false);
      } finally {
        inflight = false;
        if (again && !disposed) {
          again = false;
          void refresh();
        }
      }
    };
    reload.current = refresh;
    void refresh();
    const db = getBrowserClient();
    const channel = db
      .channel(`kitchen:${businessId}:${locationId}:${filter}:${offset}`, {
        config: { postgres_changes_options: { wait: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_signals",
          filter: `location_id=eq.${locationId}`,
        },
        (payload) => {
          if (!isKitchenSignal(payload.new as Record<string, unknown>, businessId, locationId))
            return;
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 200);
        },
      );
    // Joining before the SSR browser session resolves can subscribe as anon.
    // Bind the authenticated JWT first; never treat an early channel join as a live feed.
    void (async () => {
      try {
        const {
          data: { session },
        } = await db.auth.getSession();
        if (disposed || !session) return;
        await db.realtime.setAuth(session.access_token);
        if (disposed) return;
        channel.subscribe((status) => {
          if (disposed) return;
          setLive(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") void refresh();
        });
      } catch {
        if (!disposed) setLive(false);
      }
    })();
    const interval = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const foreground = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", foreground);
    window.addEventListener("online", foreground);
    const offline = () => {
      setFresh(false);
      setLive(false);
    };
    window.addEventListener("offline", offline);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(debounce);
      document.removeEventListener("visibilitychange", foreground);
      window.removeEventListener("online", foreground);
      window.removeEventListener("offline", offline);
      void db.removeChannel(channel);
    };
  }, [
    businessId,
    locationId,
    filter,
    offset,
    beep,
    enhanced,
    stationId,
    unassigned,
    mine,
    notifyNew,
    notifyReady,
  ]);
  useEffect(() => {
    if (selectedOrder) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selectedOrder]);
  async function act(order: KitchenOrder, status: string) {
    if (lock.current || !fresh) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const input = {
      location_id: locationId,
      id: order.id,
      revision: order.revision,
      status,
      reason: status === "cancelled" ? reason.trim() : "",
    };
    const key = JSON.stringify(input);
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    try {
      const result = await operateKitchen({ ...input, action_id: retry.current.id });
      if (!result.ok) setError(t(`ordering.${result.error}` as Parameters<typeof t>[0]));
      else {
        retry.current = null;
        setCancelling(false);
        setReason("");
      }
      await reload.current();
    } catch {
      setError(O.save_error);
      setFresh(false);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function lines(o: KitchenOrder) {
    return (
      <ul className="divide-y">
        {o.items.map((i) => (
          <li key={i.id} className="py-3">
            <p className="text-lg font-bold">
              <bdi>{i.quantity}</bdi> × <ContentText value={i.name} locale={locale} />
            </p>
            {i.variant && (
              <p className="mt-1 font-semibold">
                <ContentText value={i.variant} locale={locale} />
              </p>
            )}
            {i.modifiers.map((m, n) => (
              <p key={n} className="mt-1 text-sm text-[var(--fg-muted)]">
                <ContentText value={m.group} locale={locale} /> ·{" "}
                <ContentText value={m.name} locale={locale} />
              </p>
            ))}
            {advanced && i.tasks && (
              <TaskControls
                tasks={i.tasks}
                location={locationId}
                enabled={fresh && !busy && o.status === "preparing"}
                done={() => reload.current()}
              />
            )}
          </li>
        ))}
      </ul>
    );
  }
  function context(o: KitchenOrder) {
    return (
      <p className="mt-2 break-words font-semibold">
        {O[o.fulfillment_mode]}
        {o.fulfillment_mode === "dine_in" && o.table_name && (
          <>
            {" "}
            · {T.table} <bdi>{o.table_name}</bdi>
            {o.table_area && (
              <>
                {" "}
                · <bdi>{o.table_area}</bdi>
              </>
            )}
          </>
        )}
      </p>
    );
  }
  const next = (o: KitchenOrder) => nextOrderStatuses[o.status].filter((s) => s !== "cancelled");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[var(--fg-muted)]">
          {fresh ? (live ? L.live : L.fallback) : L.stale}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl border px-4" onClick={() => void reload.current()}>
            {L.refresh}
          </button>
          <button
            aria-pressed={sound}
            className="min-h-11 rounded-xl border px-4"
            onClick={async () => {
              if (sound) {
                await soundRef.current?.close();
                soundRef.current = null;
                setSound(false);
              } else {
                try {
                  const ctx = new AudioContext();
                  await ctx.resume();
                  soundRef.current = ctx;
                  setSound(true);
                } catch {
                  setSound(false);
                }
              }
            }}
          >
            {sound ? L.soundOff : L.soundOn}
          </button>
        </div>
      </div>
      {newCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--darb-green-deep)] p-4 text-white"
        >
          <strong>
            {L.newOrders} · {newCount}
          </strong>
          <button
            className="min-h-11 px-3"
            onClick={() => {
              setNewIds([]);
              setNewCount(0);
            }}
          >
            {L.acknowledge}
          </button>
        </div>
      )}
      {readyCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
        >
          <strong>
            {A.readyNotice} · {readyCount}
          </strong>
          <button className="min-h-11 px-3" onClick={() => setReadyCount(0)}>
            {L.acknowledge}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {fresh && !orders.length && (
        <p className="rounded-3xl border bg-[var(--bg-surface)] p-10 text-center">{L.empty}</p>
      )}
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {orders.map((o) => (
          <article
            key={o.id}
            data-order-id={o.id}
            className={`min-w-0 break-words rounded-3xl border bg-[var(--bg-surface)] p-5 shadow-sm ${newIds.includes(o.id) ? "ring-2 ring-[var(--darb-green-deep)]" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm font-semibold">
                {O[o.status]}
              </span>
              <time
                dateTime={o.submitted_at}
                className={
                  kitchenMinutes(o.submitted_at, now) > 15
                    ? "rounded-lg bg-[var(--color-warning-bg)] px-2 py-1 font-bold"
                    : "text-sm"
                }
              >
                {kitchenMinutes(o.submitted_at, now || Date.parse(o.submitted_at))} {L.age}
              </time>
            </div>
            {context(o)}
            <h2 className="mt-2 break-words text-xl font-bold">
              <bdi>{o.customer_name}</bdi>
            </h2>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              <bdi>{o.id.slice(0, 8)}</bdi>
            </p>
            {lines(o)}
            {advanced && (
              <OrderOperationControls
                order={o}
                manager={advanced.manager}
                staff={advanced.staff}
                enabled={fresh && !busy}
                done={() => reload.current()}
              />
            )}
            {o.cancellation_reason && (
              <p className="my-3 break-words text-sm">
                {L.reason}: <bdi>{o.cancellation_reason}</bdi>
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {next(o).map((s) => (
                <button
                  key={s}
                  disabled={busy || !fresh}
                  className="min-h-12 flex-1 rounded-xl bg-[var(--darb-green-deep)] px-4 font-semibold text-white disabled:opacity-40"
                  onClick={() => void act(o, s)}
                >
                  {L.actions[s as keyof typeof L.actions]}
                </button>
              ))}
              <button
                className="min-h-12 rounded-xl border px-4"
                onClick={() => {
                  setSelected(o.id);
                  setCancelling(false);
                  setReason("");
                }}
              >
                {L.details}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          disabled={offset === 0}
          className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          {L.previous}
        </button>
        <span>
          {L.page} {offset / 50 + 1}
        </span>
        <button
          disabled={offset + 50 >= total}
          className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
          onClick={() => setOffset(offset + 50)}
        >
          {L.next}
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="kitchen-detail-title"
        onClose={() => setSelected(null)}
        className="fixed m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border bg-[var(--bg-surface)] p-6 text-[var(--fg-default)] backdrop:bg-black/40"
      >
        {selectedOrder && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 id="kitchen-detail-title" className="text-xl font-bold">
                {L.details}
              </h2>
              <button className="min-h-11 px-3" onClick={() => dialog.current?.close()}>
                {L.close}
              </button>
            </div>
            {context(selectedOrder)}
            <p className="mt-3 break-all text-xs">
              <bdi>{selectedOrder.id}</bdi>
            </p>
            {lines(selectedOrder)}
            {selectedOrder.cancellation_reason && (
              <p>
                {L.reason}: <bdi>{selectedOrder.cancellation_reason}</bdi>
              </p>
            )}
            {nextOrderStatuses[selectedOrder.status].includes("cancelled") &&
              (cancelling ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(selectedOrder, "cancelled");
                  }}
                >
                  <label className="block">
                    {L.reason}
                    <textarea
                      required
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-2 min-h-28 w-full rounded-xl border p-3"
                    />
                  </label>
                  <p className="text-sm">{L.notice}</p>
                  <button
                    disabled={busy || !fresh || !reason.trim()}
                    className="min-h-12 rounded-xl border px-4 disabled:opacity-40"
                  >
                    {L.confirmCancel}
                  </button>
                </form>
              ) : (
                <button
                  disabled={busy || !fresh}
                  className="mt-4 min-h-12 rounded-xl border px-4"
                  onClick={() => setCancelling(true)}
                >
                  {selectedOrder.status === "submitted" ? L.reject : L.cancelOrder}
                </button>
              ))}
            {error && <p role="alert">{error}</p>}
          </>
        )}
      </dialog>
    </div>
  );
}
