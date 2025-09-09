"use client";
import dynamic from "next/dynamic";
const RouteMapInner = dynamic(() => import("./RouteMapInner"), { ssr: false });
export default function RouteMapClient(props: any) {
  return <RouteMapInner {...props} />;
}
