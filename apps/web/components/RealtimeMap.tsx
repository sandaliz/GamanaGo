'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';



type Pos = { trip_id: string; lat: number; lon: number; speed_kph: number; last_seen?: number };

const MapContainer = dynamic<any>(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic<any>(() => import('react-leaflet').then(m => m.TileLayer),     { ssr: false });
const Marker        = dynamic(() => import('react-leaflet').then(m => m.Marker),        { ssr: false });
const Popup         = dynamic(() => import('react-leaflet').then(m => m.Popup),         { ssr: false });

export default function RealtimeMap() {
  const base = process.env.NEXT_PUBLIC_AGGREGATOR_URL!;
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const esRef = useRef<EventSource | null>(null);

  // connect to SSE and keep local state of latest per trip
  useEffect(() => {
    const es = new EventSource(`${base}/realtime/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data) as { trip_id: string; lat: number; lon: number; speed_kph?: number; ts?: number };
        setPositions(prev => ({
          ...prev,
          [p.trip_id]: {
            trip_id: p.trip_id,
            lat: p.lat,
            lon: p.lon,
            speed_kph: Number(p.speed_kph ?? 0),
            last_seen: p.ts ?? Math.floor(Date.now()/1000),
          }
        }));
      } catch {}
    };

    es.onerror = () => {
      // let the browser handle auto-reconnect, or you can close & reopen
    };

    return () => { es.close(); };
  }, [base]);

  // initial center near Panadura
  const center = useMemo(() => [6.8019, 79.9223] as [number, number], []);
  const markers = Object.values(positions);

  return (
    <div style={{ width: '100%', height: '80vh', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(m => (
          <Marker key={m.trip_id} position={[m.lat, m.lon]}>
            <Popup>
              <div style={{minWidth: 180}}>
                <div><b>Trip:</b> {m.trip_id}</div>
                <div><b>Speed:</b> {m.speed_kph} km/h</div>
                <div><b>Seen:</b> {new Date((m.last_seen ?? 0)*1000).toLocaleTimeString()}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
