'use client';

import {useEffect, useRef, useState} from 'react';

export default function DriverSimulator() {
  const base = process.env.NEXT_PUBLIC_AGGREGATOR_URL!;
  const [tripId, setTripId] = useState('TNCG2_0700');
  const [sending, setSending] = useState(false);
  const watchRef = useRef<number | null>(null);

  const sendBeacon = async (lat: number, lon: number, speedKph?: number) => {
    try {
      await fetch(`${base}/realtime/driver/beacon`, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ trip_id: tripId, lat, lon, speed_kph: speedKph ?? 0 })
      });
    } catch {}
  };

  const start = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    setSending(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const speedKph = (speed ?? 0) * 3.6; // m/s -> km/h
        sendBeacon(latitude, longitude, speedKph);
      },
      (err) => { console.warn(err); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const stop = () => {
    setSending(false);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  };

  useEffect(() => () => stop(), []);

  return (
    <main style={{padding: 24}}>
      <h1>Driver Beacon Simulator</h1>
      <label>
        Trip ID:&nbsp;
        <input value={tripId} onChange={e=>setTripId(e.target.value)} />
      </label>
      <div style={{marginTop: 12}}>
        {!sending ? <button onClick={start}>Start</button> : <button onClick={stop}>Stop</button>}
      </div>
      <p style={{marginTop: 8}}>POSTing to {base}/realtime/driver/beacon</p>
      <p><small>Tip: open this page on your phone to stream your GPS.</small></p>
    </main>
  );
}
