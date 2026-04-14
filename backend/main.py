from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import sys

from redis_client import r  # ✅ use ONLY this

from scrapers.bigbasket import scrape_bigbasket
from scrapers.blinkit import scrape_blinkit
from scrapers.zepto import scrape_zepto
from scrapers.jiomart import scrape_jiomart
from compare import compare_products

app = FastAPI()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

try:
    print("Redis ping:", r.ping())
except Exception as e:
    print("Redis connection failed:", e)

# if sys.platform == "win32":
#     asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
#     loop = asyncio.new_event_loop()
#     asyncio.set_event_loop(loop)

#  CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class ItemRequest(BaseModel):
    items: list[str]


# =========================
# CACHE FUNCTIONS
# =========================

def get_cached_product(product_name):
    product_name = product_name.lower().strip()
    print(f"\nChecking cache for: {product_name}")

    try:
        data = r.get(product_name)

        if data:
            print(f"CACHE HIT: {product_name}")
            return json.loads(data)

        print(f"CACHE MISS: {product_name}")
        return None

    except Exception as e:
        print(f"Redis GET error: {e}")
        return None


def set_cache(product_name, data):
    product_name = product_name.lower().strip()
    print(f"Storing in cache: {product_name}")
    try:
        r.setex(product_name, 3600, json.dumps(data))
        print(f"TTL set to 3600 seconds")
        print(f"Cached data: {data}")

    except Exception as e:
        print(f"Redis SET error: {e}")


# =========================
# FETCH LOGIC
# =========================

async def fetch_product_data(product_name):
    product_name = product_name.lower().strip()
    print(f"\nProcessing item: {product_name}")

    # Cache check
    cached = get_cached_product(product_name)
    if cached:
        print(f"Returning cached data for: {product_name}")
        return cached

    print(f"Initiating scraping for: {product_name}")

    try:
        # Run ALL scrapers in parallel
        responses = await asyncio.gather(
            scrape_bigbasket(product_name),
            scrape_blinkit(product_name),
            scrape_zepto(product_name),
            scrape_jiomart(product_name),
            return_exceptions=True
        )

        valid_results = []

        for res in responses:
            if isinstance(res, Exception):
                print(f"Scraper failed: {res}")
                continue

            if res:
                valid_results.append(res)

        if not valid_results:
            raise Exception("All scrapers failed")

    except Exception as e:
        print(f"SCRAPER ERROR: {e}")

        # No fake fallback — return empty cleanly
        return []

    # Cache store (store LIST of results)
    set_cache(product_name, valid_results)

    return valid_results


# =========================
# MAIN API
# =========================

@app.post("/compare")
async def compare_prices(request: ItemRequest):
    try:
        results = []

        for item in request.items:
            print(f"\nProcessing: {item}")

            # Run all scrapers in parallel
            data = await fetch_product_data(item)

            if data:
                results.extend(data)
                
        if not results:
            return {"message": "No data found"}

        final = compare_products(results)

        return final

    except Exception as e:
        print(f"API ERROR: {e}")
        return {"error": str(e)}