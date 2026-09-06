import asyncio
from playwright.async_api import async_playwright
import re


def extract_quantity(text):
    text = text.lower()

    match = re.search(r"(\d+)\s?(ml|l|g|kg)", text)

    if not match:
        return None

    value = int(match.group(1))
    unit = match.group(2)

    # normalize
    if unit == "l":
        value *= 1000
    elif unit == "kg":
        value *= 1000

    return value


async def scrape_jiomart(product_name, headless=True):
    print(f"\n🛒 [JIOMART] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()

        print("🌐 Opening JioMart...")

        await page.goto(f"https://www.jiomart.com/search/{product_name}")

        print("⏳ Waiting for products...")

        await page.wait_for_selector(".plp-card-wrapper", timeout=20000)
        await asyncio.sleep(2)

        print("🔍 Extracting products...")

        product_cards = await page.query_selector_all(".plp-card-wrapper")

        print(f"Found {len(product_cards)} products")

        extracted_products = []

        for i, card in enumerate(product_cards[:20]):
            try:
                # ✅ NAME
                name_el = await card.query_selector(".plp-card-details-name")
                name = await name_el.inner_text() if name_el else None

                if not name:
                    continue

                # ✅ PRICE
                price_el = await card.query_selector("span:has-text('₹')")
                price_text = await price_el.inner_text() if price_el else None

                if not price_text:
                    continue

                price_value = float(re.sub(r"[^\d.]", "", price_text))

                # ✅ QUANTITY (from name itself)
                quantity = extract_quantity(name)

                if not quantity:
                    continue

                unit_price = price_value / quantity

                print(f"{name} → ₹{price_value} | {quantity}")

                extracted_products.append({
                    "name": name,
                    "price": price_value,
                    "quantity": quantity,
                    "unit_price": unit_price
                })

            except Exception as e:
                print(f"⚠️ Error: {e}")

        await browser.close()

        if extracted_products:
            best_product = min(extracted_products, key=lambda x: x["unit_price"])

            print(f"\n✅ Selected: {best_product}")

            return {
                "platform": "jiomart",
                "product_name": best_product["name"],
                "price": best_product["price"],
                "qty": best_product["quantity"],
                "delivery": 30,
                "eta": 20
            }

        print("❌ No valid products found jiomart")
        return {}
    
async def main():
    print("\n🚀 Testing Jiomart Scraper...\n")

    # You can change this or keep input
    product = input("Enter product (default: milk): ").strip()
    if not product:
        product = "milk"

    print(f"\nSearching for: {product}")

    try:
        result = await scrape_jiomart(product)

        print("\n============================")
        print("FINAL RESULT")
        print("============================")

        if result:
            print(f"Platform   : {result.get('platform')}")
            print(f"Product    : {result.get('product_name')}")
            print(f"Price      : ₹{result.get('price')}")
            print(f"Quantity   : {result.get('qty')}")
            print(f"Delivery   : ₹{result.get('delivery')}")
            print(f"ETA        : {result.get('eta')} mins")
        else:
            print("❌ No result returned")

    except Exception as e:
        print(f"ERROR in main(): {e}")


# RUN SCRIPT
if __name__ == "__main__":
    asyncio.run(main())