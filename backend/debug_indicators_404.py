# debug_indicators_404.py
# Quick debugging script to find out why indicators endpoints return 404

import requests
import json

BASE_URL = "http://localhost:8000"

def check_endpoint(url, description=""):
    """Check endpoint and show detailed response"""
    print(f"\n🔍 Checking: {description}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS")
            try:
                data = response.json()
                if isinstance(data, dict):
                    print(f"Response keys: {list(data.keys())}")
                    if len(str(data)) < 500:
                        print(f"Response: {json.dumps(data, indent=2)}")
                    else:
                        print("Response: [Large response, truncated]")
            except:
                print(f"Response text: {response.text[:200]}...")
        else:
            print("❌ FAILED")
            print(f"Error response: {response.text}")
        
    except Exception as e:
        print(f"💥 REQUEST FAILED: {e}")

def main():
    print("🐛 DEBUGGING INDICATORS 404 ISSUE")
    print("=" * 60)
    
    # Step 1: Check basic endpoints
    print("\n1️⃣ BASIC HEALTH CHECKS")
    check_endpoint(f"{BASE_URL}/", "Main API root")
    check_endpoint(f"{BASE_URL}/health", "Main health check")
    
    # Step 2: Check indicators service specifically  
    print("\n2️⃣ INDICATORS SERVICE CHECKS")
    check_endpoint(f"{BASE_URL}/api/indicators/health", "Indicators health check")
    check_endpoint(f"{BASE_URL}/api/indicators/available", "Available indicators")
    
    # Step 3: Try the failing endpoints
    print("\n3️⃣ FAILING ENDPOINTS")
    check_endpoint(f"{BASE_URL}/api/indicators/calculate/AAPL/rsi?period=14", "RSI calculation")
    check_endpoint(f"{BASE_URL}/api/indicators/calculate/AAPL/sma?period=20", "SMA calculation")
    
    # Step 4: Check if the route exists at all
    print("\n4️⃣ ROUTE EXISTENCE CHECKS")
    check_endpoint(f"{BASE_URL}/api/indicators/calculate/", "Calculate endpoint (no params)")
    check_endpoint(f"{BASE_URL}/api/indicators/test/rsi", "Test endpoint")
    check_endpoint(f"{BASE_URL}/api/indicators/examples", "Examples endpoint")
    
    # Step 5: Check docs
    print("\n5️⃣ API DOCUMENTATION")
    check_endpoint(f"{BASE_URL}/docs", "OpenAPI docs")
    
    print("\n" + "=" * 60)
    print("📝 DEBUGGING RESULTS:")
    print("1. If /health works but /api/indicators/health fails → Router not properly included")
    print("2. If /api/indicators/health works but calculate fails → Route definition issue")
    print("3. If nothing works → Server not running or wrong port")
    print("4. Check server logs for import errors or startup issues")
    
    print("\n💡 NEXT STEPS:")
    print("1. Check server console logs for errors")
    print("2. Verify the router import in main.py") 
    print("3. Check if TechnicalIndicators class imports correctly")
    print("4. Try restarting the server")

if __name__ == "__main__":
    main()