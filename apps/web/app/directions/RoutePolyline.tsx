"use client";
import { useEffect, useMemo } from "react";
import { Polyline, useMap } from "react-leaflet";
import polyline from 'polyline';
import type { LatLngTuple } from "leaflet";

export default function RoutePolyline({ encoded }: { encoded: string }) {
  const map = useMap();
  const points = useMemo<LatLngTuple[]>(
    () => polyline.decode(encoded).map(([lat, lon]) => [lat, lon] as LatLngTuple),
    [encoded]
  );

  useEffect(() => {
    if (!points.length) return;
    (async () => {
      const L = await import("leaflet");
      map.fitBounds(L.latLngBounds(points).pad(0.2));
    })();
  }, [map, points]);

  return <Polyline positions={points} pathOptions={{ weight: 5, opacity: 0.9 }} />;
}
