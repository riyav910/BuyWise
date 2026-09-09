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


async def scrape_blinkit(product_name, headless=True):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()

        try:
            await page.goto(
                f"https://blinkit.com/s/?q={product_name}",
                wait_until="domcontentloaded",
                timeout=60000
            )

            await page.wait_for_selector("text=₹", timeout=20000)
            await asyncio.sleep(3)

            price_elements = await page.query_selector_all("text=₹")

            extracted_products = []

            for price_el in price_elements[:25]:
                try:
                    price_text = await price_el.inner_text()
                    price_value = float(re.sub(r"[^\d.]", "", price_text))

                    parent = await price_el.evaluate_handle(
                        """el => {
                            let node = el;
                            for (let i = 0; i < 6; i++) {
                                if (!node) break;
                                if (node.innerText && node.innerText.length > 50) return node;
                                node = node.parentElement;
                            }
                            return el.parentElement;
                        }"""
                    )

                    parent_text = await parent.inner_text()

                    if product_name.lower() not in parent_text.lower():
                        continue

                    lines = [l.strip() for l in parent_text.split("\n") if l.strip()]

                    name = None
                    qty_line = None

                    for line in lines:
                        norm = parse_and_normalize_quantity(line)
                        if norm:
                            qty_line = line

                        if (
                            len(line) > 5
                            and "₹" not in line
                            and not norm
                            and not any(
                                x in line.lower()
                                for x in ["add", "mins", "off", "%", "rating", "sponsored"]
                            )
                        ):
                            name = line

                    if not name:
                        continue

                    # Extract exact product URL
                    product_url = None
                    try:
                        product_url_raw = await price_el.evaluate(
                            """el => {
                                let curr = el;
                                for (let i = 0; i < 15; i++) {
                                    if (!curr) break;
                                    if (curr.tagName === 'A' && (curr.getAttribute('href') || '').includes('/prn/')) {
                                        return curr.getAttribute('href');
                                    }
                                    const a = curr.querySelector('a[href*="/prn/"]');
                                    if (a && a.getAttribute('href')) {
                                        return a.getAttribute('href');
                                    }
                                    curr = curr.parentElement;
                                }
                                curr = el;
                                for (let i = 0; i < 12; i++) {
                                    if (!curr) break;
                                    const a = curr.tagName === 'A' ? curr : curr.querySelector('a[href^="/"]');
                                    if (a && a.getAttribute('href') && !a.getAttribute('href').startsWith('#')) {
                                        return a.getAttribute('href');
                                    }
                                    curr = curr.parentElement;
                                }
                                return null;
                            }"""
                        )
                        if product_url_raw:
                            product_url = urljoin("https://blinkit.com", product_url_raw)
                    except Exception:
                        pass

                    product_info = enrich_product_pricing(
                        platform="blinkit",
                        product_name=name,
                        price=price_value,
                        qty_text=qty_line or parent_text,
                        delivery=10.0,
                        eta=10,
                        product_url=product_url,
                    )

                    if product_info["normalized_quantity"] is not None:
                        extracted_products.append(product_info)

                except Exception:
                    continue

            if extracted_products:
                best_product = select_best_candidate(extracted_products, product_name)
                if best_product:
                    return best_product

            return {}

        finally:
            await browser.close()


async def main():
    product = input("\n  Product (default: milk): ").strip() or "milk"

    print("\n╭────────────────────────────────────────────╮")
    print("│                BLINKIT                    │")
    print("╰────────────────────────────────────────────╯")
    print(f"\n  Searching : {product}")

    try:
        result = await scrape_blinkit(product)
        print()

        if not result:
            print("  ✗ No valid products found\n")
            return

        print(f"  ✓ Product selected: {result.get('product_name')}")

        print("\n  BEST MATCH")
        print("  ──────────────────────────────────────────")
        print(f"  {result['product_name']}")
        print(f"  ₹{result['price']:.0f}  •  {result.get('package_display', result.get('qty'))}  •  {result.get('unit_price_display', '')}")

        print("\n  DETAILS")
        print("  ──────────────────────────────────────────")
        print(f"  Delivery : ₹{result['delivery']}")
        print(f"  ETA      : {result['eta']} mins\n")

    except Exception as e:
        print(f"\n  ✗ Scraper error: {str(e)}\n")


if __name__ == "__main__":
    asyncio.run(main())