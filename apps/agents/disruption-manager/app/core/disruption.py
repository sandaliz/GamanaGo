# # app/core/disruption.py
# from shapely.geometry import Point, LineString
# from datetime import datetime, timedelta
# from typing import Dict, Any, Optional
# #from ..clients.data_client import data_client  # Import the client instance
# from ..clients.data_client import get_trip_schedule, get_all_vehicle_positions
# import math
# from .haversine import haversine_distance      # Import your helper function
# import asyncio
# import logging

# log = logging.getLogger(__name__)



# def calculate_delay_for_vehicle(vehicle_data):
#     """
#     Calculates delay for a single vehicle using the local GTFS file data.
#     """
#     trip_id = vehicle_data['trip_id']
#     current_lat = vehicle_data['lat']
#     current_lon = vehicle_data['lon']
#     timestamp = datetime.fromtimestamp(vehicle_data['last_seen'])

#     # 1. GET THE SCHEDULE FOR THIS TRIP FROM THE FILES
#     full_schedule = get_trip_schedule(trip_id)
#     if not full_schedule or isinstance(full_schedule, dict) and full_schedule.get('error'):
#         print(f"Could not find schedule for trip {trip_id}.")
#         return None

#     # 2. Find the vehicle's current position on its route.
#     closest_prev_stop = None
#     closest_next_stop = None
#     min_distance_to_path = float('inf')

#     for i in range(len(full_schedule) - 1):
#         stop_a = full_schedule[i]
#         stop_b = full_schedule[i+1]

#         point_a = Point(stop_a['stop_lon'], stop_a['stop_lat'])
#         point_b = Point(stop_b['stop_lon'], stop_b['stop_lat'])
#         line_segment = LineString([point_a, point_b])
#         vehicle_point = Point(current_lon, current_lat)

#         projected_point = line_segment.interpolate(line_segment.project(vehicle_point))
#         distance_to_path = vehicle_point.distance(projected_point)

#         if distance_to_path < min_distance_to_path:
#             min_distance_to_path = distance_to_path
#             closest_prev_stop = stop_a
#             closest_next_stop = stop_b

#     if not closest_prev_stop or not closest_next_stop:
#         return None

#     # 3. Calculate progress ratio using Haversine (in meters)
#     total_distance_m = haversine_distance(
#         closest_prev_stop['stop_lon'], closest_prev_stop['stop_lat'],
#         closest_next_stop['stop_lon'], closest_next_stop['stop_lat']
#     )
#     distance_traveled_m = haversine_distance(
#         closest_prev_stop['stop_lon'], closest_prev_stop['stop_lat'],
#         projected_point.x, projected_point.y
#     )
#     progress_ratio = distance_traveled_m / total_distance_m
#     progress_ratio = max(0.0, min(1.0, progress_ratio))

#     # 4. Calculate scheduled time at the current location - USING 2025!
#     reference_date = datetime(2025, 1, 15)  # Any date in 2025 will work
    
#     scheduled_departure_prev = datetime.strptime(closest_prev_stop['departure_time'], '%H:%M:%S').replace(
#         year=reference_date.year, month=reference_date.month, day=reference_date.day
#     )
#     scheduled_arrival_next = datetime.strptime(closest_next_stop['arrival_time'], '%H:%M:%S').replace(
#         year=reference_date.year, month=reference_date.month, day=reference_date.day
#     )
#     scheduled_segment_time_sec = (scheduled_arrival_next - scheduled_departure_prev).total_seconds()

#     scheduled_time_here = scheduled_departure_prev + timedelta(seconds=scheduled_segment_time_sec * progress_ratio)

#     # 5. Calculate delay
#     delay_seconds = (timestamp - scheduled_time_here).total_seconds()
#     delay_minutes = delay_seconds / 60

#         # Add these debug prints:
#     print(f"DEBUG: Closest stops: {closest_prev_stop['stop_id']} -> {closest_next_stop['stop_id']}")
#     print(f"DEBUG: Scheduled departure: {scheduled_departure_prev}")
#     print(f"DEBUG: Scheduled arrival: {scheduled_arrival_next}")
#     print(f"DEBUG: Segment time: {scheduled_segment_time_sec} seconds")
#     print(f"DEBUG: Progress ratio: {progress_ratio:.2f}")
#     print(f"DEBUG: Scheduled time at location: {scheduled_time_here}")
#     print(f"DEBUG: Actual timestamp: {timestamp}")
#     print(f"DEBUG: Raw delay seconds: {delay_seconds}")
    
#     return delay_minutes



# # ------- MAIN LOOP -------
# async def main_disruption_loop():
#     """Main function that runs periodically to check for disruptions."""
#     print("Checking for disruptions...")
#     # 1. Fetch live data (simulated for now)
#     all_vehicles = get_all_vehicle_positions()
    
#     for vehicle in all_vehicles:
#         # 2. For each vehicle, calculate its current delay
#         delay = calculate_delay_for_vehicle(vehicle)
#         if delay is not None:
#             trip_id = vehicle['trip_id']
#             print(f"Vehicle on trip {trip_id} is {delay:.1f} minutes behind schedule.")
            
#             # 3. CHECK FOR DISRUPTION: Define your threshold
#             if delay > 5: 
#                 print(f"🚨 DISRUPTION DETECTED on {trip_id}! Delay: {delay} min.")
#                 # 4. Here is where you would trigger other agents for rerouting and notification.

# async def main_disruption_loop():

#     while True:
#         try:
#             # do one iteration of your disruption detection here
#             log.info("Checking for disruptions...")
#             # await your async I/O here (DB calls, HTTP, etc.)
#             await asyncio.sleep(30)  # <-- adjust cadence
#         except Exception:
#             log.exception("Disruption loop crashed; continuing in 5s")
#             await asyncio.sleep(5)

from shapely.geometry import Point, LineString
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from ..clients.data_client import get_trip_schedule, get_all_vehicle_positions
from .haversine import haversine_distance
import asyncio
import logging

log = logging.getLogger(__name__)

def calculate_delay_for_vehicle(vehicle_data) -> Optional[float]:
    trip_id = vehicle_data['trip_id']
    current_lat = vehicle_data['lat']
    current_lon = vehicle_data['lon']
    timestamp = datetime.fromtimestamp(vehicle_data['last_seen'])

    # schedule
    full = get_trip_schedule(trip_id)
    if not full or (isinstance(full, dict) and full.get('error')):
        log.warning(f"No schedule for trip {trip_id}")
        return None

    closest_prev = None
    closest_next = None
    min_dist = float('inf')
    projected_point = None

    for i in range(len(full)-1):
        a, b = full[i], full[i+1]
        pa = Point(a['stop_lon'], a['stop_lat'])
        pb = Point(b['stop_lon'], b['stop_lat'])
        seg = LineString([pa, pb])
        vp  = Point(current_lon, current_lat)

        proj = seg.interpolate(seg.project(vp))
        d = vp.distance(proj)
        if d < min_dist:
            min_dist = d
            closest_prev, closest_next = a, b
            projected_point = proj

    if not closest_prev or not closest_next or projected_point is None:
        return None

    # progress ratio (meters)
    total_m = haversine_distance(closest_prev['stop_lon'], closest_prev['stop_lat'],
                                 closest_next['stop_lon'], closest_next['stop_lat'])
    done_m = haversine_distance(closest_prev['stop_lon'], closest_prev['stop_lat'],
                                projected_point.x, projected_point.y)
    ratio = 0.0 if total_m == 0 else max(0.0, min(1.0, done_m/total_m))

    # scheduled time at this location (use a fixed reference date)
    ref = datetime(2025, 1, 15)
    dep_prev = datetime.strptime(closest_prev['departure_time'], '%H:%M:%S').replace(year=ref.year, month=ref.month, day=ref.day)
    arr_next = datetime.strptime(closest_next['arrival_time'],   '%H:%M:%S').replace(year=ref.year, month=ref.month, day=ref.day)
    seg_sec  = (arr_next - dep_prev).total_seconds()
    sched_here = dep_prev + timedelta(seconds=max(0, seg_sec) * ratio)

    delay_min = (timestamp - sched_here).total_seconds() / 60.0
    return delay_min

def classify_delay(delay_min: float) -> str:
    # tweak thresholds as you like
    if delay_min >= 10:
        return "major"
    if delay_min >= 5:
        return "minor"
    return "info"

def detect_alerts_for_legs(legs: List[Dict[str, Any]]):
    """
    Given route legs from the UI, compute disruption alerts for each leg's trip_id
    using current vehicle positions (simulated for now).
    """
    vehicles = get_all_vehicle_positions()
    by_trip = {v['trip_id']: v for v in vehicles}

    alerts = []
    for leg in legs:
        trip_id = leg.get("trip_id")
        if not trip_id or trip_id not in by_trip:
            # No live data for this trip; skip (or emit "info" if you prefer)
            continue

        v = by_trip[trip_id]
        delay = calculate_delay_for_vehicle(v)
        if delay is None:
            continue

        sev = classify_delay(delay)
        title = f"Delay on {trip_id}: {delay:.1f} min"
        advice = "Consider earlier/later bus or alternate route" if sev != "info" else "Minor delay reported"

        alerts.append({
            "id": f"{trip_id}-{int(v['last_seen'])}",
            "scope": "trip",
            "severity": sev,           # "major" | "minor" | "info"
            "title": title,
            "description": f"Estimated delay {delay:.1f} minutes based on current position.",
            "route_id": leg.get("route_id"),
            "trip_id": trip_id,
            "advice": advice,
        })

    return alerts
