// Explicit operator target only. Does not migrate, seed, publish or modify a deployment.
const origin = new URL(process.env.SMOKE_ORIGIN ?? "");
if (
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  (!["localhost", "127.0.0.1"].includes(origin.hostname) && origin.protocol !== "https:")
)
  throw Error("Supply a valid SMOKE_ORIGIN");
const slug = process.env.SMOKE_BUSINESS_SLUG;
if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) throw Error("Supply SMOKE_BUSINESS_SLUG");
for (const path of [
  "/api/health",
  "/robots.txt",
  "/sitemap.xml",
  `/en/${slug}`,
  `/ar/${slug}`,
  `/he/${slug}`,
]) {
  const response = await fetch(new URL(path, origin), {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`Smoke check failed: ${path} (${response.status})`);
  const body = await response.text();
  if (path === "/api/health" && JSON.parse(body).status !== "ok")
    throw Error("Environment health check failed");
  if (path === "/sitemap.xml" && !body.includes("<urlset")) throw Error("Invalid sitemap");
  if (path.startsWith("/en/") || path.startsWith("/ar/") || path.startsWith("/he/")) {
    if (!body.includes("application/ld+json") || !body.includes('rel="canonical"'))
      throw Error("Missing restaurant SEO");
    const scripts = [
      ...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs),
    ];
    if (!scripts.some((s) => JSON.parse(s[1])["@type"] === "Restaurant"))
      throw Error("Invalid restaurant structured data");
  }
  console.log(`PASS ${path}`);
}
