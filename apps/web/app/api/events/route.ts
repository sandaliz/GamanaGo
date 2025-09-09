// import { NextResponse } from "next/server";

// const PROFILE_AGENT_URL = process.env.PROFILE_AGENT_URL!;
// const SEED_USER_ID = process.env.SEED_USER_ID!;

// export async function POST(req: Request) {
//   try {
//     const { event, meta } = await req.json();
//     const url = `${PROFILE_AGENT_URL}/profile/${SEED_USER_ID}/events`;
//     const r = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ event, meta: meta ?? {} }),
//     });
//     const data = await r.json().catch(() => ({}));
//     return NextResponse.json(data, { status: r.status });
//   } catch (e) {
//     return NextResponse.json({ ok: false, error: "Proxy error" }, { status: 500 });
//   }
// }

// export async function GET() {

//   return Response.json({ rain: false, peak: false, train_delayed: false });
// }
import { NextResponse } from "next/server";

const base =
  process.env.PROFILE_AGENT_URL ??
  process.env.NEXT_PUBLIC_PROFILE_URL ??
  "http://profile-personalizer:8004";

const uid =
  process.env.SEED_USER_ID ??
  process.env.NEXT_PUBLIC_SEED_USER_ID ??
  "1042c8a5-81b8-459d-a1fd-6d7f9ebc097a";

export async function POST(req: Request) {
  try {
    const { event, meta } = await req.json();
    const r = await fetch(`${base}/profile/${uid}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, meta: meta ?? {} }),
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false, error: "proxy POST /events failed" }, { status: 500 });
  }
}
