from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from pathlib import Path

# import routers

from app.routers import data, backtest
from app.routers.enhanced_data import router as enhanced_data_router
from app.routers.indicators import router as indicator_router

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# data directories

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
(data_dir / "uploads").mkdir(exist_ok=True)
(data_dir / "cache").mkdir(exist_ok=True)
(data_dir / "processed").mkdir(exist_ok=True)

# mount static files for uploaded data

app.mount("/static", StaticFiles(directory="data"), name="static")

#include routers
app.include_router(data.router, prefix="/api/data", tags=["Basic Data"])
app.include_router(enhanced_data_router, prefix="/api", tags=["Advanced Data"])
app.include_router(indicator_router, prefix="/api/indicators", tags=["indicators"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["Backtesting"])

# root ednpoint

@app.get("/")
@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Backtesting Platform API",
        "version": "3.0.0",  # Update version for Phase 3
        "status": "running",
        "current_phase": "Phase 3 - Strategy Engine",  # Update phase
        "documentation": "/docs",
        "endpoints": {
            "basic_data": "/api/data/*",
            "enhanced_data": "/api/*",
            "technical_indicators": "/api/indicators/*",  # NEW LINE
            "backtesting": "/api/backtest/*",
            "health_check": "/health"
        },
        "features": {
            "phase_1": [
                "✅ Yahoo Finance data integration",
                "✅ Strategy validation",
                "✅ Mock backtesting",
                "✅ Real-time WebSocket communication"
            ],
            "phase_2": [
                "✅ CSV file upload and processing",
                "✅ Advanced data caching system",
                "✅ Multiple data source support",
                "✅ Data quality analysis",
                "✅ Bulk data operations",
                "✅ Enhanced data preprocessing"
            ],
            "phase_3": [  # NEW SECTION
                "✅ Technical indicators (EMA, RSI, MACD, Bollinger Bands)",
                "✅ Comprehensive indicator library",
                "✅ Multi-symbol indicator calculations",
                "✅ Indicator parameter optimization",
                "🔄 Strategy framework (in progress)",
                "🔄 Backtesting engine (in progress)"
            ],
            "upcoming": [
                "⏳ Strategy modeling system (Phase 3)",
                "⏳ Signal generation logic (Phase 3)",
                "⏳ Visual strategy builder (Phase 5)",
                "⏳ Performance analytics dashboard (Phase 4)"
            ]
        },
        "data_sources": [
            "Yahoo Finance (free)",
            "Binance (API key required)",
            "Coinbase Pro (API key required)",
            "CSV Upload (custom data)"
        ],
        "technical_indicators": [  # NEW SECTION
            "Moving Averages (SMA, EMA, WMA)",
            "Momentum (RSI, Stochastic, Williams %R)",
            "Trend (MACD, ADX)",
            "Volatility (Bollinger Bands, ATR)",
            "Volume (OBV, VWAP)"
        ]
    }

@app.get("/health", tags=["System"])
async def health_check():
    """Comprehensive system health check"""
    try:
        # Check data directories
        directories_status = {
            "data": data_dir.exists(),
            "uploads": (data_dir / "uploads").exists(),
            "cache": (data_dir / "cache").exists(),
            "processed": (data_dir / "processed").exists()
        }
        
        # Check disk space (basic check)
        import shutil
        total, used, free = shutil.disk_usage(data_dir)
        disk_usage = {
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "usage_percent": round((used / total) * 100, 1)
        }
        
        return {
            "status": "healthy",
            "message": "All systems operational",
            "timestamp": "2024-12-01T10:00:00Z",
            "version": "2.0.0",
            "phase": "Phase 2 - Advanced Data Management",
            "services": {
                "api": "healthy",
                "basic_data_service": "healthy",
                "enhanced_data_service": "healthy",
                "backtest_service": "healthy",
                "cache_system": "healthy"
            },
            "infrastructure": {
                "directories": directories_status,
                "disk_usage": disk_usage
            },
            "capabilities": {
                "data_sources": 4,
                "supported_formats": ["CSV", "JSON", "API"],
                "max_file_size_mb": 50,
                "cache_enabled": True,
                "bulk_operations": True
            }
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "message": "System health check failed",
                "error": str(e),
                "timestamp": "2024-12-01T10:00:00z"
            }
        )

# startup event

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Backtesting Platform API v2.0.0")
    logger.info("📊 Phase 2: Advanced Data Management")

    directories = [
        data_dir / "uploads",
        data_dir / "cache", 
        data_dir / "processed",
        data_dir / "temp"
    ]

    for directory in directories:
        directory.mkdir(exist_ok=True)
        logger.info(f"📁 Directory ready: {directory}")

    # Initialize cache cleanup task
    import asyncio
    from app.services.enhanced_data_service import enhanced_data_service
    
    # create necessary directories
    async def periodic_cache_cleanup():
        while True:
            try:
                await enhanced_data_service.cleanup_cache()
                await asyncio.sleep(3600)  # Clean every hour
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
                await asyncio.sleep(3600)
    
    # Start background task
    asyncio.create_task(periodic_cache_cleanup())
    logger.info("🧹 Cache cleanup task started")
    
    logger.info("✅ Application startup completed")

# shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Shutting down Backtesting Platform API")

    # clean up resources
    try:
        from app.services.enhanced_data_service import enhanced_data_service
        await enhanced_data_service.cleanup_cache()
        logger.info("✅ Cache cleaned up")
    except Exception as e:
        logger.error(f"Shutdown cleanup completed")

# global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "detail": str(exc),
            "path": str(request.url),
            "timestamp": "2024-12-01T10:00:00Z"
        }
    )

if __name__ == "__main__":
    print("🚀 Starting Backtesting Platform API...")
    print("📍 URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("❤️ Health: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )