

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
//     const r = await fetch(`${base}/profile/${uid}/suggestions`, { cache: "no-store" });
//     const data = await r.json();
//     return NextResponse.json(data, { status: r.status });
//   } catch (e) {
//     return NextResponse.json({ ok: false, error: "proxy GET /suggestions failed" }, { status: 500 });
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const { suggestionId } = await req.json();
//     const r = await fetch(`${base}/profile/${uid}/suggestions/${suggestionId}/apply`, {
//       method: "POST",
//     });
//     const data = await r.json().catch(() => ({}));
//     return NextResponse.json(data, { status: r.status });
//   } catch (e) {
//     return NextResponse.json({ ok: false, error: "proxy POST /suggestions failed" }, { status: 500 });
//   }
// }
export const runtime = "nodejs";
const PROFILE = process.env.PROFILE_BASE_URL;
const USER = process.env.NEXT_PUBLIC_USER_ID;

export async function GET() {
  try {
    const r = await fetch(`${PROFILE}/profile/${USER}/suggestions`, { cache: "no-store" });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = []; }
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }});
  } catch (e) {
    // Fail soft so the UI still renders
    return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" }});
  }
}

export async function POST(req) {
  try {
    const { suggestionId } = await req.json();
    const r = await fetch(`${PROFILE}/profile/${USER}/suggestions/${suggestionId}/apply`, {
      method: "POST",
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) throw new Error(data.error || data.raw || "apply failed");
    return new Response(JSON.stringify({ ok: true, ...data }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "apply failed" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
