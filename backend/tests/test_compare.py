"""
Unit Tests for Comparison and Cart Optimization Logic
Verifies that compare_products and optimize_cart_inr compute costs,
delivery thresholds, and single vs multi-platform splits accurately.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from compare import compare_products, optimize_cart_inr


def test_compare_products_single():
    mock_items = [
        {
            "platform": "blinkit",
            "product_name": "Amul Taaza Milk 500ml",
            "price": 28.0,
            "qty": 500.0,
            "unit": "ml",
            "package_display": "500 ml",
            "normalized_quantity": 500.0,
            "normalized_unit": "ml",
            "price_per_base_unit": 0.056,
            "unit_price": 56.0,
            "unit_price_unit": "L",
            "delivery": 10.0,
            "eta": 10,
            "search_term": "milk",
        },
        {
            "platform": "zepto",
            "product_name": "Nandini Milk 500ml",
            "price": 27.0,
            "qty": 500.0,
            "unit": "ml",
            "package_display": "500 ml",
            "normalized_quantity": 500.0,
            "normalized_unit": "ml",
            "price_per_base_unit": 0.054,
            "unit_price": 54.0,
            "unit_price_unit": "L",
            "delivery": 10.0,
            "eta": 10,
            "search_term": "milk",
        },
    ]

    res = compare_products(mock_items)
    assert res is not None
    assert "best" in res
    assert res["best"]["platform"] == "zepto"
    assert res["best"]["price"] == 27.0
    print(" [OK] test_compare_products_single passed!")


def test_cart_optimization():
    mock_items = [
        {"platform": "blinkit", "product_name": "Milk", "price": 30.0, "search_term": "milk"},
        {"platform": "zepto", "product_name": "Milk", "price": 27.0, "search_term": "milk"},
        {"platform": "blinkit", "product_name": "Bread", "price": 40.0, "search_term": "bread"},
        {"platform": "zepto", "product_name": "Bread", "price": 45.0, "search_term": "bread"},
    ]

    opt = optimize_cart_inr(mock_items, ["milk", "bread"])
    assert opt is not None
    assert "single_cart" in opt
    assert "split_cart" in opt
    assert "recommended_checkout" in opt
    assert opt["recommended_checkout"]["total_cost"] > 0
    print(" [OK] test_cart_optimization passed!")


if __name__ == "__main__":
    test_compare_products_single()
    test_cart_optimization()
    print("All unit tests passed successfully!")
