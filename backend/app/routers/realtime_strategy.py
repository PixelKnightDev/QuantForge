from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Optional
import asyncio
import logging
from datetime import datetime
import uuid

from ..services.realtime_strategy_engine import realtime_engine
from .websocket import broadcast_strategy_update

logger = logging.getLogger(__name__)

router = APIRouter()


class StartRealtimeStrategyRequest(BaseModel):
    strategy_name: str
    symbol: str
    initial_capital: float = 100000
    max_position: int = 100
    position_size: int = 10
    strategy_type: str = "rsi_mean_reversion"
    parameters: Dict = {}

class RealtimeStrategyResponse(BaseModel):
    strategy_id: str
    status: str
    message: str
    config: Dict

class StrategyStatusResponse(BaseModel):
    strategy_id: str
    status: str
    performance: Dict
    active_since: Optional[str]
    trades_count: int


@router.post("/start-realtime-strategy")
async def start_realtime_strategy_unified(
    request: dict, 
    background_tasks: BackgroundTasks
):
    """Start a real-time strategy (handles both Pydantic and dict requests)"""
    try:
        logger.info(f"🚀 Starting real-time strategy: {request}")
        
        strategy_name = request.get("strategy_name", "Real-time Strategy")
        symbol = request.get("symbol", "AAPL")
        initial_capital = request.get("initial_capital", 100000)
        max_position = request.get("max_position", 100)
        position_size = request.get("position_size", 10)
        strategy_type = request.get("strategy_type", "visual_builder")
        parameters = request.get("parameters", {})
        
        strategy_id = f"rt_{strategy_type}_{uuid.uuid4().hex[:8]}"
        
        strategy_config = {
            "strategy_id": strategy_id,
            "name": strategy_name,
            "symbol": symbol,
            "initial_capital": initial_capital,
            "max_position": max_position,
            "position_size": position_size,
            "strategy_type": strategy_type,
            "parameters": parameters,
            "created_at": datetime.now().isoformat()
        }
        await realtime_engine.start_realtime_strategy(strategy_id, strategy_config)
        
        background_tasks.add_task(simulate_realtime_data_for_strategy, strategy_id)
        
        logger.info(f"✅ Started real-time strategy: {strategy_id}")
        
        return {
            "success": True,
            "strategy_id": strategy_id,
            "status": "started",
            "message": f"Real-time strategy '{strategy_name}' started successfully",
            "config": strategy_config
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting real-time strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start strategy: {str(e)}")

@router.post("/stop-realtime-strategy/{strategy_id}")
async def stop_realtime_strategy(strategy_id: str):
    """
    Stop a real-time strategy
    """
    try:
        await realtime_engine.stop_realtime_strategy(strategy_id)
        
        logger.info(f"🛑 Stopped real-time strategy: {strategy_id}")
        
        return {
            "strategy_id": strategy_id,
            "status": "stopped",
            "message": "Strategy stopped successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error stopping strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop strategy: {str(e)}")

@router.get("/realtime-strategy-status/{strategy_id}", response_model=StrategyStatusResponse)
async def get_realtime_strategy_status(strategy_id: str):
    """
    Get current status of a real-time strategy
    """
    try:
        if strategy_id not in realtime_engine.active_strategies:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        strategy_info = realtime_engine.active_strategies[strategy_id]
        metrics = await realtime_engine._calculate_realtime_metrics(strategy_id)
        
        return StrategyStatusResponse(
            strategy_id=strategy_id,
            status=strategy_info["status"],
            performance=metrics,
            active_since=strategy_info.get("start_time", {}).get("isoformat", lambda: "")(),
            trades_count=len(strategy_info.get("trades", []))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting strategy status {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get strategy status: {str(e)}")



@router.get("/active-realtime-strategies")
async def get_active_realtime_strategies():
    """Get list of all active real-time strategies - SAFE VERSION"""
    try:
        logger.info(f"📊 Getting active strategies from realtime_engine...")
        
        active_strategies = []
        
        for strategy_id, strategy_info in realtime_engine.active_strategies.items():
            try:
                logger.info(f"🔍 Processing strategy {strategy_id}")
                
                # SAFE extraction of start_time
                start_time_raw = strategy_info.get("start_time")
                if isinstance(start_time_raw, str):
                    start_time_str = start_time_raw
                elif hasattr(start_time_raw, 'isoformat'):
                    start_time_str = start_time_raw.isoformat()
                else:
                    start_time_str = datetime.now().isoformat()
                
                # SAFE extraction of config
                config = strategy_info.get("config", {})
                if not isinstance(config, dict):
                    config = {}
                
                # Get metrics safely
                try:
                    metrics = await realtime_engine._calculate_realtime_metrics(strategy_id)
                    if not isinstance(metrics, dict):
                        metrics = {"error": "invalid_metrics_format"}
                except Exception as e:
                    logger.warning(f"Could not get metrics for {strategy_id}: {e}")
                    metrics = {
                        "portfolio_value": 100000,
                        "total_pnl": 0.0,
                        "total_trades": 0,
                        "win_rate": 0.0,
                        "error": "metrics_unavailable"
                    }
                
                # Build safe strategy object
                strategy_obj = {
                    "strategy_id": str(strategy_id),
                    "name": str(config.get("name", "Unknown Strategy")),
                    "symbol": str(config.get("symbol", "Unknown")),
                    "status": str(strategy_info.get("status", "unknown")),
                    "start_time": start_time_str,
                    "trades_count": len(strategy_info.get("trades", [])),
                    "strategy_type": str(strategy_info.get("strategy_type", "unknown")),
                    "current_performance": metrics
                }
                
                # Only add active strategies
                if strategy_obj["status"] == "active":
                    active_strategies.append(strategy_obj)
                    logger.info(f"✅ Added active strategy: {strategy_id}")
                
            except Exception as strategy_error:
                logger.error(f"❌ Error processing strategy {strategy_id}: {strategy_error}")
                continue
        
        logger.info(f"✅ Returning {len(active_strategies)} active strategies")
        
        return {
            "active_strategies": active_strategies,
            "total_active": len(active_strategies),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_active_realtime_strategies: {e}")
        import traceback
        logger.error(f"📝 Full traceback: {traceback.format_exc()}")
        
        # Return safe fallback
        return {
            "active_strategies": [],
            "total_active": 0,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


@router.post("/start-demo-strategy")
async def start_demo_strategy(background_tasks: BackgroundTasks):
    """
    Start a demo RSI mean reversion strategy for testing
    """
    demo_request = StartRealtimeStrategyRequest(
        strategy_name="Demo RSI Mean Reversion",
        symbol="AAPL",
        initial_capital=100000,
        max_position=100,
        position_size=10,
        strategy_type="rsi_mean_reversion",
        parameters={
            "rsi_period": 14,
            "rsi_oversold": 30,
            "rsi_overbought": 70,
            "stop_loss_percent": 2.0,
            "take_profit_percent": 4.0
        }
    )
    
    return await start_realtime_strategy(demo_request, background_tasks)

@router.post("/trigger-demo-signal/{strategy_id}")
async def trigger_demo_signal(strategy_id: str):
    """
    Manually trigger a demo signal for testing WebSocket updates
    """
    try:
        if strategy_id not in realtime_engine.active_strategies:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        # Create demo market data
        demo_price_data = {
            "price": 150.50,
            "volume": 5000,
            "timestamp": datetime.now().isoformat(),
            "symbol": realtime_engine.active_strategies[strategy_id]["config"]["symbol"]
        }
        
        # Process the demo data (this will trigger signals and broadcasts)
        await realtime_engine.process_realtime_data(
            demo_price_data["symbol"], 
            demo_price_data
        )
        
        return {
            "strategy_id": strategy_id,
            "message": "Demo signal triggered",
            "price_data": demo_price_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error triggering demo signal for {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger demo signal: {str(e)}")


@router.post("/deploy-strategy")
async def deploy_strategy(request: dict):
    """Deploy a visual strategy builder strategy to real-time trading"""
    try:
        logger.info(f"🚀 Deploying visual strategy: {request}")
        
        strategy_name = request.get("name", "Visual Strategy")
        symbol = request.get("symbol", "AAPL")
        initial_capital = request.get("initial_capital", 100000)
        
        # Generate strategy ID
        strategy_id = f"visual_{uuid.uuid4().hex[:8]}"
        
        # Build strategy configuration for realtime_engine
        strategy_config = {
            "strategy_id": strategy_id,
            "name": strategy_name,
            "symbol": symbol,
            "initial_capital": initial_capital,
            "max_position": 100,
            "position_size": 10,
            "strategy_type": "visual_builder",
            "parameters": request.get("parameters", {}),
            "visual_config": request.get("config", {}),
            "nodes": request.get("nodes", []),
            "connections": request.get("connections", []),
            "created_at": datetime.now().isoformat()
        }
        
        await realtime_engine.start_realtime_strategy(strategy_id, strategy_config)
        
        logger.info(f"✅ Deployed visual strategy: {strategy_id} - {strategy_name}")
        
        return {
            "success": True,
            "strategy_id": strategy_id,
            "status": "deployed",
            "message": f"Strategy '{strategy_name}' deployed successfully",
            "deployment_info": {
                "strategy_id": strategy_id,
                "name": strategy_name,
                "symbol": symbol,
                "type": "visual_builder",
                "deployed_at": datetime.now().isoformat(),
                "initial_capital": initial_capital,
                "nodes_count": len(request.get("nodes", [])),
                "connections_count": len(request.get("connections", []))
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Strategy deployment failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to deploy strategy: {str(e)}"
        )

@router.post("/start-realtime-strategy-dict")
async def start_realtime_strategy_dict(request: dict):
    """Start a real-time strategy from dict (for Visual Strategy Builder compatibility)"""
    try:
        logger.info(f"🚀 Starting strategy from dict: {request}")
        
        strategy_request = StartRealtimeStrategyRequest(
            strategy_name=request.get("strategy_name", "Real-time Strategy"),
            symbol=request.get("symbol", "AAPL"),
            initial_capital=request.get("initial_capital", 100000),
            max_position=request.get("max_position", 100),
            position_size=request.get("position_size", 10),
            strategy_type=request.get("strategy_type", "visual_builder"),
            parameters=request.get("parameters", {})
        )
        
        # Use the existing endpoint
        background_tasks = BackgroundTasks()
        result = await start_realtime_strategy(strategy_request, background_tasks)
        
        logger.info(f"✅ Started strategy via dict: {result.strategy_id}")
        
        return {
            "success": True,
            "strategy_id": result.strategy_id,
            "status": result.status,
            "message": result.message,
            "config": result.config
        }
        
    except Exception as e:
        logger.error(f"❌ Strategy start from dict failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to start strategy: {str(e)}"
        )

@router.get("/debug-strategies")
async def debug_strategies():
    """Debug endpoint to see what's in realtime_engine"""
    try:
        return {
            "total_strategies": len(realtime_engine.active_strategies),
            "strategy_keys": list(realtime_engine.active_strategies.keys()),
            "strategies_detailed": realtime_engine.active_strategies,
            "router_status": "real_router_active",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "router_status": "real_router_with_error",
            "timestamp": datetime.now().isoformat()
        }

async def simulate_realtime_data_for_strategy(strategy_id: str):
    """
    Background task to simulate real-time market data for a strategy
    This would be replaced with actual market data feeds in production
    """
    import random
    
    logger.info(f"🔄 Starting real-time data simulation for strategy: {strategy_id}")
    
    base_price = 150.0
    current_price = base_price
    
    try:
        while strategy_id in realtime_engine.active_strategies:
            strategy_info = realtime_engine.active_strategies[strategy_id]
            
            # Skip if strategy is not active
            if strategy_info["status"] != "active":
                await asyncio.sleep(1)
                continue
            
            # Simulate price movement (random walk)
            price_change = random.uniform(-0.02, 0.02)  # ±2% change
            current_price = max(current_price * (1 + price_change), 1.0)  # Ensure price > 0
            
            # Create market data
            market_data = {
                "symbol": strategy_info["config"]["symbol"],
                "price": round(current_price, 2),
                "volume": random.randint(1000, 10000),
                "timestamp": datetime.now().isoformat(),
                "bid": round(current_price - 0.01, 2),
                "ask": round(current_price + 0.01, 2)
            }
            
            # Process the data through the strategy engine
            await realtime_engine.process_realtime_data(
                market_data["symbol"], 
                market_data
            )
            
            # Wait before next update (1 second intervals)
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"❌ Error in real-time data simulation for {strategy_id}: {e}")
    finally:
        logger.info(f"🛑 Stopped real-time data simulation for strategy: {strategy_id}")

@router.post("/start-market-data-simulation")
async def start_market_data_simulation(background_tasks: BackgroundTasks):
    """
    Start market data simulation for all active strategies
    """
    try:
        active_count = len([
            s for s in realtime_engine.active_strategies.values() 
            if s["status"] == "active"
        ])
        
        if active_count == 0:
            raise HTTPException(
                status_code=400, 
                detail="No active strategies found. Start a strategy first."
            )
        for strategy_id, strategy_info in realtime_engine.active_strategies.items():
            if strategy_info["status"] == "active":
                background_tasks.add_task(simulate_realtime_data_for_strategy, strategy_id)
        
        return {
            "message": f"Market data simulation started for {active_count} active strategies",
            "active_strategies": list(realtime_engine.active_strategies.keys()),
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error starting market data simulation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start simulation: {str(e)}")


@router.get("/strategy-templates")
async def get_strategy_templates():
    """
    Get available strategy templates for real-time trading
    """
    templates = {
        "rsi_mean_reversion": {
            "name": "RSI Mean Reversion",
            "description": "Buy when RSI < oversold threshold, sell when RSI > overbought threshold",
            "parameters": {
                "rsi_period": {"type": "int", "default": 14, "min": 5, "max": 30},
                "rsi_oversold": {"type": "float", "default": 30, "min": 10, "max": 40},
                "rsi_overbought": {"type": "float", "default": 70, "min": 60, "max": 90},
                "stop_loss_percent": {"type": "float", "default": 2.0, "min": 0.5, "max": 5.0},
                "take_profit_percent": {"type": "float", "default": 4.0, "min": 1.0, "max": 10.0}
            }
        },
        "momentum_breakout": {
            "name": "Momentum Breakout",
            "description": "Buy on upward momentum, sell on downward momentum",
            "parameters": {
                "momentum_period": {"type": "int", "default": 10, "min": 5, "max": 20},
                "breakout_threshold": {"type": "float", "default": 0.02, "min": 0.01, "max": 0.05},
                "stop_loss_percent": {"type": "float", "default": 1.5, "min": 0.5, "max": 3.0},
                "take_profit_percent": {"type": "float", "default": 3.0, "min": 1.0, "max": 8.0}
            }
        },
        "moving_average_crossover": {
            "name": "Moving Average Crossover",
            "description": "Buy when fast MA crosses above slow MA, sell when fast MA crosses below slow MA",
            "parameters": {
                "fast_period": {"type": "int", "default": 10, "min": 5, "max": 20},
                "slow_period": {"type": "int", "default": 30, "min": 20, "max": 50},
                "stop_loss_percent": {"type": "float", "default": 2.0, "min": 0.5, "max": 4.0},
                "take_profit_percent": {"type": "float", "default": 4.0, "min": 1.0, "max": 8.0}
            }
        }
    }
    
    return {
        "templates": templates,
        "total_templates": len(templates),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/validate-strategy-config")
async def validate_strategy_config(request: StartRealtimeStrategyRequest):
    """
    Validate strategy configuration before starting
    """
    try:
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        # Basic validation
        if request.initial_capital < 1000:
            validation_results["errors"].append("Initial capital should be at least $1,000")
            validation_results["valid"] = False
        
        if request.max_position <= 0:
            validation_results["errors"].append("Max position must be greater than 0")
            validation_results["valid"] = False
        
        if request.position_size <= 0 or request.position_size > request.max_position:
            validation_results["errors"].append("Position size must be between 1 and max_position")
            validation_results["valid"] = False
        
        # Strategy-specific validation
        if request.strategy_type == "rsi_mean_reversion":
            rsi_oversold = request.parameters.get("rsi_oversold", 30)
            rsi_overbought = request.parameters.get("rsi_overbought", 70)
            
            if rsi_oversold >= rsi_overbought:
                validation_results["errors"].append("RSI oversold threshold must be less than overbought threshold")
                validation_results["valid"] = False
            
            if rsi_oversold < 10 or rsi_oversold > 40:
                validation_results["warnings"].append("RSI oversold threshold outside typical range (10-40)")
            
            if rsi_overbought < 60 or rsi_overbought > 90:
                validation_results["warnings"].append("RSI overbought threshold outside typical range (60-90)")
        
        # Suggestions
        if request.initial_capital > 1000000:
            validation_results["suggestions"].append("Consider starting with smaller capital for testing")
        
        if not request.parameters:
            validation_results["suggestions"].append("Consider customizing strategy parameters for better performance")
        
        return validation_results
        
    except Exception as e:
        logger.error(f"❌ Error validating strategy config: {e}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@router.get("/realtime-performance-summary")
async def get_realtime_performance_summary():
    """
    Get performance summary for all active real-time strategies
    """
    try:
        summary = {
            "total_strategies": len(realtime_engine.active_strategies),
            "active_strategies": 0,
            "total_portfolio_value": 0.0,
            "total_pnl": 0.0,
            "total_trades": 0,
            "overall_win_rate": 0.0,
            "strategies": []
        }
        
        winning_trades = 0
        total_trades = 0
        
        for strategy_id, strategy_info in realtime_engine.active_strategies.items():
            if strategy_info["status"] == "active":
                summary["active_strategies"] += 1
                
                try:
                    metrics = await realtime_engine._calculate_realtime_metrics(strategy_id)
                    
                    summary["total_portfolio_value"] += metrics.get("portfolio_value", 0)
                    summary["total_pnl"] += metrics.get("total_pnl", 0)
                    summary["total_trades"] += metrics.get("total_trades", 0)
                    
                    winning_trades += metrics.get("winning_trades", 0)
                    total_trades += metrics.get("total_trades", 0)
                    
                    summary["strategies"].append({
                        "strategy_id": strategy_id,
                        "name": strategy_info["config"].get("name", "Unknown"),
                        "symbol": strategy_info["config"].get("symbol", "Unknown"),
                        "performance": metrics
                    })
                    
                except Exception as e:
                    logger.warning(f"Could not get metrics for {strategy_id}: {e}")
        
        # Calculate overall win rate
        if total_trades > 0:
            summary["overall_win_rate"] = (winning_trades / total_trades) * 100
        
        summary["timestamp"] = datetime.now().isoformat()
        
        return summary
        
    except Exception as e:
        logger.error(f"❌ Error getting performance summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")


# HEALTH CHECK ENDPOINT

@router.get("/realtime-engine-health")
async def get_realtime_engine_health():
    """
    Health check for the real-time strategy engine
    """
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "engine_stats": {
                "total_strategies": len(realtime_engine.active_strategies),
                "active_strategies": len([
                    s for s in realtime_engine.active_strategies.values() 
                    if s["status"] == "active"
                ]),
                "stopped_strategies": len([
                    s for s in realtime_engine.active_strategies.values() 
                    if s["status"] == "stopped"
                ])
            },
            "websocket_status": "available",  # This would check actual WebSocket health
            "memory_usage": "normal",  # This would check actual memory usage
            "performance": "optimal"
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"❌ Error getting engine health: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }