import { NextRequest, NextResponse } from "next/server";
const ROUTE_AGENT = process.env.ROUTE_AGENT_URL || "http://route-optimizer:8002";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await fetch(`${ROUTE_AGENT}/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
