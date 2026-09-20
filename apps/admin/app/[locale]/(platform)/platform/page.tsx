import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, requireData } from "../../../../lib/platform";
import { BusinessList } from "../../../../components/platform/business-list";
export default async function Overview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params,
    locale = rawLocale as SupportedLocale,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).platform;
  const counts = await Promise.all([
    db.from("businesses").select("id", { head: true, count: "exact" }),
    ...["active", "pending", "suspended"].map((status) =>
      db.from("businesses").select("id", { head: true, count: "exact" }).eq("status", status),
    ),
    db.from("profiles").select("id", { head: true, count: "exact" }),
    db.from("memberships").select("id", { head: true, count: "exact" }),
    db.from("plans").select("id", { head: true, count: "exact" }),
  ]);
  counts.forEach(requireData);
  return (
    <>
      <h1 className="text-3xl font-bold text-[var(--darb-green-deep)]">{L.title}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[L.businesses, L.active, L.pending, L.suspended, L.profiles, L.memberships, L.plans].map(
          (label, i) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <p className="text-sm text-[var(--fg-muted)]">{label}</p>
              <p className="mt-3 text-3xl font-bold">
                {new Intl.NumberFormat(locale).format(counts[i]!.count ?? 0)}
              </p>
            </div>
          ),
        )}
      </div>
      <h2 className="text-xl font-semibold">{L.recent}</h2>
      <BusinessList locale={locale} recent />
    </>
  );
}
