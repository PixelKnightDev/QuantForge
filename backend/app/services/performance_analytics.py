# app/services/performance_analytics.py - FIXED VERSION with NaN handling
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
import logging
from scipy import stats
import yfinance as yf

from ..models.strategy_models import Portfolio, Trade
from ..models.performance_models import *

logger = logging.getLogger(__name__)

def safe_float(value, default=0.0):
    """Convert value to safe float, handling NaN and infinity"""
    if pd.isna(value) or np.isinf(value):
        return default
    return float(value)

def safe_divide(numerator, denominator, default=0.0):
    """Safe division that handles zero denominator and NaN values"""
    if denominator == 0 or pd.isna(denominator) or pd.isna(numerator):
        return default
    result = numerator / denominator
    return safe_float(result, default)

class PerformanceAnalytics:
    """Comprehensive performance analytics engine with NaN safety"""
    
    def __init__(self, risk_free_rate: float = 0.02):
        self.risk_free_rate = risk_free_rate
        
    def analyze_portfolio_performance(
        self, 
        portfolio: Portfolio, 
        trades: List[Trade],
        symbol: str,
        strategy_name: str,
        start_date: str,
        end_date: str,
        benchmark_symbol: str = "SPY"
    ) -> PerformanceReport:
        """Generate comprehensive performance analysis"""
        
        logger.info(f"Analyzing performance for {strategy_name} on {symbol}")
        
        # Create time series from trades
        performance_series = self._create_performance_series(
            portfolio, trades, start_date, end_date
        )
        
        if not performance_series:
            raise ValueError("No performance data available for analysis")
        
        # Calculate core metrics
        metrics = self._calculate_performance_metrics(performance_series, portfolio)
        
        # Risk analysis
        risk_analysis = self._calculate_risk_metrics(performance_series)
        
        # Drawdown analysis
        drawdown_periods, current_drawdown = self._analyze_drawdowns(performance_series)
        
        # Monthly returns breakdown
        monthly_returns = self._calculate_monthly_returns(performance_series)
        
        # Benchmark comparison
        benchmark_comparison = None
        if benchmark_symbol:
            try:
                benchmark_comparison = self._compare_to_benchmark(
                    performance_series, benchmark_symbol, start_date, end_date
                )
            except Exception as e:
                logger.warning(f"Benchmark comparison failed: {e}")
        
        return PerformanceReport(
            strategy_name=strategy_name,
            symbol=symbol,
            start_date=datetime.strptime(start_date, "%Y-%m-%d").date(),
            end_date=datetime.strptime(end_date, "%Y-%m-%d").date(),
            analysis_date=datetime.now(),
            metrics=metrics,
            risk_analysis=risk_analysis,
            performance_series=performance_series,
            drawdown_periods=drawdown_periods,
            current_drawdown=current_drawdown,
            monthly_returns=monthly_returns,
            benchmark_comparison=benchmark_comparison,
            initial_capital=100000.0,  # Fixed initial capital
            risk_free_rate=self.risk_free_rate
        )
    
    def _create_performance_series(
        self, 
        portfolio: Portfolio, 
        trades: List[Trade],
        start_date: str,
        end_date: str
    ) -> List[PerformanceTimeSeriesPoint]:
        """Create daily performance time series"""
        
        # Create date range
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        date_range = pd.date_range(start=start, end=end, freq='D')
        
        # Initialize portfolio tracking
        initial_capital = 100000.0  # Default starting capital
        current_capital = initial_capital
        
        performance_data = []
        cumulative_return = 0.0
        peak_value = initial_capital
        
        # Sort trades by date
        sorted_trades = sorted(trades, key=lambda t: t.exit_timestamp)
        trade_index = 0
        
        for current_date in date_range:
            # Process trades that occurred on this date
            daily_pnl = 0.0
            while (trade_index < len(sorted_trades) and 
                   sorted_trades[trade_index].exit_timestamp.date() <= current_date.date()):
                trade = sorted_trades[trade_index]
                daily_pnl += safe_float(trade.pnl, 0.0)
                trade_index += 1
            
            # Update capital
            current_capital += daily_pnl
            current_capital = max(current_capital, 0.01)  # Ensure positive capital
            
            # Calculate returns
            daily_return = safe_divide(daily_pnl, current_capital, 0.0)
            cumulative_return = safe_divide(current_capital - initial_capital, initial_capital, 0.0)
            
            # Update peak and calculate drawdown
            if current_capital > peak_value:
                peak_value = current_capital
            
            drawdown = safe_divide(peak_value - current_capital, peak_value, 0.0)
            
            performance_data.append(PerformanceTimeSeriesPoint(
                date=current_date.date(),
                portfolio_value=safe_float(current_capital),
                daily_return=safe_float(daily_return),
                cumulative_return=safe_float(cumulative_return),
                drawdown=safe_float(drawdown)
            ))
        
        return performance_data
    
    def _calculate_performance_metrics(
        self, 
        performance_series: List[PerformanceTimeSeriesPoint],
        portfolio: Portfolio
    ) -> PerformanceMetrics:
        """Calculate core performance metrics with NaN safety(enhanced)"""
        
        if not performance_series:
            raise ValueError("No performance data available")
        
        # Extract returns and clean data
        daily_returns = [safe_float(point.daily_return) for point in performance_series if abs(point.daily_return) > 1e-10]
        portfolio_values = [safe_float(point.portfolio_value) for point in performance_series]
        drawdowns = [safe_float(point.drawdown) for point in performance_series]
        
        # Basic return metrics
        total_return = safe_float(performance_series[-1].cumulative_return)
        
        # Annualized return (assuming 252 trading days)
        days = len(performance_series)
        if days > 0 and total_return != 0:
            annualized_return = safe_float((1 + total_return) ** (252 / days) - 1)
        else:
            annualized_return = 0.0
        
        # Volatility - handle empty returns
        if len(daily_returns) > 1:
            volatility = safe_float(np.std(daily_returns) * np.sqrt(252))
        else:
            volatility = 0.0
        
        # Risk-adjusted returns
        if daily_returns:
            excess_returns = np.array(daily_returns) - (self.risk_free_rate / 252)
            mean_excess = safe_float(np.mean(excess_returns))
            std_excess = safe_float(np.std(excess_returns))
            
            if std_excess > 0:
                sharpe_ratio = safe_float(mean_excess / std_excess * np.sqrt(252))
            else:
                sharpe_ratio = 0.0
            
            # Sortino ratio (downside deviation)
            negative_returns = [r for r in daily_returns if r < 0]
            if negative_returns:
                downside_std = safe_float(np.std(negative_returns))
                if downside_std > 0:
                    sortino_ratio = safe_float(mean_excess / downside_std * np.sqrt(252))
                else:
                    sortino_ratio = 0.0
            else:
                sortino_ratio = 0.0
        else:
            sharpe_ratio = 0.0
            sortino_ratio = 0.0
        
        # Drawdown metrics
        max_drawdown = safe_float(max(drawdowns) if drawdowns else 0.0)
        avg_drawdown = safe_float(np.mean([d for d in drawdowns if d > 0]) if drawdowns else 0.0)
        
        # Calmar ratio
        calmar_ratio = safe_divide(annualized_return, max_drawdown, 0.0) if max_drawdown > 0 else 0.0
        
        # Trade statistics
        trades = portfolio.trades
        total_trades = len(trades)
        winning_trades = len([t for t in trades if safe_float(t.pnl) > 0])
        losing_trades = len([t for t in trades if safe_float(t.pnl) < 0])
        win_rate = safe_divide(winning_trades, total_trades) * 100 if total_trades > 0 else 0.0
        
        # Trade performance
        winning_pnls = [safe_float(t.pnl_percent) for t in trades if safe_float(t.pnl) > 0]
        losing_pnls = [safe_float(t.pnl_percent) for t in trades if safe_float(t.pnl) < 0]
        all_pnls = [safe_float(t.pnl_percent) for t in trades]
        
        avg_win = safe_float(np.mean(winning_pnls) if winning_pnls else 0.0)
        avg_loss = safe_float(np.mean(losing_pnls) if losing_pnls else 0.0)
        best_trade = safe_float(max(all_pnls) if all_pnls else 0.0)
        worst_trade = safe_float(min(all_pnls) if all_pnls else 0.0)
        avg_trade = safe_float(np.mean(all_pnls) if all_pnls else 0.0)
        
        # Profit factor
        gross_profit = sum([safe_float(t.pnl) for t in trades if safe_float(t.pnl) > 0])
        gross_loss = abs(sum([safe_float(t.pnl) for t in trades if safe_float(t.pnl) < 0]))
        
        if gross_loss > 0:
            profit_factor = safe_divide(gross_profit, gross_loss, 1.0)
        else:
            profit_factor = 1.0 if gross_profit > 0 else 0.0
        
        # Expectancy
        expectancy = safe_float((win_rate / 100 * avg_win) - ((100 - win_rate) / 100 * abs(avg_loss)))
        
        # ADD NEW: Calculate enhanced trading metrics
        enhanced_metrics = self._calculate_enhanced_trading_metrics(trades)

        # VaR calculation
        if daily_returns and len(daily_returns) > 10:
            var_95 = safe_float(np.percentile(daily_returns, 5))
            cvar_95 = safe_float(np.mean([r for r in daily_returns if r <= var_95]) if daily_returns else 0.0)
        else:
            var_95 = 0.0
            cvar_95 = 0.0
        
        return PerformanceMetrics(
            total_return=safe_float(total_return * 100),
            annualized_return=safe_float(annualized_return * 100),
            cumulative_return=safe_float(total_return * 100),
            volatility=safe_float(volatility * 100),
            sharpe_ratio=safe_float(sharpe_ratio),
            sortino_ratio=safe_float(sortino_ratio),
            calmar_ratio=safe_float(calmar_ratio),
            max_drawdown=safe_float(max_drawdown * 100),
            max_drawdown_duration=self._calculate_max_drawdown_duration(performance_series),
            avg_drawdown=safe_float(avg_drawdown * 100),
            recovery_factor=safe_divide(safe_float(portfolio.realized_pnl), max_drawdown, 0.0) if max_drawdown > 0 else 0.0,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=safe_float(win_rate),
            avg_win=safe_float(avg_win),
            avg_loss=safe_float(avg_loss),
            best_trade=safe_float(best_trade),
            worst_trade=safe_float(worst_trade),
            avg_trade=safe_float(avg_trade),
            profit_factor=safe_float(profit_factor),
            expectancy=safe_float(expectancy),
            var_95=safe_float(var_95 * 100),
            cvar_95=safe_float(cvar_95 * 100),
            avg_trade_duration_hours=enhanced_metrics['avg_trade_duration_hours'],
            largest_win_percent=enhanced_metrics['largest_win_percent'],
            largest_loss_percent=enhanced_metrics['largest_loss_percent'],
            turnover_percent=enhanced_metrics['turnover_percent']
        )
    
    def _calculate_risk_metrics(
        self, 
        performance_series: List[PerformanceTimeSeriesPoint]
    ) -> RiskAnalysis:
        """Calculate comprehensive risk metrics with NaN safety"""
        
        daily_returns = [safe_float(point.daily_return) for point in performance_series if abs(point.daily_return) > 1e-10]
        
        if not daily_returns or len(daily_returns) < 2:
            # Return safe default values if insufficient data
            return RiskAnalysis(
                daily_volatility=0.0,
                monthly_volatility=0.0,
                annualized_volatility=0.0,
                downside_deviation=0.0,
                semi_deviation=0.0,
                var_99=0.0,
                var_95=0.0,
                var_90=0.0,
                cvar_99=0.0,
                cvar_95=0.0,
                cvar_90=0.0,
                skewness=0.0,
                kurtosis=0.0,
                tail_ratio=1.0
            )
        
        returns_array = np.array(daily_returns)
        
        # Volatility measures
        daily_vol = safe_float(np.std(returns_array))
        monthly_vol = safe_float(daily_vol * np.sqrt(21))  # ~21 trading days per month
        annual_vol = safe_float(daily_vol * np.sqrt(252))
        
        # Downside risk
        negative_returns = returns_array[returns_array < 0]
        downside_dev = safe_float(np.std(negative_returns) if len(negative_returns) > 0 else 0.0)
        semi_dev = safe_float(np.sqrt(np.mean(np.minimum(returns_array, 0) ** 2)))
        
        # Value at Risk (only if sufficient data)
        if len(returns_array) >= 10:
            var_99 = safe_float(np.percentile(returns_array, 1))
            var_95 = safe_float(np.percentile(returns_array, 5))
            var_90 = safe_float(np.percentile(returns_array, 10))
            
            # Conditional VaR
            cvar_99 = safe_float(np.mean(returns_array[returns_array <= var_99]) if np.any(returns_array <= var_99) else var_99)
            cvar_95 = safe_float(np.mean(returns_array[returns_array <= var_95]) if np.any(returns_array <= var_95) else var_95)
            cvar_90 = safe_float(np.mean(returns_array[returns_array <= var_90]) if np.any(returns_array <= var_90) else var_90)
        else:
            var_99 = var_95 = var_90 = 0.0
            cvar_99 = cvar_95 = cvar_90 = 0.0
        
        # Distribution moments (only if sufficient data)
        if len(returns_array) >= 5:
            try:
                skew = safe_float(stats.skew(returns_array))
                kurt = safe_float(stats.kurtosis(returns_array))
            except:
                skew = kurt = 0.0
        else:
            skew = kurt = 0.0
        
        # Tail ratio (95th percentile / 5th percentile)
        if len(returns_array) >= 10:
            p95 = safe_float(np.percentile(returns_array, 95))
            p5 = safe_float(np.percentile(returns_array, 5))
            tail_ratio = safe_divide(abs(p95), abs(p5), 1.0) if p5 != 0 else 1.0
        else:
            tail_ratio = 1.0
        
        return RiskAnalysis(
            daily_volatility=safe_float(daily_vol * 100),
            monthly_volatility=safe_float(monthly_vol * 100),
            annualized_volatility=safe_float(annual_vol * 100),
            downside_deviation=safe_float(downside_dev * 100),
            semi_deviation=safe_float(semi_dev * 100),
            var_99=safe_float(var_99 * 100),
            var_95=safe_float(var_95 * 100),
            var_90=safe_float(var_90 * 100),
            cvar_99=safe_float(cvar_99 * 100),
            cvar_95=safe_float(cvar_95 * 100),
            cvar_90=safe_float(cvar_90 * 100),
            skewness=safe_float(skew),
            kurtosis=safe_float(kurt),
            tail_ratio=safe_float(tail_ratio)
        )
    
    def _analyze_drawdowns(
        self, 
        performance_series: List[PerformanceTimeSeriesPoint]
    ) -> Tuple[List[DrawdownPeriod], Optional[DrawdownPeriod]]:
        """Analyze drawdown periods"""
        
        drawdown_periods = []
        current_drawdown = None
        in_drawdown = False
        drawdown_start = None
        peak_value = 0
        
        for point in performance_series:
            drawdown_val = safe_float(point.drawdown)
            
            if drawdown_val > 0:
                if not in_drawdown:
                    # Starting a new drawdown
                    in_drawdown = True
                    drawdown_start = point.date
                    peak_value = safe_float(point.portfolio_value / (1 - drawdown_val))
                
                # Update current drawdown
                current_drawdown = DrawdownPeriod(
                    start_date=drawdown_start,
                    duration_days=(point.date - drawdown_start).days + 1,
                    drawdown_percent=safe_float(drawdown_val * 100),
                    peak_value=safe_float(peak_value),
                    trough_value=safe_float(point.portfolio_value),
                    recovered=False
                )
            
            elif in_drawdown and drawdown_val == 0:
                # Drawdown recovered
                if current_drawdown:
                    current_drawdown.end_date = point.date
                    current_drawdown.recovery_date = point.date
                    current_drawdown.recovered = True
                    drawdown_periods.append(current_drawdown)
                
                in_drawdown = False
                current_drawdown = None
        
        return drawdown_periods, current_drawdown
    
    def _calculate_monthly_returns(
        self, 
        performance_series: List[PerformanceTimeSeriesPoint]
    ) -> List[MonthlyReturns]:
        """Calculate monthly returns breakdown"""
        
        # Group by year and month
        monthly_data = {}
        
        for point in performance_series:
            year = point.date.year
            month = point.date.month
            
            if year not in monthly_data:
                monthly_data[year] = {}
            
            if month not in monthly_data[year]:
                monthly_data[year][month] = []
            
            monthly_data[year][month].append(point)
        
        monthly_returns = []
        
        for year in sorted(monthly_data.keys()):
            year_data = monthly_data[year]
            
            monthly_ret = MonthlyReturns(year=year, ytd=0.0)
            
            # Calculate returns for each month
            month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
            
            year_start_value = None
            year_end_value = None
            
            for month_num in range(1, 13):
                if month_num in year_data:
                    month_data = year_data[month_num]
                    month_start = safe_float(month_data[0].portfolio_value)
                    month_end = safe_float(month_data[-1].portfolio_value)
                    month_return = safe_divide(month_end - month_start, month_start) * 100
                    
                    setattr(monthly_ret, month_names[month_num - 1], safe_float(month_return))
                    
                    if year_start_value is None:
                        year_start_value = month_start
                    year_end_value = month_end
            
            # Calculate YTD return
            if year_start_value and year_end_value:
                monthly_ret.ytd = safe_float(safe_divide(year_end_value - year_start_value, year_start_value) * 100)
            
            monthly_returns.append(monthly_ret)
        
        return monthly_returns
    
    def _calculate_max_drawdown_duration(
        self, 
        performance_series: List[PerformanceTimeSeriesPoint]
    ) -> int:
        """Calculate maximum drawdown duration in days"""
        
        max_duration = 0
        current_duration = 0
        
        for point in performance_series:
            if safe_float(point.drawdown) > 0:
                current_duration += 1
                max_duration = max(max_duration, current_duration)
            else:
                current_duration = 0
        
        return max_duration
    
    def _compare_to_benchmark(
        self,
        performance_series: List[PerformanceTimeSeriesPoint],
        benchmark_symbol: str,
        start_date: str,
        end_date: str
    ) -> BenchmarkComparison:
        """Compare strategy performance to benchmark with NaN safety"""
        
        try:
            # Download benchmark data
            ticker = yf.Ticker(benchmark_symbol)
            benchmark_data = ticker.history(start=start_date, end=end_date)
            
            if benchmark_data.empty:
                raise ValueError(f"No benchmark data available for {benchmark_symbol}")
            
            # Calculate benchmark returns
            benchmark_returns = benchmark_data['Close'].pct_change().dropna()
            strategy_returns = [safe_float(p.daily_return) for p in performance_series if abs(p.daily_return) > 1e-10]
            
            # Ensure we have data
            if len(benchmark_returns) == 0 or len(strategy_returns) == 0:
                raise ValueError("Insufficient data for benchmark comparison")
            
            # Align dates (simplified - should be more robust in production)
            min_length = min(len(benchmark_returns), len(strategy_returns))
            benchmark_returns = benchmark_returns.iloc[:min_length].values
            strategy_returns = strategy_returns[:min_length]
            
            # Clean data
            benchmark_returns = [safe_float(r) for r in benchmark_returns]
            strategy_returns = [safe_float(r) for r in strategy_returns]
            
            # Calculate benchmark metrics
            benchmark_total_return = safe_float((benchmark_data['Close'].iloc[-1] / benchmark_data['Close'].iloc[0] - 1))
            benchmark_volatility = safe_float(np.std(benchmark_returns) * np.sqrt(252))
            
            benchmark_excess = np.array(benchmark_returns) - (self.risk_free_rate / 252)
            benchmark_sharpe = safe_divide(np.mean(benchmark_excess), np.std(benchmark_excess)) * np.sqrt(252)
            
            # Calculate relative metrics
            excess_returns = np.array(strategy_returns) - np.array(benchmark_returns)
            alpha = safe_float(np.mean(excess_returns) * 252)
            
            # Beta calculation
            if len(strategy_returns) > 1 and len(benchmark_returns) > 1:
                covariance = safe_float(np.cov(strategy_returns, benchmark_returns)[0][1])
                benchmark_variance = safe_float(np.var(benchmark_returns))
                beta = safe_divide(covariance, benchmark_variance, 0.0)
                
                # Correlation
                correlation = safe_float(np.corrcoef(strategy_returns, benchmark_returns)[0][1])
            else:
                beta = 0.0
                correlation = 0.0
            
            # Other metrics
            tracking_error = safe_float(np.std(excess_returns) * np.sqrt(252))
            information_ratio = safe_divide(alpha, tracking_error, 0.0)
            
            strategy_total_return = safe_float(performance_series[-1].cumulative_return)
            excess_return = safe_float(strategy_total_return - benchmark_total_return)
            
            # Outperformance ratio
            outperformance_periods = sum(1 for s, b in zip(strategy_returns, benchmark_returns) if s > b)
            outperformance_ratio = safe_divide(outperformance_periods, len(strategy_returns)) * 100
            
            return BenchmarkComparison(
                benchmark_symbol=benchmark_symbol,
                benchmark_return=safe_float(benchmark_total_return * 100),
                benchmark_volatility=safe_float(benchmark_volatility * 100),
                benchmark_sharpe=safe_float(benchmark_sharpe),
                alpha=safe_float(alpha * 100),
                beta=safe_float(beta),
                correlation=safe_float(correlation),
                tracking_error=safe_float(tracking_error * 100),
                information_ratio=safe_float(information_ratio),
                excess_return=safe_float(excess_return * 100),
                outperformance_ratio=safe_float(outperformance_ratio)
            )
            
        except Exception as e:
            logger.warning(f"Benchmark comparison failed: {e}")
            # Return safe default benchmark comparison
            return BenchmarkComparison(
                benchmark_symbol=benchmark_symbol,
                benchmark_return=0.0,
                benchmark_volatility=0.0,
                benchmark_sharpe=0.0,
                alpha=0.0,
                beta=0.0,
                correlation=0.0,
                tracking_error=0.0,
                information_ratio=0.0,
                excess_return=0.0,
                outperformance_ratio=50.0
            )
    # ADD THIS METHOD to your existing PerformanceAnalytics class
    def _calculate_enhanced_trading_metrics(
        self, 
        trades: List[Trade]
    ) -> Dict[str, float]:
        """
        Calculate the 4 missing trading metrics:
        - avg_trade_duration_hours
        - largest_win_percent  
        - largest_loss_percent
        - turnover_percent
        """
        if not trades:
            return {
                'avg_trade_duration_hours': 0.0,
                'largest_win_percent': 0.0,
                'largest_loss_percent': 0.0,
                'turnover_percent': 0.0
            }
        
        # Calculate average trade duration in hours
        total_duration_hours = 0.0
        valid_duration_trades = 0
        
        for trade in trades:
            if hasattr(trade, 'entry_timestamp') and hasattr(trade, 'exit_timestamp'):
                try:
                    duration = trade.exit_timestamp - trade.entry_timestamp
                    duration_hours = duration.total_seconds() / 3600
                    total_duration_hours += duration_hours
                    valid_duration_trades += 1
                except:
                    continue
        
        avg_trade_duration_hours = safe_divide(total_duration_hours, valid_duration_trades, 0.0)
        
        # Calculate largest win and loss percentages
        trade_returns = [safe_float(trade.pnl_percent) for trade in trades if hasattr(trade, 'pnl_percent')]
        
        largest_win_percent = max(trade_returns) if trade_returns else 0.0
        largest_loss_percent = min(trade_returns) if trade_returns else 0.0
        
        # Calculate turnover percentage (simplified version)
        # Turnover = Total trade value / Average portfolio value * 100
        total_trade_value = 0.0
        for trade in trades:
            if hasattr(trade, 'entry_price') and hasattr(trade, 'quantity'):
                trade_value = safe_float(trade.entry_price) * safe_float(trade.quantity)
                total_trade_value += trade_value
        
        # Estimate portfolio value from trades (this is a simplified calculation)
        # In production, you'd want to track actual portfolio values over time
        estimated_avg_portfolio = 100000.0  # Default to initial capital
        if trades:
            # Try to estimate from first trade
            first_trade = trades[0]
            if hasattr(first_trade, 'entry_price') and hasattr(first_trade, 'quantity'):
                estimated_avg_portfolio = safe_float(first_trade.entry_price) * safe_float(first_trade.quantity) * 10
        
        # Annualized turnover rate
        if len(trades) > 0 and estimated_avg_portfolio > 0:
            # Assume trades span approximately 1 year for simplification
            turnover_percent = safe_divide(total_trade_value, estimated_avg_portfolio, 0.0) * 100
        else:
            turnover_percent = 0.0
        
        return {
            'avg_trade_duration_hours': safe_float(avg_trade_duration_hours),
            'largest_win_percent': safe_float(largest_win_percent),
            'largest_loss_percent': safe_float(largest_loss_percent),
            'turnover_percent': safe_float(turnover_percent)
        }