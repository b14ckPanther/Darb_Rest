import { deflateSync, inflateSync } from "node:zlib";
import type { Business, BranchLocation, PlanEntitlement } from "@darb-rest/types";
export interface DevMembershipRecord {
  userEmail: string;
  business: Business;
  role: "owner";
  locations: BranchLocation[];
  planEntitlements: PlanEntitlement[];
  overrides: [];
}
/** Development-only browser state: portable between route workers, bounded below cookie limits. */
export function encodeDevMemberships(records: DevMembershipRecord[]): string {
  if (process.env.NODE_ENV === "production") throw Error("development_only");
  const result = `z1:${deflateSync(JSON.stringify(records)).toString("base64url")}`;
  if (result.length > 3800) throw Error("development_session_too_large");
  return result;
}
export function decodeDevMemberships(raw?: string): DevMembershipRecord[] {
  if (process.env.NODE_ENV === "production" || !raw) return [];
  try {
    let value: unknown;
    if (raw.startsWith("z1:")) {
      if (raw.length > 3800) return [];
      value = JSON.parse(
        inflateSync(Buffer.from(raw.slice(3), "base64url"), { maxOutputLength: 200000 }).toString(),
      );
    } else {
      // Read existing development sessions during transition, including encoded cookies.
      try {
        value = JSON.parse(raw);
      } catch {
        value = JSON.parse(decodeURIComponent(raw));
      }
    }
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is DevMembershipRecord =>
        !!item &&
        typeof item.userEmail === "string" &&
        item.role === "owner" &&
        typeof item.business?.id === "string" &&
        Array.isArray(item.locations) &&
        Array.isArray(item.planEntitlements) &&
        Array.isArray(item.overrides),
    );
  } catch {
    return [];
  }
}
