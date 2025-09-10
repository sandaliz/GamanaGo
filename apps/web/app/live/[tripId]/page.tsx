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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 pt-6">
        {/* Back button with gradient border */}
        <div className="inline-flex rounded-xl p-[1px] bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
          <Link
            href="/directions"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-base font-semibold shadow-sm backdrop-blur"
          >
            ← Back to directions
          </Link>
        </div>

        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
            Live bus
          </span>{" "}
          <span className="text-white/70">· {tripId}</span>
        </h1>
        <p className="mt-2 text-white/70 text-lg">Watch the bus move in real time.</p>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        {/* Map card with decorative people placed around the edges (visible, not covering map) */}
        <div className="relative">
          {/* Gradient frame */}
          <div className="rounded-3xl p-[2px] bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300 shadow-2xl">
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-3">
              <LiveBusMap
                tripId={tripId}
                from={[from_lat, from_lon]}
                to={[to_lat, to_lon]}
              />
            </div>
          </div>

          {/* Decorative characters anchored OUTSIDE the card */}
          <DecorativePeople />
        </div>

        <div className="mx-auto mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-base text-white/70">
          <div>Keep this tab open to receive live updates.</div>
          <div>
            Data source: <code className="text-white/90">/realtime/stream</code>
          </div>
        </div>
      </div>
    </div>
  );
}
