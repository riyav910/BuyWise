"""
BuyWise Quick-Commerce Scrapers Verification Suite
Tests Blinkit, Zepto, and BigBasket scrapers individually or in parallel.

Usage:
    python backend/tests/test_scrapers.py
    python backend/tests/test_scrapers.py --platform zepto --product milk
    python backend/tests/test_scrapers.py --platform blinkit --product bread
    python backend/tests/test_scrapers.py --platform bigbasket --product maggi
"""
import argparse
import asyncio
import os
import sys
import time

# Ensure backend root is in Python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from scrapers.blinkit import scrape_blinkit
from scrapers.zepto import scrape_zepto
from scrapers.bigbasket import scrape_bigbasket
from scrapers.scraper import scrape_all_platforms


def print_result_card(platform_name: str, res: dict):
    print(f"\n[{platform_name.upper()} RESULT]")
    if not res:
        print("  ❌ No product matched or extracted.")
        return
    print(f"  Product Name : {res.get('product_name')}")
    print(f"  Price        : ₹{res.get('price')}")
    print(f"  Package Size : {res.get('package_display', res.get('qty'))}")
    print(f"  Unit Rate    : {res.get('unit_price_display', 'N/A')}")
    print(f"  Delivery Fee : ₹{res.get('delivery', 0)}")
    print(f"  ETA          : {res.get('eta', 'N/A')} mins")
    print(f"  Product URL  : {res.get('product_url', 'N/A')}")


async def run_single_test(platform: str, product: str, headless: bool):
    print(f"\n[TEST] Running {platform.upper()} scraper for: '{product}' (headless={headless})...")
    t0 = time.time()
    res = {}
    if platform == "blinkit":
        res = await scrape_blinkit(product, headless=headless)
    elif platform == "zepto":
        res = await scrape_zepto(product, headless=headless)
    elif platform == "bigbasket":
        res = await scrape_bigbasket(product, headless=headless)
    else:
        print(f"Unknown platform '{platform}'. Options: blinkit, zepto, bigbasket, all")
        return
    duration = time.time() - t0
    print_result_card(platform, res)
    print(f"  ⏱ Duration: {duration:.2f}s")


async def run_all_test(product: str, headless: bool):
    print(f"\n[TEST] Running ALL scrapers in parallel for: '{product}' (headless={headless})...")
    t0 = time.time()
    results = await scrape_all_platforms(product, headless=headless)
    duration = time.time() - t0

    print(f"\n{'='*70}")
    print(f" PARALLEL SCRAPING RESULTS ({len(results)} platforms matched in {duration:.2f}s)")
    print(f"{'='*70}")
    for r in results:
        pkg = r.get("package_display") or f"{r.get('qty')} {r.get('unit', '')}"
        u_price = r.get("unit_price_display") or "N/A"
        plat = r.get("platform", "N/A")
        price = r.get("price", 0)
        name = r.get("product_name", "N/A")
        print(f"  {plat:<10} | ₹{price:<5} | {pkg:<10} | {u_price:<9} | {name}")
    print(f"{'='*70}\n")


async def main():
    parser = argparse.ArgumentParser(description="Test BuyWise Quick-Commerce Scrapers")
    parser.add_argument("--platform", choices=["blinkit", "zepto", "bigbasket", "all"], default="all", help="Platform to test")
    parser.add_argument("--product", default="milk", help="Search query (default: milk)")
    parser.add_argument("--headed", action="store_true", help="Run with browser window visible (default: headless)")
    args = parser.parse_args()

    headless = not args.headed

    if args.platform == "all":
        await run_all_test(args.product, headless=headless)
    else:
        await run_single_test(args.platform, args.product, headless=headless)


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.run(main())
