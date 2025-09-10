import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json([], { status: 200 });
  }

  // Use public Nominatim for demo; swap to your service when ready.
  const nomi = new URL("https://nominatim.openstreetmap.org/search");
  nomi.searchParams.set("format", "json");
  nomi.searchParams.set("limit", "5");
  nomi.searchParams.set("q", q);

  const r = await fetch(nomi, {
    headers: { "User-Agent": "SLAICTransit/1.0 (demo)" },
    // do not cache during dev
    cache: "no-store",
  });

  if (!r.ok) return NextResponse.json([], { status: 200 });

  const rows: any[] = await r.json();
  const items = rows.map((row) => ({
    lat: Number(row.lat),
    lon: Number(row.lon),
    label: row.display_name as string,
  }));

  return NextResponse.json(items);
}
