import asyncio
from playwright.async_api import async_playwright
import re


def extract_quantity(text):

    if not text:
        return None

    text = text.lower()

    match = re.search(
        r"(\d+(?:\.\d+)?)\s?(ml|l|g|kg)",
        text
    )

    if not match:
        return None

    value = float(match.group(1))
    unit = match.group(2)

    if unit == "l":
        value *= 1000

    elif unit == "kg":
        value *= 1000

    return value


async def scrape_blinkit(product_name, headless=True):

    async with async_playwright() as p:

        browser = await p.chromium.launch(
            headless=headless
        )

        page = await browser.new_page()

        try:

            await page.goto(
                f"https://blinkit.com/s/?q={product_name}",
                wait_until="domcontentloaded",
                timeout=60000
            )

            await page.wait_for_selector(
                "text=₹",
                timeout=20000
            )

            await asyncio.sleep(3)

            price_elements = await page.query_selector_all(
                "text=₹"
            )

            extracted_products = []

            for price_el in price_elements[:25]:

                try:

                    price_text = await price_el.inner_text()

                    price_value = float(
                        re.sub(
                            r"[^\d.]",
                            "",
                            price_text
                        )
                    )

                    parent = await price_el.evaluate_handle(
                        """el => {
                            let node = el;

                            for (let i = 0; i < 6; i++) {

                                if (!node)
                                    break;

                                if (
                                    node.innerText &&
                                    node.innerText.length > 50
                                )
                                    return node;

                                node = node.parentElement;
                            }

                            return el.parentElement;
                        }"""
                    )

                    parent_text = await parent.inner_text()

                    if (
                        product_name.lower()
                        not in parent_text.lower()
                    ):
                        continue

                    lines = [
                        l.strip()
                        for l in parent_text.split("\n")
                        if l.strip()
                    ]

                    name = None
                    quantity = None

                    for line in lines:

                        qty = extract_quantity(line)

                        if qty:
                            quantity = qty

                        if (
                            len(line) > 5
                            and "₹" not in line
                            and not re.search(
                                r"\d+\s?(ml|l|g|kg)",
                                line.lower()
                            )
                            and not any(
                                x in line.lower()
                                for x in [
                                    "add",
                                    "mins",
                                    "off",
                                    "%"
                                ]
                            )
                        ):
                            name = line

                    if not name or not quantity:
                        continue

                    unit_price = (
                        price_value / quantity
                    )

                    extracted_products.append({
                        "name": name,
                        "price": price_value,
                        "quantity": quantity,
                        "unit_price": unit_price
                    })

                except Exception:
                    continue

            if extracted_products:

                best_product = min(
                    extracted_products,
                    key=lambda x: x["unit_price"]
                )

                return {
                    "platform": "blinkit",
                    "product_name": best_product["name"],
                    "price": best_product["price"],
                    "qty": best_product["quantity"],
                    "unit_price": best_product["unit_price"],
                    "delivery": 10,
                    "eta": 10,
                    "all_products": extracted_products
                }

            return {}

        finally:
            await browser.close()


async def main():

    product = (
        input("\n  Product (default: milk): ")
        .strip()
        or "milk"
    )

    print("\n╭────────────────────────────────────────────╮")
    print("│                BLINKIT                    │")
    print("╰────────────────────────────────────────────╯")

    print(f"\n  Searching : {product}")

    try:

        result = await scrape_blinkit(product)

        print()

        if not result:

            print("  ✗ No valid products found")
            print()

            return

        products = result.get(
            "all_products",
            []
        )

        print(
            f"  ✓ Products found : {len(products)}"
        )

        print("\n  BEST MATCH")
        print("  ──────────────────────────────────────────")

        print(
            f"  {result['product_name']}"
        )

        print(
            f"  ₹{result['price']:.0f}  •  "
            f"{result['qty']}  •  "
            f"₹{result['unit_price']:.4f}/unit"
        )

        print("\n  DETAILS")
        print("  ──────────────────────────────────────────")

        print(
            f"  Delivery : ₹{result['delivery']}"
        )

        print(
            f"  ETA      : {result['eta']} mins"
        )

        print()

    except Exception as e:

        print("\n  ✗ Scraper error")
        print(f"    {str(e)}")
        print()


if __name__ == "__main__":
    asyncio.run(main())