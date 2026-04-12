import asyncio
from playwright.async_api import async_playwright


async def scrape_product(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        print("🌐 Launching browser...")
        browser = await p.chromium.launch(headless=False)

        page = await browser.new_page()

        # 🔥 IMPORTANT: open website
        url = f"https://www.bigbasket.com/ps/?q={product_name}"
        await page.goto(url)

        # Wait for price element
        await page.wait_for_selector("text=₹")

        # Get product name
        try:
            name_element = await page.query_selector("h3")
            name = await name_element.inner_text()
        except:
            name = product_name

        # Get price
        price_element = await page.query_selector("text=₹")
        price_text = await price_element.inner_text()

        print(f"🛒 Product: {name}")
        print(f"💰 Price raw: {price_text}")

        # Extract number
        digits = ''.join(filter(str.isdigit, price_text))
        price_value = int(digits) if digits else 50

        extracted_products = []

        if price_value:
            extracted_products.append({
                "name": name,
                "price": price_value
            })

        await browser.close()
        print("❌ Browser closed")

        return {
            "bigbasket": {
                "price": price_value,
                "delivery": 30,
                "eta": 20
            }
        }