"use client";
import React, { useEffect, useState, useTransition } from "react";
import { RequestSheet as Sheet } from "./request-sheet";
import {
  addCartLine,
  cartSubtotal,
  priceCartLine,
  formatMenuPrice,
  localizedContent,
  sortContent,
  type CartLine,
  type OrderInput,
  type OrderResult,
  type OrderSummary,
  type FulfillmentMode,
  type PaymentSummary,
} from "@darb-rest/types";
import { MenuPreview, ContentText, type MenuPreviewProps } from "./menu-preview";
import { RestaurantMenu, type RestaurantPresentation } from "./restaurant/menu";
import { Input } from "./input";
type Props = MenuPreviewProps & {
  restaurant?: RestaurantPresentation;
  orderLabels: Record<string, string>;
  initialOrder?: OrderSummary | null;
  persist: (value: OrderInput) => Promise<OrderResult>;
  readOnly?: boolean;
  previewOnly?: boolean;
  scope: string;
  receiptQuery?: boolean;
  tableContext?: { name: string; area: string } | null;
  tableLabels?: Record<string, string>;
  checkout?: (value: OrderInput, method: "restaurant" | "online") => Promise<OrderResult>;
  paymentLabels?: Record<string, string>;
  initialPayment?: PaymentSummary | null;
  onlineAvailable?: boolean;
  testPayment?: (
    id: string,
    status: "paid" | "failed" | "cancelled" | "refunded",
  ) => Promise<boolean>;
};
const button =
  "min-h-11 rounded-xl bg-[#1a3c2a] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-xl border px-4 py-2 text-sm";

export function OrderingMenu({
  restaurant,
  orderLabels: L,
  persist,
  initialOrder,
  readOnly = false,
  previewOnly = false,
  scope,
  receiptQuery = false,
  tableContext,
  tableLabels: T = {},
  checkout,
  paymentLabels: P = {},
  initialPayment,
  onlineAvailable = false,
  testPayment,
  ...props
}: Props) {
  const Menu = restaurant ? RestaurantMenu : MenuPreview;
  const { data, locale } = props;
  const [branch, setBranch] = useState(initialOrder?.location_id ?? props.locations[0]?.id ?? "");
  const [lines, setLines] = useState<CartLine[]>(initialOrder?.cart ?? []);
  const [id, setId] = useState(initialOrder?.id ?? "");
  const [revision, setRevision] = useState(initialOrder?.revision ?? 0);
  const [customer, setCustomer] = useState(initialOrder?.customer_name ?? "");
  const [phone, setPhone] = useState(initialOrder?.customer_phone ?? "");
  const [mode, setMode] = useState<FulfillmentMode>(initialOrder?.fulfillment_mode ?? "dine_in");
  const [done, setDone] = useState<OrderSummary | null>(
    initialOrder && initialOrder.status !== "draft" ? initialOrder : null,
  );
  const [payment, setPayment] = useState(initialPayment ?? null);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"restaurant" | "online">("restaurant");
  const [cartOpen, setCartOpen] = useState(false);
  const [config, setConfig] = useState<{ line: CartLine; index: number | null } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialOrder?.status === "draft" ? L.resume : "");
  const [busy, start] = useTransition();
  const [restored, setRestored] = useState(false);
  // Persist only cart intent, never customer contact details. Server drafts own saved PII.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(scope);
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved &&
          props.locations.some((l) => l.id === saved.branch) &&
          Array.isArray(saved.lines) &&
          saved.lines.length <= 50 &&
          saved.lines.every(
            (l: CartLine) =>
              typeof l.item_id === "string" &&
              (typeof l.variant_id === "string" || l.variant_id === null) &&
              Array.isArray(l.modifier_ids) &&
              l.modifier_ids.every((v) => typeof v === "string") &&
              Number.isInteger(l.quantity) &&
              l.quantity >= 1 &&
              l.quantity <= 99,
          ) &&
          typeof saved.id === "string" &&
          Number.isInteger(saved.revision) &&
          saved.revision >= 0 &&
          (!initialOrder ||
            (saved.id === initialOrder.id && saved.revision >= initialOrder.revision))
        ) {
          setBranch(saved.branch);
          if (saved.mode === "dine_in" || saved.mode === "takeaway") setMode(saved.mode);
          setLines(saved.lines);
          setId(saved.id);
          setRevision(saved.revision);
        }
      }
    } catch {
      /* Storage may be unavailable. The cart still works in memory. */
    }
    setRestored(true);
    // The server snapshot is read once; subsequent edits remain scoped to this mounted session.
  }, [scope]);
  useEffect(() => {
    if (!restored) return;
    try {
      if (done) sessionStorage.removeItem(scope);
      else sessionStorage.setItem(scope, JSON.stringify({ branch, lines, id, revision, mode }));
    } catch {
      /* Optional local recovery. */
    }
  }, [branch, lines, id, revision, mode, done, restored, scope]);
  let subtotal = 0,
    pricingError = "";
  try {
    subtotal = cartSubtotal(data, branch, lines);
  } catch (e) {
    pricingError = e instanceof Error ? e.message : "invalid_cart";
  }
  const currency = initialOrder?.currency ?? data.menu_items[0]?.currency ?? "ILS";
  const money = (cents: number) => formatMenuPrice(cents / 100, currency, locale);
  const reset = () => {
    if (receiptQuery) {
      const url = new URL(location.href);
      url.searchParams.delete("order");
      history.replaceState(null, "", url);
    }
    setDone(null);
    setPayment(null);
    setCheckoutStep(false);
    setLines([]);
    setId("");
    setRevision(0);
    setNotice("");
    setError("");
    setCustomer("");
    setPhone("");
  };
  const openItem = (itemId: string, index: number | null = null) => {
    setError("");
    const available = data.item_variants.filter((v) => v.item_id === itemId && v.is_available);
    setConfig({
      index,
      line:
        index === null
          ? {
              item_id: itemId,
              variant_id: available.length === 1 ? available[0]!.id : null,
              modifier_ids: [],
              quantity: 1,
            }
          : { ...lines[index]!, modifier_ids: [...lines[index]!.modifier_ids] },
    });
  };
  const save = (submit: boolean) => {
    if (previewOnly) return;
    setError("");
    setNotice("");
    if (
      (submit && !lines.length) ||
      pricingError ||
      !customer.trim() ||
      (mode === "takeaway" && !phone.trim())
    ) {
      setError(L[pricingError || "invalid_cart"]!);
      return;
    }
    const orderId = id || crypto.randomUUID();
    setId(orderId);
    start(async () => {
      let result: OrderResult;
      try {
        const input: OrderInput = {
          id: orderId,
          location_id: branch,
          lines,
          customer_name: customer,
          customer_phone: phone,
          fulfillment_mode: mode,
          expected_subtotal_cents: subtotal,
          revision,
          submit,
        };
        result = submit && checkout ? await checkout(input, paymentMethod) : await persist(input);
      } catch {
        result = { ok: false, error: "save_error" };
      }
      if (!result.ok) {
        setError(T[result.error] ?? P[result.error] ?? L[result.error] ?? L.save_error!);
        return;
      }
      setRevision(result.order.revision);
      if (receiptQuery) {
        const url = new URL(location.href);
        url.searchParams.set("order", result.order.id);
        history.replaceState(null, "", url);
      }
      setNotice(submit ? "" : L.saved!);
      if (submit) {
        setDone(result.order);
        setPayment(result.payment ?? null);
        setCartOpen(false);
        setLines([]);
        if (result.redirectUrl) window.location.assign(result.redirectUrl);
      }
    });
  };
  const selected = config ? data.menu_items.find((i) => i.id === config.line.item_id) : null;
  const groups = selected
    ? sortContent(
        data.modifier_groups.filter((g) =>
          data.item_modifier_groups.some(
            (a) => a.item_id === selected.id && a.modifier_group_id === g.id,
          ),
        ),
      )
    : [];
  let configuredPrice: number | null = null;
  if (config)
    try {
      configuredPrice = priceCartLine(data, branch, config.line).totalCents;
    } catch {
      /* Show a complete estimate only after choices are valid. */
    }
  return (
    <div className={`space-y-5 pb-24 ${restaurant?.settings.template === "caramel" ? "caramel-flow" : ""}`}>
      {tableContext && !done && (
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white px-5 py-4">
          <p className="font-semibold">
            {T.table}: <bdi>{tableContext.name}</bdi>
            {tableContext.area && (
              <>
                {" "}
                · <bdi>{tableContext.area}</bdi>
              </>
            )}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">
            {mode === "takeaway" ? T.takeawayNote : T.contextNote}
          </p>
        </div>
      )}
      {done ? (
        <section
          className="mx-auto max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-6"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--fg-muted)]">{L[done.status]}</p>
          <h1 className="mt-2 text-3xl font-bold">
            {payment?.method === "online" && payment.status !== "paid"
              ? (P[payment.status + "Title"] ?? P.pendingTitle)
              : L.submittedTitle}
          </h1>
          <p className="mt-4">
            {payment
              ? P[payment.method === "restaurant" ? "restaurantNote" : payment.status + "Note"]
              : L.submittedNote}
          </p>
          {payment && (
            <div className="mt-4 space-y-3 rounded-xl border p-4">
              <p>
                {P.title}: <strong>{P[payment.status]}</strong>
              </p>
              <p className="break-all text-xs">
                {P.reference}: <bdi>{payment.reference}</bdi>
              </p>
              <button className={secondary} onClick={() => window.location.reload()}>
                {P.refresh}
              </button>
              {testPayment && payment.method === "online" && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm">{P.testNotice}</p>
                  <div className="flex flex-wrap gap-2">
                    {(payment.status === "paid"
                      ? (["refunded"] as const)
                      : payment.status === "pending"
                        ? (["paid", "failed", "cancelled"] as const)
                        : []
                    ).map((status) => (
                      <button
                        key={status}
                        disabled={busy}
                        className={secondary}
                        onClick={() =>
                          start(async () => {
                            if (await testPayment(payment.id, status)) window.location.reload();
                            else setError(L.save_error!);
                          })
                        }
                      >
                        {P["test_" + status]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          {done.table_name && (
            <p className="mt-4 font-semibold">
              {T.table}: <bdi>{done.table_name}</bdi>
              {done.table_area && (
                <>
                  {" "}
                  · <bdi>{done.table_area}</bdi>
                </>
              )}
            </p>
          )}
          <p className="mt-5 text-sm">
            {L.reference}: <bdi className="break-all">{done.id}</bdi>
          </p>
          <p className="mt-4 font-semibold">
            {L.subtotal}:{" "}
            <bdi>{formatMenuPrice(done.subtotal_cents / 100, done.currency, locale)}</bdi>
          </p>
          <button className={button + " mt-6"} onClick={reset}>
            {L.newOrder}
          </button>
        </section>
      ) : (
        <Menu
          restaurant={restaurant!}
          {...props}
          branchId={branch}
          onBranchChange={(next) => {
            if (lines.length && !window.confirm(L.changeBranch)) return;
            setBranch(next);
            reset();
          }}
          onConfigure={readOnly ? undefined : openItem}
          addLabel={L.add}
          labels={{
            ...props.labels,
            previewNote: readOnly ? L.readOnly! : (props.labels.previewNote ?? L.orderNote!),
          }}
        />
      )}
      {!done && !readOnly && (
        <div className="sticky bottom-3 z-20 mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-2xl border bg-[var(--bg-surface)] p-3 shadow-xl">
          <div>
            <p className="text-sm">
              {L.cart} · {lines.reduce((n, l) => n + l.quantity, 0)}
            </p>
            <bdi className="font-bold">{pricingError ? "—" : money(subtotal)}</bdi>
          </div>
          <button
            className={button}
            onClick={() => {
              setError("");
              setCheckoutStep(false);
              setCartOpen(true);
            }}
          >
            {L.review}
          </button>
        </div>
      )}
      {cartOpen && (
        <Sheet
          closeLabel={L.close!}
          title={checkoutStep ? P.checkout! : L.cart!}
          busy={busy}
          onClose={() => {
            setCartOpen(false);
            setError("");
          }}
        >
          {!lines.length ? (
            <div className="space-y-4">
              <p>{L.empty}</p>
              {revision > 0 && (
                <button disabled={busy} className={secondary} onClick={() => save(false)}>
                  {L.saveDraft}
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (checkout && !checkoutStep) {
                  setCheckoutStep(true);
                  setError("");
                } else save(true);
              }}
              className="space-y-5"
            >
              <fieldset disabled={busy} className="min-w-0 space-y-5">
                {!checkoutStep &&
                  lines.map((line, index) => {
                    let priced;
                    try {
                      priced = priceCartLine(data, branch, line);
                    } catch {
                      /* Stale lines stay removable. */
                    }
                    const item = data.menu_items.find((i) => i.id === line.item_id);
                    return (
                      <article key={index} className="space-y-3 border-b pb-5">
                        <div className="flex justify-between gap-3">
                          <h3 className="font-semibold">
                            <ContentText
                              value={item?.name_i18n ?? { [locale]: L.unknown! }}
                              locale={locale}
                            />
                          </h3>
                          <bdi>{priced ? money(priced.totalCents) : "—"}</bdi>
                        </div>
                        {priced?.variantName && (
                          <p className="text-sm">
                            <ContentText value={priced.variantName} locale={locale} />
                          </p>
                        )}
                        {priced?.modifiers.map((m) => (
                          <p key={m.id} className="text-sm text-[var(--fg-muted)]">
                            <ContentText value={m.name} locale={locale} />
                          </p>
                        ))}
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="text-sm">
                            {L.quantity}
                            <input
                              aria-label={L.quantity}
                              type="number"
                              min={1}
                              max={99}
                              className="ms-2 h-11 w-16 rounded-lg border bg-transparent px-2"
                              value={line.quantity}
                              onChange={(e) =>
                                setLines(
                                  lines.map((l, i) =>
                                    i === index ? { ...l, quantity: Number(e.target.value) } : l,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className={secondary}
                            onClick={() => openItem(line.item_id, index)}
                          >
                            {L.edit}
                          </button>
                          <button
                            type="button"
                            className={secondary}
                            onClick={() => setLines(lines.filter((_, i) => i !== index))}
                          >
                            {L.remove}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                {tableContext && (
                  <p className="rounded-xl border p-3 text-sm">
                    {mode === "dine_in" ? (
                      <>
                        {T.table}: <bdi>{tableContext.name}</bdi>
                      </>
                    ) : (
                      T.takeawayNote
                    )}
                  </p>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>{L.subtotal}</span>
                  <bdi>{pricingError ? "—" : money(subtotal)}</bdi>
                </div>
                {!checkoutStep && (
                  <>
                    <fieldset className="space-y-2">
                      <legend className="font-semibold">{L.fulfillment}</legend>
                      <div className="flex flex-wrap gap-3">
                        {(["dine_in", "takeaway"] as const).map((value) => (
                          <label
                            key={value}
                            className="flex min-h-11 items-center gap-2 rounded-xl border px-3"
                          >
                            <input
                              type="radio"
                              name="fulfillment"
                              value={value}
                              checked={mode === value}
                              onChange={() => setMode(value)}
                            />
                            {L[value]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <Input
                      label={L.customerName}
                      autoComplete="name"
                      maxLength={100}
                      required
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                    <Input
                      label={mode === "takeaway" ? L.customerPhone : L.phoneOptional}
                      type="tel"
                      autoComplete="tel"
                      maxLength={32}
                      dir="ltr"
                      required={mode === "takeaway"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </>
                )}
                {checkoutStep && (
                  <fieldset className="space-y-3">
                    <legend className="mb-3 font-semibold">{P.method}</legend>
                    {(["restaurant", "online"] as const).map((method) => (
                      <label
                        key={method}
                        className="flex min-h-14 items-center gap-3 rounded-xl border p-4"
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === method}
                          disabled={method === "online" && !onlineAvailable}
                          onChange={() => setPaymentMethod(method)}
                        />
                        <span>
                          {P[method]}
                          {method === "online" && !onlineAvailable && (
                            <span className="mt-1 block text-xs text-[var(--fg-muted)]">
                              {P.onlineUnavailable}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                    <p className="text-sm">{P[paymentMethod + "Note"]}</p>
                    <button
                      type="button"
                      className={secondary}
                      onClick={() => setCheckoutStep(false)}
                    >
                      {P.back}
                    </button>
                  </fieldset>
                )}
                <p className="text-xs text-[var(--fg-muted)]">{L.serverTotal}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondary}
                    disabled={previewOnly}
                    onClick={() => save(false)}
                  >
                    {L.saveDraft}
                  </button>
                  <button type="submit" className={button} disabled={!!pricingError || previewOnly}>
                    {checkout ? (checkoutStep ? P.confirm : P.checkout) : L.submit}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {(error || pricingError) && (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">
              {error || L[pricingError]}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
          <button className={secondary} disabled={busy} onClick={() => setCartOpen(false)}>
            {L.continue}
          </button>
        </Sheet>
      )}
      {config && selected && (
        <Sheet
          closeLabel={L.close!}
          title={localizedContent(selected.name_i18n, locale).text}
          onClose={() => {
            setConfig(null);
            setError("");
          }}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                priceCartLine(data, branch, config.line);
                setLines(
                  config.index === null
                    ? addCartLine(lines, config.line)
                    : lines.map((l, i) => (i === config.index ? config.line : l)),
                );
                setConfig(null);
                setError("");
              } catch (e) {
                setError(L[e instanceof Error ? e.message : "invalid_cart"] ?? L.invalid_cart!);
              }
            }}
          >
            {data.item_variants.some((v) => v.item_id === selected.id) && (
              <fieldset className="space-y-2">
                <legend className="mb-2 font-semibold">{L.variants}</legend>
                {sortContent(data.item_variants.filter((v) => v.item_id === selected.id)).map(
                  (v) => (
                    <label
                      key={v.id}
                      className="flex min-h-12 items-center gap-3 rounded-xl border p-3"
                    >
                      <input
                        type="radio"
                        name="variant"
                        disabled={!v.is_available}
                        checked={config.line.variant_id === v.id}
                        onChange={() =>
                          setConfig({ ...config, line: { ...config.line, variant_id: v.id } })
                        }
                      />
                      <span className="flex-1">
                        <ContentText value={v.name_i18n} locale={locale} />
                        {!v.is_available && " · " + props.labels.soldOut}
                      </span>
                      <bdi>{money(Math.round(v.price * 100))}</bdi>
                    </label>
                  ),
                )}
              </fieldset>
            )}
            {groups.map((g) => (
              <fieldset className="space-y-2" key={g.id}>
                <legend className="font-semibold">
                  <ContentText value={g.name_i18n} locale={locale} />
                </legend>
                <p className="text-xs text-[var(--fg-muted)]">
                  {L[g.is_required ? "required" : "optional"]} · {L.selectionRule} {g.min_select}{" "}
                  {L.and} {g.max_select}
                </p>
                {sortContent(data.modifiers.filter((m) => m.modifier_group_id === g.id)).map(
                  (m) => (
                    <label
                      key={m.id}
                      className="flex min-h-12 items-center gap-3 rounded-xl border p-3"
                    >
                      <input
                        type="checkbox"
                        disabled={!m.is_available}
                        checked={config.line.modifier_ids.includes(m.id)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            line: {
                              ...config.line,
                              modifier_ids: e.target.checked
                                ? [...config.line.modifier_ids, m.id]
                                : config.line.modifier_ids.filter((id) => id !== m.id),
                            },
                          })
                        }
                      />
                      <span className="flex-1">
                        <ContentText value={m.name_i18n} locale={locale} />
                        {!m.is_available && " · " + props.labels.soldOut}
                      </span>
                      <bdi>+{money(Math.round(m.price_delta * 100))}</bdi>
                    </label>
                  ),
                )}
              </fieldset>
            ))}
            <Input
              label={L.quantity}
              type="number"
              min={1}
              max={99}
              required
              value={config.line.quantity}
              onChange={(e) =>
                setConfig({ ...config, line: { ...config.line, quantity: Number(e.target.value) } })
              }
            />
            {error && (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                {error}
              </p>
            )}
            <button type="submit" className={button + " w-full"}>
              {config.index === null ? L.add : L.edit}
              {configuredPrice !== null && (
                <>
                  {" "}
                  · <bdi>{money(configuredPrice)}</bdi>
                </>
              )}
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
