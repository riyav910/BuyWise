def compare_products(results):
    print("\nComparing platforms...")

    best = None
    best_score = float("inf")

    for res in results:
        if not res or "price" not in res:
            print(f"Skipping invalid result: {res}")
            continue

        score = res["price"] + res["delivery"]

        print(f"{res['platform']} → Score: {score}")

        if score < best_score:
            best_score = score
            best = res

    if not best:
        return {"error": "No valid results"}

    print(f"\nBest platform: {best['platform']}")

    return {
        "all": results,
        "best": best
    }