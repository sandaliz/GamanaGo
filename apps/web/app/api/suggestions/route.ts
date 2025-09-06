// import { NextRequest, NextResponse } from "next/server";

// const PROFILE_AGENT = process.env.PROFILE_AGENT_URL || "http://profile-agent:8001";
// const USER_ID = process.env.SEED_USER_ID || "";

// export async function GET() {
//   const r = await fetch(`${PROFILE_AGENT}/profile/${USER_ID}/suggestions`, { cache: "no-store" });
//   return NextResponse.json(await r.json(), { status: r.status });
// }

// export async function POST(req: NextRequest) {
//   const { suggestionId } = await req.json();
//   const url = `${PROFILE_AGENT}/profile/${USER_ID}/suggestions/${suggestionId}/apply`;
//   const r = await fetch(url, { method: "POST" });
//   return NextResponse.json(await r.json(), { status: r.status });
// }


import { NextResponse } from "next/server";

const BASE = process.env.PROFILE_AGENT_URL!;
const USER = process.env.SEED_USER_ID!;

/** GET → list suggestions */
export async function GET() {
  const r = await fetch(`${BASE}/profile/${USER}/suggestions`, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "agent error" }, { status: r.status });
  const data = await r.json();
  return NextResponse.json(data);
}

/** POST → apply a suggestion (matches your React code) */
export async function POST(req: Request) {
  const { suggestionId } = await req.json().catch(() => ({}));
  if (!suggestionId) return NextResponse.json({ error: "suggestionId required" }, { status: 400 });

  const r = await fetch(`${BASE}/profile/${USER}/suggestions/${suggestionId}/apply`, { method: "POST" });
  if (!r.ok) return NextResponse.json({ error: "agent error" }, { status: r.status });
  const data = await r.json();
  return NextResponse.json(data);
}
