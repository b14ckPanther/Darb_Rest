"use client";
import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@darb-rest/i18n";
import { Button as BaseButton, type ButtonProps, Input, ContentText } from "@darb-rest/ui";
import { IconPlus, IconMenu, IconClose } from "@darb-rest/icons";
import {
  ALLERGENS,
  DIETARY_TAGS,
  canEditMenuContent,
  canManageAvailability,
  sortContent,
  localizedContent,
  formatMenuPrice,
  type ContentTable,
  type ContentName,
  type ContentLocale,
} from "@darb-rest/types";
import { validModifierCapacity } from "@darb-rest/validation";
import { saveContent, setAvailability } from "../../lib/actions/content";
import type { loadContent } from "../../lib/content/service";
// Keep the content actions within the brand palette with AA label contrast.
function Button(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      style={
        {
          "--color-primary": "#b45309",
          "--color-primary-hover": "#92400e",
          "--color-primary-fg": "#ffffff",
          minHeight: 44,
          ...props.style,
        } as React.CSSProperties
      }
    />
  );
}
type Loaded = NonNullable<Awaited<ReturnType<typeof loadContent>>>;
type Row = Record<string, unknown> & { id: string };
type Op = { table: ContentTable; row?: Record<string, unknown>; id?: string; delete?: boolean };
const clean = (v: unknown): Row =>
  Object.fromEntries(
    Object.entries(v as object).filter(
      ([k]) => !["business_id", "created_at", "updated_at"].includes(k),
    ),
  ) as Row;
function Names({
  value,
  onChange,
  locale,
  label,
  optional = false,
}: {
  value: ContentName;
  onChange: (v: ContentName) => void;
  locale: ContentLocale;
  label: string;
  optional?: boolean;
}) {
  const { t } = useTranslation();
  const [lang, setLang] = useState(locale);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex gap-1" role="group" aria-label={label}>
          {(["ar", "he", "en"] as const).map((l) => (
            <button
              type="button"
              key={l}
              aria-pressed={l === lang}
              onClick={() => setLang(l)}
              className={`min-h-11 min-w-11 rounded-lg px-2 text-xs ${l === lang ? "bg-[var(--darb-green-deep)] text-white" : "bg-[var(--bg-surface-elevated)]"}`}
              lang="en"
            >
              {l.toUpperCase()}
              {!value[l]?.trim() ? " ·" : ""}
            </button>
          ))}
        </div>
      </div>
      <Input
        aria-label={`${label} ${lang.toUpperCase()}`}
        lang={lang}
        dir={lang === "en" ? "ltr" : "rtl"}
        value={value[lang] ?? ""}
        maxLength={optional ? 2000 : 160}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
      />
      <p className="text-xs text-[var(--fg-muted)]">{t("content.optionalTranslation")}</p>
    </div>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--darb-green-deep)]"
      />
      {label}
    </label>
  );
}
export function ContentEditor({ loaded, menuId }: { loaded: Loaded; menuId?: string }) {
  const { locale, t } = useTranslation();
  const L = (key: string) => t(`content.${key}` as Parameters<typeof t>[0]);
  const router = useRouter();
  const data = loaded.content;
  const editable = canEditMenuContent(loaded.role);
  const [dialog, setDialog] = useState<{ table: ContentTable; row: Row; fresh: boolean } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const menu = data.menus.find((m) => m.id === menuId);
  const run = (ops: Op[]) => {
    setNotice("");
    start(async () => {
      const result = await saveContent(ops);
      setNotice(L(result.ok ? "saved" : result.error));
      if (result.ok) router.refresh();
    });
  };
  const edit = (table: ContentTable, row: unknown) =>
    setDialog({ table, row: clean(row), fresh: false });
  const create = (table: ContentTable, extra: Record<string, unknown> = {}) =>
    setDialog({
      table,
      row: {
        id: crypto.randomUUID(),
        name_i18n: {},
        description_i18n: {},
        sort_order: data[table].length,
        ...extra,
      },
      fresh: true,
    });
  const reorder = (table: ContentTable, rows: unknown[], index: number, step: number) => {
    const next = [...rows];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    run(next.map((r, i) => ({ table, row: { ...clean(r), sort_order: i } })));
  };
  const actions = (table: ContentTable, row: unknown, rows: unknown[], index: number) => (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        className="min-h-11"
        variant="ghost"
        disabled={pending}
        onClick={() => edit(table, row)}
      >
        {L("edit")}
      </Button>
      <Button
        size="sm"
        className="min-h-11"
        variant="ghost"
        disabled={pending || index === 0}
        onClick={() => reorder(table, rows, index, -1)}
        aria-label={`${L("up")} ${localizedContent((row as { name_i18n: ContentName }).name_i18n, locale).text}`}
      >
        {L("up")}
      </Button>
      <Button
        size="sm"
        className="min-h-11"
        variant="ghost"
        disabled={pending || index === rows.length - 1}
        onClick={() => reorder(table, rows, index, 1)}
        aria-label={`${L("down")} ${localizedContent((row as { name_i18n: ContentName }).name_i18n, locale).text}`}
      >
        {L("down")}
      </Button>
    </div>
  );
  const menus = sortContent(data.menus.filter((m) => m.status !== "archived"));
  const sections = sortContent(data.menu_sections.filter((s) => s.menu_id === menuId));
  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {menu && (
            <Link
              className="mb-3 inline-block text-sm text-[var(--fg-muted)]"
              href={`/${locale}/menus`}
            >
              {L("back")}
            </Link>
          )}
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            {L("title")}
          </p>
          <h1 className="text-3xl font-bold">
            {menu ? <ContentText value={menu.name_i18n} locale={locale} /> : L("title")}
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{L("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {menu ? (
            <>
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm"
                href={`/${locale}/menus/${menu.id}/preview`}
              >
                {L("preview")}
              </Link>
              {editable && <Button onClick={() => edit("menus", menu)}>{L("editMenu")}</Button>}
            </>
          ) : (
            editable && (
              <Button
                startIcon={<IconPlus size={16} />}
                onClick={() => create("menus", { status: "draft", is_default: false })}
              >
                {L("createMenu")}
              </Button>
            )
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="rounded-lg bg-[var(--bg-surface-elevated)] p-3 text-sm">
          {notice}
        </p>
      )}
      {!editable && <p className="text-sm text-[var(--fg-muted)]">{L("readOnly")}</p>}
      {!menu ? (
        <div className="overflow-hidden rounded-2xl border bg-[var(--bg-surface)]">
          {menus.length === 0 ? (
            <div className="p-10 text-center">
              <IconMenu className="mx-auto mb-4 text-[var(--fg-muted)]" size={30} />
              <p>{L("noMenus")}</p>
            </div>
          ) : (
            menus.map((m, i) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b p-5 last:border-0"
              >
                <div className="min-w-0">
                  <Link
                    className="text-xl font-semibold hover:underline"
                    href={`/${locale}/menus/${m.id}`}
                  >
                    <ContentText value={m.name_i18n} locale={locale} />
                  </Link>
                  <p className="mt-2 text-xs text-[var(--fg-muted)]">
                    {L(m.status)} · {data.menu_sections.filter((s) => s.menu_id === m.id).length}{" "}
                    {L("sections")} ·{" "}
                    {
                      data.menu_items.filter(
                        (it) =>
                          !it.archived_at &&
                          data.menu_sections.some(
                            (s) => s.menu_id === m.id && s.id === it.section_id,
                          ),
                      ).length
                    }{" "}
                    {L("count")}
                  </p>
                  <p className="mt-2 text-xs">
                    {data.menu_locations
                      .filter((a) => a.menu_id === m.id && a.is_enabled)
                      .map(
                        (a) =>
                          localizedContent(
                            loaded.locations.find((l) => l.id === a.location_id)?.name ?? {},
                            locale,
                          ).text,
                      )
                      .join(" · ")}
                  </p>
                </div>
                {editable && actions("menus", m, menus, i)}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{L("sections")}</h2>
            {editable && (
              <Button
                variant="secondary"
                onClick={() => create("menu_sections", { menu_id: menu.id, is_visible: true })}
              >
                {L("addSection")}
              </Button>
            )}
          </div>
          <Input label={L("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          {sections.length === 0 && (
            <p className="py-10 text-center text-[var(--fg-muted)]">{L("noSections")}</p>
          )}
          {sections.map((s, index) => {
            const all = sortContent(
              data.menu_items.filter((i) => i.section_id === s.id && !i.archived_at),
            );
            const items = all.filter((i) =>
              Object.values(i.name_i18n).some((n) =>
                n?.toLowerCase().includes(search.toLowerCase()),
              ),
            );
            return (
              <section className="rounded-2xl border bg-[var(--bg-surface)]" key={s.id}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                  <div>
                    <h2 className="text-xl font-semibold">
                      <ContentText value={s.name_i18n} locale={locale} />
                    </h2>
                    {!s.is_visible && <span className="text-xs">{L("hidden")}</span>}
                  </div>
                  {editable && actions("menu_sections", s, sections, index)}
                </header>
                <div className="divide-y">
                  {items.map((item) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      key={item.id}
                    >
                      <div className="min-w-0">
                        <h3 className="font-medium">
                          <ContentText value={item.name_i18n} locale={locale} />
                        </h3>
                        <p className="mt-1 text-sm text-[var(--fg-muted)]">
                          <bdi>{formatMenuPrice(item.base_price, item.currency, locale)}</bdi> ·{" "}
                          {L(item.is_visible ? "visible" : "hidden")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {canManageAvailability(loaded.role) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="min-h-11"
                            disabled={pending}
                            aria-pressed={item.is_available}
                            onClick={() =>
                              start(async () => {
                                const r = await setAvailability(item.id, !item.is_available);
                                if (r.ok) router.refresh();
                                else setNotice(L("saveError"));
                              })
                            }
                          >
                            {L(item.is_available ? "available" : "soldOut")}
                          </Button>
                        )}
                        {editable &&
                          actions(
                            "menu_items",
                            item,
                            all,
                            all.findIndex((i) => i.id === item.id),
                          )}
                      </div>
                    </div>
                  ))}
                </div>
                {!items.length && (
                  <p className="p-5 text-sm text-[var(--fg-muted)]">{L("noItems")}</p>
                )}
                {editable && (
                  <div className="p-4">
                    <Button
                      variant="ghost"
                      startIcon={<IconPlus size={16} />}
                      onClick={() =>
                        create("menu_items", {
                          section_id: s.id,
                          base_price: 0,
                          currency: loaded.business.currency,
                          is_visible: true,
                          is_available: true,
                          sku: null,
                          image_path: null,
                        })
                      }
                    >
                      {L("addItem")}
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
      <section className="border-t pt-7">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{L("groups")}</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{L("groupHint")}</p>
          </div>
          {editable && (
            <Button
              variant="secondary"
              onClick={() =>
                create("modifier_groups", { min_select: 0, max_select: 1, is_required: false })
              }
            >
              {L("addGroup")}
            </Button>
          )}
        </div>
        <div className="mt-4 divide-y">
          {sortContent(data.modifier_groups).map((g, i) => (
            <div className="flex flex-wrap items-center justify-between gap-2 py-3" key={g.id}>
              <ContentText value={g.name_i18n} locale={locale} />
              {editable && actions("modifier_groups", g, sortContent(data.modifier_groups), i)}
            </div>
          ))}
        </div>
        {!data.modifier_groups.length && (
          <p className="py-6 text-sm text-[var(--fg-muted)]">{L("noGroups")}</p>
        )}
      </section>
      {dialog && (
        <EditDialog
          key={dialog.row.id}
          loaded={loaded}
          table={dialog.table}
          initial={dialog.row}
          fresh={dialog.fresh}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
            setNotice(L("saved"));
          }}
        />
      )}
    </div>
  );
}
function EditDialog({
  loaded,
  table,
  initial,
  fresh,
  onClose,
  onSaved,
}: {
  loaded: Loaded;
  table: ContentTable;
  initial: Row;
  fresh: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locale, t } = useTranslation();
  const L = (key: string) => t(`content.${key}` as Parameters<typeof t>[0]);
  const [row, setRow] = useState<Row>(initial);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaImage, setMediaImage] = useState(loaded.images[String(initial.image_path)]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState("identity");
  const data = loaded.content;
  const field = (key: string, v: unknown) => setRow((r) => ({ ...r, [key]: v }));
  const [variants, setVariants] = useState<Row[]>(
    data.item_variants.filter((v) => v.item_id === row.id).map(clean),
  );
  const [options, setOptions] = useState<Row[]>(
    data.modifiers.filter((v) => v.modifier_group_id === row.id).map(clean),
  );
  const [assignments, setAssignments] = useState<string[]>(
    fresh && loaded.locations.length === 1
      ? [loaded.locations[0]!.id]
      : data.menu_locations
          .filter((a) => a.menu_id === row.id && a.is_enabled)
          .map((a) => a.location_id),
  );
  const [groups, setGroups] = useState(
    data.item_modifier_groups.filter((a) => a.item_id === row.id).map((a) => a.modifier_group_id),
  );
  const [tags, setTags] = useState<string[]>(
    data.item_dietary_tags.filter((a) => a.item_id === row.id).map((a) => a.code),
  );
  const [allergens, setAllergens] = useState<string[]>(
    data.item_allergens.filter((a) => a.item_id === row.id).map((a) => a.code),
  );
  const [overrides, setOverrides] = useState<Row[]>(
    data.menu_item_location_overrides.filter((a) => a.item_id === row.id).map(clean),
  );
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const toggle = (list: string[], set: (x: string[]) => void, key: string, v: boolean) =>
    set(v ? [...list, key] : list.filter((k) => k !== key));
  const replace = (target: ContentTable, old: unknown[], next: Row[]): Op[] => [
    ...old
      .map(clean)
      .filter((x) => !next.some((n) => n.id === x.id))
      .map((x) => ({ table: target, id: x.id, delete: true })),
    ...next.map((x, i) => ({ table: target, row: { ...x, sort_order: i } })),
  ];
  const links = (
    target: "item_dietary_tags" | "item_allergens" | "item_modifier_groups",
    keys: string[],
    key: string,
  ): Op[] => {
    const old = data[target].filter((x) => x.item_id === row.id);
    return replace(
      target,
      old,
      keys.map((code) => {
        const existing = old.find((x) => (x as unknown as Record<string, unknown>)[key] === code);
        return { id: existing?.id ?? crypto.randomUUID(), item_id: row.id, [key]: code };
      }),
    );
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (
      table === "modifier_groups" &&
      !validModifierCapacity(
        Number(row.min_select),
        Number(row.max_select),
        options.map((o) => ({ is_available: o.is_available !== false })),
      )
    ) {
      setError(L("invalid"));
      return;
    }
    const main = { ...row };
    if (!fresh && table === "menu_items") delete main.image_path;
    if (["modifier_groups"].includes(table)) delete main.description_i18n;
    let ops: Op[] = [];
    if (table === "menus" && row.is_default)
      ops = data.menus
        .filter((m) => m.id !== row.id && m.is_default)
        .map((m) => ({ table: "menus", row: { ...clean(m), is_default: false } }));
    ops.push({ table, row: main });
    if (table === "menus") {
      const old = data.menu_locations.filter((a) => a.menu_id === row.id);
      ops.push(
        ...replace(
          "menu_locations",
          old,
          assignments.map((location_id) => ({
            id: old.find((a) => a.location_id === location_id)?.id ?? crypto.randomUUID(),
            menu_id: row.id,
            location_id,
            is_enabled: true,
          })),
        ),
      );
    }
    if (table === "menu_items") {
      ops.push(
        ...replace(
          "item_variants",
          data.item_variants.filter((v) => v.item_id === row.id),
          variants,
        ),
        ...links("item_modifier_groups", groups, "modifier_group_id"),
        ...links("item_dietary_tags", tags, "code"),
        ...links("item_allergens", allergens, "code"),
        ...replace(
          "menu_item_location_overrides",
          data.menu_item_location_overrides.filter((a) => a.item_id === row.id),
          overrides,
        ),
      );
    }
    if (table === "modifier_groups")
      ops.push(
        ...replace(
          "modifiers",
          data.modifiers.filter((v) => v.modifier_group_id === row.id),
          options,
        ),
      );
    start(async () => {
      const r = await saveContent(ops);
      if (r.ok) onSaved();
      else setError(L(r.error));
    });
  };
  const childEditor = (
    kind: "item_variants" | "modifiers",
    rows: Row[],
    set: (v: Row[]) => void,
  ) => (
    <div className="space-y-4">
      {rows.map((child, index) => (
        <div className="space-y-3 rounded-xl bg-[var(--bg-surface-elevated)] p-4" key={child.id}>
          <Names
            label={L("name")}
            locale={loaded.business.default_locale}
            value={child.name_i18n as ContentName}
            onChange={(v) => set(rows.map((r, i) => (i === index ? { ...r, name_i18n: v } : r)))}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            dir="ltr"
            label={`${L(kind === "item_variants" ? "price" : "delta")} (${loaded.business.currency})`}
            value={Number(child[kind === "item_variants" ? "price" : "price_delta"])}
            onChange={(e) =>
              set(
                rows.map((r, i) =>
                  i === index
                    ? {
                        ...r,
                        [kind === "item_variants" ? "price" : "price_delta"]: Number(
                          e.target.value,
                        ),
                      }
                    : r,
                ),
              )
            }
          />
          <Check
            label={L("available")}
            checked={child.is_available !== false}
            onChange={(v) => set(rows.map((r, i) => (i === index ? { ...r, is_available: v } : r)))}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              disabled={index === 0}
              onClick={() => {
                const n = [...rows];
                [n[index - 1], n[index]] = [n[index]!, n[index - 1]!];
                set(n);
              }}
            >
              {L("up")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              disabled={index === rows.length - 1}
              onClick={() => {
                const n = [...rows];
                [n[index + 1], n[index]] = [n[index]!, n[index + 1]!];
                set(n);
              }}
            >
              {L("down")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => set(rows.filter((_, i) => i !== index))}
            >
              {L("remove")}
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          set([
            ...rows,
            {
              id: crypto.randomUUID(),
              [kind === "item_variants" ? "item_id" : "modifier_group_id"]: row.id,
              name_i18n: {},
              [kind === "item_variants" ? "price" : "price_delta"]: 0,
              is_available: true,
            },
          ])
        }
      >
        {L(kind === "item_variants" ? "addVariant" : "addModifier")}
      </Button>
    </div>
  );
  const tabs =
    table === "menu_items"
      ? ["identity", "customize", "dietary", "overrides", "image"]
      : ["identity"];
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        if (busy || mediaBusy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="content-dialog-title"
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-2xl overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-0 text-[var(--fg-default)] shadow-xl backdrop:bg-black/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-[var(--bg-surface)] p-5">
        <h2 id="content-dialog-title" className="text-xl font-bold">
          {L(
            table === "menus"
              ? "editMenu"
              : table === "menu_sections"
                ? "sections"
                : table === "modifier_groups"
                  ? "groups"
                  : "items",
          )}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy || mediaBusy}
          className="flex h-11 w-11 items-center justify-center rounded-lg border"
          aria-label={L("close")}
        >
          <IconClose size={18} />
        </button>
      </div>
      <form onSubmit={submit} className="space-y-5 p-5">
        <fieldset disabled={busy || mediaBusy} className="min-w-0 space-y-5">
          {tabs.length > 1 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label={L("edit")}>
              {tabs.map((key) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={`min-h-11 rounded-lg px-3 text-sm ${tab === key ? "bg-[var(--darb-green-deep)] text-white" : "bg-[var(--bg-surface-elevated)]"}`}
                >
                  {L(key)}
                </button>
              ))}
            </div>
          )}
          {tab === "identity" && (
            <>
              <Names
                label={L("name")}
                value={row.name_i18n as ContentName}
                onChange={(v) => field("name_i18n", v)}
                locale={loaded.business.default_locale}
              />
              {table !== "modifier_groups" && (
                <Names
                  optional
                  label={L("description")}
                  value={(row.description_i18n ?? {}) as ContentName}
                  onChange={(v) => field("description_i18n", v)}
                  locale={loaded.business.default_locale}
                />
              )}
              {table === "menus" && (
                <>
                  <label className="block text-sm">
                    {L("status")}
                    <select
                      value={String(row.status)}
                      onChange={(e) => field("status", e.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border bg-transparent p-2"
                    >
                      {["draft", "active", "archived"].map((s) => (
                        <option key={s} value={s}>
                          {L(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Check
                    label={L("defaultMenu")}
                    checked={!!row.is_default}
                    onChange={(v) => field("is_default", v)}
                  />
                  <fieldset>
                    <legend className="font-semibold">{L("branches")}</legend>
                    <Check
                      label={L("allBranches")}
                      checked={assignments.length === loaded.locations.length}
                      onChange={(v) => setAssignments(v ? loaded.locations.map((l) => l.id) : [])}
                    />
                    {loaded.locations.map((l) => (
                      <Check
                        key={l.id}
                        label={localizedContent(l.name, locale).text}
                        checked={assignments.includes(l.id)}
                        onChange={(v) => toggle(assignments, setAssignments, l.id, v)}
                      />
                    ))}
                  </fieldset>
                </>
              )}
              {table === "menu_sections" && (
                <Check
                  label={L("visible")}
                  checked={!!row.is_visible}
                  onChange={(v) => field("is_visible", v)}
                />
              )}
              {table === "menu_items" && (
                <>
                  <Input
                    label={`${L("price")} (${loaded.business.currency})`}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    dir="ltr"
                    value={Number(row.base_price)}
                    onChange={(e) => field("base_price", Number(e.target.value))}
                  />
                  <Check
                    label={L("visible")}
                    checked={!!row.is_visible}
                    onChange={(v) => field("is_visible", v)}
                  />
                  <Check
                    label={L("available")}
                    checked={!!row.is_available}
                    onChange={(v) => field("is_available", v)}
                  />
                </>
              )}
              {table === "modifier_groups" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label={L("min")}
                      type="number"
                      min="0"
                      value={Number(row.min_select)}
                      onChange={(e) => {
                        field("min_select", Number(e.target.value));
                        field("is_required", Number(e.target.value) > 0);
                      }}
                    />
                    <Input
                      label={L("max")}
                      type="number"
                      min="0"
                      value={Number(row.max_select)}
                      onChange={(e) => field("max_select", Number(e.target.value))}
                    />
                  </div>
                  <p className="text-sm text-[var(--fg-muted)]">{L("groupHint")}</p>
                  {childEditor("modifiers", options, setOptions)}
                </>
              )}
            </>
          )}
          {tab === "customize" && (
            <>
              <h3 className="font-semibold">{L("variants")}</h3>
              <p className="text-xs text-[var(--fg-muted)]">{L("variantHint")}</p>
              {childEditor("item_variants", variants, setVariants)}
              <h3 className="pt-4 font-semibold">{L("groups")}</h3>
              {data.modifier_groups.map((g) => (
                <Check
                  key={g.id}
                  label={localizedContent(g.name_i18n, locale).text}
                  checked={groups.includes(g.id)}
                  onChange={(v) => toggle(groups, setGroups, g.id, v)}
                />
              ))}
            </>
          )}
          {tab === "dietary" && (
            <>
              <fieldset>
                <legend className="font-semibold">{L("dietary")}</legend>
                <div className="grid grid-cols-2 gap-1">
                  {DIETARY_TAGS.map((code) => (
                    <Check
                      key={code}
                      label={L(code)}
                      checked={tags.includes(code)}
                      onChange={(v) => toggle(tags, setTags, code, v)}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-semibold">{L("allergens")}</legend>
                <div className="grid grid-cols-2 gap-1">
                  {ALLERGENS.map((code) => (
                    <Check
                      key={code}
                      label={L(code)}
                      checked={allergens.includes(code)}
                      onChange={(v) => toggle(allergens, setAllergens, code, v)}
                    />
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-[var(--fg-muted)]">{L("disclaimer")}</p>
            </>
          )}
          {tab === "overrides" && (
            <>
              <p className="text-xs text-[var(--fg-muted)]">{L("branchHint")}</p>
              {loaded.locations.map((l) => {
                const o = overrides.find((x) => x.location_id === l.id);
                const update = (key: string, v: unknown) =>
                  setOverrides((old) => {
                    const found = old.find((x) => x.location_id === l.id);
                    const next = {
                      id: found?.id ?? crypto.randomUUID(),
                      item_id: row.id,
                      location_id: l.id,
                      is_visible_override: null,
                      is_available_override: null,
                      price_override: null,
                      ...found,
                      [key]: v,
                    };
                    return [...old.filter((x) => x.location_id !== l.id), next].filter(
                      (x) =>
                        x.price_override !== null ||
                        x.is_visible_override !== null ||
                        x.is_available_override !== null,
                    );
                  });
                return (
                  <fieldset key={l.id} className="space-y-3 rounded-xl border p-4">
                    <legend className="px-2 font-semibold">
                      <ContentText value={l.name} locale={locale} />
                    </legend>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      label={L("price")}
                      placeholder={L("inherit")}
                      value={
                        o?.price_override === null || o?.price_override === undefined
                          ? ""
                          : Number(o.price_override)
                      }
                      onChange={(e) =>
                        update(
                          "price_override",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                    {["is_visible_override", "is_available_override"].map((key) => (
                      <label className="block text-sm" key={key}>
                        {L(key === "is_visible_override" ? "visible" : "available")}
                        <select
                          aria-label={L(key === "is_visible_override" ? "visible" : "available")}
                          className="mt-2 min-h-11 w-full rounded-lg border bg-transparent p-2"
                          value={
                            o?.[key] === null || o?.[key] === undefined ? "inherit" : String(o[key])
                          }
                          onChange={(e) =>
                            update(
                              key,
                              e.target.value === "inherit" ? null : e.target.value === "true",
                            )
                          }
                        >
                          <option value="inherit">{L("inherit")}</option>
                          <option value="true">{L("yes")}</option>
                          <option value="false">{L("no")}</option>
                        </select>
                      </label>
                    ))}
                  </fieldset>
                );
              })}
            </>
          )}
          {tab === "image" &&
            (fresh ? (
              <p>{L("saveBeforeImage")}</p>
            ) : (
              <Media
                itemId={row.id}
                image={mediaImage}
                onError={setError}
                onBusy={setMediaBusy}
                onChanged={(path, url) => {
                  field("image_path", path);
                  setMediaImage(url ?? undefined);
                }}
              />
            ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {!fresh && ["menus", "menu_items"].includes(table) && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy || mediaBusy}
              onClick={() => {
                if (!window.confirm(L("archiveConfirm"))) return;
                start(async () => {
                  const r = await saveContent([
                    {
                      table,
                      row: {
                        ...Object.fromEntries(
                          Object.entries(clean(initial)).filter(
                            ([key]) => table !== "menu_items" || key !== "image_path",
                          ),
                        ),
                        archived_at: new Date().toISOString(),
                        ...(table === "menus"
                          ? { status: "archived", is_default: false }
                          : { is_visible: false }),
                      },
                    },
                  ]);
                  if (r.ok) onSaved();
                  else setError(L(r.error));
                });
              }}
            >
              {L("archive")}
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={busy || mediaBusy} onClick={onClose}>
            {L("cancel")}
          </Button>
          <Button type="submit" disabled={mediaBusy} isLoading={busy}>
            {L("save")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
function Media({
  itemId,
  image,
  onError,
  onBusy,
  onChanged,
}: {
  itemId: string;
  image?: string;
  onError: (v: string) => void;
  onBusy: (v: boolean) => void;
  onChanged: (path: string | null, url: string | null) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(image);
  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const upload = async (file: File | null) => {
    setBusy(true);
    onBusy(true);
    onError("");
    const form = new FormData();
    form.set("itemId", itemId);
    if (file) form.set("image", file);
    else form.set("remove", "true");
    try {
      const response = await fetch("/api/menu-media", { method: "POST", body: form });
      if (!response.ok) throw Error();
      const result = await response.json();
      onChanged(result.path, result.url);
      setPreview(file ? URL.createObjectURL(file) : undefined);
    } catch {
      onError(t("content.invalidImage"));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {preview && <img src={preview} alt="" className="h-44 w-full rounded-xl object-cover" />}
      <label className="block text-sm">
        {t("content.upload")}
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      <p className="text-xs text-[var(--fg-muted)]">{t("content.imageHint")}</p>
      {preview && (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void upload(null)}>
          {t("content.removeImage")}
        </Button>
      )}
    </div>
  );
}
