// import { NextRequest, NextResponse } from "next/server";

// const PROFILE_AGENT = process.env.PROFILE_AGENT_URL || "http://profile-agent:8001";
// const USER_ID = process.env.SEED_USER_ID || ""; // or from session

// export async function GET() {
//   const r = await fetch(`${PROFILE_AGENT}/profile/${USER_ID}/preferences`, { cache: "no-store" });
//   return NextResponse.json(await r.json(), { status: r.status });
// }

// export async function PUT(req: NextRequest) {
//   const body = await req.json();
//   const r = await fetch(`${PROFILE_AGENT}/profile/${USER_ID}/preferences`, {
//     method: "PUT",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   return NextResponse.json(await r.json(), { status: r.status });
// }



import { NextResponse } from "next/server";

const BASE = process.env.PROFILE_AGENT_URL!;
const USER = process.env.SEED_USER_ID!;

export async function GET() {
  const r = await fetch(`${BASE}/profile/${USER}/preferences`, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "agent error" }, { status: r.status });
  const data = await r.json();
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const r = await fetch(`${BASE}/profile/${USER}/preferences`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) return NextResponse.json({ error: "agent error" }, { status: r.status });
  return NextResponse.json({ ok: true });
}
