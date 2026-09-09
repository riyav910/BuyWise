import asyncio
import sys
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from ocr_endpoint import router as ocr_router
from scraper_service import r, fetch_product_data
from compare import compare_products, optimize_cart_inr

app = FastAPI()

app.include_router(ocr_router)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

try:
    print("Redis ping:", r.ping())
except Exception as e:
    print("Redis connection failed:", e)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

        print(f"\n[PARALLEL EXECUTION] Processing {len(processed_items)} products in parallel: {processed_items}")

        async def fetch_single_item(item_name: str):
            print(f"Starting parallel fetch for: {item_name}")
            # 1. Record search/order query in Redis ZSET
            try:
                r.zadd("recent_queries", {item_name: time.time()})
                r.zremrangebyrank("recent_queries", 0, -101)  # Limit to 100 items
            except Exception as e:
                print(f"Redis ZSET log error for {item_name}: {e}")

            # 2. Fetch product data (runs parallel scrapers, using cache if hit)
            try:
                data = await fetch_product_data(item_name, bypass_cache=False, headless=False)
                if data:
                    for d in data:
                        if isinstance(d, dict) and not d.get("search_term"):
                            d["search_term"] = item_name
                return data or []
            except Exception as e:
                print(f"Error fetching product '{item_name}': {e}")
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

        # Generate per-product comparison so frontend can display each product separately
        by_product = {}
        for item_name in processed_items:
            prod_results = [
                r for r in results 
                if r.get("search_term", "").lower().strip() == item_name.lower().strip()
            ]
            if prod_results:
                by_product[item_name] = compare_products(prod_results)
            else:
                by_product[item_name] = {"all": [], "best": None, "message": f"No results for {item_name}"}

        final["by_product"] = by_product
        final["items"] = processed_items

        return final

    except Exception as e:
        print(f"API ERROR: {e}")
        return {"error": str(e)}
