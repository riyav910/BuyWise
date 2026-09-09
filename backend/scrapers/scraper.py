import asyncio
import sys

# Support running directly as script (python scrapers/scraper.py) or as imported module
try:
    from scrapers.bigbasket import scrape_bigbasket
    from scrapers.blinkit import scrape_blinkit
    from scrapers.zepto import scrape_zepto
    from scrapers.jiomart import scrape_jiomart
    from scrapers.instamart import scrape_instamart
except ImportError:
    from bigbasket import scrape_bigbasket
    from blinkit import scrape_blinkit
    from zepto import scrape_zepto
    from jiomart import scrape_jiomart
    from instamart import scrape_instamart

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


async def scrape_all_platforms(product_name: str, headless: bool = True) -> list[dict]:
    """
    Main scraper coordinator.
    Scrapes all platforms in parallel with the given headless configuration.
    Returns a list of valid scraped product results.
    No outside module should call individual platform scrapers directly.
    """
    product_name = product_name.lower().strip()
    print(f"\n[MAIN SCRAPER] Initiating scrape for: '{product_name}' (headless={headless})")

    scraper_tasks = [
        ("BigBasket", scrape_bigbasket(product_name, headless=headless)),
        ("Blinkit", scrape_blinkit(product_name, headless=headless)),
        ("Zepto", scrape_zepto(product_name, headless=headless)),
        ("JioMart", scrape_jiomart(product_name, headless=headless)),
        ("Instamart", scrape_instamart(product_name, headless=headless)),
    ]

    names = [name for name, _ in scraper_tasks]
    coroutines = [coro for _, coro in scraper_tasks]

    responses = await asyncio.gather(*coroutines, return_exceptions=True)

    valid_results = []

    for name, res in zip(names, responses):
        if isinstance(res, Exception):
            print(f"[{name}] Failed with error: {res}")
            continue

        if isinstance(res, dict) and res.get("platform") and res.get("price") is not None:
            res["search_term"] = product_name
            print(f"[{name}] Found: {res.get('product_name')} - Rs {res.get('price')}")
            valid_results.append(res)
        else:
            print(f"[{name}] No valid product found.")

    print(f"[MAIN SCRAPER] Finished '{product_name}'. Platforms found: {len(valid_results)}/{len(scraper_tasks)}")
    return valid_results


# Aliases for flexibility and backwards compatibility
scrape_all = scrape_all_platforms
scrape_product = scrape_all_platforms


# Entry point for direct testing
async def main():
    product = input("Enter product to compare (default: milk): ").strip() or "milk"
    headless_choice = input("Run headless? (y/n, default: y): ").strip().lower()
    headless = headless_choice != "n"

    print(f"\nRunning main scraper for: '{product}' (headless={headless})")
    results = await scrape_all(product, headless=headless)

    print("\n============================")
    print(f"FINAL RESULTS ({len(results)} platforms)")
    print("============================")
    for r in results:
        pkg = r.get("package_display") or f"{r.get('qty')} {r.get('unit', '')}"
        u_price = r.get("unit_price_display") or "N/A"
        print(f"Platform: {r.get('platform', 'N/A'):<10} | Price: ₹{r.get('price', 0):<4} | Size: {pkg:<10} | Rate: {u_price:<8} | Del: ₹{r.get('delivery', 0)} | {r.get('product_name', 'N/A')}")


if __name__ == "__main__":
    asyncio.run(main())