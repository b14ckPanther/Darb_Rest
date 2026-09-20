"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@darb-rest/ui";
import { useTranslation } from "@darb-rest/i18n";
import type { RestaurantTable } from "@darb-rest/types";
import { manageTable } from "../../lib/actions/tables";
const btn = "min-h-11 rounded-xl border px-4 py-2 text-sm";
export function TableManager({
  tables,
  locationId,
  editable,
  qrIds,
}: {
  tables: RestaurantTable[];
  locationId: string;
  editable: boolean;
  qrIds: string[];
}) {
  const { t, locale } = useTranslation(),
    router = useRouter();
  const L = (k: string) => t(`tables.${k}` as Parameters<typeof t>[0]);
  const [editing, setEditing] = useState<RestaurantTable | null>(null),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [busy, start] = useTransition();
  const [name, setName] = useState(""),
    [area, setArea] = useState(""),
    [active, setActive] = useState(true),
    [createId, setCreateId] = useState("");
  function mutation(row: RestaurantTable, action: "archive" | "regenerate" | "revoke") {
    if (!window.confirm(L(action + "Confirm"))) return;
    start(async () => {
      const result = await manageTable({
        action,
        id: row.id,
        location_id: row.location_id,
        revision: row.revision,
        name: row.name,
        area: row.area,
        is_active: row.is_active,
      });
      if (!result.ok) setError(L(result.error!));
      else {
        setError("");
        router.refresh();
      }
    });
  }
  return (
    <div className="space-y-5">
      {editable && (
        <button
          className={btn + " bg-[var(--darb-green-deep)] text-white"}
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setName("");
            setArea("");
            setActive(true);
            setCreateId(crypto.randomUUID());
            setError("");
          }}
        >
          {L("create")}
        </button>
      )}
      {(creating || editing) && (
        <form
          className="space-y-4 rounded-2xl border bg-[var(--bg-surface)] p-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await manageTable({
                id: editing?.id ?? createId,
                location_id: locationId,
                revision: editing?.revision ?? 0,
                action: editing ? "edit" : "create",
                name,
                area,
                is_active: active,
              });
              if (!result.ok) setError(L(result.error!));
              else {
                setEditing(null);
                setCreating(false);
                setError("");
                router.refresh();
              }
            });
          }}
        >
          <h2 className="text-xl font-bold">{L(editing ? "edit" : "create")}</h2>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <Input
              label={L("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
              dir="auto"
            />
            <Input
              label={L("area")}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={64}
              dir="auto"
            />
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {L("active")}
            </label>
            <div className="flex gap-2">
              <button className={btn} type="submit">
                {L("save")}
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                  setError("");
                }}
              >
                {L("cancel")}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[var(--color-destructive)]">
          {error}
        </p>
      )}
      {!tables.length && (
        <p className="rounded-2xl border p-8 text-[var(--fg-muted)]">{L("empty")}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((row) => (
          <article key={row.id} className="space-y-4 rounded-2xl border bg-[var(--bg-surface)] p-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  <bdi>{row.name}</bdi>
                </h2>
                {row.area && (
                  <p className="text-sm text-[var(--fg-muted)]">
                    <bdi>{row.area}</bdi>
                  </p>
                )}
              </div>
              <span className="rounded-full border px-3 py-1 text-xs">
                {L(row.is_active ? "active" : "inactive")}
              </span>
            </header>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() => {
                    setEditing(row);
                    setCreating(false);
                    setName(row.name);
                    setArea(row.area);
                    setActive(row.is_active);
                    setError("");
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  {L("edit")}
                </button>
                {row.is_active && qrIds.includes(row.id) && (
                  <Link
                    className={btn}
                    href={`/${locale}/tables/print?location=${locationId}&table=${row.id}`}
                  >
                    {L("viewQr")}
                  </Link>
                )}
                <button
                  className={btn}
                  disabled={busy || !row.is_active}
                  onClick={() => mutation(row, "regenerate")}
                >
                  {L("regenerate")}
                </button>
                {qrIds.includes(row.id) && (
                  <button className={btn} disabled={busy} onClick={() => mutation(row, "revoke")}>
                    {L("revoke")}
                  </button>
                )}
                <button className={btn} disabled={busy} onClick={() => mutation(row, "archive")}>
                  {L("archive")}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
