# verify_file_structure.py
# Check if all required files exist and imports work

import os
import sys
from pathlib import Path

def check_file_exists(filepath, description=""):
    """Check if file exists and show size"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"✅ {filepath} exists ({size} bytes) - {description}")
        return True
    else:
        print(f"❌ {filepath} MISSING - {description}")
        return False

def check_imports():
    """Test if imports work"""
    print("\n🔍 TESTING IMPORTS:")
    
    # Test basic imports
    try:
        import fastapi
        print(f"✅ FastAPI {fastapi.__version__}")
    except Exception as e:
        print(f"❌ FastAPI import failed: {e}")
    
    try:
        import pandas as pd
        print(f"✅ Pandas {pd.__version__}")
    except Exception as e:
        print(f"❌ Pandas import failed: {e}")
    
    try:
        import numpy as np
        print(f"✅ NumPy {np.__version__}")
    except Exception as e:
        print(f"❌ NumPy import failed: {e}")
    
    # Test app imports
    try:
        from app.models.enhanced_data import DataSource
        print("✅ Enhanced data models import OK")
    except Exception as e:
        print(f"❌ Enhanced data models import failed: {e}")
    
    try:
        from app.services.enhanced_data_service import enhanced_data_service
        print("✅ Enhanced data service import OK")
    except Exception as e:
        print(f"❌ Enhanced data service import failed: {e}")
    
    try:
        from app.services.technical_indicators import TechnicalIndicators
        print("✅ Technical indicators import OK")
    except Exception as e:
        print(f"❌ Technical indicators import failed: {e}")
    
    try:
        from app.routers.indicators import router
        print("✅ Indicators router import OK")
    except Exception as e:
        print(f"❌ Indicators router import failed: {e}")

def main():
    print("🔍 FILE STRUCTURE VERIFICATION")
    print("=" * 50)
    
    # Check main files
    print("\n1️⃣ MAIN APPLICATION FILES:")
    check_file_exists("app/main.py", "Main FastAPI app")
    check_file_exists("app/__init__.py", "App package init")
    
    # Check models
    print("\n2️⃣ MODEL FILES:")
    check_file_exists("app/models/__init__.py", "Models package init")
    check_file_exists("app/models/enhanced_data.py", "Enhanced data models")
    
    # Check services
    print("\n3️⃣ SERVICE FILES:")
    check_file_exists("app/services/__init__.py", "Services package init")
    check_file_exists("app/services/enhanced_data_service.py", "Enhanced data service")
    check_file_exists("app/services/technical_indicators.py", "Technical indicators service")
    
    # Check routers
    print("\n4️⃣ ROUTER FILES:")
    check_file_exists("app/routers/__init__.py", "Routers package init")
    check_file_exists("app/routers/data.py", "Basic data router")
    check_file_exists("app/routers/enhanced_data.py", "Enhanced data router")
    check_file_exists("app/routers/indicators.py", "Indicators router")
    check_file_exists("app/routers/backtest.py", "Backtest router")
    
    # Check directories
    print("\n5️⃣ DATA DIRECTORIES:")
    check_file_exists("data/", "Data directory")
    check_file_exists("data/uploads/", "Uploads directory")
    check_file_exists("data/cache/", "Cache directory")
    check_file_exists("data/processed/", "Processed directory")
    
    # Test imports
    check_imports()
    
    print("\n📋 SUMMARY:")
    print("If imports work but endpoints fail, it's likely a router registration issue.")
    print("Check your main.py file and make sure the indicators router is properly included.")
    
    print("\n🚀 RECOMMENDED ACTIONS:")
    print("1. Run this script: python verify_file_structure.py")
    print("2. If imports fail, fix the missing dependencies")
    print("3. If imports work, check main.py router inclusion")
    print("4. Run debug script: python debug_indicators_404.py")

if __name__ == "__main__":
    main()