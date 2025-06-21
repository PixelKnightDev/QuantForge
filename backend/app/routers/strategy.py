# app/routers/strategy.py - Fixed to work independently
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging
from ..models.strategy_models import Strategy, Signal, Portfolio
from ..services.strategy_engine import StrategyEngine

router = APIRouter()
logger = logging.getLogger(__name__)

def get_strategy_engine():
    """Create strategy engine instance"""
    return StrategyEngine()

@router.post("/test", response_model=List[Signal])
async def test_strategy_signals(
    strategy: Strategy,
    symbol: str,
    start_date: str,
    end_date: str,
    engine: StrategyEngine = Depends(get_strategy_engine)
):
    """Test strategy and return generated signals only (no trading simulation)"""
    try:
        logger.info(f"Testing strategy '{strategy.name}' for {symbol} from {start_date} to {end_date}")
        
        # Get market data
        data = await engine.get_market_data(symbol, start_date, end_date, strategy.timeframe)
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        # Generate signals only
        signals = await engine.generate_signals(strategy, symbol, data)
        
        logger.info(f"Generated {len(signals)} signals for strategy test")
        return signals
        
    except Exception as e:
        logger.error(f"Error testing strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backtest", response_model=Portfolio)
async def backtest_strategy(
    strategy: Strategy,
    symbol: str,
    start_date: str,
    end_date: str,
    engine: StrategyEngine = Depends(get_strategy_engine)
):
    """Run full strategy backtest with trade simulation"""
    try:
        logger.info(f"Running backtest for strategy '{strategy.name}' on {symbol}")
        logger.info(f"Date range: {start_date} to {end_date}")
        logger.info(f"Strategy rules: {len(strategy.rules)}")
        
        # Run complete strategy simulation
        portfolio = await engine.simulate_strategy(strategy, symbol, start_date, end_date)
        
        # Log results summary
        logger.info(f"Backtest completed for {strategy.name}")
        logger.info(f"Total trades: {len(portfolio.trades)}")
        logger.info(f"Final portfolio value: ${portfolio.total_value:.2f}")
        logger.info(f"Total return: ${portfolio.realized_pnl + portfolio.unrealized_pnl:.2f}")
        
        return portfolio
        
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/examples")
async def get_strategy_examples():
    """Get example strategies for testing"""
    examples = {
        "rsi_mean_reversion": {
            "name": "RSI Mean Reversion",
            "description": "Buy when RSI < 30, sell when RSI > 70",
            "rules": [
                {
                    "name": "buy_oversold",
                    "signal_type": "buy",
                    "conditions": [
                        {
                            "indicator": "rsi",
                            "parameters": {"period": 14},
                            "operator": "lt",
                            "value": 30
                        }
                    ]
                },
                {
                    "name": "sell_overbought", 
                    "signal_type": "sell",
                    "conditions": [
                        {
                            "indicator": "rsi",
                            "parameters": {"period": 14},
                            "operator": "gt",
                            "value": 70
                        }
                    ]
                }
            ],
            "position_sizing": {
                "method": "fixed_percent",
                "value": 10
            },
            "risk_management": {
                "stop_loss_percent": 5,
                "take_profit_percent": 10,
                "max_positions": 1
            }
        },
        "sma_crossover": {
            "name": "SMA Crossover",
            "description": "Buy when 50-day SMA crosses above 200-day SMA",
            "rules": [
                {
                    "name": "golden_cross",
                    "signal_type": "buy", 
                    "conditions": [
                        {
                            "indicator": "sma",
                            "parameters": {"period": 50},
                            "operator": "cross_above",
                            "value": {
                                "indicator": "sma",
                                "parameters": {"period": 200}
                            }
                        }
                    ]
                },
                {
                    "name": "death_cross",
                    "signal_type": "sell",
                    "conditions": [
                        {
                            "indicator": "sma", 
                            "parameters": {"period": 50},
                            "operator": "cross_below",
                            "value": {
                                "indicator": "sma",
                                "parameters": {"period": 200}
                            }
                        }
                    ]
                }
            ],
            "position_sizing": {
                "method": "fixed_percent",
                "value": 20
            },
            "risk_management": {
                "stop_loss_percent": 3,
                "max_positions": 1
            }
        },
        "bollinger_bands_squeeze": {
            "name": "Bollinger Bands Mean Reversion",
            "description": "Buy when price touches lower band, sell when it touches upper band",
            "rules": [
                {
                    "name": "buy_lower_band",
                    "signal_type": "buy",
                    "conditions": [
                        {
                            "indicator": "price",
                            "parameters": {},
                            "operator": "lte",
                            "value": {
                                "indicator": "bollinger_bands",
                                "parameters": {"period": 20, "std_dev": 2}
                            }
                        }
                    ]
                },
                {
                    "name": "sell_upper_band",
                    "signal_type": "sell",
                    "conditions": [
                        {
                            "indicator": "price",
                            "parameters": {},
                            "operator": "gte",
                            "value": {
                                "indicator": "bollinger_bands",
                                "parameters": {"period": 20, "std_dev": 2}
                            }
                        }
                    ]
                }
            ],
            "position_sizing": {
                "method": "fixed_percent",
                "value": 15
            },
            "risk_management": {
                "stop_loss_percent": 4,
                "take_profit_percent": 8,
                "max_positions": 1
            }
        }
    }
    
    return examples

@router.get("/health")
async def strategy_health_check():
    """Check if strategy engine is working"""
    try:
        engine = StrategyEngine()
        return {
            "status": "healthy",
            "message": "Strategy engine is operational",
            "indicators_available": True,
            "data_source": "yfinance"
        }
    except Exception as e:
        logger.error(f"Strategy engine health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Strategy engine unhealthy: {str(e)}")

@router.get("/indicators")
async def get_available_indicators():
    """Get list of available technical indicators"""
    return {
        "indicators": [
            {
                "name": "rsi",
                "description": "Relative Strength Index",
                "parameters": {"period": "integer (default: 14)"}
            },
            {
                "name": "sma", 
                "description": "Simple Moving Average",
                "parameters": {"period": "integer"}
            },
            {
                "name": "ema",
                "description": "Exponential Moving Average", 
                "parameters": {"period": "integer"}
            },
            {
                "name": "macd",
                "description": "Moving Average Convergence Divergence",
                "parameters": {"fast": "integer (default: 12)", "slow": "integer (default: 26)", "signal": "integer (default: 9)"}
            },
            {
                "name": "bollinger_bands",
                "description": "Bollinger Bands",
                "parameters": {"period": "integer (default: 20)", "std_dev": "float (default: 2)"}
            },
            {
                "name": "stochastic",
                "description": "Stochastic Oscillator",
                "parameters": {"k_period": "integer (default: 14)", "d_period": "integer (default: 3)"}
            },
            {
                "name": "atr",
                "description": "Average True Range",
                "parameters": {"period": "integer (default: 14)"}
            },
            {
                "name": "adx",
                "description": "Average Directional Index",
                "parameters": {"period": "integer (default: 14)"}
            },
            {
                "name": "obv",
                "description": "On-Balance Volume",
                "parameters": {}
            },
            {
                "name": "vwap",
                "description": "Volume Weighted Average Price",
                "parameters": {}
            },
            {
                "name": "williams_r",
                "description": "Williams %R",
                "parameters": {"period": "integer (default: 14)"}
            }
        ],
        "operators": [
            "gt", "lt", "gte", "lte", "eq", "cross_above", "cross_below"
        ]
    }