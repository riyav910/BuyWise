import asyncio
import json
import sys
import time
from redis_client import r
from scrapers.scraper import scrape_all, HEADLESS_MODE
from items_catalog import get_item_tier_and_ttl, DEFAULT_TTL

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# In-memory cache fallback in case Redis is not running or down
_IN_MEMORY_CACHE = {}


# =========================
# CACHE FUNCTIONS
# =========================

def get_cached_product_with_meta(product_name: str):
    """
    Checks Redis and in-memory fallback for cached product data.
    Returns: (data_list, cache_meta_dict) or (None, None)
    """
    product_name = product_name.lower().strip()
    now = time.time()
    raw_payload = None

    # 1. Try Redis first
    try:
        redis_val = r.get(product_name)
        if redis_val:
            raw_payload = json.loads(redis_val)
    except Exception as e:
        # Redis offline or error, proceed to in-memory fallback
        pass

    # 2. Check In-Memory fallback if Redis didn't yield result
    if not raw_payload:
        mem_entry = _IN_MEMORY_CACHE.get(product_name)
        if mem_entry and mem_entry.get("expires_at", 0) > now:
            raw_payload = mem_entry.get("payload")

    if not raw_payload:
        return None, None

    # Unpack structured payload or handle legacy raw list
    if isinstance(raw_payload, dict) and "data" in raw_payload:
        data = raw_payload.get("data", [])
        scraped_at = raw_payload.get("scraped_at", now)
        tier = raw_payload.get("tier", "unknown")
        ttl = raw_payload.get("ttl", DEFAULT_TTL)
    else:
        # Legacy list format
        data = raw_payload if isinstance(raw_payload, list) else []
        scraped_at = now
        tier = "legacy"
        ttl = DEFAULT_TTL

    age_seconds = max(0, int(now - scraped_at))
    updated_message = f"Updated {age_seconds}s ago" if age_seconds > 1 else "Updated just now"

    print(f"[CACHE] HIT: '{product_name}' ({updated_message} | tier={tier})")

    cache_meta = {
        "is_cached": True,
        "age_seconds": age_seconds,
        "scraped_at": scraped_at,
        "message": updated_message,
        "tier": tier,
        "ttl": ttl,
    }

    # Ensure search_term is present on all items
    for item in data:
        if isinstance(item, dict) and not item.get("search_term"):
            item["search_term"] = product_name

    return data, cache_meta


def get_cached_product(product_name: str):
    """Backward-compatible helper returning only the data list or None."""
    data, _ = get_cached_product_with_meta(product_name)
    return data


def set_cache(product_name: str, data: list, ttl: int = None, tier: str = None):
    """
    Stores product data in cache along with scraped_at timestamp, tier, and TTL.
    Writes to both Redis and in-memory fallback.
    """
    product_name = product_name.lower().strip()
    now = time.time()

    if ttl is None or tier is None:
        detected_tier, detected_ttl = get_item_tier_and_ttl(product_name)
        tier = tier or detected_tier
        ttl = ttl or detected_ttl

    payload = {
        "scraped_at": now,
        "ttl": ttl,
        "tier": tier,
        "data": data,
    }

    print(f"[CACHE] STORED: '{product_name}' (tier={tier}, ttl={ttl}s)")

    # 1. Update in-memory fallback
    _IN_MEMORY_CACHE[product_name] = {
        "payload": payload,
        "expires_at": now + ttl,
    }

    # 2. Update Redis
    try:
        r.setex(product_name, ttl, json.dumps(payload))
    except Exception as e:
        pass


# =========================
# FETCH LOGIC (DECOUPLED)
# =========================

async def fetch_product_data_with_meta(product_name: str, bypass_cache: bool = False, headless: bool = None):
    """
    Fetches product data and returns (valid_results, cache_meta).
    """
    if headless is None:
        headless = HEADLESS_MODE
    product_name = product_name.lower().strip()

    # 1. Cache check (unless bypassed)
    if not bypass_cache:
        cached_data, cache_meta = get_cached_product_with_meta(product_name)
        if cached_data:
            return cached_data, cache_meta

    tier, ttl = get_item_tier_and_ttl(product_name)

    try:
        # Call main scraper that coordinates all quick-commerce websites
        valid_results = await scrape_all(product_name, headless=headless)

        if not valid_results:
            return [], {
                "is_cached": False,
                "age_seconds": 0,
                "message": "No results found",
                "tier": tier,
                "ttl": ttl,
            }

    except Exception as e:
        print(f"[SCRAPER] Error for '{product_name}': {e}")
        return [], {
            "is_cached": False,
            "age_seconds": 0,
            "message": f"Scrape error: {e}",
            "tier": tier,
            "ttl": ttl,
        }

    # Ensure search_term is set
    for item in valid_results:
        if isinstance(item, dict) and not item.get("search_term"):
            item["search_term"] = product_name

    # 2. Cache store with respective TTL and tier
    set_cache(product_name, valid_results, ttl=ttl, tier=tier)

    cache_meta = {
        "is_cached": False,
        "age_seconds": 0,
        "message": "Updated just now",
        "tier": tier,
        "ttl": ttl,
    }

    return valid_results, cache_meta


async def fetch_product_data(product_name: str, bypass_cache: bool = False, headless: bool = None):
    """Backward-compatible wrapper returning only data list."""
    data, _ = await fetch_product_data_with_meta(product_name, bypass_cache=bypass_cache, headless=headless)
    return data
