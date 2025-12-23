import os
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

# API Configuration
API_HOST = "0.0.0.0"
API_PORT = 8000
API_RELOAD = True

# Data Configuration
DEFAULT_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "BTC-USD", "ETH-USD"]
DEFAULT_PERIOD = "2y"  # 
DEFAULT_INTERVAL = "1d"  

# Create directories if they don't exist
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
