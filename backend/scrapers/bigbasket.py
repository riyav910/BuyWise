from playwright.async_api import async_playwright
import asyncio


async def scrape_product_bigbasket(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("🌐 Opening BigBasket...")
        await page.goto(f"https://www.bigbasket.com/ps/?q={product_name}")

        print("⏳ Waiting for products...")
        await page.wait_for_selector("h3")

        products = await page.query_selector_all("h3")

        print(f"🔍 Found {len(products)} products")

        results = []

        for i, product in enumerate(products[:5]):
            try:
                name = await product.inner_text()

                parent = await product.evaluate_handle("node => node.closest('div')")
                price_element = await parent.query_selector("span")

                price = await price_element.inner_text() if price_element else "N/A"

                print(f"🛒 {i+1}. {name} → {price}")

                results.append({
                    "name": name,
                    "price": price
                })

            except Exception as e:
                print(f"⚠️ Error: {e}")

        await browser.close()

        if results:
            first = results[0]
            price_value = int(''.join(filter(str.isdigit, first["price"])) or 50)

            return {
                "bigbasket": {
                    "price": price_value,
                    "delivery": 30,
                    "eta": 20
                }
            }

        return {}