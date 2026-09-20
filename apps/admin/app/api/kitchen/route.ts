import { NextRequest, NextResponse } from "next/server";
import { fetchKitchen } from "../../../lib/actions/kitchen";
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const result = await fetchKitchen({
    location_id: q.get("location"),
    status: q.get("status") ?? "active",
    offset: Number(q.get("offset") ?? 0),
  });
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.error === "forbidden" ? 403 : 503,
    headers: { "Cache-Control": "private, no-store" },
  });
}
