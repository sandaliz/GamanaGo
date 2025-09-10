"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, RefreshCw, Send, Crosshair, Radio } from "lucide-react";

type Report = {
  id?: number;
  category: string;
  description: string;
  route_name?: string;
  lat: number;
  lon: number;
  stop_id?: string | null;
  severity?: number;
  created_at?: number; // seconds epoch (from your API)
  expires_at?: number; // ✅ we’ll read this if present
};

const LK =
  process.env.NEXT_PUBLIC_LOCAL_KNOWLEDGE_URL || "http://localhost:8007";

function timeAgoSec(ts?: number) {
  if (!ts) return "";
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function secondsLeft(ts?: number) {
  if (!ts) return undefined;
  const left = Math.max(0, Math.floor(ts - Date.now() / 1000));
  return left;
}

export default function LocalKnowledgeWidget({
  centerLat = 7.1,
  centerLon = 80.0,
  radiusKm = 8,
  autoRefreshMs = 12_000, // ✅ auto-refresh interval (12s)
}: {
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  autoRefreshMs?: number;
}) {
  // feed
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // routes list
  const [routes, setRoutes] = useState<string[]>([]);
  const [routeFilter, setRouteFilter] = useState<string>("");

  // form
  const [category, setCategory] = useState("flood");
  const [routeName, setRouteName] = useState<string>("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(centerLat);
  const [lon, setLon] = useState(centerLon);
  const [posting, setPosting] = useState(false);

  const canSubmit = useMemo(
    () => routeName.trim().length > 0 && description.trim().length > 0,
    [routeName, description]
  );

  async function fetchRoutes() {
    try {
      const r = await fetch(`${LK}/routes`);
      if (!r.ok) return;
      const data = await r.json();
      setRoutes(data.routes || []);
    } catch {
      /* ignore */
    }
  }

  async function fetchNearby(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(centerLat),
        lon: String(centerLon),
        radius_km: String(radiusKm),
        ...(routeFilter ? { route_name: routeFilter } : {}),
      });
      const r = await fetch(`${LK}/reports/nearby?${params.toString()}`, {
        signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // sort by newest first
      const sorted = (data.reports || []).sort(
        (a: Report, b: Report) => (b.created_at ?? 0) - (a.created_at ?? 0)
      );
      setReports(sorted);
      setLastUpdated(Math.floor(Date.now() / 1000));
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }
  async function postReport() {
    if (!canSubmit) return;
    setPosting(true);
    setError(null);
    try {
      const r = await fetch(`${LK}/reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          route_name: routeName,
          lat,
          lon,
        }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Submit failed: HTTP ${r.status} ${txt || ""}`.trim());
      }

      // ✅ reset form
      setDescription("");
      setRouteName("");
      setCategory("flood");
      setLat(centerLat);
      setLon(centerLon);

      await fetchNearby();
      await fetchRoutes();
      alert("Report submitted ✅");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to submit");
    } finally {
      setPosting(false);
    }
  }
  async function vote(rid: number, vote: "up" | "down") {
    try {
      const r = await fetch(`${LK}/reports/${rid}/vote?vote=${vote}`, {
        method: "POST",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Optimistic: refresh feed after voting
      await fetchNearby();
    } catch (e: any) {
      setError(e?.message || "Failed to vote");
    }
  }

  function pctUntilExpiry(created?: number, expires?: number) {
    if (!created || !expires) return 100;
    const now = Date.now() / 1000;
    const total = Math.max(1, expires - created);
    const left = Math.max(0, expires - now);
    return Math.round((left / total) * 100);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => {}
    );
  }

  // initial loads
  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch when inputs change
  useEffect(() => {
    const ac = new AbortController();
    fetchNearby(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, radiusKm, routeFilter]);

  // ✅ Auto-refresh (polling)
  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(() => {
      const ac = new AbortController();
      fetchNearby(ac.signal);
      // no need to keep AC reference; interval is short and fetchNearby catches Abort
    }, autoRefreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshMs, routeFilter, centerLat, centerLon, radiusKm]);

  // small ticker for the “Last updated” label
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200 text-[11px]">
            <Radio className="h-3.5 w-3.5" />
            Live
          </span>
          <div className="font-medium">Community Alerts</div>
        </div>
        <button
          onClick={() => fetchNearby()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/10"
          title="Refresh now"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      {/* <div className="mt-1 text-[11px] text-white/50">
        Last updated {lastUpdated ? timeAgoSec(lastUpdated) : "—"}
      </div> */}

      {/* Route filter */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-white/60">Filter by Route</div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2"
          >
            <option value="">All routes</option>
            {routes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-white/60">Radius</div>
          <input
            type="text"
            disabled
            value={`${radiusKm} km`}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 opacity-70"
          />
        </div>
      </div>

      {/* Submit form */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-white/70 mb-2">Add Report</div>

        {/* Route name (required) */}
        <label className="block">
          <span className="text-xs text-white/60">Route</span>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="sm:col-span-2 rounded-lg border border-white/15 bg-black/40 px-2 py-2"
            >
              <option value="">Select or type…</option>
              {routes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <input
              placeholder="Or type route name"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-2"
            />
          </div>
        </label>

        {/* Category */}
        <label className="block mt-3">
          <span className="text-xs text-white/60">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2"
          >
            <option value="flood">Flood (block)</option>
            <option value="stop_closed">Stop Closed (block)</option>
            <option value="roadwork">Roadwork (penalize)</option>
            <option value="accident">Accident (penalize)</option>
            <option value="protest_strike">Strike/Protest (penalize)</option>
            <option value="crowding">Crowding (penalize)</option>
            <option value="unsafe">Unsafe (penalize)</option>
            <option value="delay">Delay (penalize)</option>
          </select>
        </label>

        {/* Description */}
        <label className="block mt-3">
          <span className="text-xs text-white/60">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
            placeholder="e.g., Road under water near Gampaha bus stand"
          />
        </label>

        {/* Location row */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-white/60">Lat</div>
            <input
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              type="number"
              step="0.0001"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2"
            />
          </div>
          <div>
            <div className="text-xs text-white/60">Lon</div>
            <input
              value={lon}
              onChange={(e) => setLon(Number(e.target.value))}
              type="number"
              step="0.0001"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2"
            />
          </div>
          <div className="sm:pt-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={useMyLocation}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10"
                title="Use my location"
              >
                <Crosshair className="h-4 w-4" />
                Use Location
              </button>
              <button
                onClick={() => alert("Map picker coming soon 💡")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10"
                title="Pick on map"
              >
                <MapPin className="h-4 w-4" />
                Pick on Map
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={postReport}
          disabled={!canSubmit || posting}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 text-black font-medium px-3 py-2 hover:bg-cyan-300 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {posting ? "Submitting…" : "Submit Report"}
        </button>

        {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
      </div>

      {/* Feed */}
      <div className="mt-4">
        <div className="text-white/70 mb-1">
          Nearby Reports{routeFilter ? ` — ${routeFilter}` : ""}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading && <div className="text-white/60 text-xs">Loading…</div>}
          {!loading && reports.length === 0 && (
            <div className="text-white/60 text-xs">No reports nearby.</div>
          )}
          {reports.map((r) => {
            const left = r.expires_at
              ? Math.max(0, Math.floor(r.expires_at - Date.now() / 1000))
              : undefined;
            const percent = pctUntilExpiry(r.created_at, r.expires_at);
            const verified = (r as any).verified;
            const up = (r as any).votes_up ?? 0;
            const down = (r as any).votes_down ?? 0;

            return (
              <div
                key={r.id ?? `${r.lat}-${r.lon}-${r.created_at}`}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                {/* header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-medium truncate">
                      {r.route_name || "Unspecified route"}
                    </div>
                    {verified && (
                      <span className="shrink-0 text-[10px] rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 px-2 py-0.5">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/50 shrink-0">
                    {timeAgoSec(r.created_at)}
                  </div>
                </div>

                {/* description */}
                <div className="text-white/80 text-sm mt-0.5">
                  {r.description}
                </div>

                {/* meta + votes row */}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-white/55">
                    <span className="capitalize">
                      {r.category?.replace("_", " ")}
                    </span>
                    {typeof left === "number" && (
                      <>
                        <span className="opacity-40 mx-1">•</span>
                        <span>{left}s left</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-300/90">
                      ↑ {up}
                    </span>
                    <span className="text-[11px] text-rose-300/90">
                      ↓ {down}
                    </span>

                    {/* vote buttons */}
                    {typeof r.id === "number" && (
                      <>
                        <button
                          onClick={() => vote(r.id!, "up")}
                          className="rounded-lg border border-emerald-400/30 text-emerald-200 text-[11px] px-2 py-1 hover:bg-emerald-400/10"
                          title="Confirm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => vote(r.id!, "down")}
                          className="rounded-lg border border-rose-400/30 text-rose-200 text-[11px] px-2 py-1 hover:bg-rose-400/10"
                          title="Not true"
                        >
                          Not true
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* expiry progress */}
                {typeof percent === "number" && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400/80"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
