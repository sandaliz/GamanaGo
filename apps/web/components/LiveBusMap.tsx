// apps/web/components/LiveBusMap.tsx
"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Props = {
  tripId: string;
  from: [number, number];
  to: [number, number];
  // Optional: override stream base (defaults to data-aggregator)
  streamBase?: string; // e.g. http://localhost:8001
};

// NOTE: we dynamic-import Leaflet to avoid SSR issues.
let lfPromise: Promise<typeof import("leaflet")> | null = null;
function getLeaflet() {
  if (!lfPromise) lfPromise = import("leaflet");
  return lfPromise;
}

// A small pastel-green pin with a bus glyph
function makeBusIcon(L: any) {
  const svg = encodeURIComponent(`
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#g)">
        <circle cx="18" cy="18" r="12" fill="#9AE6B4" stroke="#22C55E" stroke-width="2"/>
        <text x="18" y="21" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#064E3B">🚌</text>
      </g>
    </svg>
  `);
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export default function LiveBusMap({ tripId, from, to, streamBase }: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const lineRef = useRef<any | null>(null);
  const busRef = useRef<any | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let Lmod: any;
    let cancelled = false;

    (async () => {
      const L = await getLeaflet();
      if (cancelled) return;
      Lmod = L;

      // Create map only once
      if (!mapRef.current) {
        mapRef.current = Lmod.map("live-map", {
          zoomControl: false,
          preferCanvas: true,
        });

        // Minimal controls (custom positions)
        Lmod.control.zoom({ position: "topright" }).addTo(mapRef.current);

        // Pastel OSM tiles
        Lmod.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Clear old overlays
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
      if (busRef.current) {
        busRef.current.remove();
        busRef.current = null;
      }

      // Draw the thin route segment (straight for now)
      lineRef.current = Lmod.polyline([from, to], {
        weight: 5,
        opacity: 0.9,
      }).addTo(mapRef.current);

      // Start/end dots
      const start = Lmod.circleMarker(from, {
        radius: 6,
        weight: 2,
      }).addTo(mapRef.current);
      const end = Lmod.circleMarker(to, {
        radius: 6,
        weight: 2,
      }).addTo(mapRef.current);
      markersRef.current.push(start, end);

      // Fit view
      mapRef.current.fitBounds(Lmod.latLngBounds(from, to), {
        padding: [40, 40],
        maxZoom: 15,
      });

      // Live bus marker
      busRef.current = Lmod.marker(from, { icon: makeBusIcon(Lmod) })
        .addTo(mapRef.current)
        .bindPopup(`<div style="font-weight:600">Trip: ${tripId}</div><div>Waiting for GPS…</div>`);

      // Connect SSE
      const base =
        streamBase ||
        process.env.NEXT_PUBLIC_CONTEXT_URL ||
        "http://localhost:8001";
      const url = `${base.replace(/\/$/, "")}/realtime/stream`;
      const es = new EventSource(url);
      sseRef.current = es;

      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data || "{}");
          if (!msg || msg.trip_id !== tripId) return;
          const lat = Number(msg.lat);
          const lon = Number(msg.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon) && busRef.current) {
            busRef.current.setLatLng([lat, lon]);
            busRef.current.getPopup()?.setContent(
              `<div style="font-weight:600">Trip: ${tripId}</div>
               <div>Last seen: ${new Date(msg.ts * 1000).toLocaleTimeString()}</div>
               <div>Speed: ${Math.round(Number(msg.speed_kph || 0))} km/h</div>`
            );
          }
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        // keep quiet; EventSource retries automatically
      };
    })();

    return () => {
      cancelled = true;
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, [tripId, from[0], from[1], to[0], to[1], streamBase]);

  return (
    <div
      id="live-map"
      className="w-full h-[62vh] md:h-[70vh] rounded-3xl overflow-hidden shadow-xl"
    />
  );
}
