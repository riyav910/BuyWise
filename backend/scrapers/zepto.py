import asyncio
import json
import re
from playwright.async_api import async_playwright

# ─────────────────────────────────────────
# CONFIG — update API_KEYWORDS once you find the real endpoint
# ─────────────────────────────────────────
API_KEYWORDS = [
    "search", "listing", "products", "catalog",
    "store", "items", "query", "browse"
]

DISCOVERY_MODE = True   # Set False once you know the correct endpoint
TARGET_URL_FRAGMENT = ""  # e.g. "search/v2" — fill this after discovery


# ─────────────────────────────────────────
# UTILITY
# ─────────────────────────────────────────
def extract_quantity(text: str):
    """Extract quantity in ml/g (normalized). Returns int or None."""
    text = text.lower()
    match = re.search(r"(\d+(?:\.\d+)?)\s?(ml|l|g|kg|litre|liter|ltr)", text)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2)
    if unit in ("l", "litre", "liter", "ltr"):
        value *= 1000
    elif unit == "kg":
        value *= 1000
    return int(value)


def safe_price(raw) -> float:
    """Convert raw price (could be paise int or rupee float) to rupees."""
    if raw is None:
        return 0.0
    raw = float(raw)
    # Zepto commonly sends price in paise (e.g. 5500 = ₹55)
    return raw / 100 if raw > 500 else raw


def deep_search_products(obj, found=None):
    """
    Recursively walk any JSON object to find a list that looks like products.
    Returns the first list where items have 'name' and some price field.
    """
    if found is None:
        found = []
    if isinstance(obj, list):
        if obj and isinstance(obj[0], dict):
            keys = obj[0].keys()
            if any(k in keys for k in ("name", "title", "product_name")):
                found.extend(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            deep_search_products(v, found)
    return found


# ─────────────────────────────────────────
# RESPONSE HANDLER
# ─────────────────────────────────────────
async def handle_response(response, products_data: list, seen_urls: set):
    url = response.url

    # Only care about JSON responses
    content_type = response.headers.get("content-type", "")
    if "json" not in content_type:
        return

    # Skip already-processed URLs
    if url in seen_urls:
        return
    seen_urls.add(url)

    # Filter to likely API calls
    if not any(kw in url.lower() for kw in API_KEYWORDS):
        return

    try:
        data = await response.json()
    except Exception:
        return

    if DISCOVERY_MODE:
        print(f"\n{'='*60}")
        print(f"📡 API HIT: {url}")
        # Print top-level keys to help identify structure
        if isinstance(data, dict):
            print(f"   Top-level keys: {list(data.keys())}")
            for k, v in data.items():
                if isinstance(v, list):
                    print(f"   └─ '{k}' is a list of {len(v)} items")
                    if v and isinstance(v[0], dict):
                        print(f"      Sample keys: {list(v[0].keys())[:10]}")
                elif isinstance(v, dict):
                    print(f"   └─ '{k}' is a dict with keys: {list(v.keys())[:8]}")
        print(f"{'='*60}")

    # ── Extract products (deep search handles any nesting) ──
    raw_products = deep_search_products(data)

    if not raw_products:
        return

    print(f"✅ Found {len(raw_products)} product entries in: {url}")

    for item in raw_products:
        try:
            # Name
            name = (
                item.get("name") or
                item.get("title") or
                item.get("product_name") or
                item.get("productName") or ""
            )
            if not name or len(name) < 5:
                continue
            
            if any(x in name.lower() for x in [
                "dairy", "bread & eggs", "combo", "category", "shop", "collection"
            ]):
                continue

            # Product ID / SKU
            product_id = (
                item.get("id") or
                item.get("product_id") or
                item.get("sku") or
                item.get("skuId") or
                item.get("zpid") or ""
            )

            # Price (MRP)
            mrp_raw = (
                item.get("mrp") or
                item.get("MRP") or
                item.get("original_price") or
                item.get("maxRetailPrice") or
                item.get("price") or 0
            )
            mrp = safe_price(mrp_raw)

            # Selling price
            selling_raw = (
                item.get("price") or
                item.get("selling_price") or
                item.get("sellingPrice") or
                item.get("discounted_price") or
                mrp_raw
            )
            selling_price = safe_price(selling_raw)
            
            # skip fake/invalid prices
            if selling_price <= 5:
                continue
            
            if not selling_price or selling_price == 0:
                continue

            # Discount %
            discount_pct = item.get("discount") or item.get("discount_percent") or 0
            if not discount_pct and mrp and selling_price and mrp > selling_price:
                discount_pct = round((mrp - selling_price) / mrp * 100, 1)

            # Quantity
            quantity = extract_quantity(name)
            if not quantity:
                # Some APIs expose quantity separately
                qty_sources = [
                    str(item.get("quantity", "")),
                    str(item.get("weight", "")),
                    str(item.get("unit", "")),
                    str(item.get("unitOfMeasure", "")),
                    str(item.get("display_name", "")),
                ]

                for src in qty_sources:
                    quantity = extract_quantity(src)
                    if quantity:
                        break

            # Unit price (per ml or per g)
            unit_price = round(selling_price / quantity, 4) if quantity else None

            products_data.append({
                "product_id": product_id,
                "name": name,
                "mrp": mrp,
                "selling_price": selling_price,
                "discount_percent": discount_pct,
                "quantity": quantity,
                "unit_price": unit_price,
            })

        except Exception as e:
            print(f"  ⚠️  Row error: {e}")


# ─────────────────────────────────────────
# MAIN SCRAPER
# ─────────────────────────────────────────
async def scrape_zepto(product_name: str) -> dict:
    print(f"\n🔍 Scraping Zepto for: '{product_name}'")
    products_data = []
    seen_urls = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        # Attach response interceptor
        page.on(
            "response",
            lambda r: asyncio.ensure_future(
                handle_response(r, products_data, seen_urls)
            ),
        )

        url = f"https://www.zepto.com/search?query={product_name}"
        print(f"🌐 Navigating to: {url}")

        try:
            await page.goto(url, timeout=60000, wait_until="networkidle")
        except Exception:
            # networkidle can time out on heavy SPAs — that's okay
            pass

        # Extra wait so lazy-loaded API calls fire
        await asyncio.sleep(6)

        # Scroll to trigger more results
        await page.evaluate("window.scrollBy(0, 1500)")
        await asyncio.sleep(3)

        await browser.close()

    # ── Post-process ──
    if not products_data:
        print("❌ No products captured. Run in DISCOVERY_MODE=True to debug.")
        return {}

    # Deduplicate by product_id if available
    seen_ids = set()
    unique = []
    for p in products_data:
        pid = p["product_id"]
        key = pid if pid else p["name"]
        if key not in seen_ids:
            seen_ids.add(key)
            unique.append(p)

    print(f"\n📦 Total unique products: {len(unique)}")

    # Best value = lowest unit price (skip items with no quantity)
    with_qty = [p for p in unique if p["unit_price"] is not None]
    if not with_qty:
        print("⚠️  Could not compute unit price — no quantity info found in names.")
        best = min(unique, key=lambda x: x["selling_price"])
    else:
        best = min(with_qty, key=lambda x: x["unit_price"])

    print(f"\n🏆 BEST VALUE: {best['name']}")
    print(f"   SKU         : {best['product_id']}")
    print(f"   MRP         : ₹{best['mrp']}")
    print(f"   Selling     : ₹{best['selling_price']}")
    print(f"   Discount    : {best['discount_percent']}%")
    print(f"   Quantity    : {best['quantity']} ml/g")
    print(f"   Unit Price  : ₹{best['unit_price']} per ml/g")

    return {
        "platform": "zepto",
        "product_id": best["product_id"],
        "product_name": best["name"],
        "mrp": best["mrp"],
        "price": best["selling_price"],
        "discount_percent": best["discount_percent"],
        "quantity": best["quantity"],
        "unit_price": best["unit_price"],
        "delivery": 25,
        "eta": 10,
        "all_products": unique,   # full list if you need it
    }


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