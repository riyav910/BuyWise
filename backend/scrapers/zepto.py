import asyncio
from playwright.async_api import async_playwright
import re
import os
import sys
from urllib.parse import urljoin

try:
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from quantity_utils import enrich_product_pricing, parse_and_normalize_quantity, select_best_candidate


async def scrape_zepto(product_name, headless=True):

    async with async_playwright() as p:

        browser = await p.chromium.launch(
            headless=headless
        )

        page = await browser.new_page()

        try:

            await page.goto(
                f"https://www.zeptonow.com/search?query={product_name}",
                wait_until="domcontentloaded",
                timeout=60000
            )

            await page.wait_for_selector(
                '[data-slot-id="ProductName"]',
                timeout=20000
            )

            await asyncio.sleep(2)

            cards = await page.query_selector_all("a.B4vNQ")

            extracted_products = []

            for card in cards[:25]:

                try:

                    # NAME
                    name_el = await card.query_selector(
                        '[data-slot-id="ProductName"] span'
                    )

                    name = (
                        await name_el.inner_text()
                        if name_el
                        else None
                    )

                    # PRICE: Extract discounted selling price (if multiple prices exist, e.g. MRP vs discounted, pick the lowest)
                    price_value = None
                    try:
                        prices = await card.evaluate("""el => {
                            const container = el.querySelector('[data-slot-id="EdlpPrice"]') || el;
                            const els = Array.from(container.querySelectorAll('h4, span, div, p'));
                            const found = [];
                            for (const e of els) {
                                const t = e.innerText || '';
                                if (t.includes('₹') && !t.includes('%')) {
                                    const m = t.match(/₹\\s*(\\d+(?:\\.\\d+)?)/);
                                    if (m) found.push(parseFloat(m[1]));
                                }
                            }
                            if (found.length === 0) {
                                const allMatches = el.innerText.match(/₹\\s*(\\d+(?:\\.\\d+)?)/g) || [];
                                for (const m of allMatches) {
                                    const num = m.replace(/[^\\d.]/g, '');
                                    if (num) found.push(parseFloat(num));
                                }
                            }
                            return found;
                        }""")
                        if prices:
                            price_value = min(prices)
                    except Exception:
                        pass

                    if not price_value:
                        price_el = await card.query_selector('[data-slot-id="EdlpPrice"]')
                        price_text = await price_el.inner_text() if price_el else None
                        price_value = float(re.sub(r"[^\d.]", "", price_text)) if price_text else None

                    # QUANTITY
                    qty_el = await card.query_selector(
                        '[data-slot-id="PackSize"] span'
                    )

                    qty_text = (
                        await qty_el.inner_text()
                        if qty_el
                        else None
                    )

                    if not name or not price_value:
                        continue

                    keywords = product_name.lower().split()

                    if not any(
                        k in name.lower()
                        for k in keywords
                    ):
                        continue

                    # Exact product URL from anchor
                    product_url = None
                    try:
                        product_url_raw = await card.get_attribute("href") or await card.evaluate("el => el.getAttribute('href') || el.href")
                        if product_url_raw:
                            product_url = urljoin("https://www.zeptonow.com", product_url_raw)
                    except Exception:
                        pass

                    product_info = enrich_product_pricing(
                        platform="zepto",
                        product_name=name,
                        price=price_value,
                        qty_text=qty_text or name,
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

    product = (
        input("\n  Product (default: milk): ")
        .strip()
        or "milk"
    )

    print("\n╭────────────────────────────────────────────╮")
    print("│                 ZEPTO                      │")
    print("╰────────────────────────────────────────────╯")

    print(f"\n  Searching : {product}")

    try:

        result = await scrape_zepto(product)

        print()

        if not result:

            print("  ✗ No valid products found")
            print()

            return

        print(f"  ✓ Product selected: {result.get('product_name')}")

        print("\n  BEST MATCH")
        print("  ──────────────────────────────────────────")

        print(
            f"  {result['product_name']}"
        )

        print(
            f"  ₹{result['price']:.0f}  •  "
            f"{result.get('package_display', result.get('qty'))}  •  "
            f"{result.get('unit_price_display', '')}"
        )

        print("\n  DETAILS")
        print("  ──────────────────────────────────────────")

        print(
            f"  Delivery : ₹{result['delivery']}"
        )

        print(
            f"  ETA      : {result['eta']} mins"
        )
        print(
            f"  URL      : {result.get('product_url')}"
        )

        print()

    except Exception as e:

        print("\n  ✗ Scraper error")
        print(f"    {str(e)}")
        print()


if __name__ == "__main__":
    asyncio.run(main())