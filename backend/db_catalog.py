"""
BuyWise MongoDB Central Catalog & Cache Connector
Provides dynamic retrieval of canonical products, variants, and cache-warming targets
directly from MongoDB with automatic in-memory fallback.
"""
import os
import sys
import datetime
from typing import List, Dict, Any, Optional, Tuple

try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False

try:
    from items_catalog_defaults import (
        DEFAULT_VERY_FREQUENT_ITEMS,
        DEFAULT_MODERATE_ITEMS,
        DEFAULT_VERY_FREQUENT_TTL,
        DEFAULT_MODERATE_TTL,
        DEFAULT_TTL,
    )
except ImportError:
    DEFAULT_VERY_FREQUENT_TTL = 120
    DEFAULT_MODERATE_TTL = 300
    DEFAULT_TTL = 300
    DEFAULT_VERY_FREQUENT_ITEMS = [
        "milk", "bread", "eggs", "butter", "curd", "paneer", "cheese",
        "onion", "potato", "tomato", "banana", "apple", "lemon", "ginger",
        "garlic", "coriander", "green chilli", "cucumber", "carrot", "spinach"
    ]
    DEFAULT_MODERATE_ITEMS = [
        "tea", "coffee", "sugar", "salt", "atta", "rice", "oil", "ghee",
        "maggi", "biscuits", "chips", "dal", "shampoo", "soap", "toothpaste"
    ]

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/buywise")
DB_NAME = "buywise"

# In-memory LRU-style cache for fast tier/TTL lookups to avoid hammering MongoDB on hot paths
_TIER_CACHE = {}


def get_mongo_db(timeout_ms: int = 1500):
    """Safely connects to MongoDB and returns database instance or None."""
    if not PYMONGO_AVAILABLE:
        return None
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=timeout_ms)
        client.admin.command("ping")
        return client[DB_NAME]
    except Exception:
        return None


def get_dynamic_cache_warm_targets() -> Dict[str, Any]:
    """
    Central MongoDB Cache Target Resolver.
    Fetches active cache warming targets from the 'cache_warm_targets' collection.
    If empty, discovers active products from 'product_catalog'.
    Falls back gracefully to static defaults if MongoDB is offline.
    """
    db = get_mongo_db()
    if db is not None:
        try:
            # 1. Primary: Read from cache_warm_targets collection
            targets = list(db["cache_warm_targets"].find({"enabled": True}).sort("priority", 1))
            if targets:
                tier_1 = [t["search_term"] for t in targets if t.get("priority") == 1]
                tier_2 = [t["search_term"] for t in targets if t.get("priority") != 1]
                return {
                    "very_frequent": tier_1 if tier_1 else DEFAULT_VERY_FREQUENT_ITEMS,
                    "moderate": tier_2 if tier_2 else DEFAULT_MODERATE_ITEMS,
                    "source": "mongodb:cache_warm_targets",
                    "total_targets": len(targets)
                }

            # 2. Secondary: If cache_warm_targets is empty, read directly from product_catalog
            products = list(db["product_catalog"].find({}, {"generic_name": 1, "velocity_tier": 1, "brand": 1, "search_keywords": 1}))
            if products:
                tier_1 = []
                tier_2 = []
                for p in products:
                    name = p.get("generic_name", "").lower()
                    tier = p.get("velocity_tier", "moderate")
                    if tier in ["high", "very_frequent"]:
                        if name and name not in tier_1:
                            tier_1.append(name)
                    else:
                        if name and name not in tier_2:
                            tier_2.append(name)
                return {
                    "very_frequent": tier_1 if tier_1 else DEFAULT_VERY_FREQUENT_ITEMS,
                    "moderate": tier_2 if tier_2 else DEFAULT_MODERATE_ITEMS,
                    "source": "mongodb:product_catalog",
                    "total_targets": len(products)
                }
        except Exception:
            pass

    # 3. Fallback: Static defaults
    return {
        "very_frequent": DEFAULT_VERY_FREQUENT_ITEMS,
        "moderate": DEFAULT_MODERATE_ITEMS,
        "source": "fallback:catalog_defaults",
        "total_targets": len(DEFAULT_VERY_FREQUENT_ITEMS) + len(DEFAULT_MODERATE_ITEMS)
    }


def update_warm_target_timestamp(search_term: str):
    """Updates the last_warmed_at timestamp in MongoDB after a successful warm pass."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        norm = search_term.lower().strip()
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        # 1. Update cache_warm_targets collection
        db["cache_warm_targets"].update_one(
            {"search_term": norm},
            {"$set": {"last_warmed_at": now_utc}, "$inc": {"warm_count": 1}},
            upsert=False
        )
        # 2. Update product_catalog collection
        db["product_catalog"].update_many(
            {"$or": [
                {"generic_name": norm},
                {"search_keywords": norm}
            ]},
            {"$set": {"last_warmed_at": now_utc}}
        )
    except Exception:
        pass


def get_item_tier_and_ttl_from_db(query: str) -> Tuple[str, int]:
    """
    Central lookup: looks up MongoDB product_catalog and cache_warm_targets
    for velocity_tier and refresh_ttl_seconds.
    Uses memory cache to stay instantaneous.
    """
    norm_query = query.lower().strip()
    if norm_query in _TIER_CACHE:
        return _TIER_CACHE[norm_query]

    db = get_mongo_db()
    if db is not None:
        try:
            # Check cache_warm_targets first
            target = db["cache_warm_targets"].find_one({"search_term": norm_query, "enabled": True})
            if target:
                prio = target.get("priority", 1)
                tier = "very_frequent" if prio == 1 else "moderate"
                ttl = DEFAULT_VERY_FREQUENT_TTL if prio == 1 else DEFAULT_MODERATE_TTL
                _TIER_CACHE[norm_query] = (tier, ttl)
                return tier, ttl

            # Check product_catalog
            prod = db["product_catalog"].find_one({
                "$or": [
                    {"generic_name": norm_query},
                    {"search_keywords": norm_query},
                    {"brand": norm_query}
                ]
            })
            if prod:
                raw_tier = prod.get("velocity_tier", "moderate")
                tier = "very_frequent" if raw_tier in ["high", "very_frequent"] else "moderate"
                ttl = prod.get("refresh_ttl_seconds", DEFAULT_VERY_FREQUENT_TTL if tier == "very_frequent" else DEFAULT_MODERATE_TTL)
                _TIER_CACHE[norm_query] = (tier, ttl)
                return tier, ttl
        except Exception:
            pass

    # Default matching
    for item in DEFAULT_VERY_FREQUENT_ITEMS:
        if norm_query == item or item in norm_query.split():
            res = ("very_frequent", DEFAULT_VERY_FREQUENT_TTL)
            _TIER_CACHE[norm_query] = res
            return res

    for item in DEFAULT_MODERATE_ITEMS:
        if norm_query == item or item in norm_query.split():
            res = ("moderate", DEFAULT_MODERATE_TTL)
            _TIER_CACHE[norm_query] = res
            return res

    res = ("dynamic", DEFAULT_TTL)
    _TIER_CACHE[norm_query] = res
    return res


def find_canonical_product(query: str) -> Optional[Dict[str, Any]]:
    """Looks up a canonical product and its variants from MongoDB."""
    db = get_mongo_db()
    if db is None:
        return None

    norm_query = query.lower().strip()
    try:
        prod = db["product_catalog"].find_one({"search_keywords": norm_query})
        if prod:
            return prod

        words = norm_query.split()
        for w in words:
            prod = db["product_catalog"].find_one({
                "$or": [
                    {"brand": {"$regex": f"^{w}$", "$options": "i"}},
                    {"generic_name": {"$regex": f"^{w}$", "$options": "i"}}
                ]
            })
            if prod:
                return prod
    except Exception:
        pass

    return None
