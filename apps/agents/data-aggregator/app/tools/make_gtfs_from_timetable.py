import csv, os
GTFS_DIR = os.path.join(os.path.dirname(__file__), "..", "gtfs_edit")

# ---------------- 0) helpers ----------------
def to_24h(hm_ampm: str) -> str:
    s = hm_ampm.strip().lower().replace(" ", "")
    ampm = "am" if "am" in s else "pm"
    s = s.replace("am","").replace("pm","").replace(".",":")
    hh, mm = s.split(":")
    h = int(hh); m = int(mm)
    if ampm == "pm" and h != 12: h += 12
    if ampm == "am" and h == 12: h = 0
    return f"{h:02d}:{m:02d}:00"

def to_seconds(hms: str) -> int:
    h,m,s = map(int, hms.split(":")); return h*3600 + m*60 + s

def from_seconds(sec: int) -> str:
    sec %= 86400
    h = sec//3600; m=(sec%3600)//60; s=sec%60
    return f"{h:02d}:{m:02d}:{s:02d}"

def evenly_spaced_times(dep_hms: str, arr_hms: str, n_stops: int):
    dep = to_seconds(dep_hms); arr = to_seconds(arr_hms)
    if arr <= dep: arr += 24*3600
    step = (arr - dep)/(n_stops - 1)
    return [from_seconds(int(round(dep + step*i))) for i in range(n_stops)]

# ---------------- 1) stop sequences per route ----------------
# reuse S01..S25 from your stops.txt
R1_OUT = ["S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13","S14","S15","S16","S17"]   # Panadura->Nittambuwa
R2_OUT = ["S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13","S14","S15","S16","S17","S18","S19","S20","S21","S22","S23","S24","S25"]  # Panadura->Kandy

# NEW: route 255 path via Piliyandala -> Kottawa -> Athurugiriya, then rejoin at Kaduwela (S11)
R255_OUT = [
    "S01","S26","S27","S28","S29","S30",
    "S11","S12","S13","S14","S15","S16","S17","S18","S19","S20","S21","S22","S23","S24","S25"
]

ROUTE_STOPS = {
    # NCG
    ("RNCG1","out"): R1_OUT,
    ("RNCG1","in") : list(reversed(R1_OUT)),
    ("RNCG2","out"): R2_OUT,
    ("RNCG2","in") : list(reversed(R2_OUT)),
    # SLTB (17 path via Kaduwela)
    ("RSLTB1","out"): R1_OUT,
    ("RSLTB1","in") : list(reversed(R1_OUT)),
    ("RSLTB2","out"): R2_OUT,
    ("RSLTB2","in") : list(reversed(R2_OUT)),
    # SLTB 255 via Piliyandala
    ("RSLTB255","out"): R255_OUT,
    ("RSLTB255","in") : list(reversed(R255_OUT)),
}

# ---------------- 2) timetables ----------------
# NCG (from your screenshots)
NCG_R1 = [
    ("TNCG1R_0530","RNCG1","in",  "05:30:00","08:10:00"),
    ("TNCG1R_0550","RNCG1","in",  "05:50:00","08:30:00"),
    ("TNCG1_1630", "RNCG1","out", "16:30:00","19:40:00"),
    ("TNCG1_1700", "RNCG1","out", "17:00:00","20:10:00"),
]
NCG_R2 = [
    ("TNCG2_0330","RNCG2","out","03:30:00","07:20:00"),
    ("TNCG2_0400","RNCG2","out","04:00:00","07:50:00"),
    ("TNCG2_0430","RNCG2","out","04:30:00","08:15:00"),
    ("TNCG2_0450","RNCG2","out","04:50:00","08:45:00"),
    ("TNCG2_0515","RNCG2","out","05:15:00","09:30:00"),
    ("TNCG2_0540","RNCG2","out","05:40:00","09:40:00"),
    ("TNCG2_0615","RNCG2","out","06:15:00","10:10:00"),
    ("TNCG2_0700","RNCG2","out","07:00:00","10:50:00"),
    ("TNCG2_0730","RNCG2","out","07:30:00","11:20:00"),
    ("TNCG2_0810","RNCG2","out","08:10:00","13:00:00"),
    ("TNCG2_0830","RNCG2","out","08:30:00","13:40:00"),
    ("TNCG2_0910","RNCG2","out","09:10:00","13:50:00"),
    ("TNCG2_0950","RNCG2","out","09:50:00","15:15:00"),
    ("TNCG2R_0900","RNCG2","in", "09:00:00","14:00:00"),
    ("TNCG2R_0950","RNCG2","in", "09:50:00","15:00:00"),
    ("TNCG2R_1300","RNCG2","in", "13:00:00","18:30:00"),
    ("TNCG2R_1400","RNCG2","in", "14:00:00","19:15:00"),
    ("TNCG2R_1625","RNCG2","in", "16:25:00","21:15:00"),
    ("TNCG2R_1725","RNCG2","in", "17:25:00","22:15:00"),
    ("TNCG2R_1850","RNCG2","in", "18:50:00","23:00:00"),
]

# SLTB: 17 (via Kaduwela) — note: 14:10 belongs to 255, so it's NOT here
SLTB_R1 = []  # no SLTB Panadura<->Nittambuwa

SLTB_R2_OUT = [
    ("TSLTB2_0500","RSLTB2","out","05:00:00","10:00:00"),
    ("TSLTB2_0710","RSLTB2","out","07:10:00","12:20:00"),
    ("TSLTB2_0750","RSLTB2","out","07:50:00","13:45:00"),
    ("TSLTB2_0850","RSLTB2","out","08:50:00","14:15:00"),
    ("TSLTB2_0930","RSLTB2","out","09:30:00","14:30:00"),
    ("TSLTB2_1130","RSLTB2","out","11:30:00","17:00:00"),
    ("TSLTB2_1230","RSLTB2","out","12:30:00","17:40:00"),
    ("TSLTB2_1330","RSLTB2","out","13:30:00","18:30:00"),
    ("TSLTB2_1640","RSLTB2","out","16:40:00","21:40:00"),
]
SLTB_R2_IN = [
    ("TSLTB2R_0445","RSLTB2","in","04:45:00","10:10:00"),
    ("TSLTB2R_0630","RSLTB2","in","06:30:00","11:30:00"),
    ("TSLTB2R_0745","RSLTB2","in","07:45:00","12:45:00"),
    ("TSLTB2R_1145","RSLTB2","in","11:45:00","16:00:00"),
    ("TSLTB2R_1320","RSLTB2","in","13:20:00","19:30:00"),
    ("TSLTB2R_1420","RSLTB2","in","14:20:00","19:15:00"),
    ("TSLTB2R_1500","RSLTB2","in","15:00:00","20:15:00"),
    ("TSLTB2R_1615","RSLTB2","in","16:15:00","21:15:00"),
    ("TSLTB2R_1830","RSLTB2","in","18:30:00","22:40:00"),
]
SLTB_R2 = SLTB_R2_OUT + SLTB_R2_IN

# SLTB: 255 via Piliyandala (the separate route)
SLTB_R255 = [
    ("TSLTB255_1410","RSLTB255","out","14:10:00","19:10:00"),  # Panadura -> Kandy
    ("TSLTB255R_0815","RSLTB255","in","08:15:00","13:00:00"),  # Kandy -> Panadura
]

# Final bundle
ALL = NCG_R1 + NCG_R2 + SLTB_R1 + SLTB_R2 + SLTB_R255

# ---------------- 3) write trips.txt & stop_times.txt ----------------
os.makedirs(GTFS_DIR, exist_ok=True)

with open(os.path.join(GTFS_DIR,"trips.txt"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["trip_id","route_id","service_id"])
    for trip_id, route_id, direction, dep, arr in ALL:
        w.writerow([trip_id, route_id, "WEEK"])  # matches calendar.txt

with open(os.path.join(GTFS_DIR,"stop_times.txt"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["trip_id","arrival_time","departure_time","stop_id","stop_sequence"])
    for trip_id, route_id, direction, dep, arr in ALL:
        stops = ROUTE_STOPS[(route_id, direction)]
        times = evenly_spaced_times(dep, arr, len(stops))
        for i, (sid, t) in enumerate(zip(stops, times), start=1):
            w.writerow([trip_id, t, t, sid, i])

print("✅ Wrote trips.txt and stop_times.txt for NCG + SLTB (incl. route 255 via Piliyandala)")
