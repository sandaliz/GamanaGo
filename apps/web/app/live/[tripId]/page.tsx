// apps/web/app/live/[tripId]/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LiveBusMap from "../../../components/LiveBusMap";
import DecorativePeople from "../../../components/DecorativePeople";

export default function LiveTripPage({ params }: { params: { tripId: string } }) {
  const tripId = decodeURIComponent(params.tripId);
  const qp = useSearchParams();

  const from_lat = Number(qp.get("from_lat") || 6.9);
  const from_lon = Number(qp.get("from_lon") || 79.9);
  const to_lat   = Number(qp.get("to_lat")   || 6.92);
  const to_lon   = Number(qp.get("to_lon")   || 79.95);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50">
      <div className="mx-auto max-w-6xl px-5 pt-6">
        <Link
          href="/directions"
          className="inline-flex items-center gap-2 rounded-xl bg-white/70 hover:bg-white px-4 py-2 text-base font-semibold shadow-sm"
        >
          ← Back to directions
        </Link>

        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-emerald-900">
          Live bus <span className="text-emerald-600">· {tripId}</span>
        </h1>
        <p className="mt-2 text-emerald-900/70 text-lg">
          Watch the bus move in real time.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        {/* Map card with decorative people */}
        <div className="relative rounded-3xl border border-emerald-200/60 bg-white/80 backdrop-blur-md p-3 shadow-xl">
          <LiveBusMap
            tripId={tripId}
            from={[from_lat, from_lon]}
            to={[to_lat, to_lon]}
          />
          <DecorativePeople />
        </div>

        <div className="mx-auto mt-4 flex items-center justify-between text-base text-emerald-900/70">
          <div>Keep this tab open to receive live updates.</div>
          <div>
            Data source: <code>/realtime/stream</code>
          </div>
        </div>
      </div>
    </div>
  );
}
