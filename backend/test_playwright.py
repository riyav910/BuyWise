# test_playwright.py
from playwright.async_api import async_playwright
import asyncio

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        print("✅ Browser launched successfully")
        await browser.close()

asyncio.run(test())