"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Lazy-load Leaflet (avoids SSR issues)
let Lmod: typeof import("leaflet") | null = null;
async function getLeaflet() {
  if (!Lmod) Lmod = await import("leaflet");
  return Lmod!;
}

// Types (aligned with your planner)
type Leg = {
  mode: "ride" | "walk";
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
};

export type Plan = {
  found: boolean;
  legs: Leg[];
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  origin_name: string;
  dest_name: string;
};

const OSRM = process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org";
const PROFILE_FOR_RIDE = "driving"; // simple default for all legs

type Props = {
  plan: Plan;
  height?: number | string;
  /** If provided, the map will subscribe to SSE and show a live bus marker for this trip */
  liveTripId?: string;
  /** Optional: override the SSE endpoint (defaults to aggregator /realtime/stream) */
  streamBase?: string; // e.g. http://localhost:8001
};

export default function MiniMap({ plan, height = 320, liveTripId, streamBase }: Props) {
  const mapRef = useRef<any>(null);
  const lineLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const liveMarkerRef = useRef<any>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await getLeaflet();
      if (cancelled) return;

      // Create map once
      if (!mapRef.current) {
        mapRef.current = L.map("mini-map", { zoomControl: true, preferCanvas: true });

        // OSM tiles (free)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Clear old markers/lines
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (lineLayerRef.current) {
        lineLayerRef.current.remove();
        lineLayerRef.current = null;
      }

      // Mark origin/destination
      const origin = L.circleMarker([plan.origin_lat, plan.origin_lon], { radius: 6, weight: 2 }).addTo(mapRef.current);
      const dest = L.circleMarker([plan.dest_lat, plan.dest_lon], { radius: 6, weight: 2 }).addTo(mapRef.current);
      origin.bindTooltip(plan.origin_name || "Origin", { permanent: false });
      dest.bindTooltip(plan.dest_name || "Destination", { permanent: false });
      markersRef.current.push(origin, dest);

      // ---- OSRM route per leg (if OSRM down, fallback draws straight line) ----
      async function fetchOsrmGeoJSON(l: Leg) {
        const url = `${OSRM}/route/v1/${PROFILE_FOR_RIDE}/${l.from_lon},${l.from_lat};${l.to_lon},${l.to_lat}?overview=full&geometries=geojson`;
        try {
          const r = await fetch(url);
          const j = await r.json();
          return j?.routes?.[0]?.geometry || null;
        } catch {
          return null;
        }
      }

      const geoms = await Promise.all(plan.legs.map((l) => fetchOsrmGeoJSON(l)));
      const Ls = await getLeaflet();

      if (!geoms.some(Boolean)) {
        const latlngs = plan.legs.flatMap((l) => [
          [l.from_lat, l.from_lon],
          [l.to_lat, l.to_lon],
        ]) as [number, number][];
        lineLayerRef.current = Ls.polyline(latlngs, { weight: 4 }).addTo(mapRef.current);
      } else {
        const layers = geoms
          .filter(Boolean)
          .map((geom) =>
            Ls.geoJSON({ type: "Feature", properties: {}, geometry: geom as any }, { style: { weight: 4 } })
          );
        lineLayerRef.current = Ls.layerGroup(layers).addTo(mapRef.current);
      }

      // Fit map to everything
      const bounds = L.latLngBounds([
        [plan.origin_lat, plan.origin_lon],
        [plan.dest_lat, plan.dest_lon],
      ]);
      if (lineLayerRef.current) {
        lineLayerRef.current.eachLayer((ly: any) => {
          if (ly.getBounds) bounds.extend(ly.getBounds());
        });
      }
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 15 });

      // ---- Live bus marker (SSE) ----
      if (liveTripId) {
        const busIcon = L.divIcon({
          className: "bus-icon",
          html: `
            <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2)">
              🚌
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        liveMarkerRef.current = L.marker([0, 0], { icon: busIcon }).addTo(mapRef.current).bindTooltip("Live bus", {
          permanent: false,
        });

        const base = streamBase || process.env.NEXT_PUBLIC_AGG_URL || "http://localhost:8001";
        const es = new EventSource(`${base}/realtime/stream`);
        sseRef.current = es;

        es.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (!msg || msg.trip_id !== liveTripId) return;
            const lat = Number(msg.lat);
            const lon = Number(msg.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

            liveMarkerRef.current.setLatLng([lat, lon]);

            const current = mapRef.current.getBounds();
            if (!current.contains([lat, lon])) {
              mapRef.current.panTo([lat, lon], { animate: true });
            }
          } catch {}
        };

        es.onerror = () => {
          // optional: surface a toast
        };
      }
    })();

    return () => {
      cancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [plan, liveTripId, streamBase]);

  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
      <div
        id="mini-map"
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(229,231,235,0.22)",
        }}
        className="bg-white/5"
      />
    </div>
  );
}
