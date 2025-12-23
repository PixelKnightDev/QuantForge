
import asyncio
import uuid
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
        logger.info("✅ Real-time Strategy Engine initialized")
    
    async def start_realtime_strategy(self, strategy_id: str, strategy_config: dict):
        """Start a strategy with real-time updates - FIXED VERSION"""
        try:
            logger.info(f"🚀 Starting real-time strategy: {strategy_id}")
            logger.info(f"📋 Strategy config: {strategy_config}")
            
            self.active_strategies[strategy_id] = {
                "strategy_id": strategy_id,
                "config": strategy_config,
                "status": "active",
                "start_time": datetime.now(),
                "trades": [],
                "signals": [],
                "current_position": 0,
                "current_price": 150.0, 
                "portfolio_value": strategy_config.get("initial_capital", 100000),
                "initial_capital": strategy_config.get("initial_capital", 100000),
                "cash": strategy_config.get("initial_capital", 100000),
                "price_history": [],
                "strategy_type": strategy_config.get("strategy_type", "unknown")
            }
            
            logger.info(f"✅ Strategy {strategy_id} stored in active_strategies")
            

            await broadcast_strategy_update(strategy_id, {
                "status": "active",  
                "config": strategy_config,
                "initial_capital": strategy_config.get("initial_capital", 100000),
                "start_time": datetime.now().isoformat()
            })
            
            logger.info(f"✅ Real-time strategy {strategy_id} started successfully")
            
        except Exception as e:
            logger.error(f"❌ Error starting real-time strategy {strategy_id}: {e}")
            raise
    
    async def stop_realtime_strategy(self, strategy_id: str):
        """Stop a real-time strategy"""
        try:
            if strategy_id not in self.active_strategies:
                raise ValueError(f"Strategy {strategy_id} not found")
            
            # Update status
            self.active_strategies[strategy_id]["status"] = "stopped"
            self.active_strategies[strategy_id]["end_time"] = datetime.now()
            
            # Broadcast strategy stop
            await broadcast_strategy_update(strategy_id, {
                "status": "stopped",
                "end_time": datetime.now().isoformat()
            })
            
            logger.info(f"🛑 Real-time strategy {strategy_id} stopped")
            
        except Exception as e:
            logger.error(f"❌ Error stopping strategy {strategy_id}: {e}")
            raise
    
    async def process_realtime_data(self, symbol: str, price_data: dict):
        """Process real-time market data for all active strategies"""
        try:
            # Process for each active strategy trading this symbol
            for strategy_id, strategy_info in self.active_strategies.items():
                if (strategy_info["status"] == "active" and 
                    strategy_info["config"].get("symbol") == symbol):
                    try:
                        await self._process_strategy_tick(strategy_id, symbol, price_data)
                    except Exception as e:
                        logger.error(f"Error processing tick for strategy {strategy_id}: {e}")
        except Exception as e:
            logger.error(f"❌ Error processing market data for {symbol}: {e}")
    
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
            # Store signals
            for signal in signals:
                signal["timestamp"] = datetime.now().isoformat()
                strategy_info["signals"].append(signal)
            
            # Keep only last 50 signals
            strategy_info["signals"] = strategy_info["signals"][-50:]
            
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
                    
                    # Update position based on trade type
                    if trade["type"] == "BUY":
                        strategy_info["current_position"] += trade["quantity"]
                    elif trade["type"] == "SELL":
                        strategy_info["current_position"] -= trade["quantity"]
                
                # Broadcast trade executions
                await broadcast_trade_executed(strategy_id, {
                    "trades": trades,
                    "current_position": strategy_info["current_position"],
                    "timestamp": datetime.now().isoformat()
                })
        
        # Update performance metrics
        await self._update_performance_metrics(strategy_id, price_data.get("price", 150.0))
    
    async def _generate_realtime_signals(self, strategy_id: str, price_data: dict) -> list:
        """Generate trading signals based on real-time data - ENHANCED VERSION"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        signals = []
        
        try:
            current_price = price_data.get("price", 150.0)
            
            # Update current price in strategy
            strategy_info["current_price"] = current_price
            
            # Update price history
            if "price_history" not in strategy_info:
                strategy_info["price_history"] = []
            strategy_info["price_history"].append(current_price)
            
            # Keep only last 50 prices for analysis
            if len(strategy_info["price_history"]) > 50:
                strategy_info["price_history"] = strategy_info["price_history"][-50:]
            
            price_history = strategy_info["price_history"]
            
            # Generate signals based on strategy type
            strategy_type = config.get("strategy_type", "rsi_mean_reversion")
            current_position = strategy_info.get("current_position", 0)
            
            if strategy_type == "rsi_mean_reversion":
                # RSI-based signals
                if len(price_history) >= 14:  # Need at least 14 periods for RSI
                    rsi = self._calculate_simple_rsi(price_history, 14)
                    
                    if rsi is not None:
                        # Buy when RSI < 30 (oversold)
                        if rsi < 30 and current_position <= 0:
                            signals.append({
                                "type": "BUY",
                                "strength": (30 - rsi) / 30,  # Stronger signal when more oversold
                                "price": current_price,
                                "reason": f"RSI oversold: {rsi:.1f}",
                                "indicator_value": rsi
                            })
                        
                        # Sell when RSI > 70 (overbought)
                        elif rsi > 70 and current_position > 0:
                            signals.append({
                                "type": "SELL",
                                "strength": (rsi - 70) / 30,  # Stronger signal when more overbought
                                "price": current_price,
                                "reason": f"RSI overbought: {rsi:.1f}",
                                "indicator_value": rsi
                            })
            
            else:
                # Default momentum strategy
                if len(price_history) >= 5:
                    # Calculate 5-period momentum
                    momentum = (current_price - price_history[-6]) / price_history[-6] if len(price_history) >= 6 else 0
                    
                    # Buy on positive momentum > 1%
                    if momentum > 0.01 and current_position <= 0:
                        signals.append({
                            "type": "BUY",
                            "strength": min(1.0, momentum * 10),
                            "price": current_price,
                            "reason": f"Positive momentum: {momentum:.2%}",
                            "indicator_value": momentum
                        })
                    
                    # Sell on negative momentum < -1%
                    elif momentum < -0.01 and current_position > 0:
                        signals.append({
                            "type": "SELL",
                            "strength": min(1.0, abs(momentum) * 10),
                            "price": current_price,
                            "reason": f"Negative momentum: {momentum:.2%}",
                            "indicator_value": momentum
                        })
            
            if signals:
                logger.info(f"🎯 Generated {len(signals)} signals for {strategy_id}: {[s['type'] for s in signals]}")
            
            return signals
            
        except Exception as e:
            logger.error(f"❌ Error generating signals for {strategy_id}: {e}")
            return []
    
    def _calculate_simple_rsi(self, prices: list, period: int = 14) -> Optional[float]:
        """Calculate a simple RSI"""
        try:
            if len(prices) < period + 1:
                return None
            
            # Calculate price changes
            deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
            
            # Separate gains and losses
            gains = [delta if delta > 0 else 0 for delta in deltas]
            losses = [-delta if delta < 0 else 0 for delta in deltas]
            
            # Calculate average gains and losses over the period
            avg_gain = sum(gains[-period:]) / period
            avg_loss = sum(losses[-period:]) / period
            
            if avg_loss == 0:
                return 100  # RSI = 100 when no losses
            
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            
            return rsi
            
        except Exception as e:
            logger.error(f"❌ Error calculating RSI: {e}")
            return None
    
    async def _execute_realtime_trades(self, strategy_id: str, signals: list, price_data: dict) -> list:
        """Execute trades based on generated signals - ENHANCED VERSION"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        trades = []
        
        try:
            current_price = price_data.get("price", 150.0)
            
            for signal in signals:
                # Calculate position size
                position_size = self._calculate_position_size(strategy_id, signal)
                
                if position_size > 0:
                    # Generate unique trade ID
                    trade_id = str(uuid.uuid4())
                    
                    trade = {
                        "id": trade_id,
                        "timestamp": datetime.now().isoformat(),
                        "symbol": config.get("symbol", "UNKNOWN"),
                        "type": signal["type"],
                        "quantity": position_size,
                        "price": current_price,
                        "reason": signal.get("reason", "Signal generated"),
                        "signal_strength": signal.get("strength", 1.0)
                    }
                    
                    # Update position and cash
                    if signal["type"] == "BUY":
                        cost = position_size * current_price
                        strategy_info["cash"] = strategy_info.get("cash", 0) - cost
                        trade["cost"] = cost
                        logger.info(f"📈 BUY executed: {position_size} shares at ${current_price:.2f}")
                        
                    elif signal["type"] == "SELL":
                        revenue = position_size * current_price
                        strategy_info["cash"] = strategy_info.get("cash", 0) + revenue
                        trade["revenue"] = revenue
                        logger.info(f"📉 SELL executed: {position_size} shares at ${current_price:.2f}")
                    
                    trades.append(trade)
                    
            if trades:
                logger.info(f"💰 Executed {len(trades)} trades for {strategy_id}")
                        
        except Exception as e:
            logger.error(f"❌ Error executing trades for {strategy_id}: {e}")
        
        return trades
    
    def _calculate_position_size(self, strategy_id: str, signal: dict) -> int:
        """Calculate position size for a trade"""
        strategy_info = self.active_strategies[strategy_id]
        config = strategy_info["config"]
        
        # Simple fixed position sizing (you can enhance this)
        max_position = config.get("max_position", 100)
        current_position = strategy_info.get("current_position", 0)
        position_size_config = config.get("position_size", 10)
        
        if signal["type"] == "BUY":
            available_to_buy = max_position - current_position
            return min(available_to_buy, position_size_config) if available_to_buy > 0 else 0
        elif signal["type"] == "SELL":
            return min(current_position, position_size_config) if current_position > 0 else 0
        
        return 0
    
    async def _update_performance_metrics(self, strategy_id: str, current_price: float):
        """Update performance metrics for a strategy"""
        try:
            strategy_info = self.active_strategies[strategy_id]
            
            # Calculate current portfolio value
            current_position = strategy_info.get("current_position", 0)
            cash = strategy_info.get("cash", 0)
            portfolio_value = cash + (current_position * current_price)
            
            # Update portfolio value
            strategy_info["portfolio_value"] = portfolio_value
            
            # Calculate P&L
            initial_capital = strategy_info.get("initial_capital", 100000)
            total_pnl = portfolio_value - initial_capital
            
            # Calculate trade statistics
            trades = strategy_info.get("trades", [])
            total_trades = len(trades)
            
            # Calculate winning trades (simplified)
            winning_trades = 0
            for i, trade in enumerate(trades):
                if trade["type"] == "SELL" and i > 0:
                    # Find corresponding buy trade
                    prev_trades = trades[:i]
                    buy_trades = [t for t in prev_trades if t["type"] == "BUY"]
                    if buy_trades:
                        last_buy = buy_trades[-1]
                        if trade["price"] > last_buy["price"]:
                            winning_trades += 1
            
            win_rate = (winning_trades / max(1, total_trades // 2)) * 100 
            metrics = {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "win_rate": round(win_rate, 1),
                "total_pnl": round(total_pnl, 2),
                "portfolio_value": round(portfolio_value, 2),
                "current_position": current_position,
                "cash": round(cash, 2),
                "last_updated": datetime.now().isoformat()
            }
            
            strategy_info["performance_metrics"] = metrics
            
            # Broadcast performance update
            await broadcast_performance_metrics(strategy_id, metrics)
            
        except Exception as e:
            logger.error(f"❌ Error updating performance metrics for {strategy_id}: {e}")
    
    async def _calculate_realtime_metrics(self, strategy_id: str) -> dict:
        """Calculate real-time performance metrics - FIXED VERSION"""
        try:
            if strategy_id not in self.active_strategies:
                logger.warning(f"Strategy {strategy_id} not found in active strategies")
                return {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "win_rate": 0.0,
                    "total_pnl": 0.0,
                    "portfolio_value": 100000,
                    "current_position": 0,
                    "last_updated": datetime.now().isoformat(),
                    "error": "strategy_not_found"
                }
            
            strategy_info = self.active_strategies[strategy_id]
            
            # Return stored performance metrics if available
            if "performance_metrics" in strategy_info:
                return strategy_info["performance_metrics"]
            
            # Fallback calculation
            trades = strategy_info.get("trades", [])
            initial_capital = strategy_info.get("initial_capital", 100000)
            current_position = strategy_info.get("current_position", 0)
            portfolio_value = strategy_info.get("portfolio_value", initial_capital)
            
            if not trades:
                return {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "win_rate": 0.0,
                    "total_pnl": 0.0,
                    "portfolio_value": float(portfolio_value),
                    "current_position": current_position,
                    "last_updated": datetime.now().isoformat()
                }
            
            # Calculate metrics
            total_trades = len(trades)
            total_pnl = portfolio_value - initial_capital
            
            # Simple win rate calculation
            sell_trades = [t for t in trades if t["type"] == "SELL"]
            winning_trades = len([t for t in sell_trades if t.get("revenue", 0) > t.get("cost", 0)])
            win_rate = (winning_trades / max(1, len(sell_trades))) * 100
            
            metrics = {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "win_rate": round(win_rate, 1),
                "total_pnl": round(total_pnl, 2),
                "portfolio_value": round(portfolio_value, 2),
                "current_position": current_position,
                "last_updated": datetime.now().isoformat()
            }
            
            logger.info(f"📊 Calculated metrics for {strategy_id}: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"❌ Error calculating metrics for {strategy_id}: {e}")
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "win_rate": 0.0,
                "total_pnl": 0.0,
                "portfolio_value": 100000,
                "current_position": 0,
                "last_updated": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def _is_winning_trade(self, trade: dict, strategy_info: dict) -> bool:
        """Determine if a trade is winning (simplified)"""
        # This is a simplified implementation
        return self._calculate_trade_pnl(trade, strategy_info) > 0
    
    def _calculate_trade_pnl(self, trade: dict, strategy_info: dict) -> float:
        """Calculate P&L for a trade (simplified)"""
        # This is a simplified implementation
        # In production, you'd track entry/exit prices properly
        if trade["type"] == "SELL":
            return trade.get("revenue", 0) - trade.get("cost", 0)
        return 0  # BUY trades don't have immediate P&L

# Global instance
realtime_engine = RealtimeStrategyEngine()