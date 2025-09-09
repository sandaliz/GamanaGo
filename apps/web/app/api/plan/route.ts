// import { NextRequest, NextResponse } from "next/server";
// const ROUTE_AGENT = process.env.ROUTE_AGENT_URL || "http://route-optimizer:8002";

// export async function POST(req: NextRequest) {
//   const body = await req.json();
//   const r = await fetch(`${ROUTE_AGENT}/plan`, {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   return NextResponse.json(await r.json(), { status: r.status });
// }
// app/api/plan/route.ts


























// export const runtime = "nodejs";
// const BASE = process.env.PLANNER_BASE_URL;

// export async function GET() {
 
//   const r = await fetch(`${BASE}/health`);
//   const body = await r.text();
//   return new Response(JSON.stringify({ ok: r.ok, base: BASE, status: r.status, body }), {
//     headers: { "content-type": "application/json" },
//   });
// }

// export async function POST(req) {
//   try {
//     const payload = await req.json();
//     const r = await fetch(`${BASE}/plan`, {
//       method: "POST",
//       headers: { "content-type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const txt = await r.text();
//     let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
//     if (!r.ok) {
//       return new Response(JSON.stringify({ ok: false, error: data.error || data.raw || "planner error" }), {
//         status: 500, headers: { "content-type": "application/json" },
//       });
//     }
//     return new Response(JSON.stringify({ ok: true, ...data }), {
//       headers: { "content-type": "application/json" },
//     });
//   } catch (e) {
//     return new Response(JSON.stringify({ ok: false, error: e?.message || "fetch failed" }), {
//       status: 500, headers: { "content-type": "application/json" },
//     });
//   }
// }



export const runtime = "nodejs";
const BASE = process.env.PLANNER_BASE_URL ?? "";

export async function GET() {
  if (!BASE) {
    return new Response(
      JSON.stringify({ ok: false, error: "PLANNER_BASE_URL is not set" }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }
  try {
    const r = await fetch(`${BASE}/health`);
    const body = await r.text();
    return new Response(JSON.stringify({ ok: r.ok, base: BASE, status: r.status, body }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "planner health failed" }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  // If planner URL missing, return a single “direct” leg so UI keeps working.
  if (!BASE) {
    const body = await req.json().catch(() => ({}));
    return new Response(JSON.stringify({
      ok: true,
      plans: [{
        duration: 1800,
        cost: 500,
        legs: [{
          mode: "ride",
          route_type: null,
          from_stop_name: body?.origin?.name ?? "Origin",
          to_stop_name: body?.destination?.name ?? "Destination",
          from_lat: body?.origin?.lat,
          from_lon: body?.origin?.lon,
          to_lat: body?.destination?.lat,
          to_lon: body?.destination?.lon,
        }]
      }]
    }), { headers: { "content-type": "application/json" }});
  }

  try {
    const payload = await req.json();
    const r = await fetch(`${BASE}/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await r.text();
    let data: any; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, error: data.error || data.raw || "planner error" }), {
        status: 500, headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "fetch failed" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
