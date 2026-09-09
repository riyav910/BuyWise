import asyncio
import sys
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from ocr_endpoint import router as ocr_router
from scraper_service import r, fetch_product_data
from compare import compare_products, optimize_cart_inr

app = FastAPI()

app.include_router(ocr_router)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

try:
    print("Redis ping:", r.ping())
except Exception as e:
    print("Redis connection failed:", e)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional

# Request model
class ItemRequest(BaseModel):
    items: list[str]
    required_quantity: Optional[float] = None
    required_unit: Optional[str] = None



#=========================
# USER AUTHENTICATION
#=========================
users_db = {}


@app.post("/signup")
def signup(data: dict):
    name = data.get("name")
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return {"status": "failed", "message": "Email and password are required"}

    if email in users_db:
        return {"status": "failed", "message": "User already exists"}

    users_db[email] = {
        "name": name or email.split("@")[0],
        "email": email,
        "password": password,
    }

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "name": users_db[email]["name"],
            "email": email,
        },
    }


@app.post("/login")
def login(data: dict):
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    user = users_db.get(email)

    if not user:
        return {"status": "failed", "message": "User not found"}

    if user["password"] != password:
        return {"status": "failed", "message": "Invalid credentials"}

    return {
        "status": "success",
        "user": {
            "name": user["name"],
            "email": user["email"],
        },
    }


# =========================
# MAIN API
# =========================

@app.post("/compare")
async def compare_prices(request: ItemRequest):
    try:
        results = []

        for item in request.items:
            cleaned_item = item.lower().strip()
            if not cleaned_item:
                continue

            print(f"\nProcessing: {cleaned_item}")

            # 1. Record search/order query in Redis ZSET
            try:
                r.zadd("recent_queries", {cleaned_item: time.time()})
                r.zremrangebyrank("recent_queries", 0, -101)  # Limit to 100 items
            except Exception as e:
                print(f"Redis ZSET log error: {e}")

            # 2. Fetch product data (runs parallel scrapers, using cache if hit)
            data = await fetch_product_data(cleaned_item, bypass_cache=False, headless=False)

            if data:
                results.extend(data)
                
        if not results:
            return {"message": "No data found"}

        final = compare_products(
            results,
            required_quantity=request.required_quantity,
            required_unit=request.required_unit,
        )
        
        # Calculate optimized cart values in INR
        optimized = optimize_cart_inr(results, request.items)
        final["optimized"] = optimized


        return final

    except Exception as e:
        print(f"API ERROR: {e}")
        return {"error": str(e)}
