import asyncio
from playwright.async_api import async_playwright
import re
import json


def extract_quantity(text):
    text = text.lower()

    match = re.search(r"(\d+)\s?(ml|l|g|kg)", text)

    if not match:
        return None

    value = int(match.group(1))
    unit = match.group(2)

    if unit == "l":
        value *= 1000
    elif unit == "kg":
        value *= 1000

    return value


async def scrape_zepto(product_name):
    print(f"\n[ZEPTO] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("Opening Zepto...")

        await page.goto(f"https://www.zeptonow.com/search?query={product_name}")

        print("Waiting for products...")
        await page.wait_for_selector('[data-slot-id="ProductName"]', timeout=20000)
        await asyncio.sleep(2)

        print("Extracting product cards...")

        cards = await page.query_selector_all("a.B4vNQ")

        print(f"Found {len(cards)} product cards")

        extracted_products = []

        for card in cards[:25]:
            try:
                # NAME
                name_el = await card.query_selector('[data-slot-id="ProductName"] span')
                name = await name_el.inner_text() if name_el else None

                # PRICE
                price_el = await card.query_selector('[data-slot-id="EdlpPrice"] span')
                price_text = await price_el.inner_text() if price_el else None
                price_value = float(re.sub(r"[^\d.]", "", price_text)) if price_text else None

                # QUANTITY
                qty_el = await card.query_selector('[data-slot-id="PackSize"] span')
                qty_text = await qty_el.inner_text() if qty_el else None
                quantity = extract_quantity(qty_text) if qty_text else None

                if not name or not price_value or not quantity:
                    continue

                if product_name.lower() not in name.lower():
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
                print(f"Error: {e}")

        await browser.close()

        if extracted_products:
            best_product = min(extracted_products, key=lambda x: x["unit_price"])

            print(f"\nSelected: {best_product}")

            return {
                "platform": "zepto",
                "product_name": best_product["name"],
                "price": best_product["price"],
                "qty": best_product["quantity"],
                "delivery": 10,
                "eta": 10
            }

        print(" No valid products found")
        return {}


# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────
async def main():
    product = input("Enter product name (default: milk): ").strip() or "milk"

    result = await scrape_zepto(product)

    print("\n" + "=" * 40)
    print("FINAL RESULT")
    print("=" * 40)

    if result:
        print(json.dumps(
            {k: v for k, v in result.items() if k != "all_products"},
            indent=2,
            ensure_ascii=False
        ))
        print(f"\n(+ {len(result.get('all_products', []))} total products in result['all_products'])")
    else:
        print("No result returned.")


if __name__ == "__main__":
    asyncio.run(main())