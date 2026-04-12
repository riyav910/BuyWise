import asyncio
from playwright.async_api import async_playwright
import re


async def scrape_bigbasket(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        print("🌐 Launching browser...")
        browser = await p.chromium.launch(headless=False)

        page = await browser.new_page()
        print("📄 Opening page...")

        await page.goto(f"https://www.bigbasket.com/ps/?q={product_name}")

        print("⏳ Waiting for page load...")
        # await page.wait_for_selector("text=₹")

        # price_element = await page.query_selector("text=₹")
        # price_text = await price_element.inner_text()

        # print(f"💰 Price raw: {price_text}")

        # digits = ''.join(filter(str.isdigit, price_text))
        # price_value = int(digits) if digits else 50

        # await browser.close()

        # return {
        #     "bigbasket": {
        #         "price": price_value,
        #         "delivery": 30,
        #         "eta": 20
        #     }
        # }
        
        # Wait for products to load
        await page.wait_for_selector("text=₹")

        print("🔍 Extracting products...")

        # Get all price elements
        price_elements = await page.query_selector_all("text=₹")

        print(f"💰 Found {len(price_elements)} price elements")

        extracted_products = []

        for i, price_el in enumerate(price_elements[:10]):  # limit
            try:
                price_text = await price_el.inner_text()
                price_value = float(re.sub(r"[^\d.]", "", price_text))

                # Try to find nearby product name
                # parent = await price_el.evaluate_handle("node => node.closest('div')")

                # name_element = await parent.query_selector("a, h3")

                # name = await name_element.inner_text() if name_element else "Unknown"

                # print(f"🛒 {i+1}. {name} → ₹{price_value}")
                
                print("extracted price from bigbasket")

                extracted_products.append({
                    "name": product_name,
                    "price": price_value
                })

            except Exception as e:
                print(f"⚠️ Error: {e}")
                
        if extracted_products:
            best_product = extracted_products[0]

            print(f"\n✅ Selected: {best_product}")

            return {
                # "bigbasket": {
                #     "price": best_product["price"],
                #     "delivery": 30,
                #     "eta": 20
                # }
                "platform": "bigbasket",
                "price": best_product["price"],
                "delivery": 20,
                "eta": 15,
                "product_name": product_name
            }

        print("❌ No valid products found")
        return {}