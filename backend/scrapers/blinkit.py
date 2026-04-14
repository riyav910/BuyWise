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

    if unit == "l":
        value *= 1000
    elif unit == "kg":
        value *= 1000

    return value


async def scrape_blinkit(product_name):
    print(f"\n[BLINKIT] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print(" Opening Blinkit...")

        await page.goto(f"https://blinkit.com/s/?q={product_name}")

        print(" Waiting for products...")

        await page.wait_for_selector("text=₹", timeout=20000)
        await asyncio.sleep(3)

        print(" Finding price elements...")

        price_elements = await page.query_selector_all("text=₹")

        print(f"Found {len(price_elements)} price elements")

        extracted_products = []

        for price_el in price_elements[:25]:
            try:
                price_text = await price_el.inner_text()
                price_value = float(re.sub(r"[^\d.]", "", price_text))

                #  climb up to product card
                parent = await price_el.evaluate_handle(
                    """el => {
                        let node = el;
                        for (let i = 0; i < 6; i++) {
                            if (!node) break;
                            if (node.innerText && node.innerText.length > 50) return node;
                            node = node.parentElement;
                        }
                        return el.parentElement;
                    }"""
                )

                parent_text = await parent.inner_text()

                if product_name.lower() not in parent_text.lower():
                    continue

                lines = [l.strip() for l in parent_text.split("\n") if l.strip()]

                name = None
                quantity = None

                for line in lines:
                    # quantity detection
                    qty = extract_quantity(line)
                    if qty:
                        quantity = qty

                    # name detection
                    if (
                        len(line) > 5 and
                        "₹" not in line and
                        not re.search(r"\d+\s?(ml|l|g|kg)", line.lower()) and
                        not any(x in line.lower() for x in ["add", "mins", "off", "%"])
                    ):
                        name = line

                if not name or not quantity:
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
                print(f" Error: {e}")

        await browser.close()

        if extracted_products:
            best_product = min(extracted_products, key=lambda x: x["unit_price"])

            print(f"\nSelected: {best_product}")

            return {
                "platform": "blinkit",
                "product_name": best_product["name"],
                "price": best_product["price"],
                "qty": best_product["quantity"],
                "delivery": 10,
                "eta": 10
            }

        print("❌ No valid products found")
        return {}
    
async def main():
    print("\n🚀 Testing Blinkit Scraper...\n")

    # You can change this or keep input
    product = input("Enter product (default: milk): ").strip()
    if not product:
        product = "milk"

    print(f"\nSearching for: {product}")

    try:
        result = await scrape_blinkit(product)

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
            print("No result returned")

    except Exception as e:
        print(f"ERROR in main(): {e}")


# RUN SCRIPT
if __name__ == "__main__":
    asyncio.run(main())