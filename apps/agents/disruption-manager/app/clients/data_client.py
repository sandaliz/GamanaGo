# 


import os
import pandas as pd

GTFS_DIR = os.getenv(
    "DISRUPTION_GTFS_DIR",
    # fallback to your repo path (relative or absolute)
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..", "data-aggregator/gtfs_edit"))
)

try:
    stops_df = pd.read_csv(os.path.join(GTFS_DIR, "stops.txt"))
    stop_times_df = pd.read_csv(os.path.join(GTFS_DIR, "stop_times.txt"))
    print(f"GTFS loaded from {GTFS_DIR}")
except FileNotFoundError as e:
    print(f"Error loading GTFS files: {e}")
    stops_df = pd.DataFrame()
    stop_times_df = pd.DataFrame()
