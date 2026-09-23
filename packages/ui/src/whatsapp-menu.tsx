"use client";
import React, { useState, useEffect } from "react";
import {
  restaurantOpen,
  type CartLine,
  priceCartLine,
  cartSubtotal,
  addCartLine,
  localizedContent,
} from "@darb-rest/types";
import { RestaurantMenu, type RestaurantPresentation } from "./restaurant/menu";
import { type MenuPreviewProps, ContentText } from "./menu-preview";
import { RequestSheet } from "./request-sheet";
export function WhatsappMenu({
  restaurant,
  access,
  scope,
  prepare,
  L,
  ...p
}: MenuPreviewProps & {
  restaurant: RestaurantPresentation;
  access: { cart: boolean; reservation: boolean };
  scope: string;
  L: Record<string, string>;
  prepare: (raw: unknown) => Promise<{ url?: string; error?: boolean }>;
}) {
  const [lines, setLines] = useState<CartLine[]>([]),
    [hydrated, setHydrated] = useState(false),
    [config, setConfig] = useState<CartLine | null>(null),
    [mode, setMode] = useState<"order" | "reservation" | null>(null),
    [error, setError] = useState(false),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false);
  const branch = p.locations[0]!.id,
    locale = p.locale,
    button =
      "min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-5 py-3 font-semibold text-white disabled:opacity-50",
    input = "min-h-12 w-full rounded-lg border bg-[var(--bg-surface)] p-3";
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(scope) || "[]");
      if (Array.isArray(stored) && stored.length <= 50) {
        cartSubtotal(p.data, branch, stored);
        setLines(stored);
      }
    } catch {
      /* Invalid/stale local estimates are discarded. */
    }
    setHydrated(true);
  }, [scope, p.data, branch]);
  useEffect(() => {
    if (hydrated)
      try {
        sessionStorage.setItem(scope, JSON.stringify(lines));
      } catch {
        /* Cart remains usable without storage. */
      }
  }, [lines, scope, hydrated]);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: p.data.menu_items[0]?.currency ?? "ILS",
    }).format(n / 100);
  let total: number | null = null;
  try {
    total = cartSubtotal(p.data, branch, lines);
  } catch {
    /* Availability changed. */
  }
  const selected = config ? p.data.menu_items.find((i) => i.id === config.item_id) : null;
  const groups = selected
    ? p.data.modifier_groups.filter((g) =>
        p.data.item_modifier_groups.some(
          (a) => a.item_id === selected.id && a.modifier_group_id === g.id,
        ),
      )
    : [];
  function open(kind: "order" | "reservation") {
    setMode(kind);
    setError(false);
    setUrl("");
  }
  return (
    <div className={`whatsapp-menu ${restaurant.settings.template === "caramel" ? "caramel-flow" : ""}`}>
      <RestaurantMenu
        {...p}
        restaurant={restaurant}
        onConfigure={
          access.cart
            ? (id) => {
                const variants = p.data.item_variants.filter(
                  (v) => v.item_id === id && v.is_available,
                );
                setConfig({
                  item_id: id,
                  variant_id: variants.length === 1 ? variants[0]!.id : null,
                  modifier_ids: [],
                  quantity: 1,
                });
                setError(false);
              }
            : undefined
        }
        addLabel={L.add}
      />
      {hydrated && restaurantOpen(restaurant.profile, new Date()) === false && (
        <p className="mx-auto max-w-5xl p-4 text-sm">{L.closed}</p>
      )}
      {(access.cart || access.reservation) && (
        <div className="sticky bottom-0 z-20 mx-auto flex max-w-5xl flex-wrap justify-center gap-3 border-t bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {access.cart && (
            <button className={button} onClick={() => open("order")}>
              {L.cart} · {total === null ? "—" : money(total)}
            </button>
          )}
          {access.reservation && (
            <button className="min-h-12 rounded-lg border px-5" onClick={() => open("reservation")}>
              {L.request}
            </button>
          )}
        </div>
      )}
      {config && selected && (
        <RequestSheet
          title={localizedContent(selected.name_i18n, locale).text}
          closeLabel={L.close!}
          onClose={() => setConfig(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                priceCartLine(p.data, branch, config);
                setLines(addCartLine(lines, config));
                setConfig(null);
                setError(false);
              } catch {
                setError(true);
              }
            }}
          >
            {p.data.item_variants.some((v) => v.item_id === selected.id) && (
              <fieldset>
                <legend>{p.labels.variants}</legend>
                {p.data.item_variants
                  .filter((v) => v.item_id === selected.id)
                  .map((v) => (
                    <label key={v.id} className="flex min-h-12 items-center gap-3">
                      <input
                        type="radio"
                        name="variant"
                        required
                        disabled={!v.is_available}
                        checked={config.variant_id === v.id}
                        onChange={() => setConfig({ ...config, variant_id: v.id })}
                      />
                      <ContentText value={v.name_i18n} locale={locale} />
                      <bdi>{money(Math.round(v.price * 100))}</bdi>
                    </label>
                  ))}
              </fieldset>
            )}
            {groups.map((g) => (
              <fieldset key={g.id}>
                <legend>
                  <ContentText value={g.name_i18n} locale={locale} /> (
                  {Math.max(g.min_select, g.is_required ? 1 : 0)}–{g.max_select})
                </legend>
                {p.data.modifiers
                  .filter((m) => m.modifier_group_id === g.id)
                  .map((m) => (
                    <label key={m.id} className="flex min-h-12 items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={!m.is_available}
                        checked={config.modifier_ids.includes(m.id)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            modifier_ids: e.target.checked
                              ? [...config.modifier_ids, m.id]
                              : config.modifier_ids.filter((id) => id !== m.id),
                          })
                        }
                      />
                      <ContentText value={m.name_i18n} locale={locale} />
                      <bdi>+{money(Math.round(m.price_delta * 100))}</bdi>
                    </label>
                  ))}
              </fieldset>
            ))}
            <label className="grid gap-2">
              {L.quantity}
              <input
                className={input}
                type="number"
                min="1"
                max="99"
                required
                value={config.quantity}
                onChange={(e) => setConfig({ ...config, quantity: Number(e.target.value) })}
              />
            </label>
            {error && <p role="alert">{L.invalid}</p>}
            <button className={button}>{L.add}</button>
          </form>
        </RequestSheet>
      )}
      {mode && (
        <RequestSheet
          title={mode === "order" ? L.cart! : L.request!}
          closeLabel={L.close!}
          onClose={() => setMode(null)}
          busy={busy}
        >
          <form
            className="space-y-5"
            onChange={() => setUrl("")}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setUrl("");
              setError(false);
              const f = new FormData(e.currentTarget);
              try {
                const r = await prepare({
                  kind: mode,
                  name: f.get("name"),
                  phone: f.get("phone"),
                  notes: f.get("notes"),
                  ...(mode === "order"
                    ? { lines }
                    : {
                        guests: Number(f.get("guests")),
                        date: f.get("date"),
                        time: f.get("time"),
                      }),
                });
                if (r.url) setUrl(r.url);
                else setError(true);
              } catch {
                setError(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "order" ? (
              <div className="space-y-4">
                {lines.map((line, i) => {
                  let price;
                  try {
                    price = priceCartLine(p.data, branch, line);
                  } catch {
                    /* Render removable stale lines. */
                  }
                  return (
                    <div key={i} className="space-y-2 border-b pb-3">
                      <p>{price ? localizedContent(price.name, locale).text : L.invalid}</p>
                      {price?.variantName && (
                        <ContentText value={price.variantName} locale={locale} />
                      )}
                      <p>
                        {price?.modifiers
                          .map((m) => localizedContent(m.name, locale).text)
                          .join(", ")}
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          aria-label={L.quantity}
                          className="min-h-11 w-20 rounded-lg border p-2"
                          type="number"
                          min="1"
                          max="99"
                          value={line.quantity}
                          onChange={(e) =>
                            setLines(
                              lines.map((x, j) =>
                                j === i ? { ...x, quantity: Number(e.target.value) } : x,
                              ),
                            )
                          }
                        />
                        <bdi>{price ? money(price.totalCents) : "—"}</bdi>
                        <button
                          type="button"
                          className="min-h-11 px-3 underline"
                          onClick={() => {
                            setLines(lines.filter((_, j) => i !== j));
                            setUrl("");
                          }}
                        >
                          {L.remove}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <p className="font-bold">
                  {L.total}: <bdi>{total === null ? "—" : money(total)}</bdi>
                </p>
              </div>
            ) : (
              <p>{L.requestNote}</p>
            )}
            {(["name", "phone"] as const).map((k) => (
              <label key={k} className="grid gap-2">
                {L[k]}
                <input
                  className={input}
                  name={k}
                  type={k === "phone" ? "tel" : "text"}
                  dir={k === "phone" ? "ltr" : "auto"}
                  autoComplete={k === "phone" ? "tel" : "name"}
                  maxLength={k === "phone" ? 30 : 120}
                  required
                />
              </label>
            ))}
            {mode === "reservation" &&
              (["guests", "date", "time"] as const).map((k) => (
                <label key={k} className="grid gap-2">
                  {L[k]}
                  <input
                    className={input}
                    name={k}
                    type={k === "guests" ? "number" : k}
                    min={k === "guests" ? 1 : undefined}
                    max={k === "guests" ? 100 : undefined}
                    required
                  />
                </label>
              ))}
            <label className="grid gap-2">
              {L.notes}
              <textarea className={input} name="notes" maxLength={1000} rows={3} />
            </label>
            {error && <p role="alert">{L.invalid}</p>}
            <button
              disabled={busy || (mode === "order" && (!lines.length || total === null))}
              className={button}
            >
              {L.send}
            </button>
            {url && (
              <div role="status">
                <p>{L.ready}</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-12 items-center underline"
                >
                  {L.open}
                </a>
              </div>
            )}
          </form>
        </RequestSheet>
      )}
    </div>
  );
}
