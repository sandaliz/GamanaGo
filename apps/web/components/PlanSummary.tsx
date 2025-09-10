// apps/web/components/PlanSummary.tsx
"use client";

import Link from "next/link";

export type Leg = {
  mode: "ride" | "walk";
  from_stop: string;
  to_stop: string;
  from_stop_name: string;
  to_stop_name: string;
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
  route_id?: string;
  trip_id?: string;
  depart_time: string; // "HH:MM"
  arrive_time: string; // "HH:MM"
};

export type Plan = {
  found: boolean;
  depart_at: string;     // "HH:MM"
  arrive_at: string;     // "HH:MM"
  duration_min: number;
  transfers: number;
  legs: Leg[];
  origin_stop: string;
  origin_name: string;
  dest_stop: string;
  dest_name: string;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  _used_walk_limit_m?: number;
};

function hhmmToPretty(t: string) {
  // "07:30" -> "7:30 AM"
  try {
    const [h, m] = t.split(":").map(Number);
    const dt = new Date();
    dt.setHours(h, m, 0, 0);
    return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return t;
  }
}

export default function PlanSummary({ plan }: { plan: Plan }) {
  if (!plan?.found) {
    return (
      <div className="text-white/70 text-lg">
        No route found. Try a different time or stops.
      </div>
    );
  }

  const firstRide = plan.legs.find((l) => l.mode === "ride");

  return (
    <div className="space-y-6">
      {/* Title card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {plan.origin_name} <span className="text-white/60">→</span> {plan.dest_name}
            </h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="text-white/60 text-sm">Departure</div>
                <div className="text-xl font-semibold">
                  {hhmmToPretty(plan.depart_at)}
                </div>
                <div className="text-white/50 text-sm">{plan.origin_name}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="text-white/60 text-sm">Arrival</div>
                <div className="text-xl font-semibold">
                  {hhmmToPretty(plan.arrive_at)}
                </div>
                <div className="text-white/50 text-sm">{plan.dest_name}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="badge badge-soft text-base">
              ⏱️ <strong className="ml-1">{plan.duration_min} min</strong>
            </span>
            <span className="badge badge-soft text-base">
              🔁 Transfers: <strong className="ml-1">{plan.transfers}</strong>
            </span>
            {plan._used_walk_limit_m != null && (
              <span className="badge badge-soft text-base">
                🚶 Walk limit: <strong className="ml-1">{plan._used_walk_limit_m} m</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Legs timeline */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl md:text-2xl font-bold mb-4">Journey details</h3>

        <ol className="relative ml-3">
          {plan.legs.map((l, i) => (
            <li key={i} className="mb-6 pl-6">
              {/* timeline dot + line */}
              <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-white/70 border border-white/20" />
              {i < plan.legs.length - 1 && (
                <span className="absolute left-[5px] top-6 h-full w-px bg-white/15" />
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {l.mode === "ride" ? "🚌" : "🚶"}
                  </span>
                  <div>
                    <div className="text-lg font-semibold">
                      {l.mode === "ride" ? "Ride" : "Walk"}
                      {l.route_id ? (
                        <span className="text-white/60 font-normal"> · {l.route_id}</span>
                      ) : null}
                    </div>
                    <div className="text-white/70 text-base">
                      {l.from_stop_name} <span className="text-white/40">→</span> {l.to_stop_name}
                    </div>
                  </div>
                </div>

                <div className="text-white/70 text-base whitespace-nowrap">
                  {hhmmToPretty(l.depart_time)} <span className="text-white/40">→</span>{" "}
                  {hhmmToPretty(l.arrive_time)}
                </div>
              </div>

              {/* Per-leg action */}
              {l.mode === "ride" && l.trip_id && (
                <div className="mt-3">
                  <Link
                    href={`/live/${encodeURIComponent(l.trip_id)}?from_lat=${l.from_lat}&from_lon=${l.from_lon}&to_lat=${l.to_lat}&to_lon=${l.to_lon}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-black font-semibold px-4 py-2 text-base"
                  >
                    🛰️ See live bus location
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Quick live CTA for the first ride (desktop it’s also in header button) */}
      {firstRide && (
        <div className="glass rounded-2xl p-5 flex items-center justify-between">
          <div className="text-lg">
            Want realtime tracking? Jump to the live map for{" "}
            <span className="font-semibold">{firstRide.route_id || "this trip"}</span>.
          </div>
          <Link
            href={`/live/${encodeURIComponent(firstRide.trip_id!)}?from_lat=${firstRide.from_lat}&from_lon=${firstRide.from_lon}&to_lat=${firstRide.to_lat}&to_lon=${firstRide.to_lon}`}
            className="rounded-xl bg-white text-black font-bold px-5 py-3 text-lg hover:bg-white/90"
          >
            Open live map
          </Link>
        </div>
      )}
    </div>
  );
}
