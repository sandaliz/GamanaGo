"use client";

import { useEffect, useRef, useState } from "react";

const GW =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://192.168.1.102:3000/driver";

export default function DriverBeaconPage() {
  const [tripId, setTripId] = useState("TNCG2_0700"); // set to any trip_id from your plan
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unload
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function start() {
    if (!("geolocation" in navigator)) {
      setStatus("Geolocation not supported on this device/browser.");
      return;
    }
    if (!tripId.trim()) {
      setStatus("Please enter a trip_id.");
      return;
    }

    setRunning(true);
    setStatus("Requesting location permission…");

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const speedMps = pos.coords.speed ?? 0; // m/s (may be null)
        const speedKph = speedMps ? speedMps * 3.6 : 0;

        setStatus(
          `Sending: lat=${lat.toFixed(6)}, lon=${lon.toFixed(
            6
          )} (${speedKph.toFixed(1)} km/h)`
        );

        try {
          const r = await fetch(`${GW}/api/realtime/beacon`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              trip_id: tripId,
              lat,
              lon,
              speed_kph: speedKph,
            }),
          });
          // not strictly needed to parse the body; this endpoint returns {"ok": true}
          await r.text();
        } catch (e: any) {
          setStatus(`Send failed: ${e?.message || e}`);
        }
      },
      (err) => {
        setStatus(`Location error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  }

  function stop() {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setRunning(false);
    setStatus("Stopped");
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Driver / Phone GPS Beacon</h1>

      <p className="text-sm text-gray-600">
        This page uses your phone’s GPS to publish a “bus position” for a given{" "}
        <code>trip_id</code> to the backend.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Trip ID</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          value={tripId}
          onChange={(e) => setTripId(e.target.value)}
          placeholder="e.g., TNCG2_0700"
        />
      </div>

      <div className="flex gap-3">
        {!running ? (
          <button
            onClick={start}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
          >
            Start sending GPS
          </button>
        ) : (
          <button
            onClick={stop}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            Stop
          </button>
        )}
      </div>

      <div className="text-sm text-gray-700">
        <b>Status:</b> {status}
      </div>

      <div className="text-xs text-gray-500">
        Tip: On iOS, Safari requires HTTPS for high-accuracy GPS. If you need to
        test from your phone over the internet, expose your dev server with
        <code className="mx-1">ngrok http 8000</code> and set{" "}
        <code>NEXT_PUBLIC_GATEWAY_URL</code> to that HTTPS URL.
      </div>
    </div>
  );
}
