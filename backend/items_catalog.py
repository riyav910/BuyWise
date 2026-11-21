"""
BuyWise Central Item Catalog Configuration
Routes velocity tier and TTL lookups directly to MongoDB with in-memory fallback.
"""
from db_catalog import (
    get_item_tier_and_ttl_from_db,
    get_dynamic_cache_warm_targets,
    DEFAULT_VERY_FREQUENT_ITEMS,
    DEFAULT_MODERATE_ITEMS,
    DEFAULT_VERY_FREQUENT_TTL,
    DEFAULT_MODERATE_TTL,
    DEFAULT_TTL,
)

VERY_FREQUENT_TTL = DEFAULT_VERY_FREQUENT_TTL
MODERATE_TTL = DEFAULT_MODERATE_TTL
VERY_FREQUENT_ITEMS = DEFAULT_VERY_FREQUENT_ITEMS
MODERATE_ITEMS = DEFAULT_MODERATE_ITEMS


def get_item_tier_and_ttl(query: str):
    """
    Central lookup: Matches query against MongoDB catalog and cache targets,
    returning (tier_name, ttl_seconds).
    """
    return get_item_tier_and_ttl_from_db(query)
