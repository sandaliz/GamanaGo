// apps/web/app/api/disruptions/for-plan/route.ts
import { NextRequest, NextResponse } from "next/server";

const DISRUPTIONS_BASE_URL =
  process.env.DISRUPTIONS_BASE_URL || "http://localhost:8003";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const resp = await fetch(`${DISRUPTIONS_BASE_URL}/disruptions/for-plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: text || `HTTP ${resp.status}` }, { status: resp.status });
    }
    return NextResponse.json(JSON.parse(text));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "proxy failed" }, { status: 500 });
  }
}
