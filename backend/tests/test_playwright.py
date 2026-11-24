"""
Playwright Environment Test
Verifies that Playwright Chromium browser binary is properly installed and runnable.
"""
import asyncio
import sys
import os

from playwright.async_api import async_playwright


async def test_playwright_launch():
    print("[TEST] Launching Playwright Chromium in headless mode...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_content("<h1>Playwright OK</h1>")
        h1_text = await page.inner_text("h1")
        assert h1_text == "Playwright OK", f"Unexpected content: {h1_text}"
        await browser.close()
    print(" [OK] Playwright Chromium launched and rendered successfully!")


if __name__ == "__main__":
    asyncio.run(test_playwright_launch())
