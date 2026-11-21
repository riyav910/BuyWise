import sys
import os
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List, Tuple

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from quantity_utils import (
        calculate_packages_needed,
        parse_required_quantity,
        parse_and_normalize_quantity,
    )
    from platform_config import calculate_platform_fees, get_platform_config
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from quantity_utils import (
        calculate_packages_needed,
        parse_required_quantity,
        parse_and_normalize_quantity,
    )
    from platform_config import calculate_platform_fees, get_platform_config


def to_decimal(val) -> Decimal:
    """Safely converts numerical or string input to Decimal."""
    if isinstance(val, Decimal):
        return val
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal("0.00")


def to_float(d: Decimal) -> float:
    """Rounds Decimal to 2 decimal places and returns float for JSON serialization."""
    if d is None or d == Decimal("Infinity"):
        return 0.0
    return float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


# ==============================================================================
# COMPLETE ALLOCATION EVALUATOR
# ==============================================================================

def compute_allocation_checkout_cost(assignment: List[Dict[str, Any]]) -> Tuple[
    Decimal, Decimal, Decimal, Decimal, Dict[str, Any], List[str]
]:
    """
    Evaluates complete checkout cost for an allocation:
      - Groups assigned items by platform.
      - Calculates items subtotal per platform using Decimal.
      - Calculates dynamic platform delivery fee (with threshold awareness) & handling fee.
      - Computes grand checkout total.
    Returns:
      (total_checkout, items_subtotal, delivery_total, handling_total, platform_breakdown, platforms_used)
    """
    by_plat: Dict[str, List[Dict[str, Any]]] = {}
    for item in assignment:
        p = item.get("platform", "unknown").lower().strip()
        if p not in by_plat:
            by_plat[p] = []
        by_plat[p].append(item)

    total_items_subtotal = Decimal("0.00")
    total_delivery = Decimal("0.00")
    total_handling = Decimal("0.00")
    platform_breakdown = {}
    platforms_used = []

    for p, p_items in by_plat.items():
        platforms_used.append(p)
        p_subtotal = sum(opt["effective_cost_decimal"] for opt in p_items)
        del_fee, hand_fee, free_applied, needed = calculate_platform_fees(p, p_subtotal)
        p_total = p_subtotal + del_fee + hand_fee

        total_items_subtotal += p_subtotal
        total_delivery += del_fee
        total_handling += hand_fee

        platform_breakdown[p] = {
            "items_subtotal": to_float(p_subtotal),
            "delivery_fee": to_float(del_fee),
            "handling_fee": to_float(hand_fee),
            "total": to_float(p_total),
            "items_count": len(p_items),
            "free_delivery_applied": free_applied,
            "amount_needed_for_free_delivery": to_float(needed) if needed is not None else None,
        }

    total_checkout = total_items_subtotal + total_delivery + total_handling

    return (
        total_checkout,
        total_items_subtotal,
        total_delivery,
        total_handling,
        platform_breakdown,
        platforms_used,
    )


# ==============================================================================
# CART SEARCH STRATEGIES
# ==============================================================================

def optimize_small_cart(obtainable_items, items_by_search_term):
    """Exact combinatorial search for N <= 8 items."""
    best_cost = Decimal("Infinity")
    best_assignment = None
    n = len(obtainable_items)

    def backtrack(idx, current_assignment):
        nonlocal best_cost, best_assignment
        if idx == n:
            total_cost, _, _, _, _, _ = compute_allocation_checkout_cost(current_assignment)
            if total_cost < best_cost:
                best_cost = total_cost
                best_assignment = list(current_assignment)
            return

        item_term = obtainable_items[idx]
        for opt in items_by_search_term[item_term]:
            current_assignment.append(opt)
            backtrack(idx + 1, current_assignment)
            current_assignment.pop()

    backtrack(0, [])
    return best_assignment, best_cost


def optimize_medium_cart(obtainable_items, items_by_search_term):
    """Branch & Bound search for 9 <= N <= 20 items."""
    min_prices = {
        item: min(opt["effective_cost_decimal"] for opt in items_by_search_term[item])
        for item in obtainable_items
    }

    # Sort items by price variance descending to branch on high-variance items first
    def get_variance(item):
        prices = [float(opt["effective_cost_decimal"]) for opt in items_by_search_term[item]]
        if len(prices) <= 1:
            return 0
        mean = sum(prices) / len(prices)
        return sum((p - mean) ** 2 for p in prices) / len(prices)

    sorted_items = sorted(obtainable_items, key=get_variance, reverse=True)
    n = len(sorted_items)

    suffix_min_sum = [Decimal("0.00")] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix_min_sum[i] = suffix_min_sum[i + 1] + min_prices[sorted_items[i]]

    best_assignment, best_cost = optimize_large_cart(obtainable_items, items_by_search_term)

    def branch_and_bound(idx, current_assignment):
        nonlocal best_cost, best_assignment
        current_cost, _, _, _, _, _ = compute_allocation_checkout_cost(current_assignment)

        # Lower bound check
        lower_bound = current_cost + suffix_min_sum[idx]
        if lower_bound >= best_cost:
            return

        if idx == n:
            best_cost = current_cost
            best_assignment = list(current_assignment)
            return

        item_term = sorted_items[idx]
        options = sorted(items_by_search_term[item_term], key=lambda x: x["effective_cost_decimal"])

        for opt in options:
            current_assignment.append(opt)
            branch_and_bound(idx + 1, current_assignment)
            current_assignment.pop()

    branch_and_bound(0, [])
    return best_assignment, best_cost


def optimize_large_cart(obtainable_items, items_by_search_term):
    """Greedy heuristic with iterative platform consolidation for N > 20 items."""
    assignment = {}
    for item in obtainable_items:
        cheapest_opt = min(items_by_search_term[item], key=lambda x: x["effective_cost_decimal"])
        assignment[item] = cheapest_opt

    current_cost, _, _, _, _, _ = compute_allocation_checkout_cost(list(assignment.values()))
    improved = True

    while improved:
        improved = False
        active_platforms = list(set(opt["platform"] for opt in assignment.values()))
        if len(active_platforms) <= 1:
            break

        for p_to_eliminate in active_platforms:
            candidate_assignment = assignment.copy()
            elimination_possible = True

            for item, opt in assignment.items():
                if opt["platform"] == p_to_eliminate:
                    alts = [
                        o for o in items_by_search_term[item]
                        if o["platform"] != p_to_eliminate and o["platform"] in active_platforms
                    ]
                    if not alts:
                        elimination_possible = False
                        break
                    candidate_assignment[item] = min(alts, key=lambda x: x["effective_cost_decimal"])

            if elimination_possible:
                cand_cost, _, _, _, _, _ = compute_allocation_checkout_cost(list(candidate_assignment.values()))
                if cand_cost < current_cost:
                    assignment = candidate_assignment
                    current_cost = cand_cost
                    improved = True
                    break

    return list(assignment.values()), current_cost


# ==============================================================================
# MAIN CART OPTIMIZER
# ==============================================================================

def optimize_cart_inr(results: List[Dict[str, Any]], requested_items: List[str]) -> Dict[str, Any]:
    """
    Main Cart Optimizer Engine:
    1. Prepares candidates with Decimal pricing and package counts based on required quantities.
    2. Evaluates the best consolidated single-store cart for each platform.
    3. Solves for the global minimum checkout allocation across all combinations.
    4. Computes savings_vs_alternative, platform_breakdown, and clear explanation reason.
    """
    print(f"\n[INR OPTIMIZER] Optimizing checkout for {len(requested_items)} requested item(s)...")

    # Group valid results by search term
    items_by_search_term = {item.lower().strip(): [] for item in requested_items}
    for res in results:
        if not res or "price" not in res:
            continue
        term = res.get("search_term", "").lower().strip()
        if term in items_by_search_term:
            items_by_search_term[term].append(res)

    obtainable_items = [item for item in items_by_search_term if items_by_search_term[item]]
    missing_items = [item for item in items_by_search_term if not items_by_search_term[item]]

    N = len(obtainable_items)
    if N == 0:
        return {
            "recommended_checkout": None,
            "single_cart": None,
            "split_cart": None,
            "missing_items": missing_items,
        }

    # Annotate Decimal prices and required package counts
    for item in obtainable_items:
        req_norm = parse_required_quantity(item)
        for opt in items_by_search_term[item]:
            if req_norm:
                pkgs = calculate_packages_needed(
                    package_normalized_qty=opt.get("normalized_quantity"),
                    package_dimension=opt.get("dimension"),
                    required_normalized_qty=req_norm.get("normalized_quantity"),
                    required_dimension=req_norm.get("dimension"),
                )
            else:
                pkgs = 1

            price_dec = to_decimal(opt.get("price", 0))
            opt["packages_needed"] = pkgs
            opt["product_price_decimal"] = price_dec
            opt["effective_cost_decimal"] = price_dec * Decimal(str(pkgs))

    # 1. EVALUATE ALL SINGLE-STORE OPTIONS
    all_platforms = list(set(r.get("platform", "").lower().strip() for r in results if r.get("platform")))
    single_store_evaluations = {}

    for p in all_platforms:
        p_assignment = []
        p_missing = []
        for item in obtainable_items:
            options = [o for o in items_by_search_term[item] if o.get("platform", "").lower().strip() == p]
            if options:
                p_assignment.append(min(options, key=lambda x: x["effective_cost_decimal"]))
            else:
                p_missing.append(item)

        if p_assignment:
            t_cost, t_sub, t_del, t_hand, t_break, _ = compute_allocation_checkout_cost(p_assignment)
            # Penalty for missing items to compare platforms fairly
            penalty = Decimal(str(len(p_missing) * 150.0))
            single_store_evaluations[p] = {
                "platform": p,
                "assignment": p_assignment,
                "total_cost": t_cost,
                "total_cost_with_penalty": t_cost + penalty,
                "items_subtotal": t_sub,
                "delivery_fee": t_del,
                "handling_fee": t_hand,
                "platform_breakdown": t_break,
                "missing_items": p_missing,
            }

    # Pick the best single platform
    best_single = None
    if single_store_evaluations:
        best_p_name = min(
            single_store_evaluations,
            key=lambda p: single_store_evaluations[p]["total_cost_with_penalty"]
        )
        best_single = single_store_evaluations[best_p_name]

    # 2. EVALUATE GLOBAL OPTIMUM (May be single or split)
    if N <= 8:
        path = "backtracking"
        best_assignment, best_total_cost = optimize_small_cart(obtainable_items, items_by_search_term)
    elif N <= 20:
        path = "branch_and_bound"
        best_assignment, best_total_cost = optimize_medium_cart(obtainable_items, items_by_search_term)
    else:
        path = "greedy"
        best_assignment, best_total_cost = optimize_large_cart(obtainable_items, items_by_search_term)

    (
        opt_total,
        opt_subtotal,
        opt_delivery,
        opt_handling,
        opt_breakdown,
        opt_platforms,
    ) = compute_allocation_checkout_cost(best_assignment)

    # Determine mode
    is_split = len(opt_platforms) > 1
    mode = "split_store" if is_split else "single_store"

    # Also evaluate the best split cart (strictly multi-platform) for comparison if single won
    best_split_cart_data = None
    if not is_split:
        # User's best was single store. Find the best multi-store allocation for comparison
        # (Start with cheapest item across all stores, even if multiple platforms)
        split_assign = []
        for item in obtainable_items:
            cheapest_any = min(items_by_search_term[item], key=lambda x: x["effective_cost_decimal"])
            split_assign.append(cheapest_any)

        s_total, s_sub, s_del, s_hand, _, s_plats = compute_allocation_checkout_cost(split_assign)
        if len(s_plats) > 1:
            best_split_cart_data = {
                "platforms": s_plats,
                "total_cost": s_total,
                "items_subtotal": s_sub,
                "delivery_total": s_del,
                "handling_total": s_hand,
            }
    else:
        best_split_cart_data = {
            "platforms": opt_platforms,
            "total_cost": opt_total,
            "items_subtotal": opt_subtotal,
            "delivery_total": opt_delivery,
            "handling_total": opt_handling,
        }

    # Calculate savings_vs_alternative & explanation reason
    if mode == "split_store":
        alt_cost = best_single["total_cost"] if best_single else opt_total
        savings = max(Decimal("0.00"), alt_cost - opt_total)
        single_name = best_single["platform"].capitalize() if best_single else "single store"
        reason = (
            f"Splitting order across {', '.join(p.capitalize() for p in opt_platforms)} saves "
            f"₹{to_float(savings):.2f} compared to the cheapest single-store order ({single_name} at ₹{to_float(alt_cost):.2f})."
        )
    else:
        winner_name = opt_platforms[0].capitalize()
        if best_split_cart_data and best_split_cart_data["total_cost"] > opt_total:
            savings = best_split_cart_data["total_cost"] - opt_total
            reason = (
                f"Consolidating all items into a single order on {winner_name} saves "
                f"₹{to_float(savings):.2f} by avoiding duplicate delivery and handling charges across multiple stores."
            )
        else:
            savings = Decimal("0.00")
            reason = f"A single-store order on {winner_name} delivers the lowest overall checkout cost."

    # Build per-product allocation map
    allocation_map = {}
    for opt in best_assignment:
        term = opt.get("search_term")
        allocation_map[term] = {
            "platform": opt.get("platform"),
            "product_name": opt.get("product_name", term),
            "product_price": to_float(opt.get("product_price_decimal", to_decimal(opt.get("price", 0)))),
            "packages_needed": opt.get("packages_needed", 1),
            "total_item_cost": to_float(opt["effective_cost_decimal"]),
            "product_url": opt.get("product_url"),
            "package_display": opt.get("package_display") or f"{opt.get('packages_needed', 1)} pack",
            "unit_price_display": opt.get("unit_price_display"),
        }

    recommended_checkout = {
        "mode": mode,
        "total_cost": to_float(opt_total),
        "items_subtotal": to_float(opt_subtotal),
        "delivery_total": to_float(opt_delivery),
        "handling_total": to_float(opt_handling),
        "platforms_used": opt_platforms,
        "savings_vs_alternative": to_float(savings),
        "reason": reason,
        "platform_breakdown": opt_breakdown,
        "allocation": allocation_map,
        "path_used": path,
    }

    single_cart_result = {
        "platform": best_single["platform"] if best_single else (opt_platforms[0] if opt_platforms else None),
        "total_cost": to_float(best_single["total_cost"]) if best_single else to_float(opt_total),
        "items_subtotal": to_float(best_single["items_subtotal"]) if best_single else to_float(opt_subtotal),
        "delivery_total": to_float(best_single["delivery_fee"]) if best_single else to_float(opt_delivery),
        "handling_total": to_float(best_single["handling_fee"]) if best_single else to_float(opt_handling),
        "missing_items": best_single["missing_items"] if best_single else [],
    }

    split_cart_result = {
        "platforms": best_split_cart_data["platforms"] if best_split_cart_data else opt_platforms,
        "total_cost": to_float(best_split_cart_data["total_cost"]) if best_split_cart_data else to_float(opt_total),
        "items_subtotal": to_float(best_split_cart_data["items_subtotal"]) if best_split_cart_data else to_float(opt_subtotal),
        "delivery_total": to_float(best_split_cart_data["delivery_total"]) if best_split_cart_data else to_float(opt_delivery),
        "handling_total": to_float(best_split_cart_data["handling_total"]) if best_split_cart_data else to_float(opt_handling),
        "missing_items": [],
    }

    return {
        "recommended_checkout": recommended_checkout,
        "single_cart": single_cart_result,
        "split_cart": split_cart_result,
        "missing_items": missing_items,
        # Backward compatibility for existing UI components
        "path_used": path,
    }


# ==============================================================================
# PER-PRODUCT COMPARISON & NORMALIZATION
# ==============================================================================

def compare_products(
    results,
    required_quantity: Optional[float] = None,
    required_unit: Optional[str] = None,
):
    """
    Compares scraped product candidates for a specific search item:
    1. Gathers candidates, normalizes units (volume, weight, count).
    2. Identifies:
       - Best Unit Price (Lowest ₹/L or ₹/kg)
       - Best Raw Product Price
    3. Keeps delivery fees separate (cart optimizer handles checkout fees globally).
    """
    print("\nComparing platform candidates...")

    valid_results = [r for r in results if r and "price" in r]
    if not valid_results:
        return {"error": "No valid results"}

    req_norm = None
    if required_quantity is not None and required_unit:
        req_norm = parse_and_normalize_quantity(f"{required_quantity} {required_unit}")
    elif required_quantity is not None:
        req_norm = {
            "quantity": float(required_quantity),
            "normalized_quantity": float(required_quantity),
            "dimension": "count",
            "unit": "piece",
            "package_display": f"{required_quantity} units",
        }
    else:
        search_terms = {r.get("search_term") for r in valid_results if r.get("search_term")}
        if len(search_terms) == 1:
            req_norm = parse_required_quantity(next(iter(search_terms)))

    best_item = None
    best_item_price = float("inf")

    for res in valid_results:
        price_val = float(res.get("price", 0))
        if req_norm:
            pkgs = calculate_packages_needed(
                package_normalized_qty=res.get("normalized_quantity"),
                package_dimension=res.get("dimension"),
                required_normalized_qty=req_norm.get("normalized_quantity"),
                required_dimension=req_norm.get("dimension"),
            )
        else:
            pkgs = 1

        total_item_cost = pkgs * price_val
        res["packages_needed"] = pkgs
        res["items_cost"] = total_item_cost
        res["is_best_deal"] = False
        res["is_best_unit_price"] = False

        if pkgs > 1 and res.get("package_display"):
            res["order_fulfillment_display"] = f"{pkgs} x {res['package_display']}"
        else:
            res["order_fulfillment_display"] = res.get("package_display") or f"{pkgs} pack"

        if total_item_cost < best_item_price:
            best_item_price = total_item_cost
            best_item = res

    if best_item:
        best_item["is_best_deal"] = True

    # Identify best unit price within dominant dimension
    unit_candidates = [r for r in valid_results if r.get("price_per_base_unit") is not None and r.get("dimension")]
    best_unit_price_deal = None
    dominant_dim = None

    if unit_candidates:
        dim_counts = {}
        for r in unit_candidates:
            d = r["dimension"]
            dim_counts[d] = dim_counts.get(d, 0) + 1

        dominant_dim = max(dim_counts, key=lambda d: dim_counts[d])
        dim_matches = [r for r in unit_candidates if r["dimension"] == dominant_dim]

        best_unit_price_deal = min(dim_matches, key=lambda x: x["price_per_base_unit"])
        best_unit_price_deal["is_best_unit_price"] = True

    return {
        "all": valid_results,
        "best": best_item,
        "best_unit_price": best_unit_price_deal,
        "dimension": dominant_dim,
        "required_quantity": req_norm.get("quantity") if req_norm else None,
        "required_unit": req_norm.get("unit") if req_norm else None,
        "required_display": req_norm.get("package_display") if req_norm else None,
    }
