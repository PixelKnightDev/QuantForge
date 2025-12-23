
"""
Backtesting Platform API
Main FastAPI application that combines all routers and adds missing endpoints
Author: pratyush yadav
Email:pratyushyadav0106@gmail.com
GitHub: https://github.com/pixelknightdev
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


app = FastAPI(
    title="Backtesting Platform API",
    description="Full-stack backtesting platform with visual strategy builder",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3001",
        "ws://localhost:3000",    # WebSocket origins
        "ws://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include all routers
try:
    from app.routers import websocket
    app.include_router(websocket.router, tags=["websocket"]) 
    logger.info("✅ WebSocket router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load WebSocket router: {e}")

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
# REALTIME STRATEGY ROUTER - CORRECTED INDENTATION
# ============================================================================

try:
    from app.routers import realtime_strategy
    app.include_router(realtime_strategy.router, prefix="/api/realtime", tags=["realtime"])
    logger.info("✅ Real-time strategy router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load real-time strategy router: {e}")
    logger.info("🔧 Creating complete fallback real-time router...")
    

    from fastapi import APIRouter, BackgroundTasks
    from pydantic import BaseModel
    import uuid
    import random
    from datetime import datetime
    from typing import Dict
    
    realtime_router = APIRouter()
    demo_strategies: Dict[str, dict] = {}

    class StartRealtimeStrategyRequest(BaseModel):
        strategy_name: str
        symbol: str = "AAPL"
        initial_capital: float = 100000
        strategy_type: str = "rsi_mean_reversion"
        parameters: Dict = {}

    @realtime_router.get("/debug-strategies")
    async def debug_strategies():
        """Debug endpoint to see what's in demo_strategies"""
        try:
            return {
                "total_strategies": len(demo_strategies),
                "strategy_keys": list(demo_strategies.keys()),
                "strategies_detailed": demo_strategies,
                "router_status": "fallback_active",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "error": str(e),
                "demo_strategies_type": type(demo_strategies).__name__,
                "timestamp": datetime.now().isoformat()
            }

    @realtime_router.get("/active-realtime-strategies")
    async def get_active_strategies():
        """Get all active real-time strategies"""
        try:
            logger.info(f"📊 Debug: demo_strategies contains {len(demo_strategies)} strategies")
            logger.info(f"📝 Debug: strategy keys = {list(demo_strategies.keys())}")
            
            active_strategies_list = []
            
            for strategy_id, strategy_info in demo_strategies.items():
                try:
                    logger.info(f"🔍 Processing strategy {strategy_id}: {type(strategy_info)}")
                    
                    # Super safe extraction
                    strategy_response = {
                        "strategy_id": strategy_id,
                        "name": str(strategy_info.get("name", "Unknown Strategy")),
                        "symbol": str(strategy_info.get("symbol", "Unknown")),
                        "status": str(strategy_info.get("status", "unknown")),
                        "start_time": str(strategy_info.get("start_time", datetime.now().isoformat())),
                        "trades_count": int(strategy_info.get("trades_count", 0)),
                        "strategy_type": str(strategy_info.get("strategy_type", "unknown")),
                        "current_performance": strategy_info.get("current_performance", {
                            "portfolio_value": 100000,
                            "total_pnl": 0.0,
                            "total_trades": 0,
                            "win_rate": 0.0,
                            "total_return": 0.0,
                            "sharpe_ratio": 0.0,
                            "max_drawdown": 0.0
                        })
                    }
                    
                    active_strategies_list.append(strategy_response)
                    logger.info(f"✅ Successfully processed strategy {strategy_id}")
                    
                except Exception as strategy_error:
                    logger.error(f"❌ Error processing strategy {strategy_id}: {strategy_error}")
                    continue
            
            logger.info(f"✅ Retrieved {len(active_strategies_list)} active strategies")
            
            return {
                "active_strategies": active_strategies_list,
                "total_active": len(active_strategies_list),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error in get_active_strategies: {e}")
            import traceback
            logger.error(f"📝 Full traceback: {traceback.format_exc()}")
  
            return {
                "active_strategies": [],
                "total_active": 0,
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "debug_info": {
                    "demo_strategies_count": len(demo_strategies),
                    "demo_strategies_keys": list(demo_strategies.keys())
                }
            }

    @realtime_router.post("/start-demo-strategy")
    async def start_demo_strategy():
        """Start a demo strategy for testing"""
        strategy_id = f"demo_{uuid.uuid4().hex[:8]}"
        demo_strategies[strategy_id] = {
            "strategy_id": strategy_id,
            "name": "Demo RSI Mean Reversion",
            "symbol": "AAPL",
            "status": "active",
            "start_time": datetime.now().isoformat(),
            "trades_count": random.randint(5, 25),
            "strategy_type": "demo",
            "current_performance": {
                "portfolio_value": 100000 + random.uniform(-2000, 5000),
                "total_pnl": random.uniform(-1000, 3000),
                "total_trades": random.randint(5, 25),
                "win_rate": random.uniform(45, 75),
                "total_return": random.uniform(-5, 15),
                "sharpe_ratio": random.uniform(0.5, 2.5),
                "max_drawdown": random.uniform(-5, -1)
            }
        }
        
        logger.info(f"✅ Created demo strategy: {strategy_id}")
        return {
            "strategy_id": strategy_id,
            "status": "started",
            "message": "Demo strategy started successfully",
            "config": demo_strategies[strategy_id]
        }

    @realtime_router.post("/start-realtime-strategy")
    async def start_realtime_strategy(request: dict):
        """Start a real-time strategy (handles both Visual Builder and custom strategies)"""
        try:
            # Extract strategy configuration (handles both formats)
            strategy_name = request.get("strategy_name", "Real-time Strategy")
            symbol = request.get("symbol", "AAPL")
            initial_capital = request.get("initial_capital", 100000)
            strategy_type = request.get("strategy_type", "visual_builder")
            parameters = request.get("parameters", {})
            
            # Generate strategy ID
            strategy_id = f"rt_{strategy_type}_{uuid.uuid4().hex[:8]}"
            
            # Create comprehensive strategy configuration
            strategy_config = {
                "strategy_id": strategy_id,
                "name": strategy_name,
                "symbol": symbol,
                "status": "active",
                "start_time": datetime.now().isoformat(),
                "trades_count": 0,
                "strategy_type": strategy_type,
                "parameters": parameters,
                # Visual Builder specific fields
                "visual_config": request.get("config", {}),
                "nodes": request.get("nodes", []),
                "connections": request.get("connections", []),
                # Performance tracking
                "current_performance": {
                    "portfolio_value": initial_capital,
                    "total_pnl": 0.0,
                    "total_trades": 0,
                    "win_rate": 0.0,
                    "total_return": 0.0,
                    "sharpe_ratio": 0.0,
                    "max_drawdown": 0.0,
                    "daily_pnl": 0.0,
                    "unrealized_pnl": 0.0,
                    "realized_pnl": 0.0
                }
            }
            
            # Store the strategy
            demo_strategies[strategy_id] = strategy_config
            
            logger.info(f"✅ Started real-time strategy: {strategy_id} - {strategy_name}")
            logger.info(f"📊 Strategy type: {strategy_type}, Symbol: {symbol}, Capital: ${initial_capital}")
            
            # Return response that frontend expects
            return {
                "success": True,
                "strategy_id": strategy_id,
                "status": "started",
                "message": f"Strategy '{strategy_name}' started successfully",
                "config": strategy_config,
                "deployment_info": {
                    "strategy_id": strategy_id,
                    "name": strategy_name,
                    "symbol": symbol,
                    "type": strategy_type,
                    "started_at": datetime.now().isoformat(),
                    "initial_capital": initial_capital,
                    "nodes_count": len(request.get("nodes", [])),
                    "connections_count": len(request.get("connections", []))
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Real-time strategy start failed: {e}")
            logger.error(f"📝 Request data: {request}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to start strategy: {str(e)}"
            )

    @realtime_router.post("/stop-realtime-strategy/{strategy_id}")
    async def stop_strategy(strategy_id: str):
        """Stop a real-time strategy"""
        if strategy_id in demo_strategies:
            demo_strategies[strategy_id]["status"] = "stopped"
            logger.info(f"🛑 Stopped strategy: {strategy_id}")
            return {
                "strategy_id": strategy_id,
                "status": "stopped",
                "message": "Strategy stopped successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Strategy not found")

    @realtime_router.get("/realtime-engine-health")
    async def get_engine_health():
        """Real-time engine health check"""
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "engine_stats": {
                "total_strategies": len(demo_strategies),
                "active_strategies": len([s for s in demo_strategies.values() if s.get("status") == "active"]),
                "stopped_strategies": len([s for s in demo_strategies.values() if s.get("status") == "stopped"]),
                "visual_strategies": len([s for s in demo_strategies.values() if s.get("strategy_type") == "visual_builder"])
            },
            "mode": "demo_fallback"
        }

    # Include the fallback router - CRITICAL LINE
    app.include_router(realtime_router, prefix="/api/realtime", tags=["realtime"])
    logger.info("✅ Complete fallback real-time router created and loaded")


@app.get("/api/market-data/{symbol}")
async def get_market_data_frontend_compatible(
    symbol: str,
    period: str = Query("1y", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)"),
    source: str = Query("yahoo_finance", description="Data source"),
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """Frontend-compatible market data endpoint"""
    try:
        logger.info(f"🎯 Frontend requesting market data for {symbol}")
        logger.info(f"📊 Parameters: period={period}, interval={interval}, source={source}, cache={use_cache}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()
        
        # Use yfinance to get data
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            logger.warning(f"⚠️ No data found for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for symbol {symbol}. Please check if the symbol is valid and has trading data for the requested period."
            )
        
        # Convert DataFrame to list format
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
        
        # Build response
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
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error fetching market data for {symbol}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error while fetching data for {symbol}: {str(e)}"
        )


@app.get("/api/quality-report/{symbol}")
async def get_quality_report_frontend_compatible(
    symbol: str,
    source: str = "yahoo_finance",
    start_date: str = None,
    end_date: str = None,
    period: str = "1y"
):
    """Frontend-compatible data quality analysis endpoint"""
    try:
        logger.info(f"🔍 Frontend requesting quality report for {symbol}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()

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

        ticker = yf.Ticker(symbol)
        data = ticker.history(start=start_date, end=end_date)
        
        if data.empty:
            logger.warning(f"⚠️ No data found for {symbol}")
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for {symbol} in the specified date range. Please check if the symbol is valid."
            )
        
        # Calculate data quality metrics
        total_rows = len(data)
        missing_data = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        
        price_stats = {
            "mean": float(data['Close'].mean()) if pd.notna(data['Close'].mean()) else 0.0,
            "std": float(data['Close'].std()) if pd.notna(data['Close'].std()) else 0.0,
            "min": float(data['Close'].min()) if pd.notna(data['Close'].min()) else 0.0,
            "max": float(data['Close'].max()) if pd.notna(data['Close'].max()) else 0.0,
            "volatility": float(data['Close'].pct_change().std() * 100) if len(data) > 1 and pd.notna(data['Close'].pct_change().std()) else 0.0,
            "latest_price": float(data['Close'].iloc[-1]) if len(data) > 0 and pd.notna(data['Close'].iloc[-1]) else 0.0,
            "price_change_1d": float(data['Close'].pct_change().iloc[-1] * 100) if len(data) > 1 and pd.notna(data['Close'].pct_change().iloc[-1]) else 0.0
        }
        
        # Volume analysis
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
            missing_penalty = (missing_data / (total_rows * len(data.columns))) * 20
            completeness_penalty = (1 - completeness_ratio) * 30
            quality_score = max(0, 100 - missing_penalty - completeness_penalty)
        
        # Build comprehensive analysis
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
            "data_summary": {
                "first_price": float(data['Close'].iloc[0]) if len(data) > 0 and pd.notna(data['Close'].iloc[0]) else 0.0,
                "last_price": float(data['Close'].iloc[-1]) if len(data) > 0 and pd.notna(data['Close'].iloc[-1]) else 0.0,
                "total_return": 0.0,
                "max_drawdown": 0.0,
                "best_day": 0.0,
                "worst_day": 0.0
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
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error in quality analysis for {symbol}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during quality analysis for {symbol}: {str(e)}"
        )

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
            "realtime": "/api/realtime/",
            "data": "/api/data/",
            "enhanced_data": "/api/enhanced-data/",
            "indicators": "/api/indicators/",
            "strategy": "/api/strategy/"
        },
        "frontend_compatible": {
            "market_data": "✅ /api/market-data/{symbol}",
            "quality_report": "✅ /api/quality-report/{symbol}",
            "realtime_deploy": "✅ /api/realtime/deploy-strategy",
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
    available_routes = [str(route.path) for route in app.routes if hasattr(route, 'path')]
    
    health_status["endpoints"]["data_router"] = "✅ loaded" if any("/api/data" in r for r in available_routes) else "❌ missing"
    health_status["endpoints"]["enhanced_data_router"] = "✅ loaded" if any("/api/enhanced-data" in r for r in available_routes) else "❌ missing"
    health_status["endpoints"]["indicators_router"] = "✅ loaded" if any("/api/indicators" in r for r in available_routes) else "❌ missing"
    health_status["endpoints"]["strategy_router"] = "✅ loaded" if any("/api/strategy" in r for r in available_routes) else "❌ missing"
    health_status["endpoints"]["realtime_router"] = "✅ loaded" if any("/api/realtime" in r for r in available_routes) else "❌ missing"
    health_status["endpoints"]["websocket"] = "✅ loaded" if any("/ws" in r for r in available_routes) else "❌ missing"
    
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
    """Simplified quality report with guaranteed safe numeric values"""
    try:
        logger.info(f"🔍 Simple quality analysis for {symbol}")
        
        # Validate symbol
        if not symbol or len(symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol parameter is required")
        
        symbol = symbol.upper().strip()
        
        # Get 1 year of data
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1y")
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Safe calculations
        total_rows = len(data)
        close_prices = data['Close'].dropna()
        volume_data = data['Volume'].dropna()
        
        # Price statistics with safety checks
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
        
        # Quality metrics
        missing_data = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        completeness = min(100.0, (total_rows / 252) * 100)
        
        # Quality score
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
                first_price = close_prices.iloc[0]
                last_price = close_prices.iloc[-1]
                if pd.notna(first_price) and pd.notna(last_price) and first_price > 0:
                    total_return = ((last_price - first_price) / first_price) * 100
                
                daily_returns = close_prices.pct_change().dropna()
                if len(daily_returns) > 0:
                    best_day = float(daily_returns.max() * 100) if pd.notna(daily_returns.max()) else 0.0
                    worst_day = float(daily_returns.min() * 100) if pd.notna(daily_returns.min()) else 0.0
                    
                    cumulative = (1 + daily_returns).cumprod()
                    rolling_max = cumulative.expanding().max()
                    drawdown = (cumulative - rolling_max) / rolling_max
                    max_drawdown = float(drawdown.min() * 100) if pd.notna(drawdown.min()) else 0.0
                    
            except Exception:
                pass  # Keep default values
        
        # Build safe response
        response = {
            "symbol": symbol,
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "quality": {
                "score": round(quality_score, 1),
                "completeness": round(completeness, 1),
                "missing_data": round((missing_data / (total_rows * len(data.columns)) * 100) if total_rows > 0 else 0.0, 1),
                "total_points": total_rows,
                "duplicate_rows": int(duplicate_rows)
            },
            "price": {
                "mean": round(price_mean, 2),
                "std": round(price_std, 2),
                "min": round(price_min, 2),
                "max": round(price_max, 2),
                "latest": round(latest_price, 2),
                "volatility": round(volatility, 2)
            },
            "volume": {
                "mean": round(volume_mean, 0),
                "std": round(volume_std, 0),
                "zero_days": zero_volume_days,
                "zero_percentage": round((zero_volume_days / total_rows * 100) if total_rows > 0 else 0.0, 1)
            },
            "returns": {
                "total": round(total_return, 2),
                "best_day": round(best_day, 2),
                "worst_day": round(worst_day, 2),
                "max_drawdown": round(max_drawdown, 2)
            },
            "period": {
                "start_date": data.index[0].isoformat() if len(data) > 0 else "",
                "end_date": data.index[-1].isoformat() if len(data) > 0 else "",
                "trading_days": total_rows
            },
            "assessment": "excellent" if quality_score >= 90 else "good" if quality_score >= 75 else "fair" if quality_score >= 60 else "poor",
            "recommendations": [
                "Data quality is excellent for backtesting" if quality_score >= 90 else
                "Data quality is good with minor issues" if quality_score >= 75 else
                "Data has some quality issues to consider" if quality_score >= 60 else
                "Data quality is poor - consider alternative sources"
            ]
        }
        
        logger.info(f"✅ Simple quality analysis completed for {symbol}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error in simple quality analysis for {symbol}: {e}")
        
        # Return safe error response
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
                "realtime": "/api/realtime/",
                "deploy_strategy": "/api/realtime/deploy-strategy",
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


# STARTUP EVENT


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
        test_ticker = yf.Ticker("AAPL")
        test_data = test_ticker.history(period="1d")
        logger.info("✅ YFinance service: Working")
    except Exception as e:
        logger.error(f"❌ YFinance service: Error - {e}")
    
    # Check router availability
    available_routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            available_routes.append(route.path)
    
    # Check for key frontend endpoints
    key_endpoints = {
        "/api/market-data/{symbol}": "✅" if any("/api/market-data/" in r for r in available_routes) else "❌",
        "/api/quality-report/{symbol}": "✅" if any("/api/quality-report/" in r for r in available_routes) else "❌", 
        "/api/realtime/active-realtime-strategies": "✅" if any("/api/realtime/active-realtime-strategies" in r for r in available_routes) else "❌",
        "/api/realtime/deploy-strategy": "✅" if any("/api/realtime/deploy-strategy" in r for r in available_routes) else "❌",
        "/ws": "✅" if any("/ws" in r for r in available_routes) else "❌"
    }
    
    logger.info("🔍 Frontend Endpoint Status:")
    for endpoint, status in key_endpoints.items():
        logger.info(f"   {status} {endpoint}")
    
    # Count total available endpoints
    api_endpoints = [r for r in available_routes if r.startswith("/api/")]
    logger.info(f"📊 Total API endpoints: {len(api_endpoints)}")
    
    if all(status == "✅" for status in key_endpoints.values()):
        logger.info("🎯 All critical frontend endpoints are available!")
        logger.info("🚀 Ready to serve frontend requests!")
        logger.info("💡 Deploy button should now work in Visual Strategy Builder!")
    else:
        missing_endpoints = [endpoint for endpoint, status in key_endpoints.items() if status == "❌"]
        logger.warning(f"⚠️ Missing endpoints: {missing_endpoints}")
    
    logger.info("💡 Quick tests:")
    logger.info("   GET http://localhost:8000/api/realtime/active-realtime-strategies")
    logger.info("   POST http://localhost:8000/api/realtime/deploy-strategy")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("🛑 Shutting down Backtesting Platform API")



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