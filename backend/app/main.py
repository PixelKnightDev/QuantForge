# backend/app/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import yfinance as yf
import pandas as pd
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Backtesting Platform API",
    description="API for trading strategy backtesting",
    version="1.0.0"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Backtesting Platform API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "API is working"
    }

@app.get("/api/data/symbols")
async def get_symbols():
    return ["AAPL", "GOOGL", "MSFT", "TSLA", "BTC-USD", "ETH-USD"]

@app.get("/api/data/symbols/{symbol}/info")
async def get_symbol_info(symbol: str):
    try:
        logger.info(f"Getting info for symbol: {symbol}")
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info or len(info) == 0:
            raise HTTPException(status_code=404, detail=f"No information found for symbol {symbol}")
        
        return {
            "symbol": symbol,
            "name": info.get("longName", info.get("shortName", symbol)),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "Unknown"),
            "market_type": "crypto" if "-USD" in symbol else "stock"
        }
    except Exception as e:
        logger.error(f"Error getting symbol info for {symbol}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found or data unavailable")

@app.post("/api/data/market-data")
async def get_market_data(request: dict):
    try:
        symbol = request.get("symbol", "AAPL")
        period = request.get("period", "1mo")
        interval = request.get("interval", "1d")
        
        logger.info(f"Getting market data for {symbol}, period: {period}, interval: {interval}")
        
        # Create ticker and download data
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval, auto_adjust=True, prepost=True)
        
        # Check if data is empty
        if data.empty:
            logger.warning(f"No data returned for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No market data found for symbol {symbol}. Please check if the symbol is correct."
            )
        
        # Check if data has the required columns
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        missing_columns = [col for col in required_columns if col not in data.columns]
        if missing_columns:
            logger.error(f"Missing columns for {symbol}: {missing_columns}")
            raise HTTPException(
                status_code=500,
                detail=f"Data for {symbol} is missing required columns: {missing_columns}"
            )
        
        # Remove any rows with NaN values
        data = data.dropna()
        
        if len(data) == 0:
            logger.warning(f"All data for {symbol} contained NaN values")
            raise HTTPException(
                status_code=404,
                detail=f"No valid data available for {symbol} after cleaning"
            )
        
        # Convert to list format
        data_list = []
        for timestamp, row in data.iterrows():
            try:
                data_point = {
                    "timestamp": timestamp.isoformat(),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
                    "symbol": symbol,
                    "exchange": "yahoo"
                }
                data_list.append(data_point)
            except (ValueError, TypeError) as e:
                logger.warning(f"Skipping invalid data point for {symbol} at {timestamp}: {e}")
                continue
        
        if not data_list:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process any valid data points for {symbol}"
            )
        
        # Create response
        response = {
            "symbol": symbol,
            "exchange": "yahoo",
            "start_date": data_list[0]["timestamp"],
            "end_date": data_list[-1]["timestamp"],
            "interval": interval,
            "data": data_list,
            "total_records": len(data_list)
        }
        
        logger.info(f"Successfully processed {len(data_list)} records for {symbol}")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting market data for {symbol}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error while fetching data for {symbol}: {str(e)}"
        )

@app.post("/api/backtest/validate-strategy")
async def validate_strategy(strategy: dict):
    try:
        required_fields = ["name", "symbol"]
        errors = []
        warnings = []
        
        for field in required_fields:
            if field not in strategy or not strategy[field]:
                errors.append(f"Missing required field: {field}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "strategy_hash": hash(str(strategy)),
            "validated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/api/backtest/run")
async def run_backtest(request: dict):
    try:
        strategy = request.get("strategy", {})
        
        return {
            "backtest_id": f"bt_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "strategy_name": strategy.get("name", "Test Strategy"),
            "symbol": strategy.get("symbol", "AAPL"),
            "status": "completed",
            "start_time": datetime.now().isoformat(),
            "total_return": 12.5,
            "win_rate": 64.0,
            "max_drawdown": -8.2,
            "sharpe_ratio": 1.35,
            "total_trades": 25,
            "message": "Phase 1 mock result - full engine coming in Phase 3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@app.get("/api/backtest/history")
async def get_backtest_history():
    return {
        "backtests": [
            {
                "backtest_id": "bt_20241201_143022",
                "strategy_name": "EMA Crossover",
                "symbol": "AAPL",
                "created_at": "2024-12-01T14:30:22",
                "status": "completed",
                "total_return": 12.5,
                "win_rate": 62.3
            }
        ],
        "total_count": 1,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/data/health")
async def data_health():
    return {
        "status": "healthy",
        "service": "data_service",
        "available_symbols": 6,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/backtest/health")
async def backtest_health():
    return {
        "status": "healthy",
        "service": "backtest_engine",
        "features": ["strategy_validation", "mock_backtesting"],
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🚀 Starting Backtesting Platform API...")
    print("📍 URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("❤️ Health: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )