# Vercel function regions

Both apps pin server functions to `fra1` (Frankfurt, `eu-central-1`) in their
app-local `vercel.json`. This places compute near the existing Frankfurt Supabase
database. Node.js remains the runtime; no database or data-loading changes are required.
Static assets remain globally distributed. Routing middleware is not pinned by this setting.

## Audit result

Before this change, neither app declared a Vercel region, route `preferredRegion`,
per-function region override, or Fluid Compute setting. Vercel documents `iad1`
(Washington, D.C.) as the default for new projects, so an unchanged dashboard
default could have placed functions there. The deployed region and Fluid setting
were not verified: the workspace has no linked Vercel project or authenticated
deployment inspection integration. Repository configuration alone cannot establish
where an existing deployment executes.

The installed Next.js documentation identifies Node.js as the default runtime and
deprecates route `preferredRegion`; use the deployment configuration instead.
The existing explicit Node.js QR and payment-webhook route settings remain intact.

## Manual checks for both projects

1. Open each Vercel project and check **Settings → Build and Deployment → Root
   Directory**. The web project must use `apps/web`; admin must use `apps/admin`,
   so each project consumes its own `vercel.json`. Preserve the existing monorepo
   build/install commands and workspace access settings.
2. Under **Settings → Functions → Function Regions**, inspect the existing value
   and set the project default to **Frankfurt (`fra1`)** only. Keep one primary
   region. Inspect the Fluid Compute setting without changing it for this fix.
3. The committed `regions` setting takes precedence over dashboard region defaults
   for deployments using this configuration. Per-function region overrides, if
   added later, can override the project regions. Keep deployment scripts free of
   conflicting region flags or alternative configuration files.
4. After pushing manually, deploy the new commit for **both** projects. Existing
   deployments do not acquire the new configuration retroactively. Check each
   deployment's Functions summary for Frankfurt, including dynamic pages and API
   routes. Use runtime invocation details/logs to verify actual execution region;
   a CDN response header alone is not proof of the function's execution location.
5. Compare warm authenticated navigation for `/en/platform`,
   `/en/platform/businesses`, and `/en/platform/plans` after deployment, and run
   the existing deployment smoke checks. Local development timings cannot measure
   the benefit of moving Vercel compute. No latency improvement is claimed until
   the new production deployment is measured.

## References

Verified against current documentation on September 20, 2026:

- [Vercel function region configuration](https://vercel.com/docs/functions/configuring-functions/region)
- [Supported regions](https://vercel.com/docs/regions)
- [Fluid Compute configuration precedence](https://vercel.com/docs/fluid-compute#order-of-settings-precedence)
