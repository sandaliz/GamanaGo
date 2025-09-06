// import { NextResponse } from "next/server";

// let buses = [
//   { id: "bus-101", route: "Kandy → Colombo", eta: 45, status: "on-time" },
//   { id: "bus-102", route: "Gampaha → Colombo", eta: 30, status: "on-time" },
// ];
// let trains = [
//   { id: "train-201", route: "Kandy → Colombo", eta: 80, status: "on-time" },
//   { id: "train-202", route: "Galle → Colombo", eta: 120, status: "on-time" },
// ];

// function randomizeStatus() {
//   buses = buses.map((b) => ({
//     ...b,
//     eta: b.eta + (Math.random() < 0.3 ? Math.floor(Math.random() * 15) : 0),
//     status: Math.random() < 0.2 ? "delayed" : "on-time",
//   }));
//   trains = trains.map((t) => ({
//     ...t,
//     eta: t.eta + (Math.random() < 0.3 ? Math.floor(Math.random() * 20) : 0),
//     status: Math.random() < 0.2 ? "delayed" : "on-time",
//   }));
// }

// export async function GET() {
//   randomizeStatus();
//   return NextResponse.json({ buses, trains, updatedAt: new Date().toISOString() });
// }


import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    buses: [
      { id: "B12", eta_min: 6, occupancy: "MED" },
      { id: "EX-05", eta_min: 12, occupancy: "LOW" },
    ],
    trains: [
      { id: "Ragama-Express", eta_min: 18, status: "ON_TIME" },
    ],
  });
}
