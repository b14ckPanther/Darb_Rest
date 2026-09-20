import { NextRequest, NextResponse } from "next/server";
import { fetchOperations, fetchStationKitchen } from "../../../lib/actions/operations";
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const result =
    q.get("view") === "orders"
      ? await fetchStationKitchen({
          location_id: q.get("location"),
          status: q.get("status") ?? "active",
          offset: Number(q.get("offset") ?? 0),
          station_id: q.get("station") || null,
          unassigned: q.get("unassigned") === "true",
          mine: q.get("mine") === "true",
        })
      : await fetchOperations(q.get("location") ?? "", Number(q.get("offset") ?? 0));
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.error === "forbidden" ? 403 : 503,
    headers: { "Cache-Control": "private, no-store" },
  });
}
