# app/core/disruption.py
from shapely.geometry import Point, LineString
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
#from ..clients.data_client import data_client  # Import the client instance
from ..clients.data_client import get_trip_schedule, get_all_vehicle_positions
import math
from .haversine import haversine_distance      # Import your helper function



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
# def main_disruption_loop():
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

# if __name__ == "__main__":
#     main_disruption_loop()



# ...imports unchanged...

def calculate_delay_for_vehicle(vehicle_data):
    trip_id = vehicle_data['trip_id']
    current_lat = vehicle_data['lat']
    current_lon = vehicle_data['lon']
    timestamp = datetime.fromtimestamp(vehicle_data['last_seen'])

    full_schedule = get_trip_schedule(trip_id)
    if not full_schedule or (isinstance(full_schedule, dict) and full_schedule.get('error')):
        return None

    closest_prev_stop = None
    closest_next_stop = None
    min_distance_to_path = float('inf')
    best_projected_point = None  # <-- keep the best one

    vehicle_point = Point(current_lon, current_lat)

    for i in range(len(full_schedule) - 1):
        stop_a = full_schedule[i]
        stop_b = full_schedule[i+1]

        point_a = Point(stop_a['stop_lon'], stop_a['stop_lat'])
        point_b = Point(stop_b['stop_lon'], stop_b['stop_lat'])
        line_segment = LineString([point_a, point_b])

        projected_point = line_segment.interpolate(line_segment.project(vehicle_point))
        distance_to_path = vehicle_point.distance(projected_point)

        if distance_to_path < min_distance_to_path:
            min_distance_to_path = distance_to_path
            closest_prev_stop = stop_a
            closest_next_stop = stop_b
            best_projected_point = projected_point  # <-- store

    if not closest_prev_stop or not closest_next_stop or best_projected_point is None:
        return None

    total_distance_m = haversine_distance(
        closest_prev_stop['stop_lon'], closest_prev_stop['stop_lat'],
        closest_next_stop['stop_lon'], closest_next_stop['stop_lat']
    )
    distance_traveled_m = haversine_distance(
        closest_prev_stop['stop_lon'], closest_prev_stop['stop_lat'],
        best_projected_point.x, best_projected_point.y  # <-- use best
    )
    progress_ratio = max(0.0, min(1.0, distance_traveled_m / max(total_distance_m, 1e-6)))

    # anchor schedule to the same day as the 'timestamp'
    ref = timestamp  # same calendar day as last_seen
    dep_prev = datetime.strptime(closest_prev_stop['departure_time'], '%H:%M:%S').replace(
        year=ref.year, month=ref.month, day=ref.day
    )
    arr_next = datetime.strptime(closest_next_stop['arrival_time'], '%H:%M:%S').replace(
        year=ref.year, month=ref.month, day=ref.day
    )
    # handle segments that wrap past midnight
    if arr_next < dep_prev:
        arr_next += timedelta(days=1)

    seg_sec = (arr_next - dep_prev).total_seconds()
    scheduled_time_here = dep_prev + timedelta(seconds=seg_sec * progress_ratio)

    delay_seconds = (timestamp - scheduled_time_here).total_seconds()
    return delay_seconds / 60.0
