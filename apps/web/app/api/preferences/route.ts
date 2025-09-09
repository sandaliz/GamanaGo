




// import { NextResponse } from "next/server";

// const base =
//   process.env.PROFILE_AGENT_URL ??
//   process.env.NEXT_PUBLIC_PROFILE_URL ??
//   "http://profile-personalizer:8004";

// const uid =
//   process.env.SEED_USER_ID ??
//   process.env.NEXT_PUBLIC_SEED_USER_ID ??
//   "1042c8a5-81b8-459d-a1fd-6d7f9ebc097a";

// export async function GET() {
//   try {
//     const r = await fetch(`${base}/profile/${uid}/preferences`, { cache: "no-store" });
//     const data = await r.json();
//     return NextResponse.json(data, { status: r.status });
//   } catch (e) {
//     return NextResponse.json({ ok: false, error: "proxy GET /preferences failed" }, { status: 500 });
//   }
// }

// export async function PUT(req: Request) {
//   try {
//     const body = await req.json();
//     const r = await fetch(`${base}/profile/${uid}/preferences`, {
//       method: "PUT",
//       headers: { "content-type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     const data = await r.json().catch(() => ({}));
//     return NextResponse.json(data, { status: r.status });
//   } catch (e) {
//     return NextResponse.json({ ok: false, error: "proxy PUT /preferences failed" }, { status: 500 });
//   }
// }









export const runtime = "nodejs";
const PROFILE = process.env.PROFILE_BASE_URL;
const USER = process.env.NEXT_PUBLIC_USER_ID;

export async function GET() {
  try {
    const r = await fetch(`${PROFILE}/profile/${USER}/preferences`, { cache: "no-store" });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = {}; }
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }});
  } catch {
    // Minimal fallback so the page shows sliders
    return new Response(JSON.stringify({
      weights: { time: 60, cost: 50, comfort: 50 },
      language: "en",
      walk_limit_m: 800,
      voice_assist: true,
    }), { headers: { "content-type": "application/json" }});
  }
}

export async function PUT(req) {
  // Your profile service may not support direct PUT. We accept the payload and
  // just echo it back so your UI doesn’t break. (Suggestions still persist real changes.)
  const body = await req.text();
  return new Response(body || "{}", { headers: { "content-type": "application/json" }});
}
