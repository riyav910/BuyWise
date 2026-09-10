import re
from typing import Optional, Dict, Any


# Standard reference units per dimension
DIMENSION_BASE_UNITS = {
    "volume": "ml",
    "weight": "g",
    "count": "piece"
}

DIMENSION_STANDARD_UNITS = {
    "volume": "L",
    "weight": "kg",
    "count": "piece"
}

# Unit alias maps
VOLUME_UNITS = {
    "ml": 1.0,
    "millilitre": 1.0,
    "milliliter": 1.0,
    "l": 1000.0,
    "ltr": 1000.0,
    "litre": 1000.0,
    "liter": 1000.0,
}

WEIGHT_UNITS = {
    "g": 1.0,
    "gm": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "kilo": 1000.0,
    "kilogram": 1000.0,
    "kilograms": 1000.0,
}

COUNT_UNITS = {
    "piece": 1.0,
    "pieces": 1.0,
    "pc": 1.0,
    "pcs": 1.0,
    "unit": 1.0,
    "units": 1.0,
    "pack": 1.0,
    "packs": 1.0,
    "egg": 1.0,
    "eggs": 1.0,
}


def normalize_unit_str(unit_raw: str) -> tuple[Optional[str], Optional[str], float]:
    """
    Returns (dimension, canonical_unit, multiplier_to_base_unit)
    """
    u = unit_raw.lower().strip()
    if u in VOLUME_UNITS:
        canonical = "L" if VOLUME_UNITS[u] == 1000.0 else "ml"
        return "volume", canonical, VOLUME_UNITS[u]
    if u in WEIGHT_UNITS:
        canonical = "kg" if WEIGHT_UNITS[u] == 1000.0 else "g"
        return "weight", canonical, WEIGHT_UNITS[u]
    if u in COUNT_UNITS:
        return "count", "piece", 1.0
    return None, None, 1.0


def parse_and_normalize_quantity(text: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Extracts quantity, unit, and converts to base normalized units (ml, g, or piece).
    Handles decimal values, spaces, and multipacks (e.g. '2 x 500 ml', '6 x 200ml', '3 × 1 L').
    Never guesses units: returns None if text lacks unambiguous quantity and unit.
    """
    if not text or not isinstance(text, str):
        return None

    cleaned = text.lower().replace("×", "x").strip()

    # 1. Check for multipack with unit: e.g. "2 x 500 ml", "6 x 200g", "3 x 1.5 L"
    multipack_pattern = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|liter|g|gm|gram|grams|kg|kilo|kilogram|pcs?|pieces?|units?|packs?|eggs?)\b",
        cleaned
    )
    if multipack_pattern:
        count = float(multipack_pattern.group(1))
        per_pack_qty = float(multipack_pattern.group(2))
        unit_raw = multipack_pattern.group(3)

        dimension, canonical_unit, mult = normalize_unit_str(unit_raw)
        if dimension:
            total_base_qty = count * per_pack_qty * mult
            orig_pack_display = f"{int(count) if count.is_integer() else count} x {int(per_pack_qty) if per_pack_qty.is_integer() else per_pack_qty} {canonical_unit}"
            return {
                "quantity": per_pack_qty,
                "unit": canonical_unit,
                "package_display": orig_pack_display,
                "normalized_quantity": total_base_qty,
                "normalized_unit": DIMENSION_BASE_UNITS[dimension],
                "dimension": dimension,
                "is_multipack": True,
                "multipack_count": int(count) if count.is_integer() else count,
            }

    # 2. Check for "pack of X" with separate unit: e.g. "pack of 2 - 500 ml" or "pack of 6 eggs"
    pack_of_pattern = re.search(r"pack\s+of\s+(\d+)", cleaned)
    pack_count = int(pack_of_pattern.group(1)) if pack_of_pattern else None

    # 3. Check for standard quantity + unit: e.g. "500 ml", "1.5 L", "0.75 kg", "500g", "12 pcs"
    single_pattern = re.search(
        r"(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|liter|g|gm|gram|grams|kg|kilo|kilogram|pcs?|pieces?|units?|eggs?)\b",
        cleaned
    )
    if single_pattern:
        qty_val = float(single_pattern.group(1))
        unit_raw = single_pattern.group(2)
        dimension, canonical_unit, mult = normalize_unit_str(unit_raw)

        if dimension:
            multiplier = pack_count if pack_count and pack_count > 1 else 1.0
            total_base_qty = qty_val * mult * multiplier
            display_qty = int(qty_val) if qty_val.is_integer() else qty_val
            pack_disp = f"Pack of {pack_count} x {display_qty} {canonical_unit}" if multiplier > 1 else f"{display_qty} {canonical_unit}"

            return {
                "quantity": qty_val,
                "unit": canonical_unit,
                "package_display": pack_disp,
                "normalized_quantity": total_base_qty,
                "normalized_unit": DIMENSION_BASE_UNITS[dimension],
                "dimension": dimension,
                "is_multipack": multiplier > 1,
                "multipack_count": int(multiplier),
            }

    # 4. Check for standalone "pack of X" without unit (treated as count dimension)
    if pack_count:
        return {
            "quantity": float(pack_count),
            "unit": "piece",
            "package_display": f"Pack of {pack_count}",
            "normalized_quantity": float(pack_count),
            "normalized_unit": "piece",
            "dimension": "count",
            "is_multipack": True,
            "multipack_count": pack_count,
        }

    # Unknown or unparseable unit
    return None


def calculate_unit_price(price: float, norm_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculates the normalized unit price and human-readable representation.
    Unit prices are expressed in standard reference units:
    - Volume: ₹/L
    - Weight: ₹/kg
    - Count:  ₹/piece
    """
    if not norm_data or not norm_data.get("normalized_quantity") or norm_data["normalized_quantity"] <= 0 or price is None or price <= 0:
        return {
            "price_per_base_unit": None,
            "unit_price": None,
            "unit_price_unit": None,
            "unit_price_display": None,
        }

    base_qty = norm_data["normalized_quantity"]
    dimension = norm_data["dimension"]
    price_per_base = price / base_qty

    if dimension in ("volume", "weight"):
        # Base unit is ml or g -> standard reference unit is L or kg (1000 base units)
        std_unit_price = round(price_per_base * 1000.0, 2)
        std_unit = DIMENSION_STANDARD_UNITS[dimension]
    else:
        # Base unit is piece -> standard reference unit is piece
        std_unit_price = round(price_per_base, 2)
        std_unit = "piece"

    display_price = f"{std_unit_price:.2f}".rstrip("0").rstrip(".")
    unit_price_display = f"₹{display_price}/{std_unit}"

    return {
        "price_per_base_unit": price_per_base,
        "unit_price": std_unit_price,
        "unit_price_unit": std_unit,
        "unit_price_display": unit_price_display,
    }


def enrich_product_pricing(
    platform: str,
    product_name: str,
    price: float,
    qty_text: Optional[str] = None,
    delivery: float = 0.0,
    eta: int = 15,
    product_url: Optional[str] = None,
    extra_fields: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Canonical product factory: parses quantity and unit, calculates unit price,
    and returns a clean, backward-compatible dictionary.
    """
    # 1. Try parsing from dedicated quantity text
    norm = parse_and_normalize_quantity(qty_text) if qty_text else None

    # 2. Fallback to product name if dedicated text missing or failed
    if not norm and product_name:
        norm = parse_and_normalize_quantity(product_name)

    # 3. Calculate unit price
    pricing = calculate_unit_price(price, norm)

    # 4. Backward compatible qty value (normalized numeric quantity or 1.0)
    qty_legacy = norm["normalized_quantity"] if norm else 1.0

    result = {
        "platform": platform,
        "product_name": product_name,
        "price": float(price),
        "qty": qty_legacy,  # Backward compatible key expected by optimizer
        "quantity": norm["quantity"] if norm else None,
        "unit": norm["unit"] if norm else None,
        "package_display": norm["package_display"] if norm else None,
        "normalized_quantity": norm["normalized_quantity"] if norm else None,
        "normalized_unit": norm["normalized_unit"] if norm else None,
        "dimension": norm["dimension"] if norm else None,
        "is_multipack": norm["is_multipack"] if norm else False,
        "multipack_count": norm["multipack_count"] if norm else 1,
        "price_per_base_unit": pricing["price_per_base_unit"],
        "unit_price": pricing["unit_price"],
        "unit_price_unit": pricing["unit_price_unit"],
        "unit_price_display": pricing["unit_price_display"],
        "delivery": float(delivery),
        "eta": int(eta),
        "product_url": product_url,
    }

    if extra_fields:
        result.update(extra_fields)

    return result


def select_best_candidate(candidates: list[Dict[str, Any]], search_term: str = "") -> Optional[Dict[str, Any]]:
    """
    Selects the best product candidate from a list of extracted products:
    1. Filters to products with valid parsed dimension and price.
    2. Identifies the dominant measurement dimension (e.g. volume vs weight) to avoid mixing.
    3. Selects the candidate with the lowest price per normalized base unit within that dimension.
    """
    if not candidates:
        return None

    valid = [c for c in candidates if c.get("price_per_base_unit") is not None and c.get("dimension")]
    if not valid:
        # Fallback to cheapest raw price if units couldn't be parsed
        return min(candidates, key=lambda x: x.get("price", float("inf")))

    # Count dimensions
    dim_counts: Dict[str, int] = {}
    for c in valid:
        dim = c["dimension"]
        dim_counts[dim] = dim_counts.get(dim, 0) + 1

    dominant_dim = max(dim_counts, key=lambda d: dim_counts[d])
    dim_candidates = [c for c in valid if c["dimension"] == dominant_dim]

    return min(dim_candidates, key=lambda x: x["price_per_base_unit"])


def calculate_packages_needed(
    package_normalized_qty: Optional[float],
    package_dimension: Optional[str],
    required_normalized_qty: Optional[float],
    required_dimension: Optional[str],
) -> int:
    """
    Calculates the integer number of packages needed to satisfy a required quantity.
    Returns 1 if no required quantity is specified, or if dimensions don't match or are unknown.
    """
    if not required_normalized_qty or required_normalized_qty <= 0:
        return 1
    if not package_normalized_qty or package_normalized_qty <= 0:
        return 1
    if not package_dimension or not required_dimension or package_dimension != required_dimension:
        return 1

    import math
    return max(1, math.ceil(required_normalized_qty / package_normalized_qty))


def parse_required_quantity(query_or_item: Any) -> Optional[Dict[str, Any]]:
    """
    Parses a required quantity from either:
    1. A dictionary: {"quantity": 1, "unit": "L"} or {"required_quantity": 1, "required_unit": "L"}
    2. A query string: "1 L milk", "2 kg onion", "500g paneer"
    Returns normalized required quantity dict or None if no required quantity is specified.
    """
    if isinstance(query_or_item, dict):
        q = query_or_item.get("required_quantity") or query_or_item.get("quantity")
        u = query_or_item.get("required_unit") or query_or_item.get("unit")
        if q is not None and u:
            return parse_and_normalize_quantity(f"{q} {u}")

    if isinstance(query_or_item, str):
        norm = parse_and_normalize_quantity(query_or_item)
        if norm:
            return norm

    return None


