

// import { NextResponse } from "next/server";

// export async function GET() {
//   return NextResponse.json({
//     buses: [
//       { id: "B12", eta_min: 6, occupancy: "MED" },
//       { id: "EX-05", eta_min: 12, occupancy: "LOW" },
//     ],
//     trains: [
//       { id: "Ragama-Express", eta_min: 18, status: "ON_TIME" },
//     ],
//   });
// }

export const runtime = "nodejs";

export async function GET() {
  // Return an empty but valid payload so your interval fetch won’t crash
  return new Response(JSON.stringify({ buses: [], trains: [] }), {
    headers: { "content-type": "application/json" },
  });
}
