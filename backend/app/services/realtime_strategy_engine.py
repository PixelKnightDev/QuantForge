# backend/app/services/realtime_strategy_engine.py
import asyncio
from typing import Dict, Optional
from datetime import datetime
import logging
from .strategy_engine import StrategyEngine
from .performance_analytics import PerformanceAnalytics
from ..routers.websocket import (
    broadcast_strategy_update,
    broadcast_signal_generated,
    broadcast_trade_executed,
    broadcast_performance_metrics
)

logger = logging.getLogger(__name__)

class RealtimeStrategyEngine(StrategyEngine):
    """Extended strategy engine with real-time WebSocket updates"""
    
    def __init__(self):
        super().__init__()
        self.active_strategies: Dict[str, dict] = {}
        self.performance_analytics = PerformanceAnalytics()
    
    async def start_realtime_strategy(self, strategy_id: str, strategy_config: dict):
        """Start a strategy with real-time updates"""
        try:
            # Store strategy configuration
            self.active_strategies[strategy_id] = {
                "config": strategy_config,
                "status": "active",
                "start_time": datetime.now(),
                "trades": [],
                "current_position": 0,
                "portfolio_value": strategy_config.get("initial_capital", 100000)
            }
            
            # Broadcast strategy start
            await broadcast_strategy_update(strategy_id, {
                "status": "started",
                "config": strategy_config,
                "initial_capital": strategy_config.get("initial_capital", 100000)
            })
            
            logger.info(f"Real-time strategy {strategy_id} started")
            
        except Exception as e:
            logger.error(f"Error starting real-time strategy {strategy_id}: {e}")
            raise
    
    async def stop_realtime_strategy(self, strategy_id: str):
        """Stop a real-time strategy"""
        if strategy_id in self.active_strategies:
            self.active_strategies[strategy_id]["status"] = "stopped"
            self.active_strategies[strategy_id]["end_time"] = datetime.now()
            
            # Broadcast strategy stop
            await broadcast_strategy_update(strategy_id, {
                "status": "stopped",
                "end_time": datetime.now().isoformat()
            })
            
            logger.info(f"Real-time strategy {strategy_id} stopped")
    
    async def process_realtime_data(self, symbol: str, price_data: dict):
        """Process real-time market data for all active strategies"""
        for strategy_id, strategy_info in self.active_strategies.items():
            if strategy_info["status"] == "active":
                try:
                    await self._process_strategy_tick(strategy_id, symbol, price_data)
                except Exception as e:
                    logger.error(f"Error processing tick for strategy {strategy_id}: {e}")
    
    async def _process_strategy_tick(self, strategy_id: str, symbol: str, price_data: dict):
        """Process a single tick for a strategy"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        
        # Check if this symbol is relevant for the strategy
        if symbol != config.get("symbol"):
            return
        
        # Generate trading signals
        signals = await self._generate_realtime_signals(strategy_id, price_data)
        
        if signals:
            # Broadcast signals
            await broadcast_signal_generated(strategy_id, {
                "signals": signals,
                "price": price_data["price"],
                "timestamp": price_data["timestamp"]
            })
            
            # Execute trades based on signals
            trades = await self._execute_realtime_trades(strategy_id, signals, price_data)
            
            if trades:
                # Update strategy state
                for trade in trades:
                    strategy_info["trades"].append(trade)
                    strategy_info["current_position"] += trade["quantity"]
                
                # Broadcast trade executions
                await broadcast_trade_executed(strategy_id, {
                    "trades": trades,
                    "current_position": strategy_info["current_position"],
                    "timestamp": datetime.now().isoformat()
                })
                
                # Calculate and broadcast updated performance metrics
                metrics = await self._calculate_realtime_metrics(strategy_id)
                await broadcast_performance_metrics(strategy_id, metrics)
    
    async def _generate_realtime_signals(self, strategy_id: str, price_data: dict) -> list:
        """Generate trading signals based on real-time data"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        signals = []
        
        # Example: RSI-based signals (you'll integrate with your technical indicators)
        try:
            # This is a simplified example - integrate with your existing technical indicators
            current_price = price_data["price"]
            
            # For demo purposes, generate random signals based on price movement
            # In production, this would use your technical indicators
            if len(strategy_info.get("price_history", [])) > 0:
                last_price = strategy_info["price_history"][-1]
                price_change = (current_price - last_price) / last_price
                
                # Simple momentum strategy example
                if price_change > 0.02 and strategy_info["current_position"] <= 0:
                    signals.append({
                        "type": "BUY",
                        "strength": abs(price_change),
                        "price": current_price,
                        "reason": "Momentum breakout"
                    })
                elif price_change < -0.02 and strategy_info["current_position"] >= 0:
                    signals.append({
                        "type": "SELL",
                        "strength": abs(price_change),
                        "price": current_price,
                        "reason": "Momentum breakdown"
                    })
            
            # Update price history
            if "price_history" not in strategy_info:
                strategy_info["price_history"] = []
            strategy_info["price_history"].append(current_price)
            
            # Keep only last 100 prices
            if len(strategy_info["price_history"]) > 100:
                strategy_info["price_history"] = strategy_info["price_history"][-100:]
                
        except Exception as e:
            logger.error(f"Error generating signals for {strategy_id}: {e}")
        
        return signals
    
    async def _execute_realtime_trades(self, strategy_id: str, signals: list, price_data: dict) -> list:
        """Execute trades based on generated signals"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        trades = []
        
        try:
            for signal in signals:
                # Calculate position size
                position_size = self._calculate_position_size(strategy_id, signal)
                
                if position_size > 0:
                    trade = {
                        "id": f"{strategy_id}_{len(strategy_info['trades'])}",
                        "timestamp": datetime.now().isoformat(),
                        "symbol": config.get("symbol"),
                        "type": signal["type"],
                        "quantity": position_size,
                        "price": price_data["price"],
                        "reason": signal.get("reason", "Signal generated"),
                        "signal_strength": signal.get("strength", 1.0)
                    }
                    trades.append(trade)
                    
        except Exception as e:
            logger.error(f"Error executing trades for {strategy_id}: {e}")
        
        return trades
    
    def _calculate_position_size(self, strategy_id: str, signal: dict) -> int:
        """Calculate position size for a trade"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        
        # Simple fixed position sizing (you can enhance this)
        max_position = config.get("max_position", 100)
        current_position = strategy_info["current_position"]
        
        if signal["type"] == "BUY":
            return min(max_position - current_position, config.get("position_size", 10))
        elif signal["type"] == "SELL":
            return min(current_position, config.get("position_size", 10))
        
        return 0
    
    async def _calculate_realtime_metrics(self, strategy_id: str) -> dict:
        """Calculate real-time performance metrics"""
        strategy_info = self.active_strategies[strategy_id]
        
        try:
            trades = strategy_info["trades"]
            if not trades:
                return {"total_trades": 0, "portfolio_value": strategy_info["portfolio_value"]}
            
            # Calculate basic metrics
            total_trades = len(trades)
            winning_trades = len([t for t in trades if self._is_winning_trade(t, strategy_info)])
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            # Calculate P&L
            total_pnl = sum(self._calculate_trade_pnl(trade, strategy_info) for trade in trades)
            
            # Update portfolio value
            current_portfolio_value = strategy_info["portfolio_value"] + total_pnl
            strategy_info["portfolio_value"] = current_portfolio_value
            
            return {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "win_rate": round(win_rate * 100, 2),
                "total_pnl": round(total_pnl, 2),
                "portfolio_value": round(current_portfolio_value, 2),
                "current_position": strategy_info["current_position"],
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating metrics for {strategy_id}: {e}")
            return {"error": str(e)}
    
    def _is_winning_trade(self, trade: dict, strategy_info: dict) -> bool:
        """Determine if a trade is winning (simplified)"""
        # This is a simplified implementation
        return self._calculate_trade_pnl(trade, strategy_info) > 0
    
    def _calculate_trade_pnl(self, trade: dict, strategy_info: dict) -> float:
        """Calculate P&L for a trade (simplified)"""
        # This is a simplified implementation
        # In production, you'd track entry/exit prices properly
        return trade.get("quantity", 0) * 0.1  # Placeholder calculation

# Global instance
realtime_engine = RealtimeStrategyEngine()