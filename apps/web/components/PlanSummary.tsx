"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  operator?: string;
  route_short_name?: string;
  route_long_name?: string;
  agency_id?: string;
};

export type Plan = {
  found: boolean;
  depart_at: string;
  arrive_at: string;
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
  requested_depart_at?: string;
};

function hhmmToPretty(t: string) {
  try {
    const [h, m] = t.split(":").map(Number);
    const dt = new Date();
    dt.setHours(h, m, 0, 0);
    return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return t;
  }
}

type AvTrip = {
  trip_id: string;
  route_id: string;
  depart_time: string;
  arrive_time: string;
  route_short_name?: string | null;
  route_long_name?: string | null;
  agency_name?: string | null; // “NCG”, “SLTB”, etc.
};

// NEW: disruption alert type
type Alert = {
  id: string;
  scope: "trip" | "route" | "network";
  severity: "info" | "minor" | "major";
  title: string;
  description?: string;
  route_id?: string;
  trip_id?: string;
  advice?: string;
};

export default function PlanSummary({ plan }: { plan: Plan }) {
  // ---------------- Available trips ----------------
  const [avail, setAvail] = useState<AvTrip[] | null>(null);
  const [availErr, setAvailErr] = useState<string | null>(null);
  const queryDepartAt = plan.requested_depart_at || plan.depart_at;

  useEffect(() => {
    let active = true;
    (async () => {
      setAvail(null);
      setAvailErr(null);
      if (!plan?.found) return;
      try {
        const resp = await fetch("/api/plan/available-trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { stop_id: plan.origin_stop },
            destination: { stop_id: plan.dest_stop },
            depart_at: queryDepartAt,
            window_min: 10,
            limit: 20,
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (active) setAvail(data.trips || []);
      } catch (e: any) {
        if (active) setAvailErr(e?.message || "Failed to load trips");
      }
    })();
    return () => {
      active = false;
    };
  }, [plan]);

  // ---------------- Fare quote ----------------
  const [fare, setFare] = useState<null | { total_fare: number; breakdown: { mode: string; fare: number }[] }>(null);
  const [fareErr, setFareErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setFareErr(null);
        setFare(null);
        if (!plan?.found) return;
        const resp = await fetch("/api/fares/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!resp.ok) {
          const msg = await resp.text();
          if (active) setFareErr(msg || `HTTP ${resp.status}`);
          return;
        }
        const data = await resp.json();
        if (active) setFare(data.fareQuote);
      } catch (e: any) {
        if (active) setFareErr(e?.message || "Failed to fetch fare");
      }
    })();
    return () => {
      active = false;
    };
  }, [plan]);

  // ---------------- Disruption alerts ----------------
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [alertsErr, setAlertsErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setAlerts(null);
      setAlertsErr(null);
      if (!plan?.found) return;

      const legs = plan.legs
        .filter((l) => l.mode === "ride")
        .map((l) => ({
          route_id: l.route_id,
          trip_id: l.trip_id,
          from_stop: l.from_stop,
          to_stop: l.to_stop,
          depart_time: l.depart_time,
          arrive_time: l.arrive_time,
        }));

      try {
        const resp = await fetch("/api/disruptions/for-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ legs }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (active) setAlerts(data.alerts || []);
      } catch (e: any) {
        if (active) setAlertsErr(e?.message || "Failed to load disruptions");
      }
    })();
    return () => {
      active = false;
    };
  }, [plan]);

  const alertsByTrip = useMemo(() => {
    const map = new Map<string, Alert[]>();
    (alerts || []).forEach((a) => {
      if (!a.trip_id) return;
      const arr = map.get(a.trip_id) || [];
      arr.push(a);
      map.set(a.trip_id, arr);
    });
    return map;
  }, [alerts]);

  const sevOrder = { major: 0, minor: 1, info: 2 } as const;
  const sevIcon = (s: Alert["severity"]) => (s === "major" ? "🚨" : s === "minor" ? "⚠️" : "ℹ️");

  // ---------------- Local tips ----------------
  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsErr, setTipsErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setTips(null);
        const r = await fetch("/api/local-knowledge/tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin_lat: plan.origin_lat, origin_lon: plan.origin_lon }),
        });
        const data = await r.json();
        if (active) setTips(data.tips || []);
      } catch {
        if (active) setTips([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [plan.origin_lat, plan.origin_lon]);

  const firstRide = plan?.legs?.find((l) => l.mode === "ride");

  if (!plan?.found) {
    return <div className="text-white/70 text-lg">No route found. Try a different time or stops.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                {plan.origin_name}
              </span>
              <span className="text-white/60"> → </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                {plan.dest_name}
              </span>
            </h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="text-white/60 text-sm">Departure</div>
                <div className="text-xl font-semibold">{hhmmToPretty(plan.depart_at)}</div>
                <div className="text-white/50 text-sm">{plan.origin_name}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="text-white/60 text-sm">Arrival</div>
                <div className="text-xl font-semibold">{hhmmToPretty(plan.arrive_at)}</div>
                <div className="text-white/50 text-sm">{plan.dest_name}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="badge badge-soft text-base">
              ⏱️{" "}
              <strong className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                {plan.duration_min} min
              </strong>
            </span>
            <span className="badge badge-soft text-base">
              🔁 Transfers:{" "}
              <strong className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                {plan.transfers}
              </strong>
            </span>
            {plan._used_walk_limit_m != null && (
              <span className="badge badge-soft text-base">
                🚶 Walk limit:{" "}
                <strong className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                  {plan._used_walk_limit_m} m
                </strong>
              </span>
            )}
            {fare && (
              <span className="badge badge-soft text-base">
                💸 Fare:{" "}
                <strong className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                  Rs. {fare.total_fare}
                </strong>
              </span>
            )}
            {fareErr && <span className="badge badge-soft text-base text-red-300">⚠️ Fare error</span>}
          </div>
        </div>
      </div>

      {/* Service alerts */}
      {alerts && alerts.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
              Service alerts
            </h3>
            {alertsErr && <span className="badge badge-soft text-red-300">⚠️ {alertsErr}</span>}
          </div>
          <ul className="space-y-2">
            {alerts
              .slice()
              .sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])
              .map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="text-2xl">{sevIcon(a.severity)}</span>
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    {a.description && <div className="text-white/70">{a.description}</div>}
                    {a.advice && <div className="text-white/60 text-sm mt-1">{a.advice}</div>}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Available buses */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
            Available buses after {hhmmToPretty(plan.depart_at)}
          </h3>
          {availErr && <span className="badge badge-soft text-red-300">⚠️ {availErr}</span>}
        </div>

        {avail === null ? (
          <div className="text-white/70">Loading…</div>
        ) : avail.length === 0 ? (
          <div className="text-white/70">No scheduled trips found.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {avail.map((t) => {
              const agencyBadge =
                t.agency_name === "NCG"
                  ? "bg-emerald-400/20 text-emerald-200"
                  : t.agency_name === "SLTB"
                  ? "bg-sky-400/20 text-sky-200"
                  : "bg-white/10 text-white/80";

              const tripAlerts = (alertsByTrip.get(t.trip_id) || []).sort(
                (a, b) => sevOrder[a.severity] - sevOrder[b.severity]
              );
              const topAlert = tripAlerts[0];

              return (
                <li key={t.trip_id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚌</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-sm ${agencyBadge}`}>{t.agency_name || "Bus"}</span>
                        <span className="text-white/90 font-semibold">{t.route_short_name ?? t.route_id}</span>

                        {/* small disruption badge if any */}
                        {topAlert && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs ${
                              topAlert.severity === "major"
                                ? "bg-red-500/20 text-red-200"
                                : topAlert.severity === "minor"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-white/10 text-white/70"
                            }`}
                            title={topAlert.title}
                          >
                            {sevIcon(topAlert.severity)} delay
                          </span>
                        )}
                      </div>
                      {t.route_long_name && <div className="text-white/60 text-sm">{t.route_long_name}</div>}
                      {topAlert && (
                        <div className="text-white/60 text-xs mt-1">
                          {topAlert.title}
                          {topAlert.advice ? ` — ${topAlert.advice}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-white/70 whitespace-nowrap">
                      {hhmmToPretty(t.depart_time)} <span className="text-white/40">→</span> {hhmmToPretty(t.arrive_time)}
                    </div>
                    <Link
                      href={`/live/${encodeURIComponent(
                        t.trip_id
                      )}?from_lat=${plan.origin_lat}&from_lon=${plan.origin_lon}&to_lat=${plan.dest_lat}&to_lon=${plan.dest_lon}`}
                      className="rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300 text-slate-900 font-semibold px-3 py-1.5 hover:opacity-90 shadow-lg"
                    >
                      Live
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Local tips */}
      {Array.isArray(tips) && tips.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl md:text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
            Local tips
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            {tips.map((t, i) => (
              <li key={i} className="text-white/80">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick live CTA for the first ride */}
      {firstRide && (
        <div className="glass rounded-2xl p-5 flex items-center justify-between">
          <div className="text-lg">
            Want realtime tracking? Jump to the live map for{" "}
            <span className="font-semibold">{firstRide.route_id || "this trip"}</span>.
          </div>
          <Link
            href={`/live/${encodeURIComponent(firstRide.trip_id!)}?from_lat=${firstRide.from_lat}&from_lon=${firstRide.from_lon}&to_lat=${firstRide.to_lat}&to_lon=${firstRide.to_lon}`}
            className="rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300 text-slate-900 font-bold px-5 py-3 text-lg hover:opacity-90 shadow-lg"
          >
            Open live map
          </Link>
        </div>
      )}
    </div>
  );
}
