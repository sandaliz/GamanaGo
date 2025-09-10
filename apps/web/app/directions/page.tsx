"use client";

import Link from "next/link";
import { useState } from "react";
import MiniMap from "../../components/MinMap";
import PlanSummary, { type Plan } from "../../components/PlanSummary";

const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

export default function DirectionsPage() {
  type StopRef = { name: string };
  const [origin, setOrigin] = useState<StopRef>({ name: "" });
  const [dest, setDest] = useState<StopRef>({ name: "" });
  const [time, setTime] = useState("");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doPlan() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const r = await fetch(`${GW}/api/plan/compose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origin: { name: origin.name }, // stop_id optional
          destination: { name: dest.name }, // stop_id optional
          depart_at: time,
        }),
      });
      const data = (await r.json()) as Plan | any;
      (data as any).requested_depart_at = time;
      setPlan(data);

      if (!r.ok || !data?.found) {
        setError(typeof data === "object" ? JSON.stringify(data) : String(data));
        return;
      }
      setPlan(data);
    } catch (e: any) {
      setError(e?.message || "Failed to plan");
    } finally {
      setLoading(false);
    }
  }

  const firstRide = plan?.legs?.find((l: any) => l.mode === "ride");

  return (
    <>
      <div className="bg-hero" />
      <div className="bg-grid" />

      <main className="relative mx-auto max-w-7xl px-6 py-10 text-white">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 badge badge-soft text-base">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
              🚍 Smart Transit
            </span>
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
              Transit Directions
            </span>
          </h1>
          <p className="mt-3 text-lg text-white/70 max-w-3xl leading-relaxed">
            Plan your trip, preview the route, and track buses live — all in one sleek interface.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-6 text-lg transition-shadow hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="text-sm font-medium text-white/70">Origin stop name</label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/60 text-lg"
                value={origin.name}
                placeholder="Origin name (e.g., Kohuwala)"
                onChange={(e) => setOrigin({ ...origin, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Destination stop name</label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/60 text-lg"
                value={dest.name}
                placeholder="Dest name (e.g., Kandy)"
                onChange={(e) => setDest({ ...dest, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Depart at</label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/60 text-lg"
                value={time}
                placeholder="07:30"
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={doPlan}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300 text-slate-900 font-bold px-5 py-3 text-lg transition hover:opacity-90 disabled:opacity-60 shadow-lg"
              >
                {loading ? "Planning…" : "Plan"}
              </button>

              {plan?.found && firstRide && (
                <Link
                  href={`/live/${encodeURIComponent(
                    (firstRide as any).trip_id
                  )}?from_lat=${firstRide.from_lat}&from_lon=${firstRide.from_lon}&to_lat=${firstRide.to_lat}&to_lon=${firstRide.to_lon}`}
                  className="hidden md:inline-flex items-center rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300 text-slate-900 font-bold px-5 py-3 text-lg shadow-lg hover:opacity-90"
                >
                  Live bus
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-100 px-4 py-3 text-base">
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-4 transition-shadow hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            {plan?.found ? (
              <MiniMap plan={plan} height={400} />
            ) : (
              <div className="h-[400px] rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/50 text-lg">
                Plan a trip to preview the map
              </div>
            )}
          </div>
          <div className="lg:col-span-2 glass rounded-2xl p-6 transition-shadow hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            {!plan && <div className="text-lg text-white/60">Run a plan to see journey details.</div>}
            {plan && <PlanSummary plan={plan} />}
          </div>
        </div>
      </main>
    </>
  );
}
