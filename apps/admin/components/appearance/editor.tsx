"use client";
import { useEffect, useRef, useState } from "react";
import { getDictionary, useTranslation } from "@darb-rest/i18n";
import { RESTAURANT_TEMPLATES, ContentText } from "@darb-rest/ui";
import {
  templateDefinition,
  LAYOUT_OPTIONS,
  resolvedLayout,
  sameAppearance,
  brandingUrl,
  type AppearanceSettings,
  type ContentName,
} from "@darb-rest/types";
import { appearanceSchema } from "@darb-rest/validation";
import { saveAppearance } from "../../lib/actions/appearance";
export function AppearanceEditor({
  settings: initial,
  revision: initialRevision,
  published: initialPublished,
  locations,
  businessSlug,
  businessId,
  persistenceReady,
}: {
  settings: AppearanceSettings;
  published: AppearanceSettings;
  revision: number;
  locations: { id: string; name: ContentName; slug: string }[];
  businessSlug: string;
  businessId: string;
  persistenceReady: boolean;
}) {
  const { locale } = useTranslation(),
    L = getDictionary(locale).appearance;
  const [settings, setSettings] = useState(initial),
    [revision, setRevision] = useState(initialRevision),
    [tag, setTag] = useState("all"),
    [device, setDevice] = useState("mobile"),
    [branch, setBranch] = useState(locations[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [savedSettings, setSavedSettings] = useState(initial);
  const [publishedSettings, setPublishedSettings] = useState(initialPublished);
  const dirty = !sameAppearance(settings, savedSettings);
  const live = sameAppearance(settings, publishedSettings);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function upload(kind: "logo" | "cover", file?: File) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(L.uploading);
    try {
      const body = new FormData();
      body.set("businessId", businessId);
      body.set("kind", kind);
      body.set("image", file);
      const response = await fetch("/api/appearance-media", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || typeof result.ref !== "string") throw Error();
      setSettings((current) => ({ ...current, [kind]: result.ref }));
      setMessage(L.uploaded);
    } catch {
      setMessage(L.uploadError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const previewHost = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(390);
  useEffect(() => {
    const host = previewHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() =>
      setPreviewWidth(Math.max(240, host.clientWidth - 24)),
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  const frame = useRef<HTMLIFrameElement>(null),
    lock = useRef(false);
  const current = useRef(settings);
  current.current = settings;
  const post = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "darb-appearance", settings: current.current },
      location.origin,
    );
  useEffect(() => {
    post();
  }, [settings]);
  useEffect(() => {
    const ready = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        e.source === frame.current?.contentWindow &&
        e.data?.type === "darb-preview-ready"
      )
        post();
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, []);
  const selected = templateDefinition(settings.template) ?? RESTAURANT_TEMPLATES[0]!;
  const label = (key: string) => L[key as keyof typeof L] ?? key;
  async function save(publish: boolean) {
    if (lock.current) return;
    if (!appearanceSchema.safeParse(settings).success) {
      setMessage(L.invalid);
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await saveAppearance({
        expectedBusinessId: businessId,
        revision,
        settings,
        publish,
      });
      if (result.ok) {
        setRevision(result.revision);
        setSavedSettings(settings);
        if (publish) setPublishedSettings(settings);
        setMessage(publish ? L.published : L.saved);
      } else setMessage(label(result.error));
    } catch {
      setMessage(L.error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const width = { mobile: 390, tablet: 834, desktop: 1280 }[device] ?? 390;
  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <header className="md:sticky top-0 z-20 flex flex-wrap items-start justify-between gap-5 rounded-xl border bg-[var(--bg-surface)] p-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold">
            {L.title} · {L.templates}
          </h1>
          <p className="mt-2 text-[var(--fg-muted)]">{L.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="#appearance-preview"
            className="inline-flex min-h-11 items-center rounded-xl border px-4"
          >
            {L.previewJump}
          </a>
          <a
            href="#appearance-controls"
            className="inline-flex min-h-11 items-center rounded-xl border px-4"
          >
            {L.editJump}
          </a>
          <button
            disabled={busy}
            onClick={() => void save(false)}
            className="min-h-11 rounded-xl border px-5"
          >
            {L.draft}
          </button>
          <button
            disabled={busy}
            onClick={() => void save(true)}
            className="min-h-11 rounded-xl bg-[#1a3c2a] px-5 text-white"
          >
            {L.publish}
          </button>
        </div>
      </header>
      <aside className="rounded-xl border p-4" aria-label={L.publicationState}>
        <p>{dirty ? L.unsaved : L.savedState}</p>
        <p>{live ? L.liveState : L.draftState}</p>
        <p>
          {L.liveTemplate}: {templateDefinition(publishedSettings.template)?.name[locale]}
        </p>
        <button
          disabled={busy || live}
          onClick={() => {
            setSettings(publishedSettings);
            setMessage("");
          }}
          className="mt-2 min-h-11 rounded-xl border px-4"
        >
          {L.restoreLive}
        </button>
      </aside>
      {!persistenceReady && <p role="alert">{L.error}</p>}
      {message && <p role="status">{message}</p>}
      <section aria-label={L.templates} className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {["all", ...new Set(RESTAURANT_TEMPLATES.flatMap((t) => t.tags))].map((t) => (
            <button
              key={t}
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className="min-h-11 rounded-full border px-4 aria-pressed:bg-[#1a3c2a] aria-pressed:text-white"
            >
              {label(t)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {RESTAURANT_TEMPLATES.filter((t) => tag === "all" || t.tags.includes(tag)).map((t) => (
            <button
              key={t.id}
              data-template-choice={t.id}
              aria-pressed={settings.template === t.id}
              onClick={() =>
                setSettings({
                  ...settings,
                  template: t.id,
                  version: t.version,
                  density: t.densities.includes(settings.density)
                    ? settings.density
                    : t.densities[0]!,
                })
              }
              className="overflow-hidden rounded-2xl border bg-[var(--bg-surface)] text-start shadow-sm aria-pressed:ring-2 aria-pressed:ring-[#1a3c2a]"
            >
              <img
                src={t.previewImage}
                alt=""
                className="aspect-[4/3] w-full border-b object-cover"
                loading="lazy"
              />
              <div className="space-y-2 p-3 sm:p-5">
                <h2 className="text-lg font-semibold">
                  <ContentText value={t.name} locale={locale} />
                </h2>
                <p className="text-sm text-[var(--fg-muted)]">
                  <ContentText value={t.description} locale={locale} />
                </p>
                <span className="inline-flex min-h-11 items-center text-sm font-semibold">
                  {L.choose}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section
        id="appearance-controls"
        className="scroll-mt-40 rounded-2xl border bg-[var(--bg-surface)] p-5"
      >
        <h2 className="mb-5 text-xl font-semibold">{L.customize}</h2>
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={L.palette}>
          {[
            { label: L.paletteForest, primary: "#1a3c2a", accent: "#d5b17a" },
            { label: L.paletteClay, primary: "#803d29", accent: "#e3b57f" },
            { label: L.paletteBerry, primary: "#632f4b", accent: "#dec0cb" },
            { label: L.paletteInk, primary: "#25344d", accent: "#b5c9d3" },
          ].map((palette) => (
            <button
              key={palette.primary}
              disabled={busy}
              onClick={() => {
                setSettings({ ...settings, primary: palette.primary, accent: palette.accent });
                setMessage("");
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4"
            >
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full"
                style={{ background: palette.primary }}
              />
              {palette.label}
            </button>
          ))}
        </div>
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(["primary", "accent"] as const).map((key) => (
            <label key={key} className="text-sm">
              {L[key]}
              <div className="mt-2 flex gap-2">
                <input
                  type="color"
                  aria-label={L[key]}
                  value={settings[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="h-12 w-16"
                />
                <input
                  aria-label={L[key] + " HEX"}
                  value={settings[key]}
                  maxLength={7}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="min-h-12 min-w-0 flex-1 rounded-xl border px-3"
                  dir="ltr"
                />
              </div>
            </label>
          ))}
          <label className="text-sm">
            {L.density}
            <select
              className="mt-2 min-h-12 w-full rounded-xl border px-3"
              value={settings.density}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  density: e.target.value as AppearanceSettings["density"],
                })
              }
            >
              {selected.densities.map((d) => (
                <option key={d} value={d}>
                  {label(d)}
                </option>
              ))}
            </select>
          </label>
          {(["logo", "cover"] as const)
            .filter((key) => key !== "cover" || selected.supportsCover)
            .map((key) => (
              <div key={key} className="space-y-3 rounded-xl border p-4">
                <label className="block">
                  {key === "logo" ? L.uploadLogo : L.uploadCover}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      void upload(key, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                    className="mt-2 block w-full text-sm"
                  />
                </label>
                {settings[key] && (
                  <img
                    src={brandingUrl(settings[key], true)}
                    alt={L[key]}
                    className="max-h-32 max-w-full rounded-lg object-contain"
                  />
                )}
                <button
                  disabled={busy || !settings[key]}
                  onClick={() => {
                    setSettings({ ...settings, [key]: "" });
                    setMessage("");
                  }}
                  className="min-h-11 rounded-xl border px-4"
                >
                  {key === "logo" ? L.removeLogo : L.removeCover}
                </button>
                <details>
                  <summary>{L.legacyUrl}</summary>
                  <label>
                    {L[key]}
                    <input
                      type="url"
                      dir="ltr"
                      maxLength={2048}
                      value={settings[key]}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      className="mt-2 min-h-12 w-full rounded-xl border px-3"
                    />
                  </label>
                </details>
              </div>
            ))}
          <label>
            {L.coverVideo}
            <input
              type="url"
              dir="ltr"
              maxLength={2048}
              value={settings.coverVideo}
              onChange={(e) => setSettings({ ...settings, coverVideo: e.target.value })}
              className="mt-2 min-h-12 w-full rounded-xl border px-3"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={settings.images}
              onChange={(e) => setSettings({ ...settings, images: e.target.checked })}
            />
            {L.images}
          </label>
        </fieldset>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">{L.mediaHelp}</p>
        <h3 className="mb-2 mt-8 text-xl font-semibold">{L.composition}</h3>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">{L.compositionHelp}</p>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selected.layoutControls.map((key) => (
            <label key={key} className="text-sm">
              {label(`layout_${key}`)}
              <select
                aria-label={label(`layout_${key}`)}
                value={resolvedLayout(settings)[key]}
                className="mt-2 min-h-12 w-full rounded-xl border px-3"
                onChange={(e) => {
                  setSettings({
                    ...settings,
                    layout: { ...resolvedLayout(settings), [key]: e.target.value },
                  });
                  setMessage("");
                }}
              >
                {LAYOUT_OPTIONS[key].map((option) => (
                  <option value={option} key={option}>
                    {label(`choice_${option}`)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
        <p className="mt-5 text-sm">{L.contentOrderHelp}</p>
        <a className="inline-flex min-h-11 items-center underline" href={`/${locale}/menus`}>
          {L.contentOrder}
        </a>
      </section>
      <section id="appearance-preview" className="scroll-mt-40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{L.preview}</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{L.previewNote}</p>
          </div>
          <a
            className="min-h-11 rounded-xl border px-4 py-3"
            target="_blank"
            rel="noreferrer"
            href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/${locale}/${businessSlug}?branch=${locations.find((l) => l.id === branch)?.slug ?? ""}`}
          >
            {L.publicLink}
          </a>
        </div>
        <div className="flex flex-wrap gap-3">
          <label>
            {L.branch}
            <select
              aria-label={L.branch}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="ms-3 min-h-11 rounded-xl border px-3"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name[locale] ?? l.name.en ?? Object.values(l.name)[0]}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label={L.preview} className="flex flex-wrap gap-2">
            {["mobile", "tablet", "desktop"].map((d) => (
              <button
                key={d}
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className="min-h-11 rounded-xl border px-4 aria-pressed:bg-[#1a3c2a] aria-pressed:text-white"
              >
                {label(d)}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={previewHost}
          className="max-w-full overflow-hidden rounded-2xl border bg-[#e9e6df] p-3"
        >
          <div
            dir="ltr"
            className="relative mx-auto"
            style={{
              width: width * Math.min(1, previewWidth / width),
              height: 850 * Math.min(1, previewWidth / width),
            }}
          >
            {branch && (
              <iframe
                ref={frame}
                title={L.preview}
                src={`/${locale}/appearance-preview?branch=${branch}`}
                onLoad={post}
                style={{
                  width,
                  height: 850,
                  transform: `scale(${Math.min(1, previewWidth / width)})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
                className="block rounded-xl border-0 bg-white shadow-lg"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
