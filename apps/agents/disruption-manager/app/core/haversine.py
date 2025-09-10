import math
def haversine_distance(lon1, lat1, lon2, lat2):
    """
    Calculate the great-circle distance (in meters) between two points 
    on the Earth's surface given their longitude and latitude in degrees.
    Uses the Haversine formula.
    """
    # Convert coordinates from degrees to radians
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1  # Difference in longitudes
    dlat = lat2 - lat1  # Difference in latitudes
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Radius of Earth in meters (6371 kilometers * 1000)
    radius_earth_m = 6371 * 1000
    distance_meters = radius_earth_m * c
    
    return distance_meters