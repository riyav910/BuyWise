import asyncio
import json
import sys
from redis_client import r

from scrapers.bigbasket import scrape_bigbasket
from scrapers.blinkit import scrape_blinkit
from scrapers.zepto import scrape_zepto
from scrapers.jiomart import scrape_jiomart

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


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
    except Exception as e:
        print(f"Redis SET error: {e}")


# =========================
# FETCH LOGIC (DECOUPLED)
# =========================

async def fetch_product_data(product_name, bypass_cache: bool = False, headless: bool = True):
    product_name = product_name.lower().strip()
    print(f"\nProcessing item: {product_name} (bypass_cache={bypass_cache}, headless={headless})")

    # Cache check (unless bypassed)
    if not bypass_cache:
        cached = get_cached_product(product_name)
        if cached:
            print(f"Returning cached data for: {product_name}")
            # Ensure search_term is present (for backward compatibility)
            for item in cached:
                if isinstance(item, dict):
                    item["search_term"] = product_name
            return cached

    print(f"Initiating scraping for: {product_name}")

    try:
        # Run ALL scrapers in parallel, passing down the headless parameter
        responses = await asyncio.gather(
            scrape_bigbasket(product_name, headless=headless),
            scrape_blinkit(product_name, headless=headless),
            scrape_zepto(product_name, headless=headless),
            scrape_jiomart(product_name, headless=headless),
            return_exceptions=True
        )

        valid_results = []

        for res in responses:
            if isinstance(res, Exception):
                print(f"Scraper failed with exception: {res}")
                continue

            if res:
                if isinstance(res, dict):
                    res["search_term"] = product_name
                valid_results.append(res)

        if not valid_results:
            raise Exception("All scrapers failed")

    except Exception as e:
        print(f"SCRAPER ERROR: {e}")
        return []

    # Cache store (store LIST of results)
    set_cache(product_name, valid_results)

    return valid_results
