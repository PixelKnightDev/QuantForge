# app/services/strategy_engine.py - FINAL FIX for 2D array issue
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging
import yfinance as yf
from .technical_indicators import TechnicalIndicators
from ..models.strategy_models import *

logger = logging.getLogger(__name__)

class StrategyEngine:
    """Core strategy engine for backtesting trading strategies"""
    
    def __init__(self, data_service=None):
        self.data_service = data_service
        self.indicators = TechnicalIndicators()
        self.portfolio = Portfolio()
        
    async def get_market_data(self, symbol: str, start_date: str, end_date: str, timeframe: str = "1d") -> pd.DataFrame:
        """Get market data using yfinance directly"""
        try:
            interval_map = {
                "1d": "1d",
                "1h": "1h", 
                "5m": "5m",
                "15m": "15m",
                "30m": "30m"
            }
            interval = interval_map.get(timeframe, "1d")
            
            ticker = yf.Ticker(symbol)
            data = ticker.history(start=start_date, end=end_date, interval=interval)
            
            if data.empty:
                logger.warning(f"No data found for {symbol} from {start_date} to {end_date}")
                return pd.DataFrame()
            
            # Normalize column names to lowercase
            data.columns = [col.lower() for col in data.columns]
            
            # Ensure we have the required columns
            required_cols = ['open', 'high', 'low', 'close', 'volume']
            missing_cols = [col for col in required_cols if col not in data.columns]
            if missing_cols:
                logger.error(f"Missing required columns: {missing_cols}")
                return pd.DataFrame()
            
            logger.info(f"Downloaded {len(data)} rows of data for {symbol}")
            return data
            
        except Exception as e:
            logger.error(f"Error getting market data for {symbol}: {e}")
            return pd.DataFrame()
    
    async def _calculate_indicator(self, indicator_name: str, 
                                 parameters: Dict, data: pd.DataFrame) -> Optional[np.ndarray]:
        """Calculate indicator values - FIXED for 2D arrays"""
        try:
            logger.info(f"Calculating indicator: {indicator_name} with params: {parameters}")
            
            if indicator_name == "price":
                result = data['close'].values
                logger.info(f"Price indicator: {len(result)} values, range: {result.min():.2f} - {result.max():.2f}")
                return result
            elif indicator_name == "volume":
                result = data['volume'].values
                logger.info(f"Volume indicator: {len(result)} values")
                return result
            
            # Handle technical indicators
            method = getattr(self.indicators, indicator_name, None)
            if not method:
                logger.error(f"Unknown indicator: {indicator_name}")
                return None
            
            # Call the indicator method with parameters
            try:
                if indicator_name == "rsi":
                    period = parameters.get("period", 14)
                    result = method(data, period=period)
                elif indicator_name == "sma":
                    period = parameters.get("period", 20)
                    result = method(data, period=period)
                elif indicator_name == "ema":
                    period = parameters.get("period", 20)
                    result = method(data, period=period)
                elif indicator_name == "macd":
                    fast = parameters.get("fast", 12)
                    slow = parameters.get("slow", 26)
                    signal = parameters.get("signal", 9)
                    result = method(data, fast=fast, slow=slow, signal=signal)
                elif indicator_name == "bollinger_bands":
                    period = parameters.get("period", 20)
                    std_dev = parameters.get("std_dev", 2)
                    result = method(data, period=period, std_dev=std_dev)
                else:
                    result = method(data, **parameters)
                
                if result is None:
                    logger.error(f"Indicator {indicator_name} returned None")
                    return None
                
                # CRITICAL FIX: Handle 2D arrays properly
                if isinstance(result, np.ndarray):
                    if result.ndim == 2:
                        # If 2D array, take the first column that has valid data
                        logger.info(f"Indicator returned 2D array with shape {result.shape}")
                        
                        # Find the first column with non-NaN values
                        for col_idx in range(result.shape[1]):
                            column = result[:, col_idx]
                            valid_count = np.sum(~np.isnan(column))
                            if valid_count > 10:  # Need at least 10 valid values
                                result = column
                                logger.info(f"Using column {col_idx} with {valid_count} valid values")
                                break
                        else:
                            # If no good column found, flatten and take valid values
                            result = result.flatten()
                            result = result[~np.isnan(result)]
                            if len(result) == 0:
                                logger.error(f"No valid values found in indicator result")
                                return None
                            # Pad with NaN to match original length
                            padded_result = np.full(data.shape[0], np.nan)
                            padded_result[-len(result):] = result
                            result = padded_result
                    elif result.ndim == 1:
                        # Already 1D, good to go
                        pass
                    else:
                        logger.error(f"Unexpected array dimensions: {result.ndim}")
                        return None
                
                # Handle tuple returns (like MACD)
                elif isinstance(result, tuple):
                    result = result[0]  # Take the main line
                    if isinstance(result, np.ndarray) and result.ndim == 2:
                        result = result[:, 0]  # Take first column if still 2D
                
                # Convert to numpy array if needed
                if not isinstance(result, np.ndarray):
                    result = np.array(result)
                
                # Ensure it's 1D
                if result.ndim > 1:
                    result = result.flatten()
                
                # Ensure proper length
                if len(result) != len(data):
                    if len(result) < len(data):
                        # Pad with NaN at the beginning
                        padded = np.full(len(data), np.nan)
                        padded[-len(result):] = result
                        result = padded
                    else:
                        # Truncate to match data length
                        result = result[:len(data)]
                
                # Log statistics
                valid_values = result[~np.isnan(result)]
                logger.info(f"Indicator {indicator_name}: {len(result)} total values, {len(valid_values)} valid")
                if len(valid_values) > 0:
                    logger.info(f"  Range: {valid_values.min():.2f} - {valid_values.max():.2f}")
                    logger.info(f"  Last 5 valid values: {valid_values[-5:]}")
                
                return result
                
            except Exception as method_error:
                logger.error(f"Error calling indicator method {indicator_name}: {method_error}")
                return None
                
        except Exception as e:
            logger.error(f"Error calculating indicator {indicator_name}: {e}")
            return None
        
    async def evaluate_condition(self, condition: IndicatorCondition, 
                                data: pd.DataFrame, index: int) -> bool:
        """Evaluate a single indicator condition"""
        try:
            # Calculate the indicator
            indicator_values = await self._calculate_indicator(
                condition.indicator, condition.parameters, data
            )
            
            if indicator_values is None:
                return False
                
            if index >= len(indicator_values):
                return False
                
            current_value = indicator_values[index]
            if pd.isna(current_value):
                return False
            
            # Handle different comparison types
            if isinstance(condition.value, dict) or hasattr(condition.value, 'indicator'):
                # Comparing against another indicator (dict or IndicatorReference)
                if hasattr(condition.value, 'indicator'):
                    # IndicatorReference object
                    other_indicator = condition.value.indicator
                    other_params = condition.value.parameters
                else:
                    # Dict format (backward compatibility)
                    other_indicator = condition.value.get("indicator")
                    other_params = condition.value.get("parameters", {})
                
                other_values = await self._calculate_indicator(
                    other_indicator, other_params, data
                )
                if other_values is None or index >= len(other_values):
                    return False
                compare_value = other_values[index]
                if pd.isna(compare_value):
                    return False
            else:
                # Comparing against fixed value
                compare_value = condition.value
            
            # Apply operator
            result = False
            if condition.operator == ConditionOperator.GT:
                result = current_value > compare_value
            elif condition.operator == ConditionOperator.LT:
                result = current_value < compare_value
            elif condition.operator == ConditionOperator.GTE:
                result = current_value >= compare_value
            elif condition.operator == ConditionOperator.LTE:
                result = current_value <= compare_value
            elif condition.operator == ConditionOperator.EQ:
                result = abs(current_value - compare_value) < 1e-6
            elif condition.operator == ConditionOperator.CROSS_ABOVE:
                if index == 0:
                    return False
                prev_current = indicator_values[index - 1]
                if pd.isna(prev_current):
                    return False
                prev_compare = (other_values[index - 1] if (isinstance(condition.value, dict) or hasattr(condition.value, 'indicator'))
                              else compare_value)
                if (isinstance(condition.value, dict) or hasattr(condition.value, 'indicator')) and pd.isna(prev_compare):
                    return False
                result = (prev_current <= prev_compare and current_value > compare_value)
            elif condition.operator == ConditionOperator.CROSS_BELOW:
                if index == 0:
                    return False
                prev_current = indicator_values[index - 1]
                if pd.isna(prev_current):
                    return False
                prev_compare = (other_values[index - 1] if (isinstance(condition.value, dict) or hasattr(condition.value, 'indicator'))
                              else compare_value)
                if (isinstance(condition.value, dict) or hasattr(condition.value, 'indicator')) and pd.isna(prev_compare):
                    return False
                result = (prev_current >= prev_compare and current_value < compare_value)
            
            if result:
                logger.info(f"CONDITION TRIGGERED at index {index}: {current_value:.2f} {condition.operator} {compare_value}")
            
            return result
                
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False
    
    async def evaluate_rule(self, rule: StrategyRule, 
                           data: pd.DataFrame, index: int) -> bool:
        """Evaluate all conditions in a strategy rule"""
        results = []
        
        for condition in rule.conditions:
            result = await self.evaluate_condition(condition, data, index)
            results.append(result)
        
        # Apply logical operator
        if rule.logical_operator == LogicalOperator.AND:
            final_result = all(results)
        else:  # OR
            final_result = any(results)
        
        if final_result:
            logger.info(f"RULE TRIGGERED: '{rule.name}' at index {index}")
        
        return final_result
    
    async def generate_signals(self, strategy: Strategy, 
                              symbol: str, data: pd.DataFrame) -> List[Signal]:
        """Generate trading signals for a strategy"""
        signals = []
        
        logger.info(f"Generating signals for strategy '{strategy.name}' with {len(strategy.rules)} rules")
        logger.info(f"Data range: {len(data)} candles from {data.index[0]} to {data.index[-1]}")
        
        for i in range(1, len(data)):  # Start from 1 to allow lookback
            timestamp = data.index[i]
            price = data.iloc[i]['close']
            
            for rule in strategy.rules:
                if await self.evaluate_rule(rule, data, i):
                    signal = Signal(
                        timestamp=timestamp,
                        symbol=symbol,
                        signal_type=rule.signal_type,
                        price=price,
                        rule_name=rule.name
                    )
                    signals.append(signal)
                    logger.info(f"SIGNAL GENERATED: {rule.signal_type} {symbol} at {price:.2f} on {timestamp}")
        
        logger.info(f"Generated {len(signals)} total signals")
        return signals
    
    def calculate_position_size(self, strategy: Strategy, 
                               price: float, available_cash: float) -> float:
        """Calculate position size based on strategy configuration"""
        sizing = strategy.position_sizing
        
        if sizing.method == "fixed_amount":
            shares = sizing.value / price
        elif sizing.method == "fixed_percent":
            amount = available_cash * (sizing.value / 100)
            shares = amount / price
        elif sizing.method == "risk_percent":
            if strategy.risk_management.stop_loss_percent:
                risk_amount = available_cash * (sizing.value / 100)
                risk_per_share = price * (strategy.risk_management.stop_loss_percent / 100)
                shares = risk_amount / risk_per_share
            else:
                amount = available_cash * 0.01
                shares = amount / price
        else:
            shares = 0
        
        if sizing.max_position_size:
            max_shares = sizing.max_position_size / price
            shares = min(shares, max_shares)
        
        return max(0, shares)
    
    async def simulate_strategy(self, strategy: Strategy, 
                               symbol: str, start_date: str, 
                               end_date: str) -> Portfolio:
        """Run complete strategy simulation"""
        self.portfolio = Portfolio()
        
        data = await self.get_market_data(symbol, start_date, end_date, strategy.timeframe)
        
        if data.empty:
            logger.error(f"No data available for {symbol}")
            return self.portfolio
        
        logger.info(f"Starting strategy simulation for {symbol} with {len(data)} data points")
        
        signals = await self.generate_signals(strategy, symbol, data)
        logger.info(f"Generated {len(signals)} signals")
        
        for signal in sorted(signals, key=lambda x: x.timestamp):
            await self._process_signal(signal, strategy, data)
        
        if self.portfolio.positions:
            final_price = data.iloc[-1]['close']
            final_timestamp = data.index[-1]
            for position in self.portfolio.positions.copy():
                await self._close_position(
                    position, final_price, final_timestamp, "end_of_backtest"
                )
        
        if not data.empty:
            self._update_portfolio_value(data.iloc[-1]['close'])
        
        logger.info(f"Simulation complete. Final portfolio value: ${self.portfolio.total_value:.2f}")
        logger.info(f"Total trades: {len(self.portfolio.trades)}")
        logger.info(f"Realized P&L: ${self.portfolio.realized_pnl:.2f}")
        
        return self.portfolio
    
    async def _process_signal(self, signal: Signal, strategy: Strategy, data: pd.DataFrame):
        """Process a trading signal"""
        if signal.signal_type == SignalType.BUY:
            await self._process_buy_signal(signal, strategy)
        elif signal.signal_type == SignalType.SELL:
            await self._process_sell_signal(signal, strategy)
    
    async def _process_buy_signal(self, signal: Signal, strategy: Strategy):
        """Process buy signal"""
        existing_position = next(
            (p for p in self.portfolio.positions if p.symbol == signal.symbol), None
        )
        
        if existing_position:
            return
        
        if len(self.portfolio.positions) >= strategy.risk_management.max_positions:
            return
        
        available_cash = self.portfolio.cash
        shares = self.calculate_position_size(strategy, signal.price, available_cash)
        
        if shares <= 0:
            return
        
        total_cost = shares * signal.price
        
        if total_cost > available_cash:
            shares = available_cash / signal.price
            total_cost = shares * signal.price
        
        position = Position(
            symbol=signal.symbol,
            entry_timestamp=signal.timestamp,
            entry_price=signal.price,
            quantity=shares,
            current_price=signal.price
        )
        
        if strategy.risk_management.stop_loss_percent:
            position.stop_loss = signal.price * (1 - strategy.risk_management.stop_loss_percent / 100)
        
        if strategy.risk_management.take_profit_percent:
            position.take_profit = signal.price * (1 + strategy.risk_management.take_profit_percent / 100)
        
        self.portfolio.positions.append(position)
        self.portfolio.cash -= total_cost
        
        logger.info(f"Opened position: {signal.symbol} at {signal.price:.2f} for {shares:.2f} shares")
    
    async def _process_sell_signal(self, signal: Signal, strategy: Strategy):
        """Process sell signal"""
        position = next(
            (p for p in self.portfolio.positions if p.symbol == signal.symbol), None
        )
        
        if position:
            await self._close_position(position, signal.price, signal.timestamp, signal.rule_name)
    
    async def _close_position(self, position: Position, exit_price: float, 
                             exit_timestamp: datetime, exit_reason: str):
        """Close a position and create trade record"""
        pnl = (exit_price - position.entry_price) * position.quantity
        pnl_percent = ((exit_price - position.entry_price) / position.entry_price) * 100
        
        trade = Trade(
            symbol=position.symbol,
            entry_timestamp=position.entry_timestamp,
            exit_timestamp=exit_timestamp,
            entry_price=position.entry_price,
            exit_price=exit_price,
            quantity=position.quantity,
            pnl=pnl,
            pnl_percent=pnl_percent,
            rule_name=exit_reason,
            exit_reason=exit_reason
        )
        
        self.portfolio.trades.append(trade)
        self.portfolio.cash += position.quantity * exit_price
        self.portfolio.realized_pnl += pnl
        self.portfolio.positions.remove(position)
        
        logger.info(f"Closed position: {position.symbol} at {exit_price:.2f}, P&L: ${pnl:.2f} ({pnl_percent:.2f}%)")
    
    def _update_portfolio_value(self, current_price: float):
        """Update portfolio total value"""
        unrealized_pnl = 0
        for position in self.portfolio.positions:
            position.current_price = current_price
            position.unrealized_pnl = (current_price - position.entry_price) * position.quantity
            unrealized_pnl += position.unrealized_pnl
        
        self.portfolio.unrealized_pnl = unrealized_pnl
        self.portfolio.total_value = self.portfolio.cash + unrealized_pnl