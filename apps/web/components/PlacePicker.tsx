"use client";
import { useEffect, useState } from "react";

export type Place = { lat: number; lon: number; label: string };

export default function PlacePicker({
  label, value, onChange,
}: {
  label: string;
  value: Place | null;
  onChange: (v: Place | null) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Place[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 3) { setItems([]); return; }
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const list = await r.json();
      setItems(list);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={value?.label || "Search place…"}
        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 outline-none"
      />
      {items.length > 0 && (
        <div className="mt-1 rounded-xl border border-white/10 bg-black/80 max-h-56 overflow-auto">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => { onChange(it); setQ(it.label); setItems([]); }}
              className="block w-full text-left px-3 py-2 hover:bg-white/10 text-sm"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
