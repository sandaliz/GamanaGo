"use client";
import React, { useEffect, useMemo, useState } from "react";

/**
 * Next.js App Router page
 * - Drop this file at: app/page.tsx
 * - Start with: npm run dev
 * - Set API base via env: NEXT_PUBLIC_LKA_BASE (defaults to http://localhost:8007)
 */

// ---------- Types matching your FastAPI backend ----------
interface Report {
  category: string;
  description: string;
  lat: number;
  lon: number;
  stop_id?: string | null;
  created_at?: number;
}

interface NearbyResponse {
  count: number;
  reports: Report[];
}

// ---------- Helpers ----------
const API_BASE =
  (process.env.NEXT_PUBLIC_LKA_BASE as string) || "http://localhost:8007";

const categories = [
  { value: "flood", label: "Flood" },
  { value: "stop_closed", label: "Stop Closed" },
  { value: "crowding", label: "Crowding" },
  { value: "roadwork", label: "Roadworks" },
  { value: "unsafe", label: "Unsafe Area" },
];

function km(n: number) {
  return `${n.toFixed(1)} km`;
}

// Haversine for client-side distance label (nice for list sorting)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Page() {
  // Form state
  const [category, setCategory] = useState<string>("flood");
  const [description, setDescription] = useState<string>("");
  const [lat, setLat] = useState<string>("7.085");
  const [lon, setLon] = useState<string>("79.995");
  const [radiusKm, setRadiusKm] = useState<string>("3");

  // UX state
  const [submitting, setSubmitting] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Data
  const [nearby, setNearby] = useState<NearbyResponse | null>(null);

  // Derived: current position as numbers
  const latNum = useMemo(() => Number(lat), [lat]);
  const lonNum = useMemo(() => Number(lon), [lon]);
  const radNum = useMemo(() => Math.max(0.2, Number(radiusKm) || 3), [radiusKm]);

  // Auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Actions
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Report = {
        category,
        description: description.trim(),
        lat: latNum,
        lon: lonNum,
      };
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast("Report submitted ✅");
      setDescription("");
      // Refresh nearby after submit
      await loadNearby();
    } catch (err: any) {
      console.error(err);
      setToast("Submit failed ❌");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadNearby() {
    setLoadingNearby(true);
    try {
      const params = new URLSearchParams({
        lat: String(latNum),
        lon: String(lonNum),
        radius_km: String(radNum),
      });
      const res = await fetch(`${API_BASE}/reports/nearby?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NearbyResponse = await res.json();
      setNearby(data);
    } catch (err: any) {
      console.error(err);
      setToast("Load nearby failed ❌");
    } finally {
      setLoadingNearby(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setToast("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLon(String(pos.coords.longitude));
        setToast("Location set 📍");
      },
      () => setToast("Location blocked"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // Sorted list by distance (client-side convenience)
  const sortedReports = useMemo(() => {
    if (!nearby) return [] as (Report & { _dist?: number })[];
    return [...nearby.reports]
      .map((r) => ({ ...r, _dist: haversineKm(latNum, lonNum, r.lat, r.lon) }))
      .sort((a, b) => (a._dist! - b._dist!));
  }, [nearby, latNum, lonNum]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Local Knowledge Agent</h1>
          <div className="text-sm opacity-70">API: {API_BASE}</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 grid gap-6 md:grid-cols-2">
        {/* Submit report */}
        <section className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Submit a report</h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Category</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Description</span>
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="e.g., Road under water near Gampaha"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Latitude</span>
                <input
                  className="rounded-xl border px-3 py-2"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Longitude</span>
                <input
                  className="rounded-xl border px-3 py-2"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={useMyLocation}
                className="px-3 py-2 rounded-xl border bg-neutral-50 hover:bg-neutral-100"
              >
                Use my location
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </section>

        {/* Nearby */}
        <section className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Nearby reports</h2>
            <div className="flex gap-2 items-center">
              <input
                className="w-24 rounded-xl border px-3 py-2"
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
              />
              <span className="text-sm">km radius</span>
              <button
                onClick={loadNearby}
                disabled={loadingNearby}
                className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-60"
              >
                {loadingNearby ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {nearby?.count === 0 && (
            <p className="text-sm text-neutral-600">No reports found in this area.</p>
          )}

          <ul className="grid gap-3">
            {sortedReports.map((r, idx) => (
              <li key={idx} className="border rounded-xl p-4">
                <div className="text-sm uppercase tracking-wide opacity-60">
                  {r.category}
                </div>
                <div className="mt-1 font-medium">{r.description}</div>
                <div className="mt-2 text-sm text-neutral-600">
                  {km(r._dist || 0)} away · {r.lat.toFixed(4)},{" "}
                  {r.lon.toFixed(4)}
                </div>
                {r.created_at && (
                  <div className="mt-1 text-xs text-neutral-500">
                    reported {new Date(r.created_at * 1000).toLocaleString()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
