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


async def scrape_bigbasket(product_name, headless=True):
    print(f"\n[SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()

        print("Opening BigBasket...")
        await page.goto(
            f"https://www.bigbasket.com/ps/?q={product_name}",
            wait_until="domcontentloaded",
            timeout=60000
        )

        print("Waiting for products...")
        try:
            await page.wait_for_selector("span:has-text('₹')", timeout=20000)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"Wait timeout: {e}")
            await browser.close()
            return {}

        print("Extracting products...")

        price_elements = await page.query_selector_all("span:has-text('₹')")
        print(f"Found {len(price_elements)} raw price elements")

        extracted_products = []

        for i, price_el in enumerate(price_elements[:20]):
            try:
                price_text = await price_el.inner_text()
                price_value = float(re.sub(r"[^\d.]", "", price_text))

                parent = await price_el.evaluate_handle(
                    "el => el.closest('div').parentElement.parentElement.parentElement"
                )

                parent_text = await parent.inner_text()

                if product_name.lower() not in parent_text.lower():
                    continue

                lines = parent_text.split("\n")
                name = None

                for line in lines:
                    line = line.strip()
                    if (
                        len(line) > 5 and
                        "₹" not in line and
                        not any(x in line.lower() for x in ["min", "off", "sponsored", "%"])
                    ):
                        name = line
                        break

                if not name:
                    continue

                # Extract exact product URL
                product_url = None
                try:
                    product_url_raw = await parent.evaluate(
                        """el => {
                            const a = el.querySelector('a[href*="/pd/"]') || el.querySelector('a') || el.closest('a');
                            return a ? (a.getAttribute('href') || a.href) : null;
                        }"""
                    )
                    if product_url_raw:
                        product_url = urljoin("https://www.bigbasket.com", product_url_raw)
                except Exception:
                    pass

                product_info = enrich_product_pricing(
                    platform="bigbasket",
                    product_name=name,
                    price=price_value,
                    qty_text=parent_text,
                    delivery=20.0,
                    eta=15,
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

        print(" No valid products found bb")
        return {}
    
async def main():
    print("\n Testing BigBasket Scraper...\n")

    # You can change this or keep input
    product = input("Enter product (default: milk): ").strip()
    if not product:
        product = "milk"

    print(f"\nSearching for: {product}")

    try:
        result = await scrape_bigbasket(product)

        print("\n============================")
        print(" FINAL RESULT")
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
            print(" No result returned bb")

    except Exception as e:
        print(f"ERROR in main(): {e}")


#  RUN SCRIPT
if __name__ == "__main__":
    asyncio.run(main())