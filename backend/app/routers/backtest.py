from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter()

@router.get("/status")
async def get_backtest_status():
    return {
        "status": "active",
        "service": "backtest_engine",
        "timestamp": datetime.now().isoformat(),
        "feature": ["strategy_validation", "mock_backtesting"]
    }

@router.post("/validate-strategy")
async def validate_strategy(strategy: dict):
    try:
        required_fields = ["name", "symbol"]

        for field in required_fields:
            if field not in strategy:
                return {
                    "valid": False,
                    "errors": [f"Missing required field: {field}"],
                    "warnings": []
                }
            
        return {
            "valid": True,
            "errors": [],
            "warnings": [],
            "strategy_hash": hash(str(strategy)),
            "validated_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.post("/run")
async def run_backtest(request: dict):
    try:
        strategy = request.get("strategy", {})

        validation = await validate_strategy(strategy)
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail="Invalid strategy")
        
        result = {
            backtest_id: f"bt_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "strategy_name": strategy.get("name", "Unknown"),
            "symbol": strategy.get("symbol", "UNKNOWN"),
            "status": "completed",
            "start_time": datetime.now().isoformat(),
            "total_trades": 25,
            "win_rate": 64.0,
            "total_return": 12.5,
            "max_drawdown": -8.2,
            "sharpe_ratio": 1.35,
            "message": "Phase 1 mock result - full engine coming in Phase 3"
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@router.get("/history")
async def get_backtest_history():
    """Get history of previous backtests (mock data)"""
    mock_history = [
        {
            "backtest_id": "bt_20241201_143022",
            "strategy_name": "EMA Crossover",
            "symbol": "AAPL",
            "created_at": "2024-12-01T14:30:22",
            "status": "completed",
            "total_return": 12.5,
            "win_rate": 62.3
        },
        {
            "backtest_id": "bt_20241201_120515", 
            "strategy_name": "RSI Mean Reversion",
            "symbol": "BTC-USD",
            "created_at": "2024-12-01T12:05:15",
            "status": "completed",
            "total_return": -3.2,
            "win_rate": 45.1
        }
    ]
    
    return {
        "backtests": mock_history,
        "total_count": len(mock_history),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/health")
async def backtest_service_health():
    """Health check for backtest service"""
    return {
        "status": "healthy",
        "service": "backtest_engine",
        "features": [
            "strategy_validation",
            "mock_backtesting"
        ],
        "timestamp": datetime.now().isoformat()
    }