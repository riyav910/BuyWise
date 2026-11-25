"""
BuyWise Two-Tier Intelligent Cache Warmer Daemon
Pre-scrapes and proactively updates quick-commerce product prices:
  - Tier 1 (Very Frequent Items): 120-second refresh cycle
  - Tier 2 (Moderately Bought Items): 300-second refresh cycle
  - User Search Velocity: Proactive refreshes of recent queries
"""

import asyncio
import sys
import time
import argparse
import warnings
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from redis_client import r
from scrapers.scraper import scrape_all
from scraper_service import set_cache
from items_catalog import (
    VERY_FREQUENT_ITEMS,
    MODERATE_ITEMS,
    VERY_FREQUENT_TTL,
    MODERATE_TTL,
)

# Suppress ResourceWarning emitted by closed Proactor pipes
warnings.filterwarnings("ignore", category=ResourceWarning)

# Intercept and silence harmless Windows Python 3.8-3.12 Proactor closed pipe cleanup errors during GC
def _silence_proactor_pipe_error(unraisable):
    err = unraisable.exc_value
    if isinstance(err, (ValueError, RuntimeError)):
        err_msg = str(err)
        if "I/O operation on closed pipe" in err_msg or "Event loop is closed" in err_msg:
            return
    if sys.__unraisablehook__:
        sys.__unraisablehook__(unraisable)

sys.unraisablehook = _silence_proactor_pipe_error

try:
    from db_catalog import get_dynamic_cache_warm_targets, update_warm_target_timestamp
except ImportError:
    get_dynamic_cache_warm_targets = None
    update_warm_target_timestamp = None

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


async def refresh_item(item: str, ttl: int, tier: str, semaphore: asyncio.Semaphore, headless: bool):
    """Refreshes cache for a single query using scrapers in backend/scrapers."""
    async with semaphore:
        t0 = time.time()
        try:
            results = await scrape_all(item, headless=headless)
            elapsed = time.time() - t0
            if results:
                set_cache(item, results, ttl=ttl, tier=tier)
                if update_warm_target_timestamp:
                    update_warm_target_timestamp(item)
                print(f"[WARMER] ⚡ Refreshed '{item}' ({tier} | ttl={ttl}s) -> {len(results)} platforms in {elapsed:.1f}s")
            else:
                print(f"[WARMER] ⚠️ '{item}' -> No listings found ({elapsed:.1f}s)")
        except Exception as e:
            print(f"[WARMER] ❌ Error refreshing '{item}': {e}")


async def warm_tier_loop(
    tier_name: str,
    initial_items: list[str],
    ttl: int,
    semaphore: asyncio.Semaphore,
    headless: bool,
    initial_delay: int = 0
):
    """Continuous loop refreshing items in a specific tier according to its TTL."""
    if initial_delay > 0:
        await asyncio.sleep(initial_delay)

    cycle = 1
    items = list(initial_items)
    while True:
        # Dynamically refresh targets list from MongoDB if available
        if get_dynamic_cache_warm_targets:
            try:
                dynamic = get_dynamic_cache_warm_targets()
                if tier_name in ["very_frequent", "tier1"]:
                    items = dynamic.get("very_frequent", items)
                else:
                    items = dynamic.get("moderate", items)
            except Exception:
                pass

        start_time = time.time()
        print(f"\n==================================================")
        print(f"[{tier_name.upper()}] Cycle #{cycle} ({len(items)} items | TTL: {ttl}s)")
        print(f"==================================================")

        tasks = [refresh_item(item, ttl, tier_name, semaphore, headless) for item in items]
        await asyncio.gather(*tasks)

        elapsed = time.time() - start_time
        print(f"[{tier_name.upper()}] Cycle #{cycle} completed in {elapsed:.1f}s.")

        cycle += 1
        sleep_time = max(10, ttl - int(elapsed))
        print(f"⏳ Next [{tier_name.upper()}] refresh in {sleep_time}s...\n")
        await asyncio.sleep(sleep_time)


async def recent_queries_loop(semaphore: asyncio.Semaphore, headless: bool, interval: int = 60):
    """Monitors recent queries tracked in Redis and refreshes dynamic items."""
    catalog_set = set(VERY_FREQUENT_ITEMS) | set(MODERATE_ITEMS)

    while True:
        try:
            now = time.time()
            four_hours_ago = now - 14400
            twenty_four_hours_ago = now - 86400

            # Prune terms older than 24h
            try:
                r.zremrangebyscore("recent_queries", 0, twenty_four_hours_ago)
            except Exception:
                pass

            # Retrieve active queries from the last 4 hours
            try:
                active_queries = r.zrangebyscore("recent_queries", four_hours_ago, "+inf") or []
            except Exception:
                active_queries = []

            # Filter out queries already covered by Tier 1 or Tier 2
            dynamic_queries = [q for q in active_queries if q.lower().strip() not in catalog_set]

            if dynamic_queries:
                print(f"[DYNAMIC] Refreshing {len(dynamic_queries)} user queries outside catalog: {dynamic_queries}")
                tasks = [refresh_item(q, 300, "dynamic", semaphore, headless) for q in dynamic_queries]
                await asyncio.gather(*tasks)

        except Exception as e:
            print(f"[DYNAMIC] Loop error: {e}")

        await asyncio.sleep(interval)


async def main_async(args):
    headless = not args.visual
    workers = max(1, args.workers)
    sem = asyncio.Semaphore(workers)

    # Fetch dynamic warming targets (from MongoDB or static fallback)
    if args.items:
        custom_items = [it.strip().lower() for it in args.items.split(",") if it.strip()]
        tier1_items = custom_items
        tier2_items = []
        source_label = f"custom_cli_items ({len(custom_items)})"
    elif get_dynamic_cache_warm_targets:
        targets_info = get_dynamic_cache_warm_targets()
        tier1_items = targets_info.get("very_frequent", VERY_FREQUENT_ITEMS)
        tier2_items = targets_info.get("moderate", MODERATE_ITEMS)
        source_label = targets_info.get("source", "catalog")
    else:
        tier1_items = VERY_FREQUENT_ITEMS
        tier2_items = MODERATE_ITEMS
        source_label = "static_catalog"

    print("==================================================")
    print("🛒 BuyWise Intelligent Two-Tier Cache Warmer")
    print(f"• Workers (Concurrency): {workers}")
    print(f"• Headless mode: {headless}")
    print(f"• Target Source: {source_label}")
    print(f"• Tier 1 (Very Frequent): {len(tier1_items)} items | TTL: {VERY_FREQUENT_TTL}s")
    print(f"• Tier 2 (Moderate): {len(tier2_items)} items | TTL: {MODERATE_TTL}s")
    print("==================================================\n")

    if args.initial_only:
        print("[WARMER] Running one-time initial warm-up pass for all catalog items...")
        tasks = []
        for item in tier1_items:
            tasks.append(refresh_item(item, VERY_FREQUENT_TTL, "very_frequent", sem, headless))
        if not args.skip_moderate:
            for item in tier2_items:
                tasks.append(refresh_item(item, MODERATE_TTL, "moderate", sem, headless))
        await asyncio.gather(*tasks)
        print("\n🎉 Initial warm-up complete! Exiting as requested.")
        return

    # Start background loops
    loops = [
        warm_tier_loop("very_frequent", tier1_items, VERY_FREQUENT_TTL, sem, headless, initial_delay=0),
    ]

    if not args.skip_moderate:
        # Start moderate loop with slight initial stagger (e.g. 10s) to prioritize Tier 1
        loops.append(
            warm_tier_loop("moderate", tier2_items, MODERATE_TTL, sem, headless, initial_delay=10)
        )

    loops.append(recent_queries_loop(sem, headless, interval=60))

    try:
        await asyncio.gather(*loops)
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass


def main():
    parser = argparse.ArgumentParser(description="BuyWise Intelligent Cache Warmer")
    parser.add_argument(
        "--visual",
        action="store_true",
        help="Open visible browser windows instead of headless mode"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=2,
        help="Maximum concurrent scraper instances (default: 2)"
    )
    parser.add_argument(
        "--skip-moderate",
        action="store_true",
        help="Skip Tier 2 (moderate) items and only warm Tier 1"
    )
    parser.add_argument(
        "--initial-only",
        action="store_true",
        help="Perform initial pre-warming pass once and exit"
    )
    parser.add_argument(
        "--items",
        type=str,
        default=None,
        help="Comma-separated custom items to warm (e.g. 'milk,bread,butter,eggs')"
    )

    args = parser.parse_args()

    try:
        asyncio.run(main_async(args))
    except (KeyboardInterrupt, SystemExit):
        print("\n[WARMER] Cache Warmer Daemon stopped gracefully.")


if __name__ == "__main__":
    main()
