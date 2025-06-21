# main.py - Complete FastAPI application entry point
"""
Backtesting Platform API
Main FastAPI application that combines all routers and adds missing endpoints
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import yfinance as yf
import pandas as pd
import logging
from datetime import datetime
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Backtesting Platform API",
    description="Full-stack backtesting platform with visual strategy builder",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include all routers
try:
    from app.routers import data
    app.include_router(data.router, prefix="/api/data", tags=["data"])
    logger.info("✅ Data router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load data router: {e}")

try:
    from app.routers import enhanced_data
    app.include_router(enhanced_data.router, prefix="/api/enhanced-data", tags=["enhanced-data"])
    logger.info("✅ Enhanced data router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load enhanced data router: {e}")

try:
    from app.routers import indicators
    app.include_router(indicators.router, prefix="/api/indicators", tags=["indicators"])
    logger.info("✅ Indicators router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load indicators router: {e}")

try:
    from app.routers import strategy
    app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])
    logger.info("✅ Strategy router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load strategy router: {e}")

# ============================================================================
# MISSING ENDPOINT FIX: Frontend-Compatible Market Data Endpoint
# ============================================================================

@app.get("/api/market-data/{symbol}")
async def get_market_data_frontend_compatible(
    symbol: str,
    period: str = Query("1y", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)"),
    source: str = Query("yahoo_finance", description="Data source"),
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """
    Frontend-compatible market data endpoint
    
    This endpoint matches the URL pattern your frontend expects: /api/market-data/{symbol}
    It duplicates the functionality from /api/data/market-data/{symbol} but with the correct URL path
    
    Example: GET /api/market-data/AAPL?period=1y&interval=1d&source=yahoo_finance&use_cache=true
    """
    try:
        logger.info(f"🎯 Frontend requesting market data for {symbol}")
        logger.info(f"📊 Parameters: period={period}, interval={interval}, source={source}, cache={use_cache}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()
        
        # Use yfinance to get data (same as your working data router)
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            logger.warning(f"⚠️ No data found for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbol {symbol}. Please check if the symbol is valid and has trading data for the requested period."
            )
        
        # Convert DataFrame to list format (matching your data router format)
        data_list = []
        for timestamp, row in data.iterrows():
            try:
                data_point = {
                    "timestamp": timestamp.isoformat(),
                    "open": float(row["Open"]) if pd.notna(row["Open"]) else None,
                    "high": float(row["High"]) if pd.notna(row["High"]) else None,
                    "low": float(row["Low"]) if pd.notna(row["Low"]) else None,
                    "close": float(row["Close"]) if pd.notna(row["Close"]) else None,
                    "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                    "symbol": symbol,
                    "exchange": "yahoo"
                }
                
                # Only add if we have at least a close price
                if data_point["close"] is not None:
                    data_list.append(data_point)
                    
            except (ValueError, TypeError) as e:
                logger.warning(f"⚠️ Skipping invalid data point for {symbol}: {e}")
                continue
        
        if not data_list:
            raise HTTPException(
                status_code=404,
                detail=f"No valid data points found for {symbol}"
            )
        
        # Build response matching your data router format
        response = {
            "symbol": symbol,
            "exchange": "yahoo",
            "period": period,
            "interval": interval,
            "source": source,
            "use_cache": use_cache,
            "start_date": data.index[0].isoformat() if len(data) > 0 else None,
            "end_date": data.index[-1].isoformat() if len(data) > 0 else None,
            "data": data_list,
            "total_records": len(data_list),
            "data_points": len(data_list),
            "metadata": {
                "endpoint": "frontend_compatible",
                "data_source": "yfinance",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        logger.info(f"✅ Successfully fetched {len(data_list)} data points for {symbol}")
        logger.info(f"📅 Date range: {response['start_date']} to {response['end_date']}")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error fetching market data for {symbol}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error while fetching data for {symbol}: {str(e)}"
        )

# ============================================================================
# MISSING ENDPOINT FIX: Data Quality Report (Frontend Compatible)
# ============================================================================

@app.get("/api/quality-report/{symbol}")
async def get_quality_report_frontend_compatible(
    symbol: str,
    source: str = "yahoo_finance",
    start_date: str = None,
    end_date: str = None,
    period: str = "1y"
):
    """
    Frontend-compatible data quality analysis endpoint
    
    This endpoint matches the URL pattern your frontend expects: /api/quality-report/{symbol}
    It provides the same functionality as /api/enhanced-data/data/analyze/{symbol}
    
    Example: GET /api/quality-report/AAPL?source=yahoo_finance
    """
    try:
        logger.info(f"🔍 Frontend requesting quality report for {symbol}")
        logger.info(f"📊 Parameters: source={source}, start_date={start_date}, end_date={end_date}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()
        
        # Set default date range if not provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_dt = datetime.now()
            
            # Convert period to start date
            if period == "1y":
                start_dt = end_dt - timedelta(days=365)
            elif period == "6mo" or period == "6m":
                start_dt = end_dt - timedelta(days=180)
            elif period == "3mo" or period == "3m":
                start_dt = end_dt - timedelta(days=90)
            elif period == "1mo" or period == "1m":
                start_dt = end_dt - timedelta(days=30)
            else:
                start_dt = end_dt - timedelta(days=365)  # Default to 1 year
            
            start_date = start_dt.strftime("%Y-%m-%d")
            end_date = end_dt.strftime("%Y-%m-%d")
        
        logger.info(f"📅 Using date range: {start_date} to {end_date}")
        
        # Download data for analysis using yfinance
        ticker = yf.Ticker(symbol)
        data = ticker.history(start=start_date, end=end_date)
        
        if data.empty:
            logger.warning(f"⚠️ No data found for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for {symbol} in the specified date range. Please check if the symbol is valid."
            )
        
        # Calculate data quality metrics (same logic as enhanced_data router)
        total_rows = len(data)
        missing_data = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        
        # Price analysis - ensure all values are valid numbers
        price_stats = {
            "mean": float(data['Close'].mean()) if pd.notna(data['Close'].mean()) else 0.0,
            "std": float(data['Close'].std()) if pd.notna(data['Close'].std()) else 0.0,
            "min": float(data['Close'].min()) if pd.notna(data['Close'].min()) else 0.0,
            "max": float(data['Close'].max()) if pd.notna(data['Close'].max()) else 0.0,
            "volatility": float(data['Close'].pct_change().std() * 100) if len(data) > 1 and pd.notna(data['Close'].pct_change().std()) else 0.0,
            "latest_price": float(data['Close'].iloc[-1]) if len(data) > 0 and pd.notna(data['Close'].iloc[-1]) else 0.0,
            "price_change_1d": float(data['Close'].pct_change().iloc[-1] * 100) if len(data) > 1 and pd.notna(data['Close'].pct_change().iloc[-1]) else 0.0
        }
        
        # Volume analysis - ensure all values are valid numbers
        volume_mean = float(data['Volume'].mean()) if pd.notna(data['Volume'].mean()) else 0.0
        volume_std = float(data['Volume'].std()) if pd.notna(data['Volume'].std()) else 0.0
        
        volume_stats = {
            "mean": volume_mean,
            "std": volume_std,
            "zero_volume_days": int((data['Volume'] == 0).sum()),
            "volume_consistency": float(volume_std / volume_mean) if volume_mean > 0 and pd.notna(volume_mean) and pd.notna(volume_std) else 0.0,
            "total_volume": float(data['Volume'].sum()) if pd.notna(data['Volume'].sum()) else 0.0,
            "avg_daily_volume": volume_mean
        }
        
        # Gap analysis (price gaps > 5%)
        if len(data) > 1:
            price_changes = data['Close'].pct_change().abs()
            large_gaps = (price_changes > 0.05).sum()
        else:
            large_gaps = 0
        
        # Data completeness
        try:
            expected_trading_days = pd.bdate_range(start=start_date, end=end_date)
            completeness_ratio = len(data) / len(expected_trading_days) if len(expected_trading_days) > 0 else 1.0
        except Exception:
            completeness_ratio = 1.0  # Fallback
        
        # Calculate overall quality score
        quality_score = 100.0
        if total_rows > 0:
            missing_penalty = (missing_data / (total_rows * len(data.columns))) * 20  # Max 20% penalty for missing data
            completeness_penalty = (1 - completeness_ratio) * 30  # Max 30% penalty for incompleteness
            quality_score = max(0, 100 - missing_penalty - completeness_penalty)
        
        analysis = {
            "symbol": symbol,
            "source": source,
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "total_days": total_rows,
                "period_requested": period
            },
            "data_quality": {
                "completeness_ratio": round(completeness_ratio, 3),
                "missing_data_points": int(missing_data),
                "duplicate_rows": int(duplicate_rows),
                "data_quality_score": round(quality_score, 1),
                "total_data_points": total_rows,
                "completeness_percentage": round(completeness_ratio * 100, 1),
                "missing_percentage": round((missing_data / (total_rows * len(data.columns)) * 100) if total_rows > 0 else 0.0, 1),
                "duplicate_percentage": round((duplicate_rows / total_rows * 100) if total_rows > 0 else 0.0, 1)
            },
            "price_analysis": price_stats,
            "volume_analysis": volume_stats,
            "anomalies": {
                "large_price_gaps": int(large_gaps),
                "zero_volume_days": volume_stats["zero_volume_days"],
                "potential_issues": [],
                "gap_percentage": round((large_gaps / total_rows * 100) if total_rows > 0 else 0.0, 1),
                "zero_volume_percentage": round((volume_stats["zero_volume_days"] / total_rows * 100) if total_rows > 0 else 0.0, 1)
            },
            "recommendations": [],
            "metadata": {
                "analysis_timestamp": datetime.now().isoformat(),
                "endpoint": "frontend_compatible_quality",
                "data_source": "yfinance",
                "analysis_version": "1.0",
                "data_columns": list(data.columns),
                "date_range_actual": {
                    "start": data.index[0].isoformat() if len(data) > 0 else start_date,
                    "end": data.index[-1].isoformat() if len(data) > 0 else end_date
                }
            },
            # Additional metrics that frontend might expect
            "trading_metrics": {
                "trading_days": total_rows,
                "weekend_gaps": 0,  # Placeholder - would need more complex calculation
                "holiday_gaps": 0,  # Placeholder - would need holiday calendar
                "data_frequency": interval if 'interval' in locals() else "1d"
            },
            "data_summary": {
                "first_price": float(data['Close'].iloc[0]) if len(data) > 0 and pd.notna(data['Close'].iloc[0]) else 0.0,
                "last_price": float(data['Close'].iloc[-1]) if len(data) > 0 and pd.notna(data['Close'].iloc[-1]) else 0.0,
                "total_return": 0.0,  # Will calculate below
                "max_drawdown": 0.0,  # Will calculate below
                "best_day": 0.0,     # Will calculate below
                "worst_day": 0.0     # Will calculate below
            }
        }
        
        # Calculate additional summary metrics safely
        if len(data) > 1:
            try:
                # Total return
                first_price = data['Close'].iloc[0]
                last_price = data['Close'].iloc[-1]
                if pd.notna(first_price) and pd.notna(last_price) and first_price > 0:
                    analysis["data_summary"]["total_return"] = round(((last_price - first_price) / first_price) * 100, 2)
                
                # Daily returns for additional metrics
                daily_returns = data['Close'].pct_change().dropna()
                if len(daily_returns) > 0:
                    analysis["data_summary"]["best_day"] = round(float(daily_returns.max()) * 100, 2) if pd.notna(daily_returns.max()) else 0.0
                    analysis["data_summary"]["worst_day"] = round(float(daily_returns.min()) * 100, 2) if pd.notna(daily_returns.min()) else 0.0
                    
                    # Simple max drawdown calculation
                    cumulative = (1 + daily_returns).cumprod()
                    rolling_max = cumulative.expanding().max()
                    drawdown = (cumulative - rolling_max) / rolling_max
                    analysis["data_summary"]["max_drawdown"] = round(float(drawdown.min()) * 100, 2) if pd.notna(drawdown.min()) else 0.0
                    
            except Exception as calc_error:
                logger.warning(f"Error calculating additional metrics: {calc_error}")
                # Keep default values of 0.0
        
        # Add recommendations based on analysis
        if completeness_ratio < 0.9:
            analysis["recommendations"].append("Data completeness is low - consider alternative data source or different time period")
            analysis["anomalies"]["potential_issues"].append("Low data completeness")
        
        if volume_stats["zero_volume_days"] > total_rows * 0.1:
            analysis["recommendations"].append("High number of zero volume days detected - may indicate data quality issues")
            analysis["anomalies"]["potential_issues"].append("High zero-volume days")
            
        if large_gaps > total_rows * 0.05:
            analysis["recommendations"].append("Multiple large price gaps detected - check for stock splits, dividends, or data errors")
            analysis["anomalies"]["potential_issues"].append("Frequent large price gaps")
        
        if price_stats["volatility"] > 50:
            analysis["recommendations"].append("Very high volatility detected - ensure this is expected for the asset")
            analysis["anomalies"]["potential_issues"].append("High volatility")
        
        if not analysis["recommendations"]:
            analysis["recommendations"].append("Data quality is good for backtesting and analysis")
        
        # Add quality assessment
        if quality_score >= 90:
            analysis["quality_assessment"] = "excellent"
        elif quality_score >= 75:
            analysis["quality_assessment"] = "good"
        elif quality_score >= 60:
            analysis["quality_assessment"] = "fair"
        else:
            analysis["quality_assessment"] = "poor"
        
        logger.info(f"✅ Quality analysis completed for {symbol}")
        logger.info(f"📊 Quality Score: {quality_score:.1f}%, Assessment: {analysis['quality_assessment']}")
        logger.info(f"📈 Data points: {total_rows}, Completeness: {completeness_ratio:.1%}")
        
        return analysis
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error in quality analysis for {symbol}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during quality analysis for {symbol}: {str(e)}"
        )

# ============================================================================
# ROOT AND HEALTH ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Backtesting Platform API",
        "status": "running",
        "version": "1.0.0",
        "phase": "Phase 3 - Strategy Engine Development",
        "documentation": "/docs",
        "available_endpoints": {
            "market_data": "/api/market-data/{symbol}",
            "quality_report": "/api/quality-report/{symbol}",
            "data": "/api/data/",
            "enhanced_data": "/api/enhanced-data/",
            "indicators": "/api/indicators/",
            "strategy": "/api/strategy/"
        },
        "frontend_compatible": {
            "market_data": "✅ /api/market-data/{symbol}",
            "quality_report": "✅ /api/quality-report/{symbol}",
            "cors_enabled": "✅ localhost:3000",
            "docs_available": "✅ /docs"
        }
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check for all services"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "backtesting_platform_api",
        "version": "1.0.0",
        "endpoints": {},
        "services": {}
    }
    
    # Test each router endpoint
    try:
        # Test market data endpoint
        test_symbol = "AAPL"
        ticker = yf.Ticker(test_symbol)
        test_data = ticker.history(period="5d")
        health_status["endpoints"]["market_data"] = "✅ working" if not test_data.empty else "❌ no data"
    except Exception as e:
        health_status["endpoints"]["market_data"] = f"❌ error: {str(e)}"
    
    # Check router availability
    health_status["endpoints"]["data_router"] = "✅ loaded" if "data" in [route.prefix for route in app.routes if hasattr(route, 'prefix')] else "❌ missing"
    health_status["endpoints"]["enhanced_data_router"] = "✅ loaded" if any("/enhanced-data" in str(route) for route in app.routes) else "❌ missing"
    health_status["endpoints"]["indicators_router"] = "✅ loaded" if any("/indicators" in str(route) for route in app.routes) else "❌ missing"
    health_status["endpoints"]["strategy_router"] = "✅ loaded" if any("/strategy" in str(route) for route in app.routes) else "❌ missing"
    
    # Service checks
    health_status["services"]["yfinance"] = "✅ available"
    health_status["services"]["pandas"] = "✅ available"
    
    # Overall status
    failed_checks = [k for k, v in health_status["endpoints"].items() if "❌" in str(v)]
    if failed_checks:
        health_status["status"] = "degraded"
        health_status["issues"] = failed_checks
    
    return health_status

@app.get("/api/quality-simple/{symbol}")
async def get_simple_quality_report(symbol: str):
    """
    Simplified quality report endpoint without Query parameter complications
    Returns all the data your frontend needs in a clean, predictable format
    """
    try:
        logger.info(f"🔍 Simple quality analysis for {symbol}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()
        
        # Get 1 year of data (fixed period to avoid parameter issues)
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1y")
        
        if data.empty:
            logger.warning(f"⚠️ No data found for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbol {symbol}. Please check if the symbol is valid."
            )
        
        # Safe calculations with proper null/NaN handling
        total_rows = len(data)
        close_prices = data['Close'].dropna()
        volume_data = data['Volume'].dropna()
        
        # Price statistics
        price_mean = float(close_prices.mean()) if len(close_prices) > 0 and pd.notna(close_prices.mean()) else 0.0
        price_std = float(close_prices.std()) if len(close_prices) > 0 and pd.notna(close_prices.std()) else 0.0
        price_min = float(close_prices.min()) if len(close_prices) > 0 and pd.notna(close_prices.min()) else 0.0
        price_max = float(close_prices.max()) if len(close_prices) > 0 and pd.notna(close_prices.max()) else 0.0
        latest_price = float(close_prices.iloc[-1]) if len(close_prices) > 0 and pd.notna(close_prices.iloc[-1]) else 0.0
        
        # Volatility calculation
        if len(close_prices) > 1:
            returns = close_prices.pct_change().dropna()
            volatility = float(returns.std() * 100) if len(returns) > 0 and pd.notna(returns.std()) else 0.0
        else:
            volatility = 0.0
        
        # Volume statistics
        volume_mean = float(volume_data.mean()) if len(volume_data) > 0 and pd.notna(volume_data.mean()) else 0.0
        volume_std = float(volume_data.std()) if len(volume_data) > 0 and pd.notna(volume_data.std()) else 0.0
        zero_volume_days = int((data['Volume'] == 0).sum())
        
        # Data quality metrics
        missing_data = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        completeness = min(100.0, (total_rows / 252) * 100)  # Assume ~252 trading days per year
        
        # Quality score (simple calculation)
        quality_score = 100.0
        if total_rows > 0:
            missing_penalty = (missing_data / (total_rows * len(data.columns))) * 30
            quality_score = max(0, 100 - missing_penalty)
        
        # Return calculations
        total_return = 0.0
        best_day = 0.0
        worst_day = 0.0
        max_drawdown = 0.0
        
        if len(close_prices) > 1:
            try:
                # Total return
                first_price = close_prices.iloc[0]
                last_price = close_prices.iloc[-1]
                if pd.notna(first_price) and pd.notna(last_price) and first_price > 0:
                    total_return = ((last_price - first_price) / first_price) * 100
                
                # Daily returns
                daily_returns = close_prices.pct_change().dropna()
                if len(daily_returns) > 0:
                    best_day = float(daily_returns.max() * 100) if pd.notna(daily_returns.max()) else 0.0
                    worst_day = float(daily_returns.min() * 100) if pd.notna(daily_returns.min()) else 0.0
                    
                    # Simple drawdown
                    cumulative = (1 + daily_returns).cumprod()
                    rolling_max = cumulative.expanding().max()
                    drawdown = (cumulative - rolling_max) / rolling_max
                    max_drawdown = float(drawdown.min() * 100) if pd.notna(drawdown.min()) else 0.0
                    
            except Exception as calc_error:
                logger.warning(f"Return calculation error: {calc_error}")
                # Keep default values
        
        # Build safe response
        response = {
            "symbol": symbol,
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            
            # Quality metrics
            "quality": {
                "score": round(quality_score, 1),
                "completeness": round(completeness, 1),
                "missing_data": round((missing_data / (total_rows * len(data.columns)) * 100) if total_rows > 0 else 0.0, 1),
                "total_points": total_rows,
                "duplicate_rows": int(duplicate_rows)
            },
            
            # Price analysis
            "price": {
                "mean": round(price_mean, 2),
                "std": round(price_std, 2),
                "min": round(price_min, 2),
                "max": round(price_max, 2),
                "latest": round(latest_price, 2),
                "volatility": round(volatility, 2)
            },
            
            # Volume analysis
            "volume": {
                "mean": round(volume_mean, 0),
                "std": round(volume_std, 0),
                "zero_days": zero_volume_days,
                "zero_percentage": round((zero_volume_days / total_rows * 100) if total_rows > 0 else 0.0, 1)
            },
            
            # Return analysis
            "returns": {
                "total": round(total_return, 2),
                "best_day": round(best_day, 2),
                "worst_day": round(worst_day, 2),
                "max_drawdown": round(max_drawdown, 2)
            },
            
            # Period info
            "period": {
                "start_date": data.index[0].isoformat() if len(data) > 0 else "",
                "end_date": data.index[-1].isoformat() if len(data) > 0 else "",
                "trading_days": total_rows
            },
            
            # Assessment
            "assessment": "excellent" if quality_score >= 90 else "good" if quality_score >= 75 else "fair" if quality_score >= 60 else "poor",
            
            # Recommendations
            "recommendations": [
                "Data quality is excellent for backtesting" if quality_score >= 90 else
                "Data quality is good with minor issues" if quality_score >= 75 else
                "Data has some quality issues to consider" if quality_score >= 60 else
                "Data quality is poor - consider alternative sources"
            ]
        }
        
        logger.info(f"✅ Simple quality analysis completed for {symbol}")
        logger.info(f"📊 Quality Score: {quality_score:.1f}%, Data Points: {total_rows}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error in simple quality analysis for {symbol}: {e}")
        
        # Return safe error response with all expected fields
        return {
            "symbol": symbol,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "quality": {"score": 0.0, "completeness": 0.0, "missing_data": 0.0, "total_points": 0, "duplicate_rows": 0},
            "price": {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "latest": 0.0, "volatility": 0.0},
            "volume": {"mean": 0.0, "std": 0.0, "zero_days": 0, "zero_percentage": 0.0},
            "returns": {"total": 0.0, "best_day": 0.0, "worst_day": 0.0, "max_drawdown": 0.0},
            "period": {"start_date": "", "end_date": "", "trading_days": 0},
            "assessment": "error",
            "recommendations": ["Error occurred during analysis"]
        }
async def debug_quality_fields(symbol: str):
    """Debug endpoint to show exactly what fields and values are returned"""
    try:
        # Get the actual quality report
        result = await get_quality_report_frontend_compatible(symbol)
        
        # Extract all numeric fields that frontend might call .toFixed() on
        numeric_fields = {}
        
        def extract_numeric_fields(obj, prefix=""):
            fields = {}
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_key = f"{prefix}.{key}" if prefix else key
                    if isinstance(value, (int, float)):
                        fields[current_key] = {
                            "value": value,
                            "type": type(value).__name__,
                            "is_none": value is None,
                            "is_number": isinstance(value, (int, float)),
                            "safe_to_fixed": isinstance(value, (int, float)) and value is not None
                        }
                    elif isinstance(value, dict):
                        fields.update(extract_numeric_fields(value, current_key))
            return fields
        
        numeric_fields = extract_numeric_fields(result)
        
        return {
            "symbol": symbol,
            "total_numeric_fields": len(numeric_fields),
            "numeric_fields": numeric_fields,
            "commonly_used_frontend_fields": {
                "data_quality_score": result.get("data_quality", {}).get("data_quality_score"),
                "completeness_ratio": result.get("data_quality", {}).get("completeness_ratio"),
                "completeness_percentage": result.get("data_quality", {}).get("completeness_percentage"),
                "price_mean": result.get("price_analysis", {}).get("mean"),
                "price_volatility": result.get("price_analysis", {}).get("volatility"),
                "volume_mean": result.get("volume_analysis", {}).get("mean"),
                "latest_price": result.get("price_analysis", {}).get("latest_price"),
                "total_return": result.get("data_summary", {}).get("total_return"),
                "max_drawdown": result.get("data_summary", {}).get("max_drawdown")
            },
            "safe_field_access_examples": {
                "quality_score": f"(data?.data_quality?.data_quality_score || 0).toFixed(1)",
                "completeness": f"(data?.data_quality?.completeness_percentage || 0).toFixed(1)",
                "price_mean": f"(data?.price_analysis?.mean || 0).toFixed(2)",
                "volatility": f"(data?.price_analysis?.volatility || 0).toFixed(2)"
            }
        }
        
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

@app.get("/api/frontend-safe-quality/{symbol}")
async def frontend_safe_quality_report(symbol: str):
    """
    Quality report with guaranteed safe numeric values for frontend
    All numeric fields are guaranteed to be numbers, never null/undefined
    """
    try:
        # Get the full quality report
        full_report = await get_quality_report_frontend_compatible(symbol)
        
        # Create a frontend-safe version with guaranteed numeric values
        safe_report = {
            "symbol": symbol,
            "status": "success",
            "quality": {
                "score": float(full_report.get("data_quality", {}).get("data_quality_score", 0)),
                "completeness": float(full_report.get("data_quality", {}).get("completeness_percentage", 0)),
                "missing_data": float(full_report.get("data_quality", {}).get("missing_percentage", 0)),
                "total_points": int(full_report.get("data_quality", {}).get("total_data_points", 0))
            },
            "price": {
                "mean": float(full_report.get("price_analysis", {}).get("mean", 0)),
                "std": float(full_report.get("price_analysis", {}).get("std", 0)),
                "min": float(full_report.get("price_analysis", {}).get("min", 0)),
                "max": float(full_report.get("price_analysis", {}).get("max", 0)),
                "volatility": float(full_report.get("price_analysis", {}).get("volatility", 0)),
                "latest": float(full_report.get("price_analysis", {}).get("latest_price", 0)),
                "change_1d": float(full_report.get("price_analysis", {}).get("price_change_1d", 0))
            },
            "volume": {
                "mean": float(full_report.get("volume_analysis", {}).get("mean", 0)),
                "std": float(full_report.get("volume_analysis", {}).get("std", 0)),
                "total": float(full_report.get("volume_analysis", {}).get("total_volume", 0)),
                "zero_days": int(full_report.get("volume_analysis", {}).get("zero_volume_days", 0))
            },
            "returns": {
                "total": float(full_report.get("data_summary", {}).get("total_return", 0)),
                "best_day": float(full_report.get("data_summary", {}).get("best_day", 0)),
                "worst_day": float(full_report.get("data_summary", {}).get("worst_day", 0)),
                "max_drawdown": float(full_report.get("data_summary", {}).get("max_drawdown", 0))
            },
            "anomalies": {
                "large_gaps": int(full_report.get("anomalies", {}).get("large_price_gaps", 0)),
                "gap_percentage": float(full_report.get("anomalies", {}).get("gap_percentage", 0)),
                "zero_volume_percentage": float(full_report.get("anomalies", {}).get("zero_volume_percentage", 0))
            },
            "metadata": {
                "period": full_report.get("period", {}).get("period_requested", "1y"),
                "start_date": full_report.get("period", {}).get("start_date", ""),
                "end_date": full_report.get("period", {}).get("end_date", ""),
                "analysis_time": full_report.get("metadata", {}).get("analysis_timestamp", "")
            },
            "recommendations": full_report.get("recommendations", []),
            "quality_assessment": full_report.get("quality_assessment", "unknown")
        }
        
        return safe_report
        
    except Exception as e:
        logger.error(f"Error in safe quality report for {symbol}: {e}")
        # Return safe default structure even on error
        return {
            "symbol": symbol,
            "status": "error",
            "error": str(e),
            "quality": {"score": 0.0, "completeness": 0.0, "missing_data": 0.0, "total_points": 0},
            "price": {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "volatility": 0.0, "latest": 0.0, "change_1d": 0.0},
            "volume": {"mean": 0.0, "std": 0.0, "total": 0.0, "zero_days": 0},
            "returns": {"total": 0.0, "best_day": 0.0, "worst_day": 0.0, "max_drawdown": 0.0},
            "anomalies": {"large_gaps": 0, "gap_percentage": 0.0, "zero_volume_percentage": 0.0},
            "metadata": {"period": "1y", "start_date": "", "end_date": "", "analysis_time": ""},
            "recommendations": [],
            "quality_assessment": "error"
        }
async def minimal_quality_test(symbol: str):
    """Minimal quality test with just basic calculations"""
    try:
        logger.info(f"Minimal quality test for {symbol}")
        
        # Get basic data
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1y")
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        
        # Basic calculations with safety checks
        close_prices = data['Close'].dropna()
        volume_data = data['Volume'].dropna()
        
        result = {
            "symbol": symbol,
            "basic_stats": {
                "data_points": len(data),
                "price_mean": float(close_prices.mean()) if len(close_prices) > 0 else 0.0,
                "price_std": float(close_prices.std()) if len(close_prices) > 0 else 0.0,
                "volume_mean": float(volume_data.mean()) if len(volume_data) > 0 else 0.0,
                "latest_price": float(close_prices.iloc[-1]) if len(close_prices) > 0 else 0.0
            },
            "quality_score": 100.0,  # Fixed value for testing
            "completeness": 1.0      # Fixed value for testing
        }
        
        logger.info(f"Minimal test successful for {symbol}")
        return result
        
    except Exception as e:
        logger.error(f"Minimal test failed for {symbol}: {e}")
        return {"error": str(e), "symbol": symbol}
async def simple_test_endpoint(symbol: str):
    """Simple test to check if basic yfinance works"""
    try:
        logger.info(f"Testing simple yfinance call for {symbol}")
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="5d")
        
        if data.empty:
            return {"error": f"No data for {symbol}", "symbol": symbol}
        
        return {
            "symbol": symbol,
            "data_points": len(data),
            "columns": list(data.columns),
            "latest_close": float(data['Close'].iloc[-1]) if len(data) > 0 else None,
            "date_range": {
                "start": data.index[0].isoformat() if len(data) > 0 else None,
                "end": data.index[-1].isoformat() if len(data) > 0 else None
            }
        }
    except Exception as e:
        logger.error(f"Simple test failed: {e}")
        return {"error": str(e), "symbol": symbol}
async def api_status():
    """Quick API status check"""
    return {
        "api_status": "online",
        "timestamp": datetime.now().isoformat(),
        "endpoints_count": len([route for route in app.routes if hasattr(route, 'path')]),
        "phase": "3 - Strategy Engine",
        "ready_for_frontend": True
    }

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler with helpful information"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": f"The requested endpoint {request.url.path} was not found",
            "available_endpoints": {
                "market_data": "/api/market-data/{symbol}",
                "quality_report": "/api/quality-report/{symbol}",
                "data": "/api/data/",
                "enhanced_data": "/api/enhanced-data/",
                "indicators": "/api/indicators/",
                "strategy": "/api/strategy/",
                "docs": "/docs"
            },
            "suggestion": "Check the API documentation at /docs for available endpoints"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    logger.error(f"Internal server error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.now().isoformat(),
            "support": "Check server logs for details"
        }
    )

# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("🚀 Starting Backtesting Platform API")
    logger.info("📊 Phase 3: Strategy Engine Development")
    logger.info("🔗 Frontend compatibility: ✅ Enabled")
    logger.info("📍 API Documentation: http://localhost:8000/docs")
    logger.info("🌐 CORS enabled for: localhost:3000")
    
    # Test critical services
    try:
        # Test yfinance
        test_ticker = yf.Ticker("AAPL")
        test_data = test_ticker.history(period="1d")
        logger.info("✅ YFinance service: Working")
    except Exception as e:
        logger.error(f"❌ YFinance service: Error - {e}")
    
    logger.info("🎯 Ready to serve frontend requests!")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("🛑 Shutting down Backtesting Platform API")

# ============================================================================
# DEVELOPMENT HELPERS
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    logger.info("🔧 Running in development mode")
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        log_level="info"
    )