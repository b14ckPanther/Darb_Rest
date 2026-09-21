"use server";
import { whatsappRequestSchema } from "@darb-rest/validation";
import { commercialLabels, isValidLocale } from "@darb-rest/i18n";
import { priceCartLine, cartSubtotal, localizedContent } from "@darb-rest/types";
import { loadPublicMenu } from "./guest-orders";
import { loadRestaurant } from "./restaurant";
import { v1Context } from "./v1-context";
import { publicMutationBudget } from "./launch";
export async function prepareWhatsapp(
  business: string,
  branch: string,
  locale: string,
  raw: unknown,
): Promise<{ url?: string; error?: boolean }> {
  const parsed = whatsappRequestSchema.safeParse(raw);
  if (!parsed.success || !isValidLocale(locale)) return { error: true };
  try {
    await publicMutationBudget();
    const restaurant = await loadRestaurant(business, branch);
    if (!restaurant) return { error: true };
    const menu = await loadPublicMenu(business, branch);
    if (!menu) return { error: true };
    const location = menu.locations[0]!,
      access = await v1Context(menu.business.id, location.id),
      v = parsed.data,
      L = commercialLabels[locale];
    if (!access.destination || (v.kind === "order" ? !access.cart : !access.reservation))
      return { error: true };
    const money = (n: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency: menu.business.currency }).format(
        n / 100,
      );
    const rows = [
      v.kind === "order" ? L.orderTitle : L.reservationTitle,
      localizedContent(menu.business.name, locale).text,
      localizedContent(location.name, locale).text,
      `${L.name}: ${v.name}`,
      `${L.phone}: ${v.phone}`,
    ];
    if (v.kind === "order") {
      const total = cartSubtotal(menu.content, location.id, v.lines);
      for (const line of v.lines) {
        const price = priceCartLine(menu.content, location.id, line);
        rows.push("", `${line.quantity} × ${localizedContent(price.name, locale).text}`);
        if (price.variantName) rows.push(localizedContent(price.variantName, locale).text);
        for (const m of price.modifiers) rows.push(`- ${localizedContent(m.name, locale).text}`);
        rows.push(money(price.totalCents));
      }
      rows.push("", `${L.total}: ${money(total)}`);
    } else {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: restaurant.profile.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (v.date < today) return { error: true };
      rows.push(
        `${L.guests}: ${v.guests}`,
        `${L.date}: ${v.date}`,
        `${L.time}: ${v.time}`,
        L.requestNote,
      );
    }
    if (v.notes) rows.push(`${L.notes}: ${v.notes}`);
    const text = rows.join("\n");
    if (text.length > 12000) return { error: true };
    return { url: `https://wa.me/${access.destination.slice(1)}?text=${encodeURIComponent(text)}` };
  } catch {
    return { error: true };
  }
}
