// 'use client';

// import { useEffect, useMemo, useRef } from 'react';
// import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
// import type { Map as LeafletMap, LatLngTuple } from 'leaflet';
// import RoutePolyline from './RoutePolyline';

// type Leg = {
//   mode: 'ride' | 'walk';
//   from_stop_name?: string; to_stop_name?: string;
//   from_lat?: number; from_lon?: number;
//   to_lat?: number;   to_lon?: number;
//   route_type?: number | null; // 2 = train
// };

// type Waypoint = { lat: number; lon: number; name?: string } | null;

// const DEFAULT_CENTER: LatLngTuple = [6.9271, 79.8612];

// export default function RouteMapInner({
//   legs,
//   origin,
//   destination,
//   osrmGeometry,
// }: {
//   legs: Leg[];
//   origin?: Waypoint;
//   destination?: Waypoint;
//   osrmGeometry?: string | null;
// }) {
//   const mapRef = useRef<LeafletMap | null>(null);

//   const segments = useMemo(() => {
//     const out: { pts: LatLngTuple[]; kind: 'walk' | 'bus' | 'train' }[] = [];
//     for (const l of legs) {
//       if (l.from_lat == null || l.from_lon == null || l.to_lat == null || l.to_lon == null) continue;
//       out.push({
//         pts: [[l.from_lat, l.from_lon], [l.to_lat, l.to_lon]] as LatLngTuple[],
//         kind: l.mode === 'walk' ? 'walk' : l.route_type === 2 ? 'train' : 'bus',
//       });
//     }
//     return out;
//   }, [legs]);

//   const allPts = useMemo(() => {
//     const pts: LatLngTuple[] = [];
//     segments.forEach((s) => pts.push(...s.pts));
//     if (origin && origin.lat != null && origin.lon != null) pts.push([origin.lat, origin.lon]);
//     if (destination && destination.lat != null && destination.lon != null) pts.push([destination.lat, destination.lon]);
//     return pts;
//   }, [segments, origin, destination]);

//   // Fix default marker icon (Next bundlers)
//   useEffect(() => {
//     (async () => {
//       const L = await import('leaflet');
//       const DefaultIcon = L.icon({
//         iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//         iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//         shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
//         iconSize: [25, 41],
//         iconAnchor: [12, 41],
//         popupAnchor: [1, -34],
//         shadowSize: [41, 41],
//       });
      
//       L.Marker.prototype.options.icon = DefaultIcon;
//     })();
//   }, []);

//   // Fit to points if no OSRM geometry is present
//   useEffect(() => {
//     if (!mapRef.current || !allPts.length || osrmGeometry) return;
//     (async () => {
//       const { latLngBounds } = await import('leaflet');
//       mapRef.current!.fitBounds(latLngBounds(allPts).pad(0.2));
//     })();
//   }, [allPts, osrmGeometry]);

//   const hasOrigin = !!(origin && origin.lat != null && origin.lon != null);
//   const hasDestination = !!(destination && destination.lat != null && destination.lon != null);

//   return (
//     <MapContainer
//       whenCreated={(m: LeafletMap) => { mapRef.current = m; }}
//       center={DEFAULT_CENTER}
//       zoom={11}
//       style={{ height: 520, width: '100%' }}
//       scrollWheelZoom
//     >
//       <TileLayer
//         attribution="&copy; OpenStreetMap contributors"
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />

//       {osrmGeometry && <RoutePolyline encoded={osrmGeometry} />}

//       {segments.map((s, i) => (
//         <Polyline
//           key={i}
//           positions={s.pts}
//           pathOptions={{ weight: 5, opacity: 0.9, dashArray: s.kind === 'walk' ? '6 6' : undefined }}
//         />
//       ))}

//       {hasOrigin && (
//         <Marker position={[origin!.lat, origin!.lon]}>
//           <Popup>{origin!.name || 'Origin'}</Popup>
//         </Marker>
//       )}

//       {hasDestination && (
//         <Marker position={[destination!.lat, destination!.lon]}>
//           <Popup>{destination!.name || 'Destination'}</Popup>
//         </Marker>
//       )}
//     </MapContainer>
//   );
// }
