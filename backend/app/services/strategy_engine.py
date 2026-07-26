
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
            
            data.columns = [col.lower() for col in data.columns]
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
        """Calculate indicator values - FIXED for proper data passing"""
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

            # Technical indicators expect pd.Series, not DataFrame
            close_series = data['close']
            high_series = data['high'] 
            low_series = data['low']
            volume_series = data['volume']
            
            try:
                if indicator_name == "rsi":
                    period = parameters.get("period", 14)
                    # ✅ Pass Series, not DataFrame
                    result = self.indicators.rsi(close_series, period=period)
                elif indicator_name == "sma":
                    period = parameters.get("period", 20)
                    # ✅ Pass Series, not DataFrame  
                    result = self.indicators.sma(close_series, period=period)
                elif indicator_name == "ema":
                    period = parameters.get("period", 20)
                    # ✅ Pass Series, not DataFrame
                    result = self.indicators.ema(close_series, period=period)
                elif indicator_name == "macd":
                    fast = parameters.get("fast", 12)
                    slow = parameters.get("slow", 26)
                    signal = parameters.get("signal", 9)
                    # ✅ Pass Series, not DataFrame
                    result_dict = self.indicators.macd(close_series, fast_period=fast, slow_period=slow, signal_period=signal)
                    result = result_dict['macd']  # Take the main MACD line
                elif indicator_name == "bollinger_bands":
                    period = parameters.get("period", 20)
                    std_dev = parameters.get("std_dev", 2)
                    # ✅ Pass Series, not DataFrame
                    result_dict = self.indicators.bollinger_bands(close_series, period=period, std_dev=std_dev)
                    result = result_dict['middle']  # Take the middle band (SMA)
                elif indicator_name == "stochastic":
                    k_period = parameters.get("k_period", 14)
                    d_period = parameters.get("d_period", 3)
                    # ✅ Pass individual Series
                    result_dict = self.indicators.stochastic(high_series, low_series, close_series, k_period=k_period, d_period=d_period)
                    result = result_dict['k']  # Take %K
                elif indicator_name == "atr":
                    period = parameters.get("period", 14)
                    # ✅ Pass individual Series
                    result = self.indicators.atr(high_series, low_series, close_series, period=period)
                elif indicator_name == "adx":
                    period = parameters.get("period", 14)
                    # ✅ Pass individual Series
                    result_dict = self.indicators.adx(high_series, low_series, close_series, period=period)
                    result = result_dict['adx']  # Take ADX value
                elif indicator_name == "obv":
                    # ✅ Pass individual Series
                    result = self.indicators.obv(close_series, volume_series)
                elif indicator_name == "vwap":
                    # ✅ Pass individual Series
                    result = self.indicators.vwap(high_series, low_series, close_series, volume_series)
                elif indicator_name == "williams_r":
                    period = parameters.get("period", 14)
                    # ✅ Pass individual Series
                    result = self.indicators.williams_r(high_series, low_series, close_series, period=period)
                else:
                    logger.error(f"Unknown indicator: {indicator_name}")
                    return None
                
                if result is None:
                    logger.error(f"Indicator {indicator_name} returned None")
                    return None

                if isinstance(result, pd.Series):
                    result_array = result.values
                elif isinstance(result, np.ndarray):
                    result_array = result
                else:
                    logger.error(f"Unexpected result type from {indicator_name}: {type(result)}")
                    return None
                
                if len(result_array) != len(data):
                    if len(result_array) < len(data):
                        # Pad with NaN at the beginning (common for indicators with lookback)
                        padded = np.full(len(data), np.nan)
                        padded[-len(result_array):] = result_array
                        result_array = padded
                    else:
                        # Truncate to match data length
                        result_array = result_array[:len(data)]
                
                # Log statistics for debugging
                valid_values = result_array[~np.isnan(result_array)]
                logger.info(f"Indicator {indicator_name}: {len(result_array)} total values, {len(valid_values)} valid")
                if len(valid_values) > 0:
                    logger.info(f"  Range: {valid_values.min():.2f} - {valid_values.max():.2f}")
                    logger.info(f"  Last 5 valid values: {valid_values[-5:]}")
                
                return result_array
                
            except Exception as method_error:
                logger.error(f"Error calling indicator method {indicator_name}: {method_error}")
                return None
                
        except Exception as e:
            logger.error(f"Error calculating indicator {indicator_name}: {e}")
            return None
    def calculate_position_size(self, strategy: Strategy, 
                               price: float, available_cash: float) -> float:
        """Calculate position size based on strategy configuration - ENHANCED"""
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
                shares = risk_amount / risk_per_share if risk_per_share > 0 else 0
            else:
   
                amount = available_cash * 0.01
                shares = amount / price
        else:
            shares = 0
        
        # Apply maximum position size limit
        if sizing.max_position_size:
            max_shares = sizing.max_position_size / price
            shares = min(shares, max_shares)
        
        # Ensure we don't exceed available cash
        total_cost = shares * price
        if total_cost > available_cash:
            shares = available_cash / price
        
        return max(0, shares)
    
    async def _check_risk_management(self, position: Position, current_price: float,
                                   current_timestamp: datetime, strategy: Strategy):
        """Check if position should be closed due to risk management rules"""

        # Check stop loss
        if position.stop_loss and current_price <= position.stop_loss:
            logger.info(f"Stop loss triggered for {position.symbol} at {current_price:.2f}")
            await self._close_position(position, current_price, current_timestamp, "stop_loss", strategy)
            return True

        # Check take profit
        if position.take_profit and current_price >= position.take_profit:
            logger.info(f"Take profit triggered for {position.symbol} at {current_price:.2f}")
            await self._close_position(position, current_price, current_timestamp, "take_profit", strategy)
            return True

        return False


    async def simulate_strategy(self, strategy: Strategy,
                               symbol: str, start_date: str,
                               end_date: str, initial_capital: float = 100000.0) -> Portfolio:
        """Run complete strategy simulation with real daily mark-to-market tracking"""
        initial_cash = initial_capital

        self.portfolio = Portfolio()
        self.portfolio.cash = initial_cash
        self.portfolio.total_value = initial_cash

        data = await self.get_market_data(symbol, start_date, end_date, strategy.timeframe)

        if data.empty:
            logger.error(f"No data available for {symbol}")
            return self.portfolio

        logger.info(f"Starting strategy simulation for {symbol} with {len(data)} data points")
        logger.info(f"Initial cash: ${initial_cash:.2f}")

        # Seed the equity curve at t=0 so annualization/volatility reflect the full period
        self.portfolio.equity_curve = [
            EquityPoint(timestamp=data.index[0], value=initial_cash, cash=initial_cash, unrealized_pnl=0.0)
        ]

        signals = await self.generate_signals(strategy, symbol, data)
        logger.info(f"Generated {len(signals)} signals")

        for i in range(1, len(data)):
            current_timestamp = data.index[i]
            current_price = data.iloc[i]['close']

            # Update portfolio value and check risk management for existing positions
            positions_to_remove = []
            for position in self.portfolio.positions:
                position.current_price = current_price
                position.unrealized_pnl = (current_price - position.entry_price) * position.quantity

                # Check risk management rules
                if await self._check_risk_management(position, current_price, current_timestamp, strategy):
                    positions_to_remove.append(position)

            # Remove closed positions
            for position in positions_to_remove:
                if position in self.portfolio.positions:
                    self.portfolio.positions.remove(position)

            # Process any signals for this timestamp
            current_signals = [s for s in signals if s.timestamp == current_timestamp]
            for signal in current_signals:
                await self._process_signal(signal, strategy, data)

            # Update portfolio total value (mark-to-market every bar, not just on trade close)
            self._update_portfolio_value(current_price)
            self.portfolio.equity_curve.append(EquityPoint(
                timestamp=current_timestamp,
                value=self.portfolio.total_value,
                cash=self.portfolio.cash,
                unrealized_pnl=self.portfolio.unrealized_pnl
            ))

        # Close any remaining positions at the end
        if self.portfolio.positions:
            final_price = data.iloc[-1]['close']
            final_timestamp = data.index[-1]
            for position in self.portfolio.positions.copy():
                await self._close_position(
                    position, final_price, final_timestamp, "end_of_backtest", strategy
                )
            # Record the cost of liquidating at the end of the backtest
            self._update_portfolio_value(final_price)
            self.portfolio.equity_curve.append(EquityPoint(
                timestamp=final_timestamp,
                value=self.portfolio.total_value,
                cash=self.portfolio.cash,
                unrealized_pnl=self.portfolio.unrealized_pnl
            ))

        # Calculate final portfolio metrics
        if not data.empty:
            final_price = data.iloc[-1]['close']
            self._update_portfolio_value(final_price)
        
        # Calculate total return percentage
        total_return_percent = ((self.portfolio.total_value - initial_cash) / initial_cash) * 100
        self.portfolio.total_return_percent = total_return_percent
        
        logger.info(f"Simulation complete:")
        logger.info(f"  Initial cash: ${initial_cash:.2f}")
        logger.info(f"  Final portfolio value: ${self.portfolio.total_value:.2f}")
        logger.info(f"  Total return: {total_return_percent:.2f}%")
        logger.info(f"  Total trades: {len(self.portfolio.trades)}")
        logger.info(f"  Realized P&L: ${self.portfolio.realized_pnl:.2f}")
        logger.info(f"  Unrealized P&L: ${self.portfolio.unrealized_pnl:.2f}")
        
        return self.portfolio

    # Rest of your methods stay the same...
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

        costs = strategy.transaction_costs
        # Slippage: buys fill slightly worse than the signal price
        effective_price = signal.price * (1 + costs.slippage_percent / 100)

        available_cash = self.portfolio.cash
        shares = self.calculate_position_size(strategy, effective_price, available_cash)

        if shares <= 0:
            return

        def cost_for(shares: float) -> Tuple[float, float]:
            commission = costs.commission_fixed + (shares * effective_price * costs.commission_percent / 100)
            return shares * effective_price + commission, commission

        total_cost, entry_commission = cost_for(shares)

        if total_cost > available_cash:
            # Solve for the largest share count whose all-in cost fits available cash
            denom = effective_price * (1 + costs.commission_percent / 100)
            shares = max(0.0, (available_cash - costs.commission_fixed) / denom) if denom > 0 else 0.0
            total_cost, entry_commission = cost_for(shares)

        if shares <= 0:
            return

        position = Position(
            symbol=signal.symbol,
            entry_timestamp=signal.timestamp,
            entry_price=effective_price,
            quantity=shares,
            current_price=effective_price,
            entry_commission=entry_commission
        )

        if strategy.risk_management.stop_loss_percent:
            position.stop_loss = effective_price * (1 - strategy.risk_management.stop_loss_percent / 100)

        if strategy.risk_management.take_profit_percent:
            position.take_profit = effective_price * (1 + strategy.risk_management.take_profit_percent / 100)

        self.portfolio.positions.append(position)
        self.portfolio.cash -= total_cost

        logger.info(f"Opened position: {signal.symbol} at {effective_price:.2f} for {shares:.2f} shares (commission ${entry_commission:.2f})")

    async def _process_sell_signal(self, signal: Signal, strategy: Strategy):
        """Process sell signal"""
        position = next(
            (p for p in self.portfolio.positions if p.symbol == signal.symbol), None
        )

        if position:
            await self._close_position(position, signal.price, signal.timestamp, signal.rule_name, strategy)

    async def _close_position(self, position: Position, exit_price: float,
                             exit_timestamp: datetime, exit_reason: str, strategy: Strategy):
        """Close a position and create trade record"""
        costs = strategy.transaction_costs
        # Slippage: sells fill slightly worse than the requested exit price
        effective_exit_price = exit_price * (1 - costs.slippage_percent / 100)
        exit_commission = costs.commission_fixed + (position.quantity * effective_exit_price * costs.commission_percent / 100)

        gross_pnl = (effective_exit_price - position.entry_price) * position.quantity
        total_commission = position.entry_commission + exit_commission
        pnl = gross_pnl - total_commission
        cost_basis = position.entry_price * position.quantity
        pnl_percent = (pnl / cost_basis) * 100 if cost_basis > 0 else 0.0

        trade = Trade(
            symbol=position.symbol,
            entry_timestamp=position.entry_timestamp,
            exit_timestamp=exit_timestamp,
            entry_price=position.entry_price,
            exit_price=effective_exit_price,
            quantity=position.quantity,
            pnl=pnl,
            pnl_percent=pnl_percent,
            rule_name=exit_reason,
            exit_reason=exit_reason,
            gross_pnl=gross_pnl,
            commission=total_commission
        )

        self.portfolio.trades.append(trade)
        self.portfolio.cash += position.quantity * effective_exit_price - exit_commission
        self.portfolio.realized_pnl += pnl
        if position in self.portfolio.positions:
            self.portfolio.positions.remove(position)

        logger.info(f"Closed position: {position.symbol} at {effective_exit_price:.2f}, P&L: ${pnl:.2f} ({pnl_percent:.2f}%), commission: ${total_commission:.2f}")
    
    def _update_portfolio_value(self, current_price: float):
        """Update portfolio total value.

        `cash` already had each open position's full cost basis subtracted at
        entry, so total_value must add back the position's current *market
        value* (quantity * current_price) - not just its unrealized P&L, which
        would silently drop the principal until the trade closes.
        """
        unrealized_pnl = 0.0
        positions_market_value = 0.0
        for position in self.portfolio.positions:
            position.current_price = current_price
            position.unrealized_pnl = (current_price - position.entry_price) * position.quantity
            unrealized_pnl += position.unrealized_pnl
            positions_market_value += position.quantity * current_price

        self.portfolio.unrealized_pnl = unrealized_pnl
        self.portfolio.total_value = self.portfolio.cash + positions_market_value