"use client";

import Link from "next/link";
import { useState } from "react";
import MiniMap from "../../components/MinMap";
import PlanSummary, { type Plan } from "../../components/PlanSummary";

const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

export default function DirectionsPage() {
  const [origin, setOrigin] = useState("S06");
  const [dest, setDest] = useState("S09");
  const [time, setTime] = useState("07:30");

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
          origin: { stop_id: origin },
          destination: { stop_id: dest },
          depart_at: time,
        }),
      });
      const data = (await r.json()) as Plan | any;
      if (!r.ok || !data?.found) {
        setError(
          typeof data === "object" ? JSON.stringify(data) : String(data)
        );
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
            🚍 Smart Transit
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
            Transit Directions
          </h1>
          <p className="mt-3 text-lg text-white/70 max-w-3xl leading-relaxed">
            Plan your trip, preview the route, and track buses live — all in one
            sleek interface.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-6 text-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="text-sm font-medium text-white/70">
                Origin stop_id
              </label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ring-sky-400/60 text-lg"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Destination stop_id
              </label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ring-fuchsia-400/60 text-lg"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Depart at
              </label>
              <input
                className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ring-emerald-400/60 text-lg"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={doPlan}
                disabled={loading}
                className="flex-1 rounded-xl bg-white text-black font-bold px-5 py-3 text-lg transition hover:bg-white/90 disabled:opacity-60"
              >
                {loading ? "Planning…" : "Plan"}
              </button>
              {plan?.found && firstRide && (
                <Link
                  href={`/live/${encodeURIComponent(
                    (firstRide as any).trip_id
                  )}?from_lat=${firstRide.from_lat}&from_lon=${
                    firstRide.from_lon
                  }&to_lat=${firstRide.to_lat}&to_lon=${firstRide.to_lon}`}
                  className="hidden md:inline-flex items-center rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-black font-bold px-5 py-3 text-lg"
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
          <div className="glass rounded-2xl p-4">
            {plan?.found ? (
              <MiniMap plan={plan} height={400} />
            ) : (
              <div className="h-[400px] rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/50 text-lg">
                Plan a trip to preview the map
              </div>
            )}
          </div>
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            {!plan && (
              <div className="text-lg text-white/60">
                Run a plan to see journey details.
              </div>
            )}
            {plan && <PlanSummary plan={plan} />}
          </div>
        </div>
      </main>
    </>
  );
}
