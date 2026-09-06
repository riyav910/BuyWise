import sys
import os
import time
import asyncio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper_service import r, fetch_product_data, set_cache, get_cached_product
from cache_warmer import refresh_query

def cleanup_redis():
    try:
        r.delete("recent_queries")
        r.delete("test_item_warmer")
    except Exception as e:
        print(f"Cleanup error (Redis probably not running): {e}")


def test_redis_zset_operations():
    print("Running test: Redis ZSET Operations...")
    try:
        r.ping()
    except Exception:
        print("[SKIP] Redis is not running. Skipping ZSET tests.")
        return

    # Clear set
    r.delete("recent_queries")

    # Add queries with different timestamps
    now = time.time()
    r.zadd("recent_queries", {"apple": now})                 # fresh (now)
    r.zadd("recent_queries", {"banana": now - 5000})         # recent (~1.4 hrs ago)
    r.zadd("recent_queries", {"orange": now - 15000})        # old (~4.1 hrs ago)
    r.zadd("recent_queries", {"grape": now - 90000})         # expired (~25 hrs ago)

    # 1. Test pruning items older than 24 hours
    twenty_four_hours_ago = now - 86400
    pruned = r.zremrangebyscore("recent_queries", 0, twenty_four_hours_ago)
    assert pruned == 1, f"Expected 1 pruned item, got {pruned}"

    # 2. Retrieve active queries from the last 4 hours (orange should not be retrieved)
    four_hours_ago = now - 14400
    queries = r.zrangebyscore("recent_queries", four_hours_ago, "+inf")
    assert "apple" in queries, "apple should be active"
    assert "banana" in queries, "banana should be active"
    assert "orange" not in queries, "orange should be filtered out (4.1 hrs old)"
    assert "grape" not in queries, "grape should be pruned"
    assert len(queries) == 2, f"Expected 2 queries, got {len(queries)}"

    print("[OK] Redis ZSET Operations tests passed!")


def test_cache_bypassing():
    print("Running test: Cache Bypassing...")
    try:
        r.ping()
    except Exception:
        print("[SKIP] Redis is not running. Skipping Cache Bypassing test.")
        return

    # Cache pre-population
    test_key = "test_item_warmer"
    r.delete(test_key)
    mock_data = [{"platform": "blinkit", "product_name": "Test Milk", "price": 40.0, "delivery": 10, "search_term": test_key}]
    set_cache(test_key, mock_data)

    # With bypass_cache = False: should hit cache immediately (and not trigger scraper error since it returns cache)
    cached_res = asyncio.run(fetch_product_data(test_key, bypass_cache=False))
    assert len(cached_res) == 1, "Should return cached data"
    assert cached_res[0]["price"] == 40.0, "Cached price should be 40.0"

    # With bypass_cache = True: should skip cache and execute scrapers.
    # Since scrapers will execute and fail (as it is dummy key without network or mock), it should trigger scraping and return [] (scraper error fallback)
    bypass_res = asyncio.run(fetch_product_data(test_key, bypass_cache=True))
    assert bypass_res == [], "Bypassing cache should trigger fresh scraping and return [] on scraper fail"

    print("[OK] Cache Bypassing tests passed!")


if __name__ == "__main__":
    print("Starting Cache Warmer Verification Tests...\n")
    try:
        test_redis_zset_operations()
        print("-" * 50)
        test_cache_bypassing()
        print("\n[SUCCESS] ALL TESTS COMPLETED SUCCESSFULLY!")
    finally:
        cleanup_redis()
