import sys
import os

# Add parent directory to path so we can import compare
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compare import (
    optimize_cart_inr,
    optimize_small_cart,
    optimize_medium_cart,
    optimize_large_cart,
    get_platform_delivery_fee_inr,
    FALLBACK_DELIVERY_FEE_INR,
)

# Define mock data generator
def make_mock_results(platforms, items_prices_map):
    """
    items_prices_map: dict of search_term -> {platform: (price, delivery)}
    """
    results = []
    for item, plat_info in items_prices_map.items():
        for plat, pricing in plat_info.items():
            price, delivery = pricing
            res = {
                "platform": plat,
                "product_name": f"Mock {item} on {plat}",
                "price": price,
                "qty": 1,
                "delivery": delivery,
                "eta": 10,
                "search_term": item
            }
            results.append(res)
    return results


def test_fallback_delivery():
    print("Running test: Fallback Delivery...")
    # Missing delivery key
    item_no_delivery = [{"platform": "blinkit", "price": 50}]
    fee = get_platform_delivery_fee_inr("blinkit", item_no_delivery)
    assert fee == FALLBACK_DELIVERY_FEE_INR["blinkit"], f"Expected fallback {FALLBACK_DELIVERY_FEE_INR['blinkit']}, got {fee}"

    # Invalid delivery key (string that can't be float)
    item_bad_delivery = [{"platform": "zepto", "price": 50, "delivery": "free"}]
    fee = get_platform_delivery_fee_inr("zepto", item_bad_delivery)
    assert fee == FALLBACK_DELIVERY_FEE_INR["zepto"], f"Expected fallback {FALLBACK_DELIVERY_FEE_INR['zepto']}, got {fee}"

    # Valid delivery key
    item_good_delivery = [{"platform": "zepto", "price": 50, "delivery": 12.5}]
    fee = get_platform_delivery_fee_inr("zepto", item_good_delivery)
    assert fee == 12.5, f"Expected 12.5, got {fee}"
    print("[OK] Fallback Delivery tests passed!")


def test_small_cart_optimization():
    print("Running test: Small Cart Optimization (Backtracking)...")
    # 3 items, 3 platforms
    # Milk: Blinkit (50, 10), Zepto (60, 10), BigBasket (45, 30)
    # Bread: Blinkit (40, 10), Zepto (30, 10), BigBasket (35, 30)
    # Eggs: Blinkit (80, 10), Zepto (75, 10), BigBasket (70, 30)
    items_prices = {
        "milk": {"blinkit": (50, 10), "zepto": (60, 10), "bigbasket": (45, 30)},
        "bread": {"blinkit": (40, 10), "zepto": (30, 10), "bigbasket": (35, 30)},
        "eggs": {"blinkit": (80, 10), "zepto": (75, 10), "bigbasket": (70, 30)},
    }
    requested = list(items_prices.keys())
    results = make_mock_results(["blinkit", "zepto", "bigbasket"], items_prices)

    optimized = optimize_cart_inr(results, requested)
    split_cart = optimized["split_cart"]

    # Let's manually calculate combinations:
    # 1. All from Blinkit: Items (50 + 40 + 80) = 170. Delivery = 10. Total = 180.
    # 2. All from Zepto: Items (60 + 30 + 75) = 165. Delivery = 10. Total = 175.
    # 3. All from BB: Items (45 + 35 + 70) = 150. Delivery = 30. Total = 180.
    # 4. Mixed (cheapest items): Milk (BB: 45), Bread (Zepto: 30), Eggs (BB: 70).
    #    Platforms used: BB, Zepto.
    #    Cost: (45 + 30 + 70) + BB_delivery(30) + Zepto_delivery(10) = 145 + 40 = 185.
    # Therefore, the optimal split-cart assignment is:
    # - Milk: BB (45)
    # - Bread: Zepto (30)
    # - Eggs: BB (70)
    # But wait, with delivery fees, is it cheaper to buy all from Zepto (175) or mix (185)?
    # Since 175 < 185, the optimal split-cart should actually choose:
    # All from Zepto (or maybe Milk from Blinkit 50, Bread Zepto 30, Eggs Zepto 75 = 155 + 20 = 175)
    # Let's see: Milk (Blinkit: 50), Bread (Zepto: 30), Eggs (BB: 70) -> 150 + 10 + 10 + 30 = 200.
    # So the algorithm should output a total cost of 175.
    assert split_cart["total_cost_inr"] == 175.0, f"Expected total cost to be 175.0, got {split_cart['total_cost_inr']}"
    assert optimized["single_cart"]["platform"] == "zepto", f"Expected single cart platform to be 'zepto', got {optimized['single_cart']['platform']}"
    assert optimized["single_cart"]["total_cost_inr"] == 175.0, f"Expected single cart cost to be 175.0, got {optimized['single_cart']['total_cost_inr']}"
    print("[OK] Small Cart Optimization tests passed!")


def test_medium_cart_exactness():
    print("Running test: Medium Cart Exactness (Branch-and-Bound vs Backtracking)...")
    # 10 items, 3 platforms, random prices
    import random
    random.seed(42)

    requested = [f"item_{i}" for i in range(10)]
    items_prices = {}
    for item in requested:
        items_prices[item] = {
            "blinkit": (random.randint(10, 100), 15),
            "zepto": (random.randint(10, 100), 15),
            "bigbasket": (random.randint(10, 100), 30),
        }

    results = make_mock_results(["blinkit", "zepto", "bigbasket"], items_prices)
    items_by_search_term = {item: [] for item in requested}
    for r in results:
        items_by_search_term[r["search_term"]].append(r)

    # Run backtracking
    bt_assignment, bt_cost = optimize_small_cart(requested, items_by_search_term)
    # Run branch and bound
    bb_assignment, bb_cost = optimize_medium_cart(requested, items_by_search_term)

    assert abs(bt_cost - bb_cost) < 1e-5, f"Backtracking cost ({bt_cost}) does not match Branch-and-Bound ({bb_cost})"
    print(f"[OK] Medium Cart Exactness tests passed! Cost matching at: {bb_cost} INR")


def test_large_cart_greedy():
    print("Running test: Large Cart Greedy...")
    # 25 items, 4 platforms
    requested = [f"item_{i}" for i in range(25)]
    items_prices = {}
    for item in requested:
        items_prices[item] = {
            "blinkit": (30, 15),
            "zepto": (28, 15),
            "bigbasket": (25, 30),
            "jiomart": (27, 30),
        }
    results = make_mock_results(["blinkit", "zepto", "bigbasket", "jiomart"], items_prices)
    
    # This should trigger the greedy path (N = 25 > 20)
    optimized = optimize_cart_inr(results, requested)
    split_cart = optimized["split_cart"]
    
    assert split_cart is not None
    assert split_cart["path_used"] == "greedy", f"Expected greedy path, got {split_cart['path_used']}"
    # Calculate costs:
    # Cheapest is BigBasket (25 per item) for all items.
    # Buying all 25 items from BigBasket: 25 * 25 = 625. BB delivery = 30. Total = 655.
    # Buying from others: Zepto is 28 * 25 + 15 = 715.
    # The greedy algorithm should easily find the optimal assignment of all items to BigBasket.
    assert split_cart["total_cost_inr"] == 655.0, f"Expected cost 655.0, got {split_cart['total_cost_inr']}"
    print("[OK] Large Cart Greedy tests passed!")


if __name__ == "__main__":
    print("Starting Cart Optimizer Verification Tests...\n")
    test_fallback_delivery()
    print("-" * 50)
    test_small_cart_optimization()
    print("-" * 50)
    test_medium_cart_exactness()
    print("-" * 50)
    test_large_cart_greedy()
    print("\n[SUCCESS] ALL TESTS COMPLETED SUCCESSFULLY!")
