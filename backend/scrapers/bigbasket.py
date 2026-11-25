
import asyncio
import os
import re
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
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))
        )
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


BASE_URL = "https://www.bigbasket.com"


async def scrape_bigbasket(product_name, headless=True, lat=12.9716, lon=77.5946):
    async with async_playwright() as p:
        browser, context, page = await launch_stealth_browser(
            p,
            headless=headless,
            lat=lat,
            lon=lon
        )

        try:
            target_url = (
                f"{BASE_URL}/ps/?q={quote(product_name)}"
            )

            await page.goto(
                target_url,
                wait_until="domcontentloaded",
                timeout=45000
            )

            # Wait for product cards or links
            try:
                await page.wait_for_selector(
                    'a[href*="/pd/"], div[class*="SKUDeck"], li[class*="sc-ciQpPG"]',
                    timeout=15000
                )
            except Exception:
                try:
                    await page.wait_for_selector('text=₹', timeout=5000)
                except Exception:
                    await page.wait_for_timeout(2000)

            await page.wait_for_timeout(1500)

            # Scroll to load additional products
            for _ in range(2):
                await page.evaluate(
                    "window.scrollBy(0, window.innerHeight)"
                )
                await page.wait_for_timeout(800)

            # Extract complete product cards from live BigBasket DOM
            cards_data = await page.evaluate("""
                () => {
                    // Match cards by SKUDeck, li container, or links
                    const deckNodes = document.querySelectorAll(
                        'li[class*="sc-ciQpPG"], div[class*="SKUDeck"], ul[class*="grid"] li, a[href*="/pd/"]'
                    );

                    let cards = [];
                    deckNodes.forEach(node => {
                        const card = node.closest('li') || (node.matches && node.matches('div[class*="SKUDeck"]') ? node : node.parentElement);
                        if (card && !cards.includes(card)) {
                            cards.push(card);
                        }
                    });

                    if (cards.length === 0) {
                        cards = Array.from(document.querySelectorAll('ul.grid li, ul[class*="grid"] li, div[class*="SKUDeck"]'));
                    }

                    return cards.map(card => {
                        const productLink = card.querySelector(
                            'a[href*="/pd/"]'
                        ) || (card.matches && card.matches('a[href*="/pd/"]') ? card : null);

                        if (!productLink) return null;

                        // Product image
                        const image = card.querySelector('img[class*="DeckImage"], img[title], img[alt], img');
                        const imgTitle = image ? (image.getAttribute('title') || image.getAttribute('alt') || '') : '';
                        const imgSrc = image ? (image.currentSrc || image.src || image.getAttribute('src')) : null;

                        // Brand
                        const brandEl = card.querySelector(
                            '[class*="BrandName"], span[class*="BrandName"]'
                        );
                        const brand = brandEl ? brandEl.innerText.trim() : '';

                        // Product name
                        const h3El = card.querySelector(
                            'div.break-words h3, [class*="BrandName"] ~ div h3, h3.block, h3'
                        );
                        let name = h3El ? h3El.innerText.trim() : '';
                        if (!name && imgTitle) {
                            name = imgTitle;
                        }

                        // Pack size from button, dropdown, or PackSelector
                        let quantity = '';
                        const packEl = card.querySelector(
                            '[class*="PackSelector"] span, [id*="headlessui-listbox-button"] button span, [id*="headlessui-listbox-button"] span, span[class*="PackSize"]'
                        );
                        if (packEl && packEl.innerText) {
                            const m = packEl.innerText.match(/\\d+(?:\\.\\d+)?\\s*(?:kg|g|gm|gms|ml|l|litre|liter|pack|piece|pcs|unit|pouch)/i);
                            if (m) quantity = m[0];
                            else quantity = packEl.innerText.trim();
                        }

                        if (!quantity) {
                            const buttons = Array.from(
                                card.querySelectorAll('button, [id*="headlessui-listbox-button"], [class*="PackSelector"]')
                            );
                            for (const btn of buttons) {
                                const bText = btn.innerText || '';
                                const m = bText.match(/\\d+(?:\\.\\d+)?\\s*(?:kg|g|gm|gms|ml|l|litre|liter|pack|piece|pcs|unit|pouch)/i);
                                if (m) {
                                    quantity = m[0];
                                    break;
                                }
                            }
                        }

                        // Fallback quantity from product title or image title
                        if (!quantity) {
                            const combinedTitle = `${name} ${imgTitle}`;
                            const m = combinedTitle.match(/\\d+(?:\\.\\d+)?\\s*(?:kg|g|gm|gms|ml|l|litre|liter|pack|piece|pcs|unit|pouch)/i);
                            if (m) {
                                quantity = m[0];
                            }
                        }

                        // Selling price and MRP
                        const priceEls = Array.from(
                            card.querySelectorAll('div[class*="sc-jMakVo"] span, span[class*="Pricing"], div:has(> span)')
                        );
                        let prices = [];
                        for (const el of priceEls) {
                            const txt = el.innerText || '';
                            const matches = txt.match(/₹\\s*[\\d,.]+/g);
                            if (matches) {
                                for (const p of matches) {
                                    const num = parseFloat(p.replace(/[^\\d.]/g, ''));
                                    if (!isNaN(num) && num > 0) prices.push(num);
                                }
                            }
                        }

                        if (prices.length === 0) {
                            const cardText = card.innerText || '';
                            const priceMatches = cardText.match(/₹\\s*[\\d,.]+/g) || [];
                            prices = priceMatches.map(p =>
                                parseFloat(p.replace(/[^\\d.]/g, ''))
                            ).filter(n => !isNaN(n) && n > 0);
                        }

                        // ETA
                        const etaEl = card.querySelector(
                            '[class*="Eta"] div, div.text-slimyGreen-800, [class*="Eta"]'
                        );
                        let etaText = etaEl ? etaEl.innerText.trim() : '';
                        if (!etaText) {
                            const cardText = card.innerText || '';
                            const m = cardText.match(/\\b\\d+\\s*mins?\\b/i);
                            if (m) etaText = m[0];
                            else etaText = '15 mins';
                        }

                        // Product URL
                        const productUrl = productLink.getAttribute('href') || '';

                        return {
                            brand,
                            name,
                            fullName: [brand, name].filter(Boolean).join(' '),
                            quantity: quantity || '1 pack',
                            prices,
                            image: imgSrc,
                            productUrl,
                            eta: etaText
                        };
                    }).filter(Boolean);
                }
            """)

            extracted_products = []

            for item in cards_data:
                try:
                    name = item.get("fullName") or item.get("name")
                    qty_text = item.get("quantity") or "1 pack"
                    prices = item.get("prices") or []

                    if not name or not prices:
                        continue

                    # First displayed price is the selling price
                    price_value = prices[0]
                    if price_value <= 0:
                        continue

                    product_url = (
                        urljoin(BASE_URL, item["productUrl"])
                        if item.get("productUrl")
                        else None
                    )

                    eta_match = re.search(r"(\d+)", item.get("eta") or "")
                    eta = int(eta_match.group(1)) if eta_match else 15

                    product_info = enrich_product_pricing(
                        platform="bigbasket",
                        product_name=name,
                        price=price_value,
                        qty_text=qty_text,
                        delivery=20.0,
                        eta=eta,
                        product_url=product_url,
                    )

                    if product_info and product_info.get("normalized_quantity") is not None:
                        extracted_products.append(product_info)

                except Exception:
                    continue

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

            print(f"[BIGBASKET] Scraper error: {e}")
            return {}

        finally:

            await browser.close()


async def main():

    product = (
        input("\nEnter product (default: milk): ").strip()
        or "milk"
    )

    result = await scrape_bigbasket(
        product,
        headless=False
    )

    if not result:

        print("\nNo valid products found.")
        return

    print("\nBEST MATCH")
    print("----------------------------------------")

    print(f"Product    : {result.get('product_name')}")
    print(f"Price      : ₹{result.get('price')}")
    print(
        f"Quantity   : "
        f"{result.get('package_display', result.get('qty'))}"
    )
    print(
        f"Unit Price : {result.get('unit_price_display')}"
    )
    print(f"Delivery   : ₹{result.get('delivery')}")
    print(f"ETA        : {result.get('eta')} mins")
    print(f"URL        : {result.get('product_url')}")


if __name__ == "__main__":
    asyncio.run(main())
