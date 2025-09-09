import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/geocode?q=search
 * Uses OpenStreetMap Nominatim (no key) and returns
 * [{ lat, lon, label }, ...]
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    if (q.length < 3) return NextResponse.json([]);

    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=${encodeURIComponent(
        q
      )}`,
      {
        // Nominatim asks for a UA; put your email/app name here
        headers: { "User-Agent": "GamanaGo/1.0 (onelladias@example.com)" },
        cache: "no-store",
      }
    );

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: `geocode upstream ${r.status}`, body: text },
        { status: 502 }
      );
    }

    const data = (await r.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    const list = data.map((d) => ({
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      label: d.display_name,
    }));

    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "geocode failed" },
      { status: 500 }
    );
  }
}
