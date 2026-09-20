export function publicOrigin(env: Record<string, string | undefined> = process.env) {
  const value = env.NEXT_PUBLIC_WEB_URL;
  if (!value && env.NODE_ENV === "production") throw Error("Missing NEXT_PUBLIC_WEB_URL");
  const u = new URL(value || "http://localhost:3000");
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/" ||
    (env.NODE_ENV === "production" && u.protocol !== "https:")
  )
    throw Error("Invalid NEXT_PUBLIC_WEB_URL");
  return u.origin;
}
export function validateProduction(
  env: Record<string, string | undefined> = process.env,
  application: "public" | "admin" = "public",
) {
  if (env.NODE_ENV !== "production") return;
  publicOrigin(env);
  const admin = new URL(env.NEXT_PUBLIC_ADMIN_URL ?? "");
  if (
    admin.protocol !== "https:" ||
    admin.username ||
    admin.password ||
    admin.pathname !== "/" ||
    admin.search ||
    admin.hash
  )
    throw Error("Invalid NEXT_PUBLIC_ADMIN_URL");
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    ...(application === "public" ? ["PUBLIC_RATE_LIMIT_SECRET", "TRUSTED_CLIENT_IP_HEADER"] : []),
  ]) {
    const v = env[name];
    if (!v || /placeholder|replace-with|your-project/.test(v))
      throw Error(`Missing production configuration: ${name}`);
  }
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (anon === env.SUPABASE_SERVICE_ROLE_KEY || anon.startsWith("sb_secret_"))
    throw Error("Private credential supplied as public key");
  if (anon.split(".").length === 3) {
    let role: unknown;
    try {
      role = JSON.parse(atob(anon.split(".")[1]!.replaceAll("-", "+").replaceAll("_", "/"))).role;
    } catch {
      throw Error("Invalid public token");
    }
    if (role !== "anon") throw Error("Invalid public token role");
  }
  const db = new URL(env.NEXT_PUBLIC_SUPABASE_URL!);
  if (
    db.protocol !== "https:" ||
    db.username ||
    db.password ||
    /localhost|127\.0\.0\.1/.test(db.hostname)
  )
    throw Error("Invalid production database origin");
  if (
    application === "public" &&
    (env.PUBLIC_RATE_LIMIT_SECRET!.length < 32 ||
      !/^[a-z0-9-]+$/.test(env.TRUSTED_CLIENT_IP_HEADER!))
  )
    throw Error("Invalid abuse protection configuration");
  if (env.PAYMENT_PROVIDER) throw Error("No live payment adapter is enabled");
}
