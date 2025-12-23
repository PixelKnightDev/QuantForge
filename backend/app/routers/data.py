
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Sample symbols for quick access
SAMPLE_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "BTC-USD", "ETH-USD", "ADA-USD"]

@router.get("/")
async def data_root():
    """Basic data router information"""
    return {
        "message": "Basic Data API",
        "endpoints": {
            "symbols": "/api/data/symbols",
            "market_data_get": "/api/data/market-data/{symbol}",
            "market_data_post": "/api/data/market-data",
            "symbol_info": "/api/data/symbols/{symbol}/info",
            "health": "/api/data/health"
        },
        "features": [
            "Yahoo Finance integration",
            "OHLCV data fetching",
            "Symbol validation",
            "Multiple timeframes",
            "Both GET and POST endpoints"
        ]
    }

@router.get("/health")
async def data_service_health():
    """Data service health check"""
    return {
        "status": "healthy",
        "service": "data_service",
        "available_symbols": len(SAMPLE_SYMBOLS),
        "data_source": "Yahoo Finance",
        "supported_timeframes": ["1d", "1wk", "1mo", "1h", "5m"],
        "timestamp": datetime.now().isoformat()
    }

@router.get("/symbols")
async def get_available_symbols():
    """Get list of available symbols"""
    return {
        "symbols": SAMPLE_SYMBOLS,
        "total": len(SAMPLE_SYMBOLS),
        "categories": {
            "stocks": [s for s in SAMPLE_SYMBOLS if "-USD" not in s],
            "crypto": [s for s in SAMPLE_SYMBOLS if "-USD" in s]
        }
    }

@router.get("/symbols/{symbol}/info")
async def get_symbol_info(symbol: str):
    """Get detailed information about a symbol"""
    try:
        logger.info(f"Getting info for symbol: {symbol}")
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if not info or len(info) < 3:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

        return {
            "symbol": symbol.upper(),
            "name": info.get("longName", symbol),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "Unknown"),
            "market_type": "crypto" if "-USD" in symbol else "stock",
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": info.get("marketCap"),
            "current_price": info.get("currentPrice"),
            "previous_close": info.get("previousClose"),
            "volume": info.get("volume"),
            "description": info.get("businessSummary", "No description available")[:300]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting symbol info for {symbol}: {e}")
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

@router.get("/market-data/{symbol}")
async def get_market_data_by_symbol(
    symbol: str,
    period: str = Query("1y", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)"),
    source: str = Query("yahoo_finance", description="Data source"),
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """Get market data for a symbol via GET request (Frontend compatible)"""
    try:
        logger.info(f"Fetching market data for {symbol} (period: {period}, interval: {interval})")
        
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbol {symbol}. Please check if the symbol is valid."
            )
        
        data_list = []
        for timestamp, row in data.iterrows():
            data_list.append({
                "timestamp": timestamp.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                "symbol": symbol.upper(),
                "exchange": "yahoo"
            })
        
        result = {
            "symbol": symbol.upper(),
            "exchange": "yahoo",
            "period": period,
            "interval": interval,
            "source": source,
            "use_cache": use_cache,
            "start_date": data.index[0].isoformat() if len(data) > 0 else None,
            "end_date": data.index[-1].isoformat() if len(data) > 0 else None,
            "data": data_list,
            "total_records": len(data_list),
            "data_points": len(data_list)
        }
        
        logger.info(f"Successfully fetched {len(data_list)} data points for {symbol}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@router.post("/market-data")
async def get_market_data_post(request: dict):
    """Get market data via POST request (Original endpoint)"""
    try:
        symbol = request.get("symbol")
        period = request.get("period", "3mo")
        interval = request.get("interval", "1d")
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")

        logger.info(f"POST: Fetching market data for {symbol}")
        
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)

        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        data_list = []
        for timestamp, row in data.iterrows():
            data_list.append({
                "timestamp": timestamp.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                "symbol": symbol.upper(),
                "exchange": "yahoo"
            })
        
        return {
            "symbol": symbol.upper(),
            "exchange": "yahoo",
            "start_date": data.index[0].isoformat() if len(data) > 0 else None,
            "end_date": data.index[-1].isoformat() if len(data) > 0 else None,
            "interval": interval,
            "period": period,
            "data": data_list,
            "total_records": len(data_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST: Error fetching market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validate/{symbol}")
async def validate_symbol(symbol: str):
    """Validate if a symbol exists and has data"""
    try:
        logger.info(f"Validating symbol: {symbol}")
        ticker = yf.Ticker(symbol)
        
        data = ticker.history(period="5d")
        
        if data.empty:
            return {
                "symbol": symbol.upper(),
                "valid": False,
                "message": "No data available for this symbol"
            }
        
        return {
            "symbol": symbol.upper(), 
            "valid": True,
            "message": "Symbol is valid",
            "last_price": float(data['Close'].iloc[-1]),
            "last_date": data.index[-1].isoformat(),
            "data_points": len(data)
        }
        
    except Exception as e:
        logger.warning(f"Symbol validation failed for {symbol}: {e}")
        return {
            "symbol": symbol.upper(),
            "valid": False, 
            "message": f"Validation failed: {str(e)}"
        }

@router.get("/search")
async def search_symbols(
    query: str = Query(..., min_length=1, description="Search query for symbols"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """Search for trading symbols"""
    try:

        all_symbols = [
            # Major Stocks
            "AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA", "JPM", "JNJ", "V",
            "PG", "UNH", "HD", "MA", "DIS", "PYPL", "NFLX", "ADBE", "CRM", "CSCO",
            "INTC", "VZ", "PFE", "KO", "PEP", "WMT", "BAC", "XOM", "T", "CVX",
            
            # Crypto
            "BTC-USD", "ETH-USD", "ADA-USD", "SOL-USD", "DOGE-USD", "XRP-USD",
            "DOT-USD", "AVAX-USD", "MATIC-USD", "LTC-USD", "LINK-USD", "UNI-USD",
            
            # ETFs
            "SPY", "QQQ", "IWM", "VTI", "VOO", "VEA", "VWO", "BND", "AGG", "GLD"
        ]
        
        # Filter symbols that contain the query (case insensitive)
        query_upper = query.upper()
        matching_symbols = [
            symbol for symbol in all_symbols 
            if query_upper in symbol
        ][:limit]
        
        # Add basic info for each symbol
        results = []
        for symbol in matching_symbols:
            symbol_type = "crypto" if "-USD" in symbol else "etf" if symbol in ["SPY", "QQQ", "IWM", "VTI", "VOO"] else "stock"
            
            results.append({
                "symbol": symbol,
                "name": symbol,  # Simplified for now
                "type": symbol_type,
                "exchange": "NASDAQ" if symbol_type == "stock" else "Crypto" if symbol_type == "crypto" else "ETF",
                "currency": "USD"
            })
        
        return {
            "query": query,
            "results": results,
            "total": len(results),
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error searching symbols: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/popular")
async def get_popular_symbols():
    """Get list of popular trading symbols organized by category"""
    return {
        "stocks": [
            {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology"},
            {"symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Automotive"},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "E-commerce"},
            {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology"},
            {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology"},
            {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial"},
            {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare"},
            {"symbol": "V", "name": "Visa Inc.", "sector": "Financial"}
        ],
        "etfs": [
            {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "type": "Large Cap"},
            {"symbol": "QQQ", "name": "Invesco QQQ Trust", "type": "Technology"},
            {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "type": "Small Cap"},
            {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "type": "Total Market"},
            {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "type": "Large Cap"}
        ],
        "crypto": [
            {"symbol": "BTC-USD", "name": "Bitcoin", "type": "Cryptocurrency"},
            {"symbol": "ETH-USD", "name": "Ethereum", "type": "Cryptocurrency"},
            {"symbol": "ADA-USD", "name": "Cardano", "type": "Cryptocurrency"},
            {"symbol": "SOL-USD", "name": "Solana", "type": "Cryptocurrency"},
            {"symbol": "DOGE-USD", "name": "Dogecoin", "type": "Cryptocurrency"}
        ],
        "total_categories": 3,
        "total_symbols": 20
    }

@router.get("/latest/{symbol}")
async def get_latest_price(symbol: str):
    """Get the latest price for a symbol"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1d", interval="1m")
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No recent data for {symbol}")
        
        latest = data.iloc[-1]
        
        return {
            "symbol": symbol.upper(),
            "price": float(latest['Close']),
            "timestamp": data.index[-1].isoformat(),
            "volume": int(latest['Volume']) if pd.notna(latest['Volume']) else 0,
            "open": float(latest['Open']),
            "high": float(latest['High']),
            "low": float(latest['Low'])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest price: {str(e)}")