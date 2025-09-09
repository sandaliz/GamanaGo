import { NextResponse } from "next/server";
const OSRM = process.env.OSRM_URL || "https://router.project-osrm.org";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const coords = u.searchParams.get("coords"); // "lon,lat;lon,lat"
  const profile = u.searchParams.get("profile") || "car"; // car|bike|foot
  if (!coords) return NextResponse.json({ error: "coords required" }, { status: 400 });

  const url = `${OSRM}/route/v1/${profile}/${coords}?overview=full&geometries=polyline`;
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok || !data?.routes?.length) {
    return NextResponse.json({ error: "no route" }, { status: 502 });
  }
  const route = data.routes[0];
  return NextResponse.json({
    duration: route.duration,
    distance: route.distance,
    geometry: route.geometry,
  });
}
