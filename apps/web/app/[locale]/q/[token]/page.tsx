import { notFound, redirect } from "next/navigation";
import { isValidLocale } from "@darb-rest/i18n";
import { resolveTableToken } from "../../../../lib/table-context";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function TableEntry({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isValidLocale(locale)) notFound();
  const table = await resolveTableToken(token);
  if (!table) notFound();
  redirect(
    `/${locale}/order/${encodeURIComponent(table.business_slug)}/${encodeURIComponent(table.location_slug)}?table=${token}`,
  );
}
