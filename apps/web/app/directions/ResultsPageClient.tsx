// "use client";

// import { useMemo, useState } from "react";
// import PlacePicker, { Place } from "../../components/PlacePicker";
// import RouteMapClient from "./RouteMapClient";

// type Leg = {
//   mode: "ride" | "walk";
//   from_stop_name?: string; to_stop_name?: string;
//   from_lat?: number; from_lon?: number;
//   to_lat?: number;   to_lon?: number;
//   route_type?: number | null; // 2=train
// };

// type Plan = { duration: number; cost: number; legs: Leg[] };

// function hhmmFromNow(mins: number) {
//   const d = new Date(Date.now() + mins * 60_000);
//   return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
// }

// export default function ResultsPageClient({
//   fromInit, toInit, departInInit,
// }: { fromInit: string; toInit: string; departInInit: number }) {
//   const [from, setFrom] = useState<Place | null>(null);
//   const [to, setTo] = useState<Place | null>(null);
//   const [departIn, setDepartIn] = useState(departInInit);
//   const [plans, setPlans] = useState<Plan[]>([]);
//   const [selected, setSelected] = useState<Plan | null>(null);
//   const [osrmGeom, setOsrmGeom] = useState<string | null>(null);
//   const [sort, setSort] = useState<"time" | "cost" | "transfers">("time");
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   async function doPlan() {
//     if (!from || !to) return;
//     setLoading(true); setErr(null); setPlans([]); setSelected(null); setOsrmGeom(null);

//     try {
//       // 1) OSRM route for the baseline polyline
//       const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
//       const osrm = await fetch(`/api/osrm?coords=${encodeURIComponent(coords)}&profile=car`).then(r=>r.json());
//       if (osrm?.geometry) setOsrmGeom(osrm.geometry);

//       // 2) Your planner (reads { ok, plans })
//       const res = await fetch("/api/plan", {
//         method: "POST",
//         headers: { "content-type": "application/json" },
//         body: JSON.stringify({
//           origin: { lat: from.lat, lon: from.lon, name: from.label },
//           destination: { lat: to.lat, lon: to.lon, name: to.label },
//           depart_at: hhmmFromNow(departIn),
//         }),
//       });
//       const data = await res.json();

//       if (!res.ok || data?.ok === false) {
//         throw new Error(data?.error || "Planner failed");
//       }

//       if (Array.isArray(data?.plans) && data.plans.length) {
//         setPlans(data.plans);
//         setSelected(data.plans[0]);
//       } else {
//         // Fallback: build a single-plan from the OSRM line
//         const fake: Plan = {
//           duration: osrm?.duration ?? 1800,
//           cost: 500,
//           legs: [{
//             mode: "ride", route_type: null,
//             from_stop_name: from.label, to_stop_name: to.label,
//             from_lat: from.lat, from_lon: from.lon,
//             to_lat: to.lat, to_lon: to.lon,
//           }],
//         };
//         setPlans([fake]); setSelected(fake);
//       }
//     } catch (e: any) {
//       setErr(e?.message || "Routing failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   const sortedPlans = useMemo(() => {
//     const copy = [...plans];
//     copy.sort((a,b) =>
//       sort === "time" ? a.duration - b.duration :
//       sort === "cost" ? a.cost - b.cost :
//       (a.legs.length) - (b.legs.length)
//     );
//     return copy;
//   }, [plans, sort]);

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       {/* Left: search + list */}
//       <div className="space-y-3">
//         <h1 className="text-xl font-semibold">Transit Directions</h1>

//         <PlacePicker label="From" value={from} onChange={setFrom} />
//         <PlacePicker label="To"   value={to}   onChange={setTo} />

//         <div className="flex items-center gap-2">
//           <label className="text-xs text-white/70">Depart in (min)</label>
//           <input type="number" min={0} max={120}
//             value={departIn} onChange={e=>setDepartIn(parseInt(e.target.value||"0"))}
//             className="w-24 rounded-xl border border-white/15 bg-black/40 px-3 py-2 outline-none" />
//           <button onClick={doPlan} disabled={!from||!to||loading}
//             className="ml-auto rounded-xl px-4 py-2 bg-cyan-400 text-black font-medium disabled:opacity-60">
//             {loading ? "Planning…" : "Plan"}
//           </button>
//         </div>

//         {/* Sorting */}
//         <div className="flex gap-2">
//           {(["time","cost","transfers"] as const).map(s=>(
//             <button key={s} onClick={()=>setSort(s)}
//               className={`px-3 py-1 rounded-full text-sm border ${sort===s ? "bg-cyan-400 text-black" : ""}`}>
//               {s}
//             </button>
//           ))}
//         </div>

//         {err && <div className="text-red-300 text-sm">{err}</div>}

//         {sortedPlans.map((p, i) => (
//           <button key={i}
//             onClick={()=>setSelected(p)}
//             className={`w-full text-left p-3 rounded-xl border shadow-sm ${selected===p ? "bg-white/10" : "bg-white/[0.04]"}`}
//           >
//             <div className="flex justify-between text-sm mb-1">
//               <span>{Math.round(p.duration/60)} min</span>
//               <span>LKR {p.cost}</span>
//             </div>
//             <div className="text-xs text-white/70">
//               {p.legs.map((l,j)=>(
//                 <span key={j}>
//                   {l.from_stop_name || "Start"} → {l.to_stop_name || "End"}{j<p.legs.length-1?", ":""}
//                 </span>
//               ))}
//             </div>
//           </button>
//         ))}
//       </div>

//       {/* Right: Map */}
//       <div className="lg:col-span-2">
//         <RouteMapClient
//           legs={selected?.legs ?? []}
//           origin={selected?.legs?.[0] && {
//             lat: selected.legs[0].from_lat,
//             lon: selected.legs[0].from_lon,
//             name: selected.legs[0].from_stop_name
//           }}
//           destination={selected?.legs?.slice(-1)[0] && {
//             lat: selected.legs.slice(-1)[0].to_lat,
//             lon: selected.legs.slice(-1)[0].to_lon,
//             name: selected.legs.slice(-1)[0].to_stop_name
//           }}
//           osrmGeometry={osrmGeom || undefined}
//         />
//       </div>
//     </div>
//   );
// }
