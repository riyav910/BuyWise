import asyncio

async def launch_stealth_browser(p, headless=True):
    """
    Launches Chromium with anti-bot stealth parameters to prevent
    quick-commerce sites (Blinkit, BigBasket, Zepto) from showing
    'Access Denied', 'Error Page', or 'Please login' in headless mode.
    """
    args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-infobars",
    ]
    if headless:
        args.append("--headless=new")

    browser = await p.chromium.launch(
        headless=headless,
        args=args
    )

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        viewport={"width": 1366, "height": 768},
        locale="en-IN",
        timezone_id="Asia/Kolkata",
        geolocation={"latitude": 12.9716, "longitude": 77.5946},
        permissions=["geolocation"],
        extra_http_headers={
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
        }
    )

    page = await context.new_page()

    await page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });
        window.chrome = { runtime: {} };
    """)

    return browser, context, page
