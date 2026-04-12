import asyncio
from playwright.async_api import async_playwright
import re
import json
# import redis 

# r = redis.Redis(
#     host="localhost",
#     port=6379,
#     decode_responses=True
# )

async def scrape_zepto(product_name):
    print(f"\n🟡 [ZEPTO] Scraping: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("🌐 Opening Zepto...")
        await page.goto(f"https://www.zepto.com/search?query={product_name}")

        print("⏳ Waiting for content...")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(4)

        content = await page.content()

        print("🔍 Extracting prices...")

        prices = re.findall(r"₹\s?\d+", content)

        print(f"💰 Found {len(prices)} price matches")

        extracted = []

        for i, price in enumerate(prices[:10]):  # limit
            value = int(price.replace("₹", "").strip())

            extracted.append({
                "price": value
            })

            print(f"💸 {i+1}. ₹{value}")

        await browser.close()

        if not extracted:
            print("❌ No data extracted")
            return None

        best_price = min(extracted, key=lambda x: x["price"])

        result = {
            "platform": "zepto",
            "price": best_price["price"],
            "delivery": 25,
            "eta": 10,
            "product_name": product_name
        }

        print(f"\n✅ Best Price: ₹{result['price']}")

        return result


# =========================
# 💾 STORE IN REDIS
# =========================

def store_in_redis(key, data):
    print(f"\n💾 Storing in Redis → {key}")

    r.setex(
        key,
        300,  # TTL = 5 min
        json.dumps(data)
    )

    print("✅ Stored successfully")


def get_from_redis(key):
    print(f"\n📦 Fetching from Redis → {key}")

    data = r.get(key)

    if data:
        print("✅ Cache HIT")
        return json.loads(data)

    print("❌ Cache MISS")
    return None


# =========================
# 🚀 MAIN TEST FLOW
# =========================

# async def main():
#     product = "milk"

#     # Step 1: Check cache
#     cached = get_from_redis(product)

#     if cached:
#         print(f"\n⚡ Cached Data: {cached}")
#         return

#     # Step 2: Scrape
#     data = await scrape_zepto(product)

#     if data:
#         # Step 3: Store
#         store_in_redis(product, data)

#         print(f"\n🎯 Final Result: {data}")