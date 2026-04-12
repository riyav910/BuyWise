from playwright.sync_api import sync_playwright
import asyncio
import time


async def scrape_product_bigbasket(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # keep False for debugging
        page = browser.new_page()

        print("🌐 Opening BigBasket...")
        page.goto(f"https://www.bigbasket.com/ps/?q={product_name}")

        # wait for products to load
        print("⏳ Waiting for products...")
        page.wait_for_selector("h3")  # product titles usually in h3

        time.sleep(2)

        # get all product cards
        products = page.query_selector_all("h3")

        print(f"🔍 Found {len(products)} products")

        results = []

        for i, product in enumerate(products[:5]):  # limit to first 5
            try:
                name = product.inner_text()

                # go up to parent and find price
                parent = product.evaluate_handle("node => node.closest('div')")

                price_element = parent.query_selector("span")

                price = price_element.inner_text() if price_element else "N/A"

                print(f"🛒 {i+1}. {name} → {price}")

                results.append({
                    "name": name,
                    "price": price
                })

            except Exception as e:
                print(f"⚠️ Error extracting product: {e}")

        browser.close()

        # ⚡ Convert into your system format
        if results:
            # pick first product as best match
            first = results[0]

            # extract numeric price
            price_value = int(''.join(filter(str.isdigit, first["price"])) or 50)

            return {
                "bigbasket": {
                    "price": price_value,
                    "delivery": 30,
                    "eta": 20
                }
            }

        return {}