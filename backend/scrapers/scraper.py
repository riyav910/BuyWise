import asyncio
from playwright.async_api import async_playwright


async def scrape_product(product_name):
    print(f"\n🕸️ [SCRAPER] Starting for: {product_name}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )

        page = await browser.new_page()

        url = f"https://www.bigbasket.com/ps/?q={product_name}"
        await page.goto(url, wait_until="domcontentloaded")

        await page.wait_for_timeout(3000)  # safer than selector wait

        # 🟢 TRY MULTIPLE PRICE SELECTORS
        price_text = None

        selectors = [
            "span.Pricing___StyledLabel-sc-pldi2d-1",
            "span.Label-sc-15v1nk5-0",
            "span[class*='Pricing']",
            "text=₹"
        ]

        for sel in selectors:
            try:
                el = await page.query_selector(sel)
                if el:
                    price_text = await el.inner_text()
                    if "₹" in price_text:
                        break
            except:
                continue

        # fallback
        if not price_text:
            price_text = "₹50"

        print(f"💰 Raw price: {price_text}")

        # extract number
        digits = ''.join(c for c in price_text if c.isdigit())
        price_value = int(digits) if digits else 50

        await browser.close()

        return {
            "bigbasket": {
                "price": price_value,
                "delivery": 30,
                "eta": 20
            }
        }