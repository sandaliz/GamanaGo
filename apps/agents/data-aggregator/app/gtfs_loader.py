import os, csv, datetime as dt
from typing import Dict, Any, List
from sqlalchemy import text
from .db import engine, ensure_postgis

GTFS_DIR = os.path.join(os.path.dirname(__file__), "..", "gtfs_edit")

def _exists(path: str) -> bool:
    return os.path.exists(path) and os.path.getsize(path) > 0

def _read_csv(path: str) -> List[Dict[str, Any]]:
    # use utf-8-sig to strip BOM if present
    with open(path, newline="", encoding="utf-8-sig") as f:
        rdr = csv.DictReader(f)
        # normalize keys a bit
        return [{(k.strip() if k else k): v for k, v in row.items()} for row in rdr]

def reset_tables():
    """Clear all GTFS tables in FK-safe order."""
    with engine.begin() as c:
        # CASCADE ensures dependent rows go too; order doesn’t matter with TRUNCATE
        c.execute(text("""
            TRUNCATE
              stop_times,
              trips,
              transfers,
              shapes,
              calendar,
              feed_info,
              routes,
              stops,
              agencies
            RESTART IDENTITY CASCADE
        """))

DDL = """
CREATE TABLE IF NOT EXISTS agencies(
  agency_id text PRIMARY KEY,
  agency_name text,
  agency_url text,
  agency_timezone text,
  agency_lang text,
  agency_phone text,
  agency_email text
);

CREATE TABLE IF NOT EXISTS routes(
  route_id text PRIMARY KEY,
  agency_id text REFERENCES agencies(agency_id),
  route_short_name text,
  route_long_name text
);

CREATE TABLE IF NOT EXISTS stops(
  stop_id text PRIMARY KEY,
  name text,
  lat double precision,
  lon double precision,
  geom geometry(Point,4326)
);

CREATE TABLE IF NOT EXISTS trips(
  trip_id text PRIMARY KEY,
  route_id text REFERENCES routes(route_id),
  service_id text,
  shape_id text
);

CREATE TABLE IF NOT EXISTS stop_times(
  trip_id text REFERENCES trips(trip_id),
  arrival_time text,
  departure_time text,
  stop_id text REFERENCES stops(stop_id),
  stop_sequence integer,
  PRIMARY KEY(trip_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS shapes(
  shape_id text,
  shape_pt_lat double precision,
  shape_pt_lon double precision,
  shape_pt_sequence integer,
  PRIMARY KEY(shape_id, shape_pt_sequence)
);

CREATE TABLE IF NOT EXISTS calendar(
  service_id text PRIMARY KEY,
  monday int, tuesday int, wednesday int, thursday int, friday int, saturday int, sunday int,
  start_date int, end_date int
);

CREATE TABLE IF NOT EXISTS feed_info(
  feed_publisher_name text,
  feed_publisher_url text,
  feed_lang text,
  default_lang text,
  feed_version text,
  feed_contact_email text
);

CREATE TABLE IF NOT EXISTS transfers(
  from_stop_id text REFERENCES stops(stop_id),
  to_stop_id text   REFERENCES stops(stop_id),
  distance_m integer,
  PRIMARY KEY(from_stop_id, to_stop_id)
);
"""

def create_tables():
    ensure_postgis()
    with engine.begin() as conn:
        for stmt in DDL.strip().split(";\n\n"):
            if stmt.strip():
                conn.execute(text(stmt))
def load_gtfs() -> Dict[str,int]:
    """Load all CSVs from gtfs_edit/ into DB (truncate & insert)."""
    create_tables()
    reset_tables()
    counts: Dict[str, int] = {}

    # Agencies
    p = os.path.join(GTFS_DIR, "agency.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                c.execute(text("""
                    INSERT INTO agencies(agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_email)
                    VALUES (:agency_id,:agency_name,:agency_url,:agency_timezone,:agency_lang,:agency_phone,:agency_email)
                """), r)
        counts["agencies"] = len(rows)

    # Routes
    p = os.path.join(GTFS_DIR, "routes.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                params = {
                    "route_id": r.get("route_id"),
                    "agency_id": r.get("agency_id"),
                    "route_short_name": r.get("route_short_name"),
                    "route_long_name": r.get("route_long_name"),
                }
                c.execute(text("""
                    INSERT INTO routes(route_id,agency_id,route_short_name,route_long_name)
                    VALUES (:route_id,:agency_id,:route_short_name,:route_long_name)
                """), params)
        counts["routes"] = len(rows)

    # Stops (supports both 4-col and 6-col headers)
    p = os.path.join(GTFS_DIR, "stops.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                stop_name = r.get("stop_name") or r.get("name")
                lat = float(r["stop_lat"] if "stop_lat" in r else r["lat"])
                lon = float(r["stop_lon"] if "stop_lon" in r else r["lon"])
                c.execute(text("""
                    INSERT INTO stops(stop_id,name,lat,lon,geom)
                    VALUES (:id,:name,:lat,:lon, ST_SetSRID(ST_MakePoint(:lon,:lat),4326))
                """), {"id": r["stop_id"], "name": stop_name, "lat": lat, "lon": lon})
        counts["stops"] = len(rows)

    # Trips
    p = os.path.join(GTFS_DIR, "trips.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                c.execute(text("""
                    INSERT INTO trips(trip_id,route_id,service_id,shape_id)
                    VALUES (:trip_id,:route_id,:service_id,:shape_id)
                """), {
                    "trip_id": r["trip_id"],
                    "route_id": r["route_id"],
                    "service_id": r.get("service_id"),
                    "shape_id": r.get("shape_id"),
                })
        counts["trips"] = len(rows)

    # Stop times
    p = os.path.join(GTFS_DIR, "stop_times.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                c.execute(text("""
                    INSERT INTO stop_times(trip_id,arrival_time,departure_time,stop_id,stop_sequence)
                    VALUES (:trip_id,:arrival_time,:departure_time,:stop_id,:stop_sequence)
                """), r)
        counts["stop_times"] = len(rows)

    # Shapes (optional, BOM-safe + header validation)
    shapes_path = os.path.join(GTFS_DIR, "shapes.txt")
    if os.path.exists(shapes_path) and os.path.getsize(shapes_path) > 0:
        with engine.begin() as c, open(shapes_path, "r", encoding="utf-8-sig") as f:
            r = csv.DictReader(f)
            required = {"shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"}
            fieldnames = set([h.strip() for h in (r.fieldnames or [])])
            if required.issubset(fieldnames):
                for row in r:
                    sid = (row.get("shape_id") or "").strip()
                    lat = (row.get("shape_pt_lat") or "").strip()
                    lon = (row.get("shape_pt_lon") or "").strip()
                    seq = (row.get("shape_pt_sequence") or "").strip()
                    if not (sid and lat and lon and seq):
                        continue
                    c.execute(text("""
                        INSERT INTO shapes(shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence)
                        VALUES (:shape_id,:shape_pt_lat,:shape_pt_lon,:shape_pt_sequence)
                    """), {
                        "shape_id": sid,
                        "shape_pt_lat": float(lat),
                        "shape_pt_lon": float(lon),
                        "shape_pt_sequence": int(seq),
                    })
            else:
                print(f"Skipping shapes: bad header {r.fieldnames}")
    else:
        print("No shapes.txt → skipping (OK)")

    # Calendar (optional)
    p = os.path.join(GTFS_DIR, "calendar.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                c.execute(text("""
                    INSERT INTO calendar(service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date)
                    VALUES (:service_id,:monday,:tuesday,:wednesday,:thursday,:friday,:saturday,:sunday,:start_date,:end_date)
                """), r)
        counts["calendar"] = len(rows)

    # feed_info (optional)
    p = os.path.join(GTFS_DIR, "feed_info.txt")
    if _exists(p):
        rows = _read_csv(p)
        with engine.begin() as c:
            for r in rows:
                c.execute(text("""
                    INSERT INTO feed_info(feed_publisher_name,feed_publisher_url,feed_lang,default_lang,feed_version,feed_contact_email)
                    VALUES (:feed_publisher_name,:feed_publisher_url,:feed_lang,:default_lang,:feed_version,:feed_contact_email)
                """), r)
        counts["feed_info"] = len(rows)

    return counts

def build_transfers(max_meters: int = 400) -> int:
    """Create walk transfers between nearby stops using PostGIS (geodesic meters)."""
    with engine.begin() as c:
        c.execute(text("DELETE FROM transfers"))
        c.execute(text("""
            INSERT INTO transfers(from_stop_id, to_stop_id, distance_m)
            SELECT s1.stop_id, s2.stop_id,
                   CAST(ST_DistanceSphere(s1.geom, s2.geom) AS integer) AS dist_m
            FROM stops s1
            JOIN stops s2 ON s1.stop_id < s2.stop_id
            WHERE ST_DWithin(geography(s1.geom), geography(s2.geom), :r)
        """), {"r": max_meters})
        # Count rows
        res = c.execute(text("SELECT count(*) FROM transfers")).scalar_one()
        return int(res)

def list_routes():
    with engine.begin() as c:
        rows = c.execute(text("""
            SELECT r.route_id, r.agency_id, r.route_short_name, r.route_long_name,
                   COALESCE(t.cnt,0) AS trips
            FROM routes r
            LEFT JOIN (
              SELECT route_id, count(*) AS cnt FROM trips GROUP BY route_id
            ) t USING(route_id)
            ORDER BY r.agency_id, r.route_id
        """)).mappings().all()
    return [dict(r) for r in rows]

def list_stops(bbox: str):
    # bbox: "minLon,minLat,maxLon,maxLat"
    minLon, minLat, maxLon, maxLat = [float(x) for x in bbox.split(",")]
    with engine.begin() as c:
        rows = c.execute(text("""
            SELECT stop_id, name, lat, lon
            FROM stops
            WHERE geom && ST_MakeEnvelope(:minLon,:minLat,:maxLon,:maxLat,4326)
            ORDER BY stop_id
        """), {"minLon":minLon,"minLat":minLat,"maxLon":maxLon,"maxLat":maxLat}).mappings().all()
    return [dict(r) for r in rows]

def build_report() -> str:
    """Write a tiny HTML report to /app/output/report.html inside the container."""
    out_dir = os.path.join(os.path.dirname(__file__), "..", "output")
    os.makedirs(out_dir, exist_ok=True)
    with engine.begin() as c:
        stats = {}
        for table in ["agencies","routes","stops","trips","stop_times","shapes","calendar","feed_info","transfers"]:
            stats[table] = c.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one()
    html = "<h1>GTFS Ingestion Report</h1><ul>" + "".join([f"<li>{k}: {v}</li>" for k,v in stats.items()]) + "</ul>"
    path = os.path.join(out_dir, "report.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path
