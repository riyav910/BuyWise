"""
Platform Configuration Layer for BuyWise
Configurable fee structures (delivery, handling, free delivery threshold, min order value).
All monetary rules are stored as Decimals to prevent floating-point inaccuracies.
"""

from decimal import Decimal
from typing import Dict, Any, Tuple, Optional

PLATFORM_CONFIG: Dict[str, Dict[str, Any]] = {
    "blinkit": {
        "delivery_fee": Decimal("16.00"),
        "handling_fee": Decimal("4.00"),
        "free_delivery_threshold": Decimal("199.00"),
        "min_order_value": Decimal("0.00"),
    },
    "zepto": {
        "delivery_fee": Decimal("15.00"),
        "handling_fee": Decimal("4.00"),
        "free_delivery_threshold": Decimal("199.00"),
        "min_order_value": Decimal("0.00"),
    },
    "bigbasket": {
        "delivery_fee": Decimal("25.00"),
        "handling_fee": Decimal("0.00"),
        "free_delivery_threshold": Decimal("499.00"),
        "min_order_value": Decimal("0.00"),
    },
    "jiomart": {
        "delivery_fee": Decimal("29.00"),
        "handling_fee": Decimal("0.00"),
        "free_delivery_threshold": Decimal("250.00"),
        "min_order_value": Decimal("0.00"),
    },
    "instamart": {
        "delivery_fee": Decimal("16.00"),
        "handling_fee": Decimal("5.00"),
        "free_delivery_threshold": Decimal("199.00"),
        "min_order_value": Decimal("0.00"),
    },
}

DEFAULT_PLATFORM_CONFIG: Dict[str, Any] = {
    "delivery_fee": Decimal("20.00"),
    "handling_fee": Decimal("0.00"),
    "free_delivery_threshold": None,
    "min_order_value": Decimal("0.00"),
}


def get_platform_config(platform: str) -> Dict[str, Any]:
    key = (platform or "").lower().strip()
    return PLATFORM_CONFIG.get(key, DEFAULT_PLATFORM_CONFIG)


def calculate_platform_fees(
    platform: str,
    subtotal: Decimal
) -> Tuple[Decimal, Decimal, bool, Optional[Decimal]]:
    """
    Returns:
      (delivery_fee, handling_fee, free_delivery_applied, amount_needed_for_free_delivery)
    """
    cfg = get_platform_config(platform)
    delivery_fee = cfg["delivery_fee"]
    handling_fee = cfg["handling_fee"]
    threshold = cfg.get("free_delivery_threshold")

    free_applied = False
    amount_needed: Optional[Decimal] = None

    if threshold is not None:
        if subtotal >= threshold:
            delivery_fee = Decimal("0.00")
            free_applied = True
            amount_needed = Decimal("0.00")
        else:
            amount_needed = threshold - subtotal

    return delivery_fee, handling_fee, free_applied, amount_needed
