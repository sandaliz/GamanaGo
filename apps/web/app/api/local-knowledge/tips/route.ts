import { NextRequest, NextResponse } from "next/server";

function pickCandidates() {
  const envs = [
    process.env.LOCAL_KNOWLEDGE_BASE_URL,
    process.env.NEXT_PUBLIC_LOCAL_KNOWLEDGE_URL,
  ].filter(Boolean) as string[];

  // Reasonable fallbacks for different setups
  const fallbacks = [
    "http://local-knowledge:8007",      // docker compose service name
    "http://host.docker.internal:8007", // Docker→host (Mac/Win)
    "http://127.0.0.1:8007",            // host
    "http://localhost:8007",            // host
  ];

  // De-dup while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...envs, ...fallbacks]) {
    if (!seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const lat = Number(body?.origin_lat ?? 6.9);
  const lon = Number(body?.origin_lon ?? 79.9);
  const radius = Number(body?.radius_km ?? 5);

  const tried: { base: string; url: string; ok?: boolean; status?: number; err?: string }[] = [];
  const candidates = pickCandidates();

  for (const base of candidates) {
    const url = `${base}/disruptions?lat=${lat}&lon=${lon}&radius_km=${radius}`;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        tried.push({ base, url, ok: false, status: r.status });
        continue;
      }
      const data = await r.json(); // { count, zones }
      const zones: any[] = Array.isArray(data?.zones) ? data.zones : [];
      const tips = zones.slice(0, 5).map((z) =>
        `${z.category}${z.verified ? " ✅" : ""}: ${z.description}`
      );
      return NextResponse.json({ tips, debug: { used: base, count: zones.length } });
    } catch (e: any) {
      tried.push({ base, url, ok: false, err: String(e?.message || e) });
    }
  }

  // Nothing worked
  return NextResponse.json(
    { tips: [], debug: { tried } },
    { status: 200 }
  );
}
