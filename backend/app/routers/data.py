from fastapi import APIRouter, HTTPException
from typing import List
import yfinance as yf
import pandas as pd
from datetime import datetime

router = APIRouter()

SAMPLE_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "BTC-USD", "ETH-USD"]

@router.get("/symbols")
async def get_available_symbols():
    return SAMPLE_SYMBOLS

@router.get("/symbols/{symbol}/info")
async def get_symbol_info(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "Unknown"),
            "market_type": "crypto" if "-USD" in symbol else "stock"
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

@router.post("/market-data")
async def get_market_data(request: dict):
    try:
        symbol = request.get("symbol")
        period = request.get("period", "3mo")
        interval = request.get("interval", "1d")

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
                "volume": int(row["Volume"]),
                "symbol": symbol,
                "exchange": "yahoo"
            })
            return {
                "symbol": symbol,
                "exchange": "yahoo",
                "start_date": data.index[0].isoformat(),
                "end_date": data.index[-1].isoformat(),
                "interval": interval,
                "data": data_list,
                "total_records": len(data_list)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def data_service_health():
    return {
        "status": "healthy",
        "service": "data_service",
        "available_symbols": len(SAMPLE_SYMBOLS),
        "timestamp": datetime.now().isoformat()
    }