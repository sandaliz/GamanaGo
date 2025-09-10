// apps/web/app/api/plan/available-trips/route.ts
import { NextRequest, NextResponse } from "next/server";

const PLANNER_BASE_URL =
  process.env.PLANNER_BASE_URL || // <-- preferred
  process.env.ROUTE_OPT_URL ||    // optional legacy
  "http://localhost:8002";        // sane default

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = `${PLANNER_BASE_URL.replace(/\/+$/, "")}/available-trips`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const ct = resp.headers.get("content-type") || "";
    const payload = ct.includes("application/json") ? await resp.json() : await resp.text();

    if (!resp.ok) {
      return NextResponse.json(
        { error: typeof payload === "string" ? payload : JSON.stringify(payload) },
        { status: resp.status }
      );
    }

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("available-trips proxy error:", err);
    return NextResponse.json({ error: err?.message || "Upstream fetch failed" }, { status: 502 });
  }
}
