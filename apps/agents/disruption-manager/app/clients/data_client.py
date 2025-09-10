# data_client.py
import pandas as pd
import os

# Assuming the GTFS files are in a directory relative to your project
GTFS_DIR = "C:/Users/HP/Documents/GitHub/GamanaGo/apps/agents/data-aggregator/gtfs_edit"

# Load the data into Pandas DataFrames once at startup
try:
    stops_df = pd.read_csv(os.path.join(GTFS_DIR, "stops.txt"))
    stop_times_df = pd.read_csv(os.path.join(GTFS_DIR, "stop_times.txt"))
    print("GTFS data loaded successfully into DataFrames.")
except FileNotFoundError as e:
    print(f"Error loading GTFS files: {e}")
    stops_df = pd.DataFrame()
    stop_times_df = pd.DataFrame()

def get_trip_schedule(trip_id):
    """
    Replaces the suggested API endpoint.
    Returns the schedule for a given trip_id from the stop_times.txt and stops.txt files.
    """
    if stop_times_df.empty or stops_df.empty:
        return {"error": "Data not loaded"}
    
    # 1. Filter stop_times for the specific trip
    trip_schedule = stop_times_df[stop_times_df['trip_id'] == trip_id]
    
    # 2. Merge with stops to get the latitude and longitude for each stop
    merged_schedule = trip_schedule.merge(stops_df, on='stop_id', how='left')
    
    # 3. Sort by stop_sequence and return as a list of dictionaries
    merged_schedule = merged_schedule.sort_values('stop_sequence')
    return merged_schedule.to_dict('records')

def get_all_vehicle_positions():
    """
    This function is a placeholder. Since there's no real-time data,
    you will need to simulate vehicle positions for your demo.
    """
    # For a demo, you can create a simulated list of vehicles.
    # You can hardcode a vehicle that is on the trip you are demonstrating.
    simulated_vehicle = {
        "trip_id": "TNCG1R_0530", # Must match a trip_id in your stop_times.txt
        "lat": 7.075,      # Current GPS Latitude (simulated)
        "lon": 80.020,     # Current GPS Longitude (simulated)
        "last_seen": 1736901000        # Current Unix timestamp
    }
    return [simulated_vehicle]

#cd apps\agents\disruption-manager
#python -m app.core.disruption