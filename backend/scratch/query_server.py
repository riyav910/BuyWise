import urllib.request
import json
import sys

def main():
    url = "http://127.0.0.1:8000/compare"
    data = json.dumps({"items": ["milk"]}).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    print("Sending POST request to /compare for ['milk']...")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            print("\nResponse Received:")
            print(json.dumps(res_json, indent=2))
            
            # Assert optimized key exists
            if "optimized" in res_json:
                print("\n[OK] 'optimized' key is present in response!")
                print("Single Cart Total Cost in INR:", res_json["optimized"]["single_cart"]["total_cost_inr"])
                print("Split Cart Total Cost in INR:", res_json["optimized"]["split_cart"]["total_cost_inr"])
            else:
                print("\n[FAIL] 'optimized' key is MISSING in response!")
                sys.exit(1)
                
    except Exception as e:
        print("\n[ERROR] Request failed:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
