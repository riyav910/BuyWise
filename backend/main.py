import asyncio
import os
import sys
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from ocr_endpoint import router as ocr_router
from scraper_service import r, fetch_product_data, fetch_product_data_with_meta
from compare import compare_products, optimize_cart_inr
from location_utils import resolve_coordinates

app = FastAPI()

app.include_router(ocr_router)

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            if not isinstance(asyncio.get_event_loop_policy(), asyncio.WindowsProactorEventLoopPolicy):
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        except Exception:
            pass

try:
    print("Redis ping:", r.ping())
except Exception as e:
    print("Redis connection failed:", e)

# CORS
allowed_origins_env = os.getenv("PYTHON_ALLOWED_ORIGINS", "*")
if allowed_origins_env.strip() == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [
        origin.strip()
        for origin in allowed_origins_env.split(",")
        if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional

# Request model
class ItemRequest(BaseModel):
    items: list[str]
    required_quantity: Optional[float] = None
    required_unit: Optional[str] = None
    pincode: Optional[str] = "560001"
    latitude: Optional[float] = None
    longitude: Optional[float] = None



#=========================
# USER AUTHENTICATION
#=========================
users_db = {}


@app.post("/signup")
def signup(data: dict):
    name = data.get("name")
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return {"status": "failed", "message": "Email and password are required"}

    if email in users_db:
        return {"status": "failed", "message": "User already exists"}

    users_db[email] = {
        "name": name or email.split("@")[0],
        "email": email,
        "password": password,
    }

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "name": users_db[email]["name"],
            "email": email,
        },
    }


@app.post("/login")
def login(data: dict):
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    user = users_db.get(email)

    if not user:
        return {"status": "failed", "message": "User not found"}

    if user["password"] != password:
        return {"status": "failed", "message": "Invalid credentials"}

    return {
        "status": "success",
        "user": {
            "name": user["name"],
            "email": user["email"],
        },
    }


# =========================
# MAIN API
# =========================

@app.post("/compare")
async def compare_prices(request: ItemRequest):
    try:
        # Expand any comma-separated product names and deduplicate while preserving order
        processed_items = []
        for raw in request.items:
            for part in raw.split(","):
                cleaned = part.lower().strip()
                if cleaned and cleaned not in processed_items:
                    processed_items.append(cleaned)

        if not processed_items:
            return {"message": "No valid products provided"}

        lat, lon, location_name = resolve_coordinates(request.pincode, request.latitude, request.longitude)
        print(f"\n[PARALLEL EXECUTION] Processing {len(processed_items)} products for location: {location_name} (lat={lat}, lon={lon})")

        cache_info_map = {}

        async def fetch_single_item(item_name: str):
            # 1. Record search/order query in Redis ZSET
            try:
                r.zadd("recent_queries", {item_name: time.time()})
                r.zremrangebyrank("recent_queries", 0, -101)  # Limit to 100 items
            except Exception as e:
                print(f"Redis ZSET log error for {item_name}: {e}")

            # 2. Fetch product data (runs parallel scrapers, using cache if hit)
            try:
                data, cache_meta = await fetch_product_data_with_meta(item_name, bypass_cache=False, lat=lat, lon=lon)
                cache_info_map[item_name] = cache_meta
                if data:
                    for d in data:
                        if isinstance(d, dict) and not d.get("search_term"):
                            d["search_term"] = item_name
                return data or []
            except Exception as e:
                print(f"Error fetching product '{item_name}': {e}")
                cache_info_map[item_name] = {
                    "is_cached": False,
                    "age_seconds": 0,
                    "message": "Updated just now",
                }
                return []

        # Run all product extractions in parallel
        item_results = await asyncio.gather(*(fetch_single_item(item) for item in processed_items))

        results = []
        for data in item_results:
            if data:
                results.extend(data)

        if not results:
            return {"message": "No data found"}

        final = compare_products(
            results,
            required_quantity=request.required_quantity,
            required_unit=request.required_unit,
        )

        # Calculate optimized cart values in INR across all parallel requested items
        optimized = optimize_cart_inr(results, processed_items)
        final["optimized"] = optimized
        final["location"] = {
            "pincode": request.pincode or "560001",
            "name": location_name,
            "latitude": lat,
            "longitude": lon
        }

        # Generate per-product comparison so frontend can display each product separately
        by_product = {}
        alloc_map = (optimized.get("recommended_checkout") or {}).get("allocation") or {}

        for item_name in processed_items:
            norm_term = item_name.lower().strip()
            prod_results = [
                r for r in results 
                if r.get("search_term", "").lower().strip() == norm_term
            ]
            item_cache_info = cache_info_map.get(item_name, {
                "is_cached": False,
                "age_seconds": 0,
                "message": "Updated just now",
            })
            item_alloc = alloc_map.get(norm_term)

            if prod_results:
                prod_comp = compare_products(prod_results)
                prod_comp["cache_info"] = item_cache_info
                if item_alloc:
                    prod_comp["recommended_allocation"] = item_alloc
                    prod_comp["recommended_platform"] = item_alloc.get("platform")
                    rec_plat = (item_alloc.get("platform") or "").lower().strip()
                    for cand in prod_comp.get("all", []):
                        cand["is_assigned_store"] = (cand.get("platform", "").lower().strip() == rec_plat)
                by_product[item_name] = prod_comp
            else:
                by_product[item_name] = {
                    "all": [],
                    "best": None,
                    "message": f"No results for {item_name}",
                    "cache_info": item_cache_info,
                    "recommended_allocation": item_alloc,
                    "recommended_platform": item_alloc.get("platform") if item_alloc else None,
                }

        final["by_product"] = by_product
        final["items"] = processed_items
        if len(processed_items) == 1:
            final["cache_info"] = cache_info_map.get(processed_items[0])
            rec_checkout = optimized.get("recommended_checkout") or {}
            final["recommended_platform"] = rec_checkout.get("platforms_used", [None])[0] if rec_checkout.get("platforms_used") else None
            final["recommended_checkout"] = rec_checkout

        return final

    except Exception as e:
        print(f"API ERROR: {e}")
        return {"error": str(e)}
