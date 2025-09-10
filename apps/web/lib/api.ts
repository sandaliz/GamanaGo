export const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

export async function getStops() {
  const r = await fetch(`${GATEWAY}/api/stops`, { cache: "no-store" });
  if (!r.ok) throw new Error("failed to fetch stops");
  return r.json() as Promise<Array<{stop_id:string; name:string; lat:number; lon:number}>>;
}

export type PlanComposeReq = {
  origin: { stop_id: string };
  destination: { stop_id: string };
  depart_at: string;           // "HH:MM"
  user_id?: string;
};

export type PlanComposeRes = {
  found: boolean;
  depart_at: string;
  arrive_at: string;
  duration_min: number;
  transfers: number;
  legs: Array<{
    mode: "ride" | "walk";
    trip_id?: string;
    route_id?: string;
    route_type?: number | null;
    from_stop: string; to_stop: string;
    from_stop_name: string; to_stop_name: string;
    from_lat:number; from_lon:number; to_lat:number; to_lon:number;
    from_seq?: number; to_seq?: number;
    depart_time: string; arrive_time: string;
  }>;
  max_walk_m: number;
  origin_stop: string; origin_name: string;
  dest_stop: string;   dest_name: string;
  origin_lat:number; origin_lon:number;
  dest_lat:number;   dest_lon:number;
  _used_walk_limit_m?: number;
};

export async function planCompose(payload: PlanComposeReq) {
  const r = await fetch(`${GATEWAY}/api/plan/compose`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data as PlanComposeRes;
}
