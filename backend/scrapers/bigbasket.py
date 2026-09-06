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

    # normalize to ml/g
    if unit == "l":
        value *= 1000
    elif unit == "kg":
        value *= 1000

    return value


async def scrape_bigbasket(product_name, headless=True):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        print("🌐 Launching browser...")
        browser = await p.chromium.launch(headless=headless)

        page = await browser.new_page()
        print("📄 Opening page...")

        await page.goto(f"https://www.bigbasket.com/ps/?q={product_name}")

        print("⏳ Waiting for page load...")
        
        print("🔍 Finding product cards...")

        await page.wait_for_selector("text=₹", timeout=15000)
        await asyncio.sleep(2)

        price_elements = await page.query_selector_all("text=₹")

        print(f"Found {len(price_elements)} price elements")

        extracted_products = []

        for i, price_el in enumerate(price_elements[:20]):
            try:
                price_text = await price_el.inner_text()
                price_value = float(re.sub(r"[^\d.]", "", price_text))

                # go up multiple levels (IMPORTANT FIX)
                parent = await price_el.evaluate_handle(
                    "el => el.closest('div').parentElement.parentElement"
                )

                parent_text = await parent.inner_text()

                # filter relevant
                if product_name.lower() not in parent_text.lower():
                    continue

                # extract name
                lines = parent_text.split("\n")

                name = None

                for line in lines:
                    line = line.strip()

                    if (
                        len(line) > 8 and
                        "₹" not in line and
                        not re.search(r"\d+\s?(ml|l|g|kg)", line.lower()) and
                        not any(x in line.lower() for x in ["min", "off", "sponsored", "%"])
                    ):
                        name = line
                        break

                if not name:
                    continue

                # extract quantity
                quantity = None

                for line in lines:
                    qty = extract_quantity(line)
                    if qty:
                        quantity = qty
                        break
                if not quantity:
                    continue

                unit_price = price_value / quantity

                print(f"{name} → ₹{price_value} | {quantity}")

                extracted_products.append({
                    "name": name if name else {product_name},
                    "price": price_value,
                    "quantity": quantity if quantity else 1,
                    "unit_price": unit_price
                })
        
            except Exception as e:
                print(f"⚠️ Error: {e}")
                
        if extracted_products:
            best_product = min(extracted_products, key=lambda x: x["unit_price"])

            print(f"\n✅ Selected: {best_product}")

            return {
                "platform": "bigbasket",
                "product_name": best_product["name"],
                "price": best_product["price"],
                "qty": best_product["quantity"],
                "delivery": 20,
                "eta": 15
            }

        print("❌ No valid products found bb")
        return {}
    
async def main():
    print("\n🚀 Testing BigBasket Scraper...\n")

    # You can change this or keep input
    product = input("Enter product (default: milk): ").strip()
    if not product:
        product = "milk"

    print(f"\nSearching for: {product}")

    try:
        result = await scrape_bigbasket(product)

        print("\n============================")
        print("📊 FINAL RESULT")
        print("============================")

        if result:
            print(f"Platform   : {result.get('platform')}")
            print(f"Product    : {result.get('product_name')}")
            print(f"Price      : ₹{result.get('price')}")
            print(f"Quantity   : {result.get('qty')}")
            print(f"Delivery   : ₹{result.get('delivery')}")
            print(f"ETA        : {result.get('eta')} mins")
        else:
            print("❌ No result returned bb")

    except Exception as e:
        print(f"ERROR in main(): {e}")


# ▶️ RUN SCRIPT
if __name__ == "__main__":
    asyncio.run(main())