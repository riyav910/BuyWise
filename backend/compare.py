import sys
import os
from typing import Optional, Dict, Any

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from quantity_utils import (
        calculate_packages_needed,
        parse_required_quantity,
        parse_and_normalize_quantity,
    )
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from quantity_utils import (
        calculate_packages_needed,
        parse_required_quantity,
        parse_and_normalize_quantity,
    )

FALLBACK_DELIVERY_FEE_INR = {
    "blinkit": 15.0,
    "zepto": 15.0,
    "bigbasket": 30.0,
    "jiomart": 30.0,
    "instamart": 15.0,
}
DEFAULT_DELIVERY_FEE_INR = 20.0


def get_platform_delivery_fee_inr(platform, selected_items):
    """
    Finds the exact delivery fee for a platform from the scraped results.
    Falls back to platform-specific default fees if missing or invalid.
    """
    platform_lower = platform.lower().strip()
    for item in selected_items:
        if item.get("platform", "").lower().strip() == platform_lower:
            delivery = item.get("delivery")
            if delivery is not None:
                try:
                    return float(delivery)
                except (ValueError, TypeError):
                    pass
    return FALLBACK_DELIVERY_FEE_INR.get(platform_lower, DEFAULT_DELIVERY_FEE_INR)


def optimize_small_cart(obtainable_items, items_by_search_term):
    """
    Exact backtracking search for N <= 8 items.
    """
    best_cost_inr = float("inf")
    best_assignment = None
    n = len(obtainable_items)

    def backtrack(idx, current_assignment, active_platforms):
        nonlocal best_cost_inr, best_assignment
        if idx == n:
            items_cost_inr = sum(item.get("effective_cost", item["price"]) for item in current_assignment)
            delivery_cost_inr = sum(get_platform_delivery_fee_inr(p, current_assignment) for p in active_platforms)
            total_cost_inr = items_cost_inr + delivery_cost_inr
            if total_cost_inr < best_cost_inr:
                best_cost_inr = total_cost_inr
                best_assignment = list(current_assignment)
            return

        item_term = obtainable_items[idx]
        options = items_by_search_term[item_term]

        for opt in options:
            p = opt["platform"]
            current_assignment.append(opt)
            added_platform = False
            if p not in active_platforms:
                active_platforms.add(p)
                added_platform = True

            backtrack(idx + 1, current_assignment, active_platforms)

            # Backtrack
            current_assignment.pop()
            if added_platform:
                active_platforms.remove(p)

    backtrack(0, [], set())
    return best_assignment, best_cost_inr


def optimize_medium_cart(obtainable_items, items_by_search_term):
    """
    Exact Depth-First Branch-and-Bound search for 9 <= N <= 20 items.
    Prunes subtrees using a minimum-remaining bounds estimation.
    """
    min_prices = {
        item: min(opt.get("effective_cost", opt["price"]) for opt in items_by_search_term[item])
        for item in obtainable_items
    }

    # Sort items by price variance (descending) to branch on high-variance items first
    def get_variance(item):
        prices = [opt.get("effective_cost", opt["price"]) for opt in items_by_search_term[item]]
        if len(prices) <= 1:
            return 0
        mean = sum(prices) / len(prices)
        return sum((p - mean) ** 2 for p in prices) / len(prices)

    sorted_items = sorted(obtainable_items, key=get_variance, reverse=True)
    n = len(sorted_items)

    # Pre-calculate suffix sums of minimum prices for remaining items
    suffix_min_sum = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix_min_sum[i] = suffix_min_sum[i + 1] + min_prices[sorted_items[i]]

    # Initialize best cost with greedy heuristic for a tight upper bound
    greedy_assignment, greedy_cost_inr = optimize_large_cart(obtainable_items, items_by_search_term)
    best_cost_inr = greedy_cost_inr
    best_assignment = greedy_assignment

    def branch_and_bound(idx, current_assignment, active_platforms, current_items_cost_inr):
        nonlocal best_cost_inr, best_assignment

        delivery_cost_inr = sum(get_platform_delivery_fee_inr(p, current_assignment) for p in active_platforms)
        total_current_cost_inr = current_items_cost_inr + delivery_cost_inr

        # Pruning check
        lower_bound_inr = total_current_cost_inr + suffix_min_sum[idx]
        if lower_bound_inr >= best_cost_inr:
            return

        if idx == n:
            best_cost_inr = total_current_cost_inr
            best_assignment = list(current_assignment)
            return

        item_term = sorted_items[idx]
        # Check cheaper options first
        options = sorted(items_by_search_term[item_term], key=lambda x: x.get("effective_cost", x["price"]))

        for opt in options:
            p = opt["platform"]
            current_assignment.append(opt)
            added_platform = False
            if p not in active_platforms:
                active_platforms.add(p)
                added_platform = True

            eff_cost = opt.get("effective_cost", opt["price"])
            branch_and_bound(idx + 1, current_assignment, active_platforms, current_items_cost_inr + eff_cost)

            # Backtrack
            current_assignment.pop()
            if added_platform:
                active_platforms.remove(p)

    branch_and_bound(0, [], set(), 0)
    return best_assignment, best_cost_inr


def optimize_large_cart(obtainable_items, items_by_search_term):
    """
    Greedy heuristic with iterative merging for N > 20 items.
    """
    # Start by assigning each item to the cheapest option
    assignment = {}
    for item in obtainable_items:
        cheapest_opt = min(items_by_search_term[item], key=lambda x: x.get("effective_cost", x["price"]))
        assignment[item] = cheapest_opt

    def compute_cost(current_assign):
        items_cost_inr = sum(opt.get("effective_cost", opt["price"]) for opt in current_assign.values())
        active_plats = set(opt["platform"] for opt in current_assign.values())
        delivery_cost_inr = sum(get_platform_delivery_fee_inr(p, current_assign.values()) for p in active_plats)
        return items_cost_inr + delivery_cost_inr

    current_cost_inr = compute_cost(assignment)
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
                    # Find alternative options on other active platforms
                    alternatives = [
                        o for o in items_by_search_term[item]
                        if o["platform"] != p_to_eliminate and o["platform"] in active_platforms
                    ]
                    if not alternatives:
                        elimination_possible = False
                        break
                    cheapest_alt = min(alternatives, key=lambda x: x.get("effective_cost", x["price"]))
                    candidate_assignment[item] = cheapest_alt

            if elimination_possible:
                candidate_cost_inr = compute_cost(candidate_assignment)
                if candidate_cost_inr < current_cost_inr:
                    assignment = candidate_assignment
                    current_cost_inr = candidate_cost_inr
                    improved = True
                    break

    return list(assignment.values()), current_cost_inr


def optimize_cart_inr(results, requested_items):
    """
    Main optimizer entry point. Decides algorithm path based on cart size.
    Accounts for required quantities specified in requested items.
    Returns:
      - split_cart: mathematically optimized cheapest combinations of platforms
      - single_cart: best single-platform option
    """
    print(f"\n[INR OPTIMIZER] Optimizing cart for {len(requested_items)} requested items...")

    # Group results by search term
    items_by_search_term = {item.lower().strip(): [] for item in requested_items}
    for res in results:
        term = res.get("search_term", "").lower().strip()
        if term in items_by_search_term:
            items_by_search_term[term].append(res)

    obtainable_items = [item for item in items_by_search_term if items_by_search_term[item]]
    missing_items = [item for item in items_by_search_term if not items_by_search_term[item]]

    N = len(obtainable_items)

    if N == 0:
        return {
            "split_cart": None,
            "single_cart": None,
            "missing_items": missing_items,
        }

    # Pre-annotate each option with packages_needed and effective_cost based on required quantity
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
            opt["packages_needed"] = pkgs
            opt["effective_cost"] = opt["price"] * pkgs

    # Decide path
    if N <= 8:
        path = "backtracking"
        best_split_assignment, split_total_inr = optimize_small_cart(obtainable_items, items_by_search_term)
    elif N <= 20:
        path = "branch_and_bound"
        best_split_assignment, split_total_inr = optimize_medium_cart(obtainable_items, items_by_search_term)
    else:
        path = "greedy"
        best_split_assignment, split_total_inr = optimize_large_cart(obtainable_items, items_by_search_term)

    print(f"[INR OPTIMIZER] Chose algorithm path: '{path}' for cart size N = {N} obtainable items")

    # Format split cart option
    split_items_cost_inr = sum(opt.get("effective_cost", opt["price"]) for opt in best_split_assignment)
    split_active_platforms = set(opt["platform"] for opt in best_split_assignment)
    split_delivery_inr = sum(get_platform_delivery_fee_inr(p, best_split_assignment) for p in split_active_platforms)

    split_cart_details = {
        "items": best_split_assignment,
        "items_cost_inr": split_items_cost_inr,
        "delivery_cost_inr": split_delivery_inr,
        "total_cost_inr": split_total_inr,
        "platforms_used": list(split_active_platforms),
        "path_used": path
    }

    # Format single cart option (all items from same platform)
    platforms = list(set(r["platform"] for r in results))
    single_cart_options = {}

    for p in platforms:
        p_assignment = []
        p_missing = []
        for item in obtainable_items:
            # Check if this platform has this item
            options = [o for o in items_by_search_term[item] if o["platform"] == p]
            if options:
                # Pick cheapest effective option on this platform
                p_assignment.append(min(options, key=lambda x: x.get("effective_cost", x["price"])))
            else:
                p_missing.append(item)

        # Penalty for missing items to allow sorting/comparison
        penalty_inr = len(p_missing) * 150.0
        p_items_cost_inr = sum(opt.get("effective_cost", opt["price"]) for opt in p_assignment)
        p_delivery_inr = get_platform_delivery_fee_inr(p, p_assignment) if p_assignment else 0
        p_total_inr = p_items_cost_inr + p_delivery_inr + penalty_inr

        single_cart_options[p] = {
            "platform": p,
            "items": p_assignment,
            "items_cost_inr": p_items_cost_inr,
            "delivery_cost_inr": p_delivery_inr,
            "total_cost_inr": p_items_cost_inr + p_delivery_inr,  # true cost (without penalty)
            "total_cost_with_penalty_inr": p_total_inr,
            "missing_items": p_missing
        }

    # Best single platform is the one that has the minimum cost including missing item penalties
    best_single_platform_name = min(single_cart_options, key=lambda p: single_cart_options[p]["total_cost_with_penalty_inr"])
    best_single_cart = single_cart_options[best_single_platform_name]

    return {
        "split_cart": split_cart_details,
        "single_cart": best_single_cart,
        "missing_items": missing_items,
        "all_single_options": single_cart_options
    }


def compare_products(
    results,
    required_quantity: Optional[float] = None,
    required_unit: Optional[str] = None,
):
    """
    Compares scraped products across platforms:
    1. Distinguishes between:
       - Best Unit Price (normalized price per L, kg, or piece)
       - Best Actual Order Deal (package price * packages_needed + delivery fee)
    2. If required quantity is specified, calculates packages_needed = ceil(required / package_size).
    3. Groups and compares unit prices only within the same measurement dimension (volume vs weight vs count).
    4. Keeps delivery fee strictly separate from unit price.
    """
    print("\nComparing platforms...")

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
            "package_display": f"{required_quantity} units"
        }
    else:
        # Check if search_term from results specified a required quantity (e.g. "1 L milk" or "500g butter")
        search_terms = {r.get("search_term") for r in valid_results if r.get("search_term")}
        if len(search_terms) == 1:
            req_norm = parse_required_quantity(next(iter(search_terms)))

    # 1. Best overall actual order purchase (Package Price * packages_needed + Delivery)
    best_deal = None
    best_deal_score = float("inf")

    for res in valid_results:
        delivery = res.get("delivery")
        if delivery is None:
            delivery = FALLBACK_DELIVERY_FEE_INR.get(res.get("platform", "").lower(), DEFAULT_DELIVERY_FEE_INR)
            res["delivery"] = delivery

        if req_norm:
            pkgs = calculate_packages_needed(
                package_normalized_qty=res.get("normalized_quantity"),
                package_dimension=res.get("dimension"),
                required_normalized_qty=req_norm.get("normalized_quantity"),
                required_dimension=req_norm.get("dimension"),
            )
        else:
            pkgs = 1

        items_cost = pkgs * res["price"]
        score = items_cost + delivery
        res["packages_needed"] = pkgs
        res["items_cost"] = items_cost
        res["total_order_cost"] = score
        res["actual_order_cost"] = score
        res["is_best_deal"] = False
        res["is_best_unit_price"] = False

        if pkgs > 1 and res.get("package_display"):
            res["order_fulfillment_display"] = f"{pkgs} x {res['package_display']}"
        else:
            res["order_fulfillment_display"] = res.get("package_display") or f"{pkgs} pack"

        print(f"{res.get('platform')} -> {pkgs}x {res.get('package_display', 'pack')} (₹{items_cost}) + Del: ₹{delivery} = ₹{score} | Unit Rate: {res.get('unit_price_display', 'N/A')} | URL: {res.get('product_url')}")

        if score < best_deal_score:
            best_deal_score = score
            best_deal = res

    if best_deal:
        best_deal["is_best_deal"] = True

    # 2. Best Unit Price within the dominant measurement dimension
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
        print(f"Dominant dimension: '{dominant_dim}' | Best Unit Price: {best_unit_price_deal.get('platform')} at {best_unit_price_deal.get('unit_price_display')}")

    print(f"Best Actual Order Deal: {best_deal.get('platform')} (Total ₹{best_deal.get('total_order_cost')})\n")

    return {
        "all": valid_results,
        "best": best_deal,
        "best_unit_price": best_unit_price_deal,
        "dimension": dominant_dim,
        "required_quantity": req_norm.get("quantity") if req_norm else None,
        "required_unit": req_norm.get("unit") if req_norm else None,
        "required_display": req_norm.get("package_display") if req_norm else None,
    }