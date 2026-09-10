import asyncio
import os
import re
import sys
from urllib.parse import urljoin
from playwright.async_api import async_playwright

try:
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate


async def scrape_jiomart(product_name, headless=True):
    print(f"\n🛒 [JIOMART] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()

        print(" Opening JioMart...")

        await page.goto(f"https://www.jiomart.com/search/{product_name}")

        print(" Waiting for products...")

        await page.wait_for_selector(".plp-card-wrapper", timeout=20000)
        await asyncio.sleep(2)

        print(" Extracting products...")

        product_cards = await page.query_selector_all(".plp-card-wrapper")

        print(f"Found {len(product_cards)} products")

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
                    print(f"{name} → ₹{price_value} | {product_info['package_display']} | {product_info['unit_price_display']}")
                    extracted_products.append(product_info)

            except Exception as e:
                print(f" Error: {e}")

        await browser.close()

        if extracted_products:
            best_product = select_best_candidate(extracted_products, product_name)
            if best_product:
                print(f"\n Selected: {best_product['product_name']} ({best_product.get('unit_price_display')})")
                return best_product

        print(" No valid products found jiomart")
        return {}
    
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