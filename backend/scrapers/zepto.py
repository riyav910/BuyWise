import asyncio
from playwright.async_api import async_playwright
import re
import json


def extract_quantity(text):
    if not text:
        return None, None

    text = text.lower()

    #1. Handle "<1000g"
    match = re.search(r"(\d+)\s?(g|kg|ml|l)\s?or\s?(\d+)", text)
    if match:
        val1 = int(match.group(1))
        val2 = int(match.group(3))
        unit = match.group(2)

        value = min(val1, val2)

        if unit == "kg":
            value *= 1000
            unit = "g"
        elif unit == "l":
            value *= 1000
            unit = "ml"

        return value, unit

    #2. Handle NORMAL case
    match = re.search(r"(\d+)\s?(g|kg|ml|l)", text)
    if match:
        value = int(match.group(1))
        unit = match.group(2)

        if unit == "kg":
            value *= 1000
            unit = "g"
        elif unit == "l":
            value *= 1000
            unit = "ml"

        return value, unit

    #3. Handle count
    match = re.search(r"(\d+)\s?(pcs|pieces|units)", text)
    if match:
        return int(match.group(1)), "count"

    #4. Fallback
    return 1, "unit"


async def scrape_zepto(product_name, headless=True):
    print(f"\n[ZEPTO] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
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

                keywords = product_name.lower().split()

                if not any(k in name.lower() for k in keywords):
                    continue

                quantity, unit = extract_quantity(qty_text)

                if not quantity:
                    quantity = 1
                    unit = "unit"

                unit_price = price_value / quantity

                print(f"{name} → ₹{price_value} | {quantity}")

                extracted_products.append({
                    "name": name,
                    "price": price_value,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "unit": unit
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
                "unit": unit,
                "delivery": 10,
                "eta": 10
            }

        print(" No valid products found zepto")
        return {}


# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────
import json
import traceback

async def main():
    product = input("Enter product name (default: milk): ").strip() or "milk"

    try:
        print(f"\nRunning scraper for: {product}")

        result = await scrape_zepto(product)

        print("\n" + "=" * 40)
        print("FINAL RESULT")
        print("=" * 40)

        # Case 1: result is None
        if result is None:
            print("Result is None (scraper returned nothing)")
            return

        # Case 2: empty dict
        if not result:
            print("Empty result returned {}")
            return

        # Case 3: missing expected keys
        if "platform" not in result:
            print("Unexpected result structure:")
            print(json.dumps(result, indent=2))
            return

        # Normal case
        print(json.dumps(
            {k: v for k, v in result.items() if k != "all_products"},
            indent=2,
            ensure_ascii=False
        ))

        print(f"\n(+ {len(result.get('all_products', []))} total products)")

    except Exception as e:
        print("\nERROR OCCURRED")
        print("=" * 40)

        print("Error message:", str(e))

        print("\nFull traceback:")
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())