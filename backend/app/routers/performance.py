# app/routers/performance.py
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from ..models.strategy_models import Strategy, Portfolio
from ..models.performance_models import PerformanceReport, StrategyComparison, PerformanceConfig
from ..services.performance_analytics import PerformanceAnalytics
from ..services.strategy_engine import StrategyEngine

router = APIRouter()
logger = logging.getLogger(__name__)

def get_performance_analytics():
    """Get performance analytics service instance"""
    return PerformanceAnalytics()

def get_strategy_engine():
    """Get strategy engine instance"""
    return StrategyEngine()

@router.get("/health")
async def performance_health_check():
    """Check if performance analytics service is working"""
    try:
        analytics = PerformanceAnalytics()
        return {
            "status": "healthy",
            "message": "Performance analytics service operational",
            "features": [
                "Comprehensive performance metrics",
                "Risk analytics (Sharpe, Sortino, Calmar, VaR)",
                "Benchmark comparison functionality", 
                "Drawdown analysis",
                "Monthly returns breakdown",
                "Strategy comparison tools"
            ],
            "supported_metrics": [
                "Returns", "Volatility", "Sharpe Ratio", "Sortino Ratio",
                "Calmar Ratio", "Max Drawdown", "VaR", "CVaR", "Alpha", "Beta"
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Performance analytics health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Performance analytics service unhealthy: {str(e)}")

@router.post("/analyze", response_model=PerformanceReport)
async def analyze_strategy_performance(
    strategy: Strategy,
    symbol: str,
    start_date: str,
    end_date: str,
    benchmark_symbol: str = Query("SPY", description="Benchmark symbol for comparison"),
    risk_free_rate: float = Query(0.02, description="Risk-free rate for calculations"),
    analytics: PerformanceAnalytics = Depends(get_performance_analytics),
    engine: StrategyEngine = Depends(get_strategy_engine)
):
    """Analyze strategy performance and generate comprehensive report"""
    try:
        logger.info(f"Analyzing performance for strategy '{strategy.name}' on {symbol}")
        
        # Run the strategy backtest first
        portfolio = await engine.simulate_strategy(strategy, symbol, start_date, end_date)
        
        if not portfolio.trades:
            raise HTTPException(
                status_code=400, 
                detail="No trades generated - cannot analyze performance of strategy with no trades"
            )
        
        # Set risk-free rate
        analytics.risk_free_rate = risk_free_rate
        
        # Generate comprehensive performance analysis
        performance_report = analytics.analyze_portfolio_performance(
            portfolio=portfolio,
            trades=portfolio.trades,
            symbol=symbol,
            strategy_name=strategy.name,
            start_date=start_date,
            end_date=end_date,
            benchmark_symbol=benchmark_symbol
        )
        
        logger.info(f"Performance analysis completed for {strategy.name}")
        logger.info(f"Total return: {performance_report.metrics.total_return:.2f}%")
        logger.info(f"Sharpe ratio: {performance_report.metrics.sharpe_ratio:.3f}")
        logger.info(f"Max drawdown: {performance_report.metrics.max_drawdown:.2f}%")
        
        return performance_report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing strategy performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quick-metrics")
async def get_quick_performance_metrics(
    strategy: Strategy,
    symbol: str, 
    start_date: str,
    end_date: str,
    engine: StrategyEngine = Depends(get_strategy_engine),
    analytics: PerformanceAnalytics = Depends(get_performance_analytics)
):
    """Get quick performance metrics without full analysis"""
    try:
        # Run backtest
        portfolio = await engine.simulate_strategy(strategy, symbol, start_date, end_date)
        
        if not portfolio.trades:
            return {
                "status": "no_trades",
                "message": "Strategy generated no trades",
                "basic_metrics": {
                    "total_return": 0.0,
                    "total_trades": 0,
                    "final_value": portfolio.total_value
                }
            }
        
        # Create minimal performance series for metrics calculation
        performance_series = analytics._create_performance_series(
            portfolio, portfolio.trades, start_date, end_date
        )
        
        # Calculate key metrics only
        total_return = performance_series[-1].cumulative_return if performance_series else 0.0
        max_drawdown = max([p.drawdown for p in performance_series]) if performance_series else 0.0
        
        # Trade statistics
        winning_trades = len([t for t in portfolio.trades if t.pnl > 0])
        win_rate = (winning_trades / len(portfolio.trades) * 100) if portfolio.trades else 0.0
        
        return {
            "status": "success",
            "strategy_name": strategy.name,
            "symbol": symbol,
            "period": f"{start_date} to {end_date}",
            "quick_metrics": {
                "total_return": round(total_return * 100, 2),
                "max_drawdown": round(max_drawdown * 100, 2),
                "total_trades": len(portfolio.trades),
                "winning_trades": winning_trades,
                "win_rate": round(win_rate, 1),
                "final_value": round(portfolio.total_value, 2),
                "profit_loss": round(portfolio.realized_pnl, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating quick metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare-strategies")
async def compare_multiple_strategies(
    strategies_config: List[Dict[str, Any]],
    symbol: str,
    start_date: str,
    end_date: str,
    benchmark_symbol: str = "SPY",
    engine: StrategyEngine = Depends(get_strategy_engine),
    analytics: PerformanceAnalytics = Depends(get_performance_analytics)
):
    """Compare performance of multiple strategies"""
    try:
        if len(strategies_config) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 strategies to compare")
        
        comparison_results = {}
        strategy_names = []
        
        for strategy_config in strategies_config:
            try:
                # Parse strategy from config
                strategy = Strategy(**strategy_config)
                strategy_names.append(strategy.name)
                
                # Run backtest
                portfolio = await engine.simulate_strategy(strategy, symbol, start_date, end_date)
                
                # Get quick metrics
                if portfolio.trades:
                    performance_series = analytics._create_performance_series(
                        portfolio, portfolio.trades, start_date, end_date
                    )
                    
                    total_return = performance_series[-1].cumulative_return if performance_series else 0.0
                    max_drawdown = max([p.drawdown for p in performance_series]) if performance_series else 0.0
                    
                    # Calculate Sharpe ratio
                    daily_returns = [p.daily_return for p in performance_series if p.daily_return != 0]
                    if daily_returns:
                        import numpy as np
                        excess_returns = np.array(daily_returns) - (0.02 / 252)  # Risk-free rate
                        sharpe_ratio = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252) if np.std(excess_returns) > 0 else 0.0
                    else:
                        sharpe_ratio = 0.0
                    
                    comparison_results[strategy.name] = {
                        "total_return": round(total_return * 100, 2),
                        "max_drawdown": round(max_drawdown * 100, 2),
                        "sharpe_ratio": round(sharpe_ratio, 3),
                        "total_trades": len(portfolio.trades),
                        "win_rate": round(len([t for t in portfolio.trades if t.pnl > 0]) / len(portfolio.trades) * 100, 1) if portfolio.trades else 0.0,
                        "final_value": round(portfolio.total_value, 2),
                        "status": "success"
                    }
                else:
                    comparison_results[strategy.name] = {
                        "total_return": 0.0,
                        "max_drawdown": 0.0,
                        "sharpe_ratio": 0.0,
                        "total_trades": 0,
                        "win_rate": 0.0,
                        "final_value": 100000.0,
                        "status": "no_trades"
                    }
                    
            except Exception as e:
                comparison_results[f"strategy_{len(comparison_results) + 1}"] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Create rankings
        valid_strategies = {k: v for k, v in comparison_results.items() if v.get("status") == "success"}
        
        rankings = {}
        if valid_strategies:
            # Rank by different metrics
            rankings["by_return"] = sorted(valid_strategies.keys(), 
                                         key=lambda x: valid_strategies[x]["total_return"], reverse=True)
            rankings["by_sharpe"] = sorted(valid_strategies.keys(), 
                                         key=lambda x: valid_strategies[x]["sharpe_ratio"], reverse=True)
            rankings["by_drawdown"] = sorted(valid_strategies.keys(), 
                                           key=lambda x: valid_strategies[x]["max_drawdown"])
        
        return {
            "comparison_results": comparison_results,
            "rankings": rankings,
            "summary": {
                "total_strategies": len(strategies_config),
                "successful_strategies": len(valid_strategies),
                "period": f"{start_date} to {end_date}",
                "symbol": symbol
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing strategies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/definitions")
async def get_performance_metrics_definitions():
    """Get definitions and explanations of all performance metrics"""
    return {
        "return_metrics": {
            "total_return": "Total percentage return over the entire period",
            "annualized_return": "Return per year, adjusted for the actual time period",
            "cumulative_return": "Total return from start to finish"
        },
        "risk_metrics": {
            "volatility": "Standard deviation of returns, annualized",
            "sharpe_ratio": "Risk-adjusted return (excess return / volatility)",
            "sortino_ratio": "Return / downside deviation (only negative returns)",
            "calmar_ratio": "Annual return / maximum drawdown"
        },
        "drawdown_metrics": {
            "max_drawdown": "Largest peak-to-trough decline",
            "avg_drawdown": "Average of all drawdown periods",
            "recovery_factor": "Profit / maximum drawdown"
        },
        "trade_metrics": {
            "win_rate": "Percentage of profitable trades",
            "profit_factor": "Gross profit / gross loss",
            "expectancy": "Expected value per trade"
        },
        "risk_measures": {
            "var_95": "Value at Risk at 95% confidence level",
            "cvar_95": "Conditional VaR (expected loss beyond VaR)",
            "skewness": "Asymmetry of return distribution",
            "kurtosis": "Tail heaviness of return distribution"
        },
        "benchmark_metrics": {
            "alpha": "Excess return over what beta would predict",
            "beta": "Sensitivity to benchmark movements", 
            "correlation": "Relationship strength with benchmark",
            "tracking_error": "Standard deviation of excess returns",
            "information_ratio": "Alpha / tracking error"
        }
    }

@router.get("/examples")
async def get_performance_analysis_examples():
    """Get example performance analysis configurations"""
    return {
        "sample_strategies": [
            {
                "name": "Conservative RSI",
                "description": "Low-risk RSI mean reversion strategy",
                "rules": [
                    {
                        "name": "buy_oversold",
                        "signal_type": "buy",
                        "conditions": [{
                            "indicator": "rsi",
                            "parameters": {"period": 14},
                            "operator": "lt",
                            "value": 25
                        }]
                    },
                    {
                        "name": "sell_overbought",
                        "signal_type": "sell", 
                        "conditions": [{
                            "indicator": "rsi",
                            "parameters": {"period": 14},
                            "operator": "gt",
                            "value": 75
                        }]
                    }
                ],
                "position_sizing": {"method": "fixed_percent", "value": 5},
                "risk_management": {"stop_loss_percent": 3, "take_profit_percent": 6}
            },
            {
                "name": "Aggressive Momentum",
                "description": "High-risk momentum strategy",
                "rules": [
                    {
                        "name": "momentum_buy",
                        "signal_type": "buy",
                        "conditions": [{
                            "indicator": "rsi",
                            "parameters": {"period": 14},
                            "operator": "gt",
                            "value": 60
                        }]
                    },
                    {
                        "name": "momentum_sell",
                        "signal_type": "sell",
                        "conditions": [{
                            "indicator": "rsi", 
                            "parameters": {"period": 14},
                            "operator": "lt",
                            "value": 40
                        }]
                    }
                ],
                "position_sizing": {"method": "fixed_percent", "value": 25},
                "risk_management": {"stop_loss_percent": 8}
            }
        ],
        "benchmark_options": ["SPY", "QQQ", "IWM", "VTI", "^GSPC"],
        "analysis_periods": [
            "2023-01-01 to 2024-01-01",
            "2022-01-01 to 2023-01-01", 
            "2021-01-01 to 2022-01-01"
        ],
        "recommended_symbols": ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"]
    }