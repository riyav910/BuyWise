import asyncio
import json
import sys
from redis_client import r

from scrapers.scraper import scrape_all

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


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

    print(f"Cache miss: Initiating scraping for: {product_name}")

    try:
        # Call main scraper that coordinates all websites
        valid_results = await scrape_all(product_name, headless=headless)

        if not valid_results:
            print(f"No valid results returned from any platform for: {product_name}")
            return []

    except Exception as e:
        print(f"SCRAPER ERROR: {e}")
        return []

    # Cache store (store LIST of results)
    set_cache(product_name, valid_results)

    return valid_results
