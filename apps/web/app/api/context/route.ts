import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // accept { peak_hour, rain, train_delayed } etc. — no-op for demo
  await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true });
}

