/** DNS names only: never accept URLs, paths, ports, wildcard names or address literals. */
export function domainHostname(value: string): string | null {
  const host = value.trim().toLowerCase();
  if (
    host.length > 253 ||
    !/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host)
  )
    return null;
  if (/\.(localhost|local|internal|invalid|test|example)$/.test(host)) return null;
  return host;
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}
export function restaurantCanonical(
  origin: string,
  slug: string,
  locale: string,
  branch?: string,
  custom = false,
) {
  const u = new URL(custom ? `/${locale}` : `/${locale}/${encodeURIComponent(slug)}`, origin);
  if (branch) u.searchParams.set("branch", branch);
  return u.toString();
}
