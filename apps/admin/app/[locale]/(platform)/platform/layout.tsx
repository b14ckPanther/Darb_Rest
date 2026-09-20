import Link from "next/link";
import Image from "next/image";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, requireData } from "../../../../lib/platform";
import { LocaleSwitcher } from "../../../../components/locale-switcher";
export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as SupportedLocale;
  const { db, user } = await requirePlatform(locale);
  const D = getDictionary(locale),
    L = D.platform;
  const membership = await db
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  requireData(membership);
  return (
    <div className="min-h-[100svh] bg-[var(--bg-canvas)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--warm-ivory)] px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href={`/${locale}/platform`}>
            <Image
              src="/brand/darb-rest-logo-header.png"
              alt="Darb REST"
              width={120}
              height={40}
              style={{ width: 120, height: "auto" }}
            />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--darb-green-deep)]">{L.role}</p>
            <p className="break-all text-xs" lang="en" dir="ltr">
              {user.email}
            </p>
          </div>
          <LocaleSwitcher currentLocale={locale} />
          <a href="/auth/signout" className="py-3 text-sm">
            {D.auth.signOut}
          </a>
        </div>
        <nav aria-label={L.title} className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2">
          {[
            ["", L.overview],
            ["/applications", D.acquisition.applications],
            ["/businesses", L.businesses],
            ["/users", D.acquisition.users],
            ["/plans", L.plans],
          ].map(([path, label]) => (
            <Link
              className="rounded-lg border border-[var(--border-subtle)] px-4 py-3 text-sm font-semibold hover:bg-[var(--bg-surface)]"
              key={path}
              href={`/${locale}/platform${path}`}
            >
              {label}
            </Link>
          ))}
          {!!membership.data?.length && (
            <Link className="px-4 py-3 text-sm underline" href={`/${locale}`}>
              {L.tenant}
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
