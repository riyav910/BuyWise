import asyncio
import sys
import time
import argparse
from scraper_service import r, fetch_product_data

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def refresh_query(query, semaphore, headless):
    """
    Refreshes cache for a single query using a concurrency semaphore.
    """
    async with semaphore:
        print(f"[WARMER] Refreshing query: '{query}' (headless={headless})...")
        try:
            # We explicitly bypass cache checking to trigger scrapers and overwrite cache
            results = await fetch_product_data(query, bypass_cache=True, headless=headless)
            print(f"[WARMER] Successfully refreshed '{query}' -> Found {len(results)} platforms")
        except Exception as e:
            print(f"[WARMER] Error refreshing '{query}': {e}")


async def warm_cache_loop(interval_seconds, headless):
    print(f"\n[WARMER] Starting Cache Warmer Daemon...")
    print(f"[WARMER] Interval: {interval_seconds}s | Headless mode: {headless}\n")

    while True:
        try:
            now = time.time()
            four_hours_ago = now - 14400
            twenty_four_hours_ago = now - 86400

            # 1. Prune items older than 24 hours to keep the set small
            print("[WARMER] Pruning search terms older than 24 hours...")
            pruned_count = r.zremrangebyscore("recent_queries", 0, twenty_four_hours_ago)
            if pruned_count > 0:
                print(f"[WARMER] Pruned {pruned_count} expired search terms from Redis.")

            # 2. Retrieve active queries from the last 4 hours
            # Redis zrangebyscore returns items ordered from oldest to newest score
            queries = r.zrangebyscore("recent_queries", four_hours_ago, "+inf")

            if not queries:
                print(f"[WARMER] No queries found in active tracking window (last 4 hours). Sleeping for {interval_seconds}s...")
            else:
                print(f"[WARMER] Found {len(queries)} active query terms to refresh: {queries}")

                # Concurrency Semaphore: run at most 3 scraper browsers in parallel
                sem = asyncio.Semaphore(3)
                
                # Build concurrent tasks
                tasks = [refresh_query(q, sem, headless) for q in queries]
                
                # Gather tasks
                await asyncio.gather(*tasks)
                print(f"[WARMER] All {len(queries)} query terms refreshed successfully.")

        except Exception as err:
            print(f"[WARMER] Daemon loop encountered error: {err}")

        # Sleep till next cycle
        await asyncio.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description="BuyWise Cache Warmer Daemon")
    parser.add_argument(
        "--visual",
        action="store_true",
        help="Enable visual browser windows (headful mode) for scrapers during the run"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Refresh interval cycle in seconds (default: 60s)"
    )

    args = parser.parse_args()

    # Headless is True if '--visual' is NOT passed
    headless = not args.visual

    try:
        asyncio.run(warm_cache_loop(args.interval, headless))
    except KeyboardInterrupt:
        print("\n[WARMER] Cache Warmer Daemon stopped by user.")
        sys.exit(0)


if __name__ == "__main__":
    main()
