import asyncio
from playwright.async_api import async_playwright


async def scrape_product(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        print("🌐 Launching browser...")
        browser = await p.chromium.launch(headless=True)

        page = await browser.new_page()
        print("📄 Opening page...")

        await page.goto(f"https://www.bigbasket.com/ps/?q={product_name}")

        print("⏳ Waiting for page load...")
        await asyncio.sleep(2)

        # 🔥 TEMP simulated extraction
        data = {
            "blinkit": {
                "price": 50 + len(product_name),
                "delivery": 20,
                "eta": 10
            },
            "zepto": {
                "price": 45 + len(product_name),
                "delivery": 25,
                "eta": 15
            }
        }

        print(f"📊 [SCRAPER] Extracted data: {data}")

        await browser.close()
        print("❌ Browser closed")

        return data