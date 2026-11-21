import asyncio
import os
import re
import sys
from urllib.parse import urljoin
from playwright.async_api import async_playwright

try:
    from scrapers.browser_utils import launch_stealth_browser
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from scrapers.browser_utils import launch_stealth_browser
    except ImportError:
        from browser_utils import launch_stealth_browser
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate


async def scrape_jiomart(product_name, headless=True):
    async with async_playwright() as p:
        browser, context, page = await launch_stealth_browser(p, headless=headless)
        try:
            await page.goto(f"https://www.jiomart.com/search/{product_name}", timeout=45000)

            try:
                await page.wait_for_selector(".plp-card-wrapper", timeout=15000)
                await asyncio.sleep(1.5)
            except Exception:
                return {}

            product_cards = await page.query_selector_all(".plp-card-wrapper")
            extracted_products = []

            for i, card in enumerate(product_cards[:20]):
                try:
                    #  NAME
                    name_el = await card.query_selector(".plp-card-details-name")
                    name = await name_el.inner_text() if name_el else None

                    if not name:
                        continue

                    #  PRICE
                    price_el = await card.query_selector("span:has-text('₹')")
                    price_text = await price_el.inner_text() if price_el else None

                    if not price_text:
                        continue

                    price_value = float(re.sub(r"[^\d.]", "", price_text))

                    # Extract exact product URL
                    product_url = None
                    try:
                        product_url_raw = await card.evaluate(
                            """el => {
                                const a = el.tagName === 'A' ? el : (el.querySelector('a[href*="/p/"]') || el.querySelector('a') || el.closest('a'));
                                return a ? (a.getAttribute('href') || a.href) : null;
                            }"""
                        )
                        if product_url_raw:
                            product_url = urljoin("https://www.jiomart.com", product_url_raw)
                    except Exception:
                        pass

                    product_info = enrich_product_pricing(
                        platform="jiomart",
                        product_name=name,
                        price=price_value,
                        qty_text=name,
                        delivery=30.0,
                        eta=20,
                        product_url=product_url,
                    )

                    if product_info["normalized_quantity"] is not None:
                        extracted_products.append(product_info)

                except Exception:
                    pass

            if extracted_products:
                best_product = select_best_candidate(extracted_products, product_name)
                if best_product:
                    return best_product

            return {}
        finally:
            await browser.close()
    
async def main():
    print("\n Testing Jiomart Scraper...\n")

    # You can change this or keep input
    product = input("Enter product (default: milk): ").strip()
    if not product:
        product = "milk"

    print(f"\nSearching for: {product}")

    try:
        result = await scrape_jiomart(product)

        print("\n============================")
        print("FINAL RESULT")
        print("============================")

        if result:
            print(f"Platform   : {result.get('platform')}")
            print(f"Product    : {result.get('product_name')}")
            print(f"Price      : ₹{result.get('price')}")
            print(f"Quantity   : {result.get('qty')}")
            print(f"Delivery   : ₹{result.get('delivery')}")
            print(f"ETA        : {result.get('eta')} mins")
            print(f"URL        : {result.get('product_url')}")
        else:
            print(" No result returned")

    except Exception as e:
        print(f"ERROR in main(): {e}")


# RUN SCRIPT
if __name__ == "__main__":
    asyncio.run(main())