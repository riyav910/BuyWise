
import asyncio
import re
import os
import sys
from urllib.parse import urljoin, quote

from playwright.async_api import async_playwright

try:
    from scrapers.browser_utils import launch_stealth_browser
    from quantity_utils import (
        enrich_product_pricing,
        parse_and_normalize_quantity,
        select_best_candidate
    )
except ImportError:
    sys.path.append(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )

    try:
        from scrapers.browser_utils import launch_stealth_browser
    except ImportError:
        from browser_utils import launch_stealth_browser

    from quantity_utils import (
        enrich_product_pricing,
        parse_and_normalize_quantity,
        select_best_candidate
    )


BASE_URL = "https://www.zeptonow.com"


async def scrape_zepto(product_name, headless=True, lat=12.9716, lon=77.5946):

    async with async_playwright() as p:

        browser, context, page = await launch_stealth_browser(
            p, headless=headless, lat=lat, lon=lon
        )

        try:
            # Pre-inject dynamic location cookies for Zepto domains
            try:
                loc_val = f"{lat},{lon}"
                await context.add_cookies([
                    {
                        "name": "user_location",
                        "value": loc_val,
                        "domain": ".zeptonow.com",
                        "path": "/",
                    },
                    {
                        "name": "user_location",
                        "value": loc_val,
                        "domain": ".zepto.com",
                        "path": "/",
                    },
                ])
            except Exception:
                pass

            target_url = (
                f"{BASE_URL}/search?query={quote(product_name)}"
            )

            await page.goto(
                target_url,
                wait_until="domcontentloaded",
                timeout=45000
            )

            # Wait for product cards or price containers
            try:
                await page.wait_for_selector(
                    'a[data-testid="product-card"], [data-testid="product-card"], [data-slot-id="EdlpPrice"], text=₹',
                    timeout=20000
                )
            except Exception:
                pass

            await page.wait_for_timeout(1500)

            # Scroll to load additional lazy-loaded products
            for _ in range(2):
                await page.evaluate(
                    "window.scrollBy(0, window.innerHeight)"
                )
                await page.wait_for_timeout(600)

            # Extract product information from DOM
            cards_data = await page.locator(
                'a[data-testid="product-card"], div[data-testid="product-card"], a[href*="/pn/"], a[href*="/prn/"]'
            ).evaluate_all("""
                cards => cards.map(card => {
                    const getText = (selector) => {
                        const el = card.querySelector(selector);
                        return el ? el.innerText.trim() : null;
                    };

                    const priceContainer = card.querySelector(
                        '[data-slot-id="EdlpPrice"]'
                    );

                    const priceText = priceContainer
                        ? priceContainer.innerText
                        : (card.innerText || '');

                    const prices = (
                        priceText.match(/₹\\s*[\\d,.]+/g) || []
                    ).map(p =>
                        parseFloat(p.replace(/[^\\d.]/g, ''))
                    ).filter(p => !isNaN(p));

                    let name = getText('[data-slot-id="ProductName"]');
                    if (!name) {
                        const h = card.querySelector('h3, h4, h5, [data-testid="product-name"]');
                        if (h) name = h.innerText.trim();
                    }

                    let quantity = getText('[data-slot-id="PackSize"]');
                    if (!quantity) {
                        const q = card.querySelector('[data-testid="product-quantity"], [data-slot-id="pack-size"]');
                        if (q) quantity = q.innerText.trim();
                    }

                    const image = card.querySelector(
                        '[data-slot-id="ProductImageWrapper"] img, img'
                    );

                    const productUrl = card.getAttribute('href') || (card.querySelector('a') ? card.querySelector('a').getAttribute('href') : null);

                    const productContainer = card.querySelector(
                        '[data-is-out-of-stock]'
                    );

                    const outOfStock = productContainer
                        ? productContainer.getAttribute(
                            'data-is-out-of-stock'
                        ) === 'true'
                        : (card.innerText && card.innerText.toLowerCase().includes("out of stock"));

                    const eta = getText(
                        '[data-slot-id="EtaInformation"]'
                    );

                    return {
                        name,
                        prices,
                        quantity,
                        image: image ? image.src : null,
                        productUrl,
                        outOfStock,
                        eta
                    };
                })
            """)

            extracted_products = []
            search_words = [w for w in product_name.lower().split() if len(w) > 2]
            stemmed_words = [w[:-1] if w.endswith('s') and len(w) > 3 else w for w in search_words]

            for item in cards_data:
                try:
                    name = item.get("name")
                    prices = item.get("prices") or []
                    qty_text = item.get("quantity") or name

                    if not name or not prices:
                        continue

                    if item.get("outOfStock"):
                        continue

                    price_value = min(prices)
                    if price_value <= 0:
                        continue

                    name_lower = name.lower()
                    matches = (
                        product_name.lower() in name_lower
                        or any(w in name_lower for w in search_words)
                        or any(w in name_lower for w in stemmed_words)
                    )
                    if not matches:
                        continue

                    product_url = (
                        urljoin(BASE_URL, item["productUrl"])
                        if item.get("productUrl")
                        else None
                    )

                    product_info = enrich_product_pricing(
                        platform="zepto",
                        product_name=name,
                        price=price_value,
                        qty_text=qty_text,
                        delivery=10.0,
                        eta=10,
                        product_url=product_url,
                    )

                    if (
                        product_info
                        and product_info.get("normalized_quantity") is not None
                    ):
                        extracted_products.append(product_info)

                except Exception:
                    continue

            if not extracted_products:
                return {}

            best_product = select_best_candidate(
                extracted_products,
                product_name
            )
            return best_product or {}

        except Exception as e:

            print(f"[Zepto] Scraper error: {e}")
            return {}

        finally:
            await browser.close()


async def main():

    product = (
        input("\nProduct (default: milk): ").strip()
        or "milk"
    )

    print("\n╭────────────────────────────────────────────╮")
    print("│                  ZEPTO                     │")
    print("╰────────────────────────────────────────────╯")

    result = await scrape_zepto(product, headless=False)

    if not result:
        print("\nNo valid products found.")
        return

    print("\nBEST MATCH")
    print("--------------------------------------------")

    print(f"Product   : {result.get('product_name')}")
    print(f"Price     : ₹{result.get('price')}")
    print(f"Quantity  : {result.get('package_display', result.get('qty'))}")
    print(f"Unit Price: {result.get('unit_price_display')}")
    print(f"URL       : {result.get('product_url')}")


if __name__ == "__main__":
    asyncio.run(main())
