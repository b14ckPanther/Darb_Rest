"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDictionary, useTranslation } from "@darb-rest/i18n";
import { ContentText } from "@darb-rest/ui";
import {
  TABLE_STATES,
  localizedContent,
  type OperationsContext,
  type Station,
} from "@darb-rest/types";
import { KitchenBoard } from "../kitchen/board";
import { useOperation } from "./controls";
export function OperationsWorkspace({
  businessId,
  locationId,
}: {
  businessId: string;
  locationId: string;
}) {
  const { locale } = useTranslation();
  const L = getDictionary(locale).operations;
  const [data, setData] = useState<OperationsContext | null>(null),
    [error, setError] = useState(false),
    [station, setStation] = useState(""),
    [mine, setMine] = useState(false),
    [offset, setOffset] = useState(0);
  const requestVersion = useRef(0);
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const r = await fetch(`/api/operations?location=${locationId}&offset=${offset}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const v = await r.json();
      if (version !== requestVersion.current) return;
      if (!v.ok) {
        setError(true);
        if (v.error === "forbidden") setData(null);
        return;
      }
      setData(v.context);
      setError(false);
    } catch {
      if (version !== requestVersion.current) return;
      setError(true);
    }
  }, [locationId, offset]);
  useEffect(() => {
    let disposed = false;
    const run = () => {
      if (!disposed) void reload();
    };
    run();
    const timer = setInterval(run, 15000);
    return () => {
      disposed = true;
      requestVersion.current++;
      clearInterval(timer);
    };
  }, [reload]);
  const op = useOperation(locationId, reload);
  if (!data)
    return (
      <div className="space-y-3">
        <p role="status">{error ? L.loadError : L.loading}</p>
        <button className="min-h-11 rounded-xl border px-4" onClick={() => void reload()}>
          {L.refresh}
        </button>
      </div>
    );
  const label = (key: string) => L[key as keyof typeof L] ?? key;
  return (
    <div className="space-y-6">
      {(error || op.error) && <p role="alert">{op.error || L.loadError}</p>}
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 text-sm">
          {L.stations}
          <select
            className="mt-2 min-h-12 w-full rounded-xl border bg-[var(--bg-surface)] px-3"
            aria-label={L.stations}
            value={station}
            onChange={(e) => setStation(e.target.value)}
          >
            <option value="">{L.allStations}</option>
            <option value="unassigned">{L.unassigned}</option>
            {data.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.is_active ? ` · ${L.inactive}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          {L.mine}
        </label>
      </div>
      <details className="rounded-2xl border bg-[var(--bg-surface)] p-5">
        <summary className="cursor-pointer py-2 font-semibold">{L.management}</summary>
        <div className="mt-5 space-y-6">
          <fieldset className="flex flex-wrap gap-4" disabled={error || op.busy}>
            <legend className="mb-3 font-semibold">{L.notifications}</legend>
            {(["new_orders", "ready_orders"] as const).map((key) => (
              <label className="flex min-h-11 items-center gap-2" key={key}>
                <input
                  type="checkbox"
                  checked={data.preferences[key]}
                  onChange={(e) =>
                    void op.run("preferences", { ...data.preferences, [key]: e.target.checked })
                  }
                />
                {key === "new_orders" ? L.newOrders : L.readyOrders}
              </label>
            ))}
          </fieldset>
          {data.manager && (
            <>
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">{L.stations}</h2>
                <StationForm key="new" location={locationId} done={reload} disabled={error} />
                {data.stations.map((s) => (
                  <StationForm
                    key={`${s.id}:${s.revision}`}
                    station={s}
                    location={locationId}
                    done={reload}
                    disabled={error}
                  />
                ))}
              </section>
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">{L.routing}</h2>
                <p className="text-sm text-[var(--fg-muted)]">{L.futureRouting}</p>
                <form
                  className="flex flex-wrap gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const selected = data.catalog.find((c) => c.id === form.get("target"));
                    if (selected)
                      void op.run("route", {
                        id: selected.id,
                        kind: selected.kind,
                        station_id: String(form.get("station")),
                        enabled: true,
                      });
                  }}
                >
                  <select
                    aria-label={L.item}
                    name="target"
                    required
                    className="min-h-11 min-w-0 flex-1 rounded-xl border p-2"
                  >
                    {data.catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {label(c.kind)} · {localizedContent(c.name, locale).text}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={L.routingStation}
                    name="station"
                    required
                    className="min-h-11 rounded-xl border p-2"
                  >
                    {data.stations
                      .filter((s) => s.is_active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={
                      error ||
                      op.busy ||
                      !data.catalog.length ||
                      !data.stations.some((s) => s.is_active)
                    }
                    className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
                  >
                    {L.enable}
                  </button>
                </form>
                <ul className="divide-y">
                  {data.routes.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <span>
                        <ContentText
                          value={
                            data.catalog.find((c) => c.id === (r.item_id ?? r.section_id))
                              ?.name ?? { en: (r.item_id ?? r.section_id)! }
                          }
                          locale={locale}
                        />{" "}
                        · <bdi>{data.stations.find((s) => s.id === r.station_id)?.name}</bdi>
                      </span>
                      <button
                        disabled={error || op.busy}
                        className="min-h-11 px-3"
                        onClick={() =>
                          void op.run("route", {
                            id: r.item_id ?? r.section_id,
                            kind: r.item_id ? "item" : "section",
                            station_id: r.station_id,
                            enabled: false,
                          })
                        }
                      >
                        {L.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-semibold">{L.roster}</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.staff.map((s) => (
                    <label
                      key={s.user_id}
                      className="flex min-h-11 items-center gap-3 rounded-xl border p-3"
                    >
                      <input
                        type="checkbox"
                        disabled={error || op.busy}
                        checked={s.in_branch}
                        onChange={(e) =>
                          void op.run("roster", { user_id: s.user_id, enabled: e.target.checked })
                        }
                      />
                      <bdi>{s.name}</bdi>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{L.tables}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {data.tables
                .filter((t) => !mine || t.assigned_user_id === data.user_id)
                .map((t) => (
                  <article key={t.id} className="space-y-3 rounded-xl border p-4">
                    <h3 className="font-bold">
                      <bdi>{t.name}</bdi>
                    </h3>
                    <label className="block text-sm">
                      {L.table_state}
                      <select
                        className="mt-1 min-h-11 w-full rounded-xl border p-2"
                        value={t.state}
                        disabled={error || op.busy}
                        onChange={(e) =>
                          void op.run("table_state", {
                            id: t.id,
                            revision: t.revision,
                            state: e.target.value,
                          })
                        }
                      >
                        {TABLE_STATES.map((s) => (
                          <option key={s} value={s}>
                            {L[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      {L.assign}
                      <select
                        className="mt-1 min-h-11 w-full rounded-xl border p-2"
                        value={t.assigned_user_id ?? ""}
                        disabled={!data.manager || error || op.busy}
                        onChange={(e) =>
                          void op.run("assign_table", {
                            id: t.id,
                            revision: t.revision,
                            user_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">{L.unassign}</option>
                        {data.staff
                          .filter((s) => s.in_branch || s.user_id === t.assigned_user_id)
                          .map((s) => (
                            <option key={s.user_id} value={s.user_id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </article>
                ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{L.history}</h2>
            <ul className="divide-y">
              {data.history.map((h) => (
                <li className="space-y-1 py-3 text-sm" key={h.id}>
                  <p className="font-semibold">
                    {label(h.action)} ·{" "}
                    <bdi>
                      {data.staff.find((s) => s.user_id === h.actor_id)?.name ?? h.actor_id ?? ""}
                    </bdi>
                  </p>
                  <p className="break-all text-xs">
                    <bdi>{h.target_id}</bdi> ·{" "}
                    <time>{new Date(h.created_at).toLocaleString(locale)}</time>
                  </p>
                  {typeof h.payload.to === "string" && (
                    <p>{getDictionary(locale).ordering[String(h.payload.to) as "submitted"]}</p>
                  )}
                  {typeof h.payload.state === "string" && <p>{label(String(h.payload.state))}</p>}
                </li>
              ))}
            </ul>
            <div className="flex justify-between">
              <button
                disabled={!offset}
                className="min-h-11 px-3 disabled:opacity-40"
                onClick={() => setOffset((n) => Math.max(0, n - 50))}
              >
                {L.previous}
              </button>
              <button
                disabled={offset + 50 >= data.history_total}
                className="min-h-11 px-3 disabled:opacity-40"
                onClick={() => setOffset((n) => n + 50)}
              >
                {L.next}
              </button>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{L.printers}</h2>
            <p className="text-sm text-[var(--fg-muted)]">{L.printerNote}</p>
            <ul className="divide-y">
              {data.printer_events.map((e) => (
                <li key={e.id} className="break-all py-3 text-sm">
                  {getDictionary(locale).ordering[e.kind]} · <bdi>{e.order_id}</bdi> ·{" "}
                  <time>{new Date(e.created_at).toLocaleString(locale)}</time>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </details>
      <p className="text-sm text-[var(--fg-muted)]">{L.prepNote}</p>
      <KitchenBoard
        key={`${station}:${mine}`}
        businessId={businessId}
        locationId={locationId}
        advanced={{
          stationId: station && station !== "unassigned" ? station : null,
          unassigned: station === "unassigned",
          mine,
          manager: data.manager,
          staff: data.staff,
          preferences: data.preferences,
        }}
      />
    </div>
  );
}
function StationForm({
  station,
  location,
  done,
  disabled,
}: {
  station?: Station;
  location: string;
  done: () => Promise<void>;
  disabled: boolean;
}) {
  const { locale } = useTranslation();
  const L = getDictionary(locale).operations;
  const [id, setId] = useState(() => station?.id ?? crypto.randomUUID());
  const [name, setName] = useState(station?.name ?? ""),
    [active, setActive] = useState(station?.is_active ?? true);
  const op = useOperation(location, done);
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          (await op.run("station", { id, revision: station?.revision ?? 0, name, active })) &&
          !station
        ) {
          setName("");
          setId(crypto.randomUUID());
        }
      }}
    >
      <label className="min-w-0 flex-1 text-sm">
        {station ? L.name : L.newStation}
        <input
          required
          maxLength={64}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border px-3"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {L.active}
      </label>
      <button
        disabled={disabled || op.busy || !name.trim()}
        className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
      >
        {L.save}
      </button>
      {op.error && (
        <p role="alert" className="w-full">
          {op.error}
        </p>
      )}
    </form>
  );
}
