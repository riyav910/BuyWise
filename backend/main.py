from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
from redis_client import r
# from backend.scrapers.scraper import scrape_product
from backend.scrapers.bigbasket import scrape_product_bigbasket

app = FastAPI()

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📦 Request model
class ItemRequest(BaseModel):
    items: list[str]


# =========================
# 🔁 CACHE FUNCTIONS
# =========================

def get_cached_product(product_name):
    print(f"\n🔍 Checking cache for: {product_name}")

    data = r.get(product_name)
    if data:
        print(f"✅ CACHE HIT: {product_name}")
        return json.loads(data)

    print(f"❌ CACHE MISS: {product_name}")
    return None


def set_cache(product_name, data):
    print(f"💾 Storing in cache: {product_name}")
    r.setex(product_name, 300, json.dumps(data))
    print(f"⏳ TTL set to 300 seconds")


# =========================
# 📊 FETCH LOGIC
# =========================

async def fetch_product_data(product_name):
    product_name = product_name.lower()
    print(f"\n📦 Processing item: {product_name}")

    # 1️⃣ Cache check
    cached = get_cached_product(product_name)
    if cached:
        print(f"⚡ Returning cached data for: {product_name}")
        return cached

    # 2️⃣ Scrape (SAFE)
    try:
        print(f"🕸️ Initiating scraping for: {product_name}")
        data = await scrape_product_bigbasket(product_name)

        if not data:
            raise Exception("Empty scrape result")

    except Exception as e:
        print(f"❌ SCRAPER ERROR: {e}")

        # 🔥 fallback (IMPORTANT)
        data = {
            "blinkit": {"price": 60, "delivery": 20, "eta": 10},
            "zepto": {"price": 55, "delivery": 25, "eta": 15}
        }

    # 3️⃣ Cache store
    set_cache(product_name, data)

    return data


# =========================
# 🧮 MAIN API
# =========================

@app.post("/compare")
async def compare_prices(request: ItemRequest):
    try:
        platform_totals = {}

        for item in request.items:
            product_data = await fetch_product_data(item)

            for platform, details in product_data.items():
                if platform not in platform_totals:
                    platform_totals[platform] = {
                        "items_price": 0,
                        "delivery_fee": details["delivery"],
                        "eta": details["eta"]
                    }

                platform_totals[platform]["items_price"] += details["price"]

        for platform in platform_totals:
            platform_totals[platform]["total_cost"] = (
                platform_totals[platform]["items_price"] +
                platform_totals[platform]["delivery_fee"]
            )

        return platform_totals

    except Exception as e:
        print(f"🔥 API ERROR: {e}")
        return {"error": str(e)}