
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
import logging
from datetime import datetime
from pydantic import BaseModel

from ..services.strategy_engine import StrategyEngine
from ..services.performance_analytics import PerformanceAnalytics 
from ..models.strategy_models import Strategy, Portfolio
from ..models.performance_models import PerformanceReport  

class BacktestRequest(BaseModel):
    # Strategy fields
    name: str
    description: str
    timeframe: str = "1d"
    rules: List[dict]
    position_sizing: dict
    risk_management: dict
    symbols: Optional[List[str]] = None
    
    # Backtest parameters  
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = 100000.0

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
strategy_engine = StrategyEngine()
performance_analytics = PerformanceAnalytics()

@router.get("/indicators")
async def get_available_indicators():
    """Get available indicators for strategy building"""
    try:
        from ..services.technical_indicators import TechnicalIndicators
        

        indicators_info = TechnicalIndicators.get_available_indicators()
        
        # Convert to the format your frontend expects
        indicators = []
        for name, info in indicators_info.items():
            indicators.append({
                "name": name,
                "description": info.get("description", f"{name.upper()} technical indicator"),
                "parameters": {param: f"Parameter for {param} (default: {details.get('default', 'N/A')})" 
                             for param, details in info.get("parameters", {}).items()}
            })
        
        operators = ["gt", "lt", "gte", "lte", "eq", "cross_above", "cross_below"]
        
        logger.info(f"✅ Returning {len(indicators)} indicators and {len(operators)} operators")
        
        return {
            "indicators": indicators,
            "operators": operators
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get available indicators: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get indicators: {str(e)}")

@router.post("/test")
async def test_strategy(
    strategy: Strategy,
    symbol: str,
    start_date: str,
    end_date: str
):
    """Test strategy and return generated signals"""
    try:
        logger.info(f"🧪 Testing strategy: {strategy.name}")
        logger.info(f"📊 Request details:")
        logger.info(f"  - Strategy: {strategy.dict()}")
        logger.info(f"  - Symbol: {symbol}")
        logger.info(f"  - Start Date: {start_date}")
        logger.info(f"  - End Date: {end_date}")
        
        # Get market data
        data = await strategy_engine.get_market_data(symbol, start_date, end_date, strategy.timeframe)
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No market data found for {symbol}")
        
        # Generate signals
        signals = await strategy_engine.generate_signals(strategy, symbol, data)
        
        # Convert signals to dict format for JSON response
        signals_dict = []
        for signal in signals:
            signals_dict.append({
                "timestamp": signal.timestamp.isoformat(),
                "symbol": signal.symbol,
                "signal_type": signal.signal_type,
                "price": signal.price,
                "rule_name": signal.rule_name,
                "confidence": signal.confidence,
                "metadata": signal.metadata
            })
        
        logger.info(f"✅ Strategy test completed: {len(signals)} signals generated")
        
        return signals_dict
        
    except Exception as e:
        logger.error(f"❌ Strategy test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy test failed: {str(e)}")

@router.post("/backtest")
async def run_strategy_backtest(request: BacktestRequest):
    """Run complete strategy backtest with comprehensive performance analysis"""
    try:
        logger.info(f"📊 Running enhanced backtest: {request.name}")
        logger.info(f"💰 Initial capital: ${request.initial_capital}")
        logger.info(f"📊 Params: symbol={request.symbol}, start={request.start_date}, end={request.end_date}")
        
        # Create strategy object from request
        strategy = Strategy(
            name=request.name,
            description=request.description,
            timeframe=request.timeframe,
            rules=request.rules,
            position_sizing=request.position_sizing,
            risk_management=request.risk_management,
            symbols=request.symbols or []
        )
        
        # Extract parameters
        symbol = request.symbol
        start_date = request.start_date
        end_date = request.end_date
        initial_capital = request.initial_capital
        
        # Run strategy simulation
        portfolio = await strategy_engine.simulate_strategy(strategy, symbol, start_date, end_date)
        
        if not portfolio.trades:
            logger.warning("No trades generated - returning basic portfolio data")
            return {
                "strategy": {
                    "name": strategy.name,
                    "description": strategy.description,
                    "timeframe": strategy.timeframe
                },
                "backtest_config": {
                    "symbol": symbol,
                    "start_date": start_date,
                    "end_date": end_date,
                    "initial_capital": initial_capital
                },
                "portfolio": {
                    "cash": portfolio.cash,
                    "total_value": portfolio.total_value,
                    "unrealized_pnl": portfolio.unrealized_pnl,
                    "realized_pnl": portfolio.realized_pnl,
                    "total_return_percent": portfolio.total_return_percent,
                    "positions": [],
                    "trades": []
                },
                "portfolio_values": [initial_capital],
                "portfolio_dates": [start_date],
                "performance_report": {
                    "summary": {
                        "strategy_performance": "No trades executed",
                        "total_return": "0.00%",
                        "risk_assessment": "Unable to assess"
                    },
                    "recommendations": ["No trades were generated - check strategy conditions"]
                }
            }
        
        # Generate comprehensive performance report using your analytics
        logger.info(f"📈 Generating comprehensive performance report with {len(portfolio.trades)} trades")
        
        performance_report = performance_analytics.analyze_portfolio_performance(
            portfolio=portfolio,
            trades=portfolio.trades,
            symbol=symbol,
            strategy_name=strategy.name,
            start_date=start_date,
            end_date=end_date,
            benchmark_symbol="SPY"
        )
        
        logger.info("📊 Generating portfolio time series for advanced visualizations")
        
        # Create portfolio value progression over time
        portfolio_values = [initial_capital]
        portfolio_dates = [start_date]  
        
        sorted_trades = sorted(portfolio.trades, key=lambda t: t.exit_timestamp)
        
        current_value = initial_capital
        for trade in sorted_trades:
            current_value += trade.pnl  
            portfolio_values.append(current_value)
            portfolio_dates.append(trade.exit_timestamp.isoformat())
        
        portfolio_values.append(portfolio.total_value)
        portfolio_dates.append(end_date)
        
        logger.info(f"📈 Generated {len(portfolio_values)} portfolio value points over time")
        
        # Convert portfolio to dict for response
        portfolio_dict = {
            "cash": portfolio.cash,
            "total_value": portfolio.total_value,
            "unrealized_pnl": portfolio.unrealized_pnl,
            "realized_pnl": portfolio.realized_pnl,
            "total_return_percent": portfolio.total_return_percent,
            "positions": [
                {
                    "symbol": pos.symbol,
                    "entry_timestamp": pos.entry_timestamp.isoformat(),
                    "entry_price": pos.entry_price,
                    "quantity": pos.quantity,
                    "current_price": pos.current_price,
                    "unrealized_pnl": pos.unrealized_pnl,
                    "stop_loss": pos.stop_loss,
                    "take_profit": pos.take_profit
                }
                for pos in portfolio.positions
            ],
            "trades": [
                {
                    "symbol": trade.symbol,
                    "entry_timestamp": trade.entry_timestamp.isoformat(),
                    "exit_timestamp": trade.exit_timestamp.isoformat(),
                    "entry_price": trade.entry_price,
                    "exit_price": trade.exit_price,
                    "quantity": trade.quantity,
                    "pnl": trade.pnl,
                    "pnl_percent": trade.pnl_percent,
                    "rule_name": trade.rule_name,
                    "exit_reason": trade.exit_reason,
                    "duration_hours": (trade.exit_timestamp - trade.entry_timestamp).total_seconds() / 3600
                }
                for trade in portfolio.trades
            ]
        }

        # Convert performance report to dict
        performance_dict = {
            "strategy_name": performance_report.strategy_name,
            "symbol": performance_report.symbol,
            "start_date": performance_report.start_date.isoformat(),
            "end_date": performance_report.end_date.isoformat(),
            "analysis_date": performance_report.analysis_date.isoformat(),
            
            # Core metrics
            "metrics": performance_report.metrics.dict(),
            "risk_analysis": performance_report.risk_analysis.dict(),
            
            # Detailed analysis
            "drawdown_periods": [dd.dict() for dd in performance_report.drawdown_periods],
            "current_drawdown": performance_report.current_drawdown.dict() if performance_report.current_drawdown else None,
            "monthly_returns": [mr.dict() for mr in performance_report.monthly_returns],
            "benchmark_comparison": performance_report.benchmark_comparison.dict() if performance_report.benchmark_comparison else None,
            
            # Configuration
            "initial_capital": performance_report.initial_capital,
            "risk_free_rate": performance_report.risk_free_rate
        }
        
        # Create summary and recommendations
        metrics = performance_report.metrics
        risk_analysis = performance_report.risk_analysis
        
        # Generate performance assessment
        if metrics.sharpe_ratio > 1.5:
            performance_assessment = "Excellent"
        elif metrics.sharpe_ratio > 1.0:
            performance_assessment = "Good"
        elif metrics.sharpe_ratio > 0.5:
            performance_assessment = "Average"
        else:
            performance_assessment = "Poor"
        
        # Generate risk assessment
        if metrics.max_drawdown < 10 and risk_analysis.annualized_volatility < 15:
            risk_assessment = "Low Risk"
        elif metrics.max_drawdown < 20 and risk_analysis.annualized_volatility < 25:
            risk_assessment = "Medium Risk"
        else:
            risk_assessment = "High Risk"
        
        # Generate recommendations
        recommendations = []
        if metrics.sharpe_ratio < 0.5:
            recommendations.append("Consider improving risk-adjusted returns - Sharpe ratio is below optimal")
        if metrics.max_drawdown > 20:
            recommendations.append("High maximum drawdown detected - consider tighter risk management")
        if metrics.win_rate < 40:
            recommendations.append("Low win rate - review entry criteria and market conditions")
        if risk_analysis.annualized_volatility > 30:
            recommendations.append("High volatility - consider position sizing adjustments")
        if metrics.total_trades < 10:
            recommendations.append("Low number of trades - consider longer backtest period or different parameters")
        if metrics.profit_factor < 1.5:
            recommendations.append("Profit factor could be improved - analyze losing trades")
        if not recommendations:
            recommendations.append("Strategy shows good performance characteristics")
        
        # Build complete response
        response = {
            "strategy": {
                "name": strategy.name,
                "description": strategy.description,
                "timeframe": strategy.timeframe
            },
            "backtest_config": {
                "symbol": symbol,
                "start_date": start_date,
                "end_date": end_date,
                "initial_capital": initial_capital,
                "data_points": len(performance_report.performance_series) if performance_report.performance_series else 0
            },
            "portfolio": portfolio_dict,
            
            "portfolio_values": portfolio_values,
            "portfolio_dates": portfolio_dates,

            "performance_metrics": {
                "returns": {
                    "total_return_percent": metrics.total_return,
                    "total_return_dollar": (metrics.total_return / 100) * initial_capital,
                    "annualized_return": metrics.annualized_return,
                    "cagr": metrics.annualized_return
                },
                "risk": {
                    "volatility": risk_analysis.annualized_volatility,
                    # ADD these fields for chart compatibility:
                    "volatility_pct": risk_analysis.annualized_volatility,
                    "max_drawdown": metrics.max_drawdown,
                    "max_drawdown_pct": metrics.max_drawdown,
                    "max_drawdown_dollar": (metrics.max_drawdown / 100) * initial_capital,
                    "var_95": metrics.var_95,
                    "var_95_pct": metrics.var_95,
                    "var_99": risk_analysis.var_99
                },
                "risk_adjusted": {
                    "sharpe_ratio": metrics.sharpe_ratio,
                    "sortino_ratio": metrics.sortino_ratio,
                    "calmar_ratio": metrics.calmar_ratio
                },
                "trading": {
                    "total_trades": metrics.total_trades,
                    "win_rate": metrics.win_rate,
                    # NEW: Use actual calculated values from enhanced metrics
                    "avg_trade_duration_hours": getattr(metrics, 'avg_trade_duration_hours', 24 * 7),
                    "largest_win_percent": getattr(metrics, 'largest_win_percent', metrics.best_trade),
                    "largest_loss_percent": getattr(metrics, 'largest_loss_percent', metrics.worst_trade),
                    "turnover_percent": getattr(metrics, 'turnover_percent', 100.0),
                    # Keep existing fields for backward compatibility
                    "profit_factor": metrics.profit_factor,
                    "expectancy": metrics.expectancy,
                    "best_trade": metrics.best_trade,
                    "worst_trade": metrics.worst_trade,
                    "avg_win": metrics.avg_win,
                    "avg_loss": metrics.avg_loss
                },
                "additional": {
                    "profit_factor": metrics.profit_factor,
                    "expectancy": metrics.expectancy,
                    "recovery_factor": metrics.recovery_factor,
                    "beta": performance_report.benchmark_comparison.beta if performance_report.benchmark_comparison else 0.0
                }
            },
            "performance_report": {
                "summary": {
                    "strategy_performance": performance_assessment,
                    "total_return": f"{metrics.total_return:.2f}%",
                    "annualized_return": f"{metrics.annualized_return:.2f}%",
                    "max_drawdown": f"{metrics.max_drawdown:.2f}%",
                    "sharpe_ratio": f"{metrics.sharpe_ratio:.2f}",
                    "total_trades": metrics.total_trades,
                    "win_rate": f"{metrics.win_rate:.1f}%"
                },
                "detailed_metrics": performance_dict,
                "portfolio_summary": {
                    "final_value": f"${portfolio.total_value:.2f}",
                    "cash": f"${portfolio.cash:.2f}",
                    "realized_pnl": f"${portfolio.realized_pnl:.2f}",
                    "unrealized_pnl": f"${portfolio.unrealized_pnl:.2f}",
                    "open_positions": len(portfolio.positions)
                },
                "recommendations": recommendations,
                "risk_assessment": risk_assessment
            },
            "metadata": {
                "backtest_timestamp": datetime.now().isoformat(),
                "total_signals_processed": len(portfolio.trades) * 2,
                "performance_analytics_version": "comprehensive"
            }
        }
        
        logger.info(f"✅ Enhanced backtest completed successfully")
        logger.info(f"📈 Total Return: {metrics.total_return:.2f}%")
        logger.info(f"📊 Sharpe Ratio: {metrics.sharpe_ratio:.2f}")
        logger.info(f"📉 Max Drawdown: {metrics.max_drawdown:.2f}%")
        logger.info(f"🎯 Performance Assessment: {performance_assessment}")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Enhanced backtest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

# ADD a new test endpoint to your router to verify the enhanced metrics:
@router.get("/test-enhanced-trading-metrics")
async def test_enhanced_trading_metrics():
    """Test endpoint to verify enhanced trading metrics are working"""
    try:
        # Create sample trade data
        from datetime import datetime, timedelta
        from ..models.strategy_models import Trade
        
        # Sample trades with proper timestamps
        sample_trades = []
        base_time = datetime(2024, 1, 1, 9, 0, 0)
        
        # Trade 1: Quick win (2 hours, +3%)
        trade1 = Trade(
            symbol="AAPL",
            entry_timestamp=base_time,
            exit_timestamp=base_time + timedelta(hours=2),
            entry_price=100.0,
            exit_price=103.0,
            quantity=100,
            pnl=300.0,
            pnl_percent=3.0,
            rule_name="test_rule",
            exit_reason="take_profit"
        )
        sample_trades.append(trade1)
        
        # Trade 2: Medium loss (1 day, -2%)
        trade2 = Trade(
            symbol="AAPL",
            entry_timestamp=base_time + timedelta(days=1),
            exit_timestamp=base_time + timedelta(days=2),
            entry_price=105.0,
            exit_price=102.9,
            quantity=95,
            pnl=-199.5,
            pnl_percent=-2.0,
            rule_name="test_rule",
            exit_reason="stop_loss"
        )
        sample_trades.append(trade2)
        
        # Trade 3: Long hold win (1 week, +8%)
        trade3 = Trade(
            symbol="AAPL",
            entry_timestamp=base_time + timedelta(days=3),
            exit_timestamp=base_time + timedelta(days=10),
            entry_price=102.0,
            exit_price=110.16,
            quantity=98,
            pnl=799.68,
            pnl_percent=8.0,
            rule_name="test_rule",
            exit_reason="take_profit"
        )
        sample_trades.append(trade3)
        
        # Test enhanced metrics calculation
        analytics = PerformanceAnalytics()
        enhanced_metrics = analytics._calculate_enhanced_trading_metrics(sample_trades)
        
        return {
            "success": True,
            "message": "Enhanced trading metrics test completed",
            "sample_trades_count": len(sample_trades),
            "enhanced_metrics": enhanced_metrics,
            "explanation": {
                "avg_trade_duration_hours": f"Average of {enhanced_metrics['avg_trade_duration_hours']:.1f} hours across all trades",
                "largest_win_percent": f"Best trade: +{enhanced_metrics['largest_win_percent']:.1f}%",
                "largest_loss_percent": f"Worst trade: {enhanced_metrics['largest_loss_percent']:.1f}%",
                "turnover_percent": f"Portfolio turnover: {enhanced_metrics['turnover_percent']:.1f}% annually"
            },
            "validation": {
                "manual_calculations": {
                    "durations": [2.0, 24.0, 168.0],  # hours
                    "returns": [3.0, -2.0, 8.0],  # percentages
                    "manual_avg_duration": (2.0 + 24.0 + 168.0) / 3,
                    "manual_max_win": 8.0,
                    "manual_max_loss": -2.0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Enhanced metrics test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Enhanced metrics test failed"
        }

@router.get("/examples")
async def get_strategy_examples():
    """Get example strategies for the frontend"""
    try:
        examples = {
            "rsi_mean_reversion": {
                "name": "RSI Mean Reversion",
                "description": "Buy when RSI < 40, sell when RSI > 60",
                "timeframe": "1d",
                "rules": [
                    {
                        "name": "buy_oversold",
                        "signal_type": "buy",
                        "conditions": [
                            {
                                "indicator": "rsi",
                                "parameters": {"period": 14},
                                "operator": "lt",
                                "value": 40
                            }
                        ],
                        "logical_operator": "and"
                    },
                    {
                        "name": "sell_overbought", 
                        "signal_type": "sell",
                        "conditions": [
                            {
                                "indicator": "rsi",
                                "parameters": {"period": 14},
                                "operator": "gt",
                                "value": 60
                            }
                        ],
                        "logical_operator": "and"
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
                "description": "Buy when price crosses above SMA(20), sell when crosses below",
                "timeframe": "1d",
                "rules": [
                    {
                        "name": "buy_crossover",
                        "signal_type": "buy",
                        "conditions": [
                            {
                                "indicator": "price",
                                "parameters": {},
                                "operator": "cross_above",
                                "value": {
                                    "indicator": "sma",
                                    "parameters": {"period": 20}
                                }
                            }
                        ],
                        "logical_operator": "and"
                    },
                    {
                        "name": "sell_crossunder",
                        "signal_type": "sell", 
                        "conditions": [
                            {
                                "indicator": "price",
                                "parameters": {},
                                "operator": "cross_below",
                                "value": {
                                    "indicator": "sma",
                                    "parameters": {"period": 20}
                                }
                            }
                        ],
                        "logical_operator": "and"
                    }
                ],
                "position_sizing": {
                    "method": "fixed_percent",
                    "value": 15
                },
                "risk_management": {
                    "stop_loss_percent": 3,
                    "take_profit_percent": 8,
                    "max_positions": 1
                }
            }
        }
        
        logger.info(f"✅ Returning {len(examples)} strategy examples")
        return {"examples": examples}
        
    except Exception as e:
        logger.error(f"❌ Failed to get strategy examples: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get examples: {str(e)}")

@router.get("/health")
async def strategy_router_health():
    """Health check for strategy router"""
    try:
        # Test strategy engine
        test_engine = StrategyEngine()
        
        # Test performance analytics
        test_analytics = PerformanceAnalytics()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "strategy_engine": "✅ operational",
                "performance_analytics": "✅ operational", 
                "indicators": "✅ operational"
            },
            "available_endpoints": {
                "test_strategy": "/test",
                "run_backtest": "/backtest",
                "get_examples": "/examples",
                "get_indicators": "/indicators"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Strategy router health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }