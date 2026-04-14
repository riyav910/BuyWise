from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
from redis_client import r
from scrapers.bigbasket import scrape_bigbasket
from scrapers.zepto import scrape_zepto
from compare import compare_products

import sys
import asyncio

# Windows fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

app = FastAPI()

# =========================
# 🧠 SIMPLE IN-MEMORY DB
# =========================
users_db = {}

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# REQUEST MODEL
# =========================
class ItemRequest(BaseModel):
    items: list[str]

# =========================
# CACHE FUNCTIONS
# =========================
def get_cached_product(product_name):
    data = r.get(product_name)
    if data:
        return json.loads(data)
    return None


def set_cache(product_name, data):
    r.setex(product_name, 300, json.dumps(data))

# =========================
# SCRAPER LOGIC
# =========================
async def fetch_product_data(product_name):
    product_name = product_name.lower()

    cached = get_cached_product(product_name)
    if cached:
        return cached

    try:
        data = await scrape_bigbasket(product_name)
        if not data:
            raise Exception("Empty scrape result")

    except Exception:
        data = {
            "bigbasket": {"price": 60, "delivery": 20, "eta": 10},
            "zepto": {"price": 55, "delivery": 25, "eta": 15}
        }

    set_cache(product_name, data)
    return data

# =========================
# SIGNUP API
# =========================
@app.post("/signup")
def signup(data: dict):
    name = data.get("name")
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if email in users_db:
        return {
            "status": "failed",
            "message": "User already exists"
        }

    users_db[email] = {
        "name": name,
        "email": email,
        "password": password
    }

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "name": name,
            "email": email
        }
    }

# =========================
# LOGIN API
# =========================
@app.post("/login")
def login(data: dict):
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    user = users_db.get(email)

    if not user:
        return {
            "status": "failed",
            "message": "User not found"
        }

    if user["password"] != password:
        return {
            "status": "failed",
            "message": "Invalid credentials"
        }

    return {
        "status": "success",
        "user": {
            "name": user["name"],
            "email": user["email"]
        }
    }

# =========================
# COMPARE API
# =========================
@app.post("/compare")
async def compare_prices(request: ItemRequest):
    try:
        results = []

        for item in request.items:
            bb = await scrape_bigbasket(item)
            zp = await scrape_zepto(item)

            results.append(bb)
            results.append(zp)

        final = compare_products(results)
        return final

    except Exception as e:
        return {"error": str(e)}