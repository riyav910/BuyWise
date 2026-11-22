"""
BuyWise Indian Pincode & Geolocation Resolver
Translates Indian postal codes into accurate GPS coordinates and city names
for quick-commerce dark-store localization (Blinkit, Zepto, BigBasket).
"""
import re
from typing import Tuple, Optional

# Major Indian Postal Circles & Metro Regions
PINCODE_REGIONS = {
    # Delhi & NCR
    "11": (28.6139, 77.2090, "Delhi NCR"),
    "12": (28.4595, 77.0266, "Gurgaon / Haryana"),
    "20": (28.5355, 77.3910, "Noida / Ghaziabad"),

    # Maharashtra
    "40": (19.0760, 72.8777, "Mumbai"),
    "41": (18.5204, 73.8567, "Pune"),
    "42": (19.9975, 73.7898, "Nashik"),
    "44": (21.1458, 79.0882, "Nagpur"),

    # Karnataka
    "56": (12.9716, 77.5946, "Bangalore"),
    "57": (12.2958, 76.6394, "Mysore"),
    "58": (15.3647, 75.1240, "Hubli"),

    # Telangana & Andhra Pradesh
    "50": (17.3850, 78.4867, "Hyderabad"),
    "51": (13.6288, 79.4192, "Tirupati"),
    "52": (16.5062, 80.6480, "Vijayawada"),
    "53": (17.6868, 83.2185, "Visakhapatnam"),

    # Tamil Nadu
    "60": (13.0827, 80.2707, "Chennai"),
    "64": (11.0168, 76.9558, "Coimbatore"),
    "62": (9.9252, 78.1198, "Madurai"),

    # West Bengal
    "70": (22.5726, 88.3639, "Kolkata"),
    "71": (22.5958, 88.2636, "Howrah"),

    # Gujarat
    "38": (23.0225, 72.5714, "Ahmedabad"),
    "39": (21.1702, 72.8311, "Surat"),
    "36": (22.3039, 70.8022, "Rajkot"),

    # Rajasthan
    "30": (26.9124, 75.7873, "Jaipur"),
    "34": (26.2389, 73.0243, "Jodhpur"),

    # Uttar Pradesh
    "22": (26.8467, 80.9462, "Lucknow"),
    "28": (27.1767, 78.0081, "Agra"),
    "24": (28.9845, 77.7064, "Meerut"),

    # Punjab & Chandigarh
    "16": (30.7333, 76.7794, "Chandigarh"),
    "14": (31.3260, 75.5762, "Jalandhar"),

    # Kerala
    "68": (9.9312, 76.2673, "Kochi"),
    "69": (8.5241, 76.9366, "Thiruvananthapuram"),

    # Madhya Pradesh
    "45": (22.7196, 75.8577, "Indore"),
    "46": (23.2599, 77.4126, "Bhopal"),

    # Bihar
    "80": (25.5941, 85.1376, "Patna"),
}

DEFAULT_COORDINATES = (12.9716, 77.5946, "Bangalore")


def resolve_coordinates(
    pincode: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Tuple[float, float, str]:
    """
    Returns (latitude, longitude, city_name).
    If valid GPS coords are provided, uses them directly.
    Otherwise matches 6-digit Indian postal code to city center.
    """
    # 1. Exact GPS coordinates passed
    if latitude is not None and longitude is not None:
        try:
            lat = float(latitude)
            lon = float(longitude)
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return (lat, lon, "User GPS Location")
        except (ValueError, TypeError):
            pass

    # 2. Pincode lookup
    if pincode:
        clean_pin = re.sub(r"[^\d]", "", str(pincode)).strip()
        if len(clean_pin) == 6:
            prefix_2 = clean_pin[:2]
            if prefix_2 in PINCODE_REGIONS:
                lat, lon, city = PINCODE_REGIONS[prefix_2]
                return (lat, lon, f"{city} ({clean_pin})")

    # 3. Default fallback
    return DEFAULT_COORDINATES
