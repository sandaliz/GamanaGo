// apps/web/app/api/fares/quote/route.ts
import { NextRequest, NextResponse } from "next/server";

type FareLeg =
  | { mode: "bus"; distance_km: number }
  | { mode: "train"; from_station: string; to_station: string };

function haversineKm(a: {lat:number, lon:number}, b: {lat:number, lon:number}) {
  const toRad = (d:number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = body?.plan || body;
    if (!plan || !Array.isArray(plan.legs)) {
      return NextResponse.json({ error: "plan.legs missing" }, { status: 400 });
    }

    // Map planner legs -> fare legs
    const fareLegs: FareLeg[] = [];
    for (const l of plan.legs) {
      if (l.mode === "walk") continue;
      // If you later support trains, branch here using route_id, etc.
      const kmRaw = haversineKm(
        { lat: l.from_lat, lon: l.from_lon },
        { lat: l.to_lat,   lon: l.to_lon }
      );
      const km = Math.max(1, Math.ceil(kmRaw)); // ceil + min 1km
      fareLegs.push({ mode: "bus", distance_km: km });
    }

    const FARE_BASE_URL = process.env.FARE_BASE_URL || "http://localhost:8005";

    const resp = await fetch(`${FARE_BASE_URL}/fare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legs: fareLegs }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("fare-optimizer error", resp.status, text);
      return NextResponse.json({ error: text || `HTTP ${resp.status}` }, { status: resp.status });
    }
    const fareData = JSON.parse(text); // { total_fare, breakdown: [{mode, fare}] }

    // Align breakdown to the original plan. Walks get fare 0.
    let rideIdx = 0;
    const alignedBreakdown = plan.legs.map((l: any) => {
      if (l.mode !== "ride") return { mode: l.mode, fare: 0 };
      const item = fareData.breakdown?.[rideIdx++] || { mode: "bus", fare: 0 };
      return { mode: "ride", fare: item.fare ?? 0 };
    });

    return NextResponse.json({
      fareQuote: {
        total_fare: fareData.total_fare ?? 0,
        breakdown: alignedBreakdown,
      },
    });
  } catch (e:any) {
    console.error("fares/quote route crash:", e);
    return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 500 });
  }
}
