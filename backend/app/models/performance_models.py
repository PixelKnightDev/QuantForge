
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Union
from datetime import datetime, date
from enum import Enum

class RiskMetricType(str, Enum):
    SHARPE = "sharpe_ratio"
    SORTINO = "sortino_ratio"
    CALMAR = "calmar_ratio"
    TREYNOR = "treynor_ratio"
    INFORMATION = "information_ratio"

class PerformanceMetrics(BaseModel):
    """Core performance metrics for a strategy"""
    # Return Metrics
    total_return: float = Field(description="Total return percentage")
    annualized_return: float = Field(description="Annualized return percentage")
    cumulative_return: float = Field(description="Cumulative return percentage")
    
    # Risk Metrics
    volatility: float = Field(description="Annualized volatility")
    sharpe_ratio: float = Field(description="Sharpe ratio")
    sortino_ratio: float = Field(description="Sortino ratio")
    calmar_ratio: float = Field(description="Calmar ratio")
    
    # Drawdown Metrics
    max_drawdown: float = Field(description="Maximum drawdown percentage")
    max_drawdown_duration: int = Field(description="Max drawdown duration in days")
    avg_drawdown: float = Field(description="Average drawdown percentage")
    recovery_factor: float = Field(description="Recovery factor")
    
    # Trade Statistics
    total_trades: int = Field(description="Total number of trades")
    winning_trades: int = Field(description="Number of winning trades")
    losing_trades: int = Field(description="Number of losing trades")
    win_rate: float = Field(description="Win rate percentage")
    
    # Trade Performance
    avg_win: float = Field(description="Average winning trade percentage")
    avg_loss: float = Field(description="Average losing trade percentage")
    best_trade: float = Field(description="Best trade percentage")
    worst_trade: float = Field(description="Worst trade percentage")
    avg_trade: float = Field(description="Average trade percentage")
    
    # Risk Ratios
    profit_factor: float = Field(description="Profit factor")
    expectancy: float = Field(description="Mathematical expectancy")
    
    # Additional Metrics
    var_95: float = Field(description="Value at Risk (95%)")
    cvar_95: float = Field(description="Conditional Value at Risk (95%)")

    # advanced metrics
    avg_trade_duration_hours: float = 0.0
    largest_win_percent: float = 0.0
    largest_loss_percent: float = 0.0
    turnover_percent: float = 0.0

    
class DrawdownPeriod(BaseModel):
    """Represents a drawdown period"""
    start_date: date
    end_date: Optional[date] = None
    duration_days: int
    drawdown_percent: float
    peak_value: float
    trough_value: float
    recovery_date: Optional[date] = None
    recovered: bool = False

class BenchmarkComparison(BaseModel):
    """Comparison metrics against a benchmark"""
    benchmark_symbol: str
    benchmark_return: float
    benchmark_volatility: float
    benchmark_sharpe: float
    
    # Relative metrics
    alpha: float = Field(description="Alpha against benchmark")
    beta: float = Field(description="Beta against benchmark")
    correlation: float = Field(description="Correlation with benchmark")
    tracking_error: float = Field(description="Tracking error")
    information_ratio: float = Field(description="Information ratio")
    
    # Outperformance
    excess_return: float = Field(description="Excess return over benchmark")
    outperformance_ratio: float = Field(description="Percentage of periods outperforming")

class MonthlyReturns(BaseModel):
    """Monthly returns breakdown"""
    year: int
    jan: Optional[float] = None
    feb: Optional[float] = None
    mar: Optional[float] = None
    apr: Optional[float] = None
    may: Optional[float] = None
    jun: Optional[float] = None
    jul: Optional[float] = None
    aug: Optional[float] = None
    sep: Optional[float] = None
    oct: Optional[float] = None
    nov: Optional[float] = None
    dec: Optional[float] = None
    ytd: float = Field(description="Year to date return")

class PerformanceTimeSeriesPoint(BaseModel):
    """Single point in performance time series"""
    date: date
    portfolio_value: float
    daily_return: float
    cumulative_return: float
    drawdown: float
    benchmark_value: Optional[float] = None
    benchmark_return: Optional[float] = None

class RiskAnalysis(BaseModel):
    """Comprehensive risk analysis"""
    # Volatility Analysis
    daily_volatility: float
    monthly_volatility: float
    annualized_volatility: float
    
    # Downside Risk
    downside_deviation: float
    semi_deviation: float
    
    # Value at Risk
    var_99: float = Field(description="99% Value at Risk")
    var_95: float = Field(description="95% Value at Risk")
    var_90: float = Field(description="90% Value at Risk")
    
    # Conditional VaR
    cvar_99: float = Field(description="99% Conditional VaR")
    cvar_95: float = Field(description="95% Conditional VaR")
    cvar_90: float = Field(description="90% Conditional VaR")
    
    # Tail Risk
    skewness: float = Field(description="Return distribution skewness")
    kurtosis: float = Field(description="Return distribution kurtosis")
    tail_ratio: float = Field(description="Tail ratio")

class PerformanceReport(BaseModel):
    """Complete performance analysis report"""
    strategy_name: str
    symbol: str
    start_date: date
    end_date: date
    analysis_date: datetime
    
    # Core Performance
    metrics: PerformanceMetrics
    risk_analysis: RiskAnalysis
    
    # Time Series Data
    performance_series: List[PerformanceTimeSeriesPoint]
    
    # Drawdown Analysis
    drawdown_periods: List[DrawdownPeriod]
    current_drawdown: Optional[DrawdownPeriod] = None
    
    # Monthly Breakdown
    monthly_returns: List[MonthlyReturns]
    
    # Benchmark Comparison (optional)
    benchmark_comparison: Optional[BenchmarkComparison] = None
    
    # Configuration
    initial_capital: float = 100000.0
    risk_free_rate: float = 0.02 
    
class StrategyComparison(BaseModel):
    """Compare multiple strategies"""
    strategies: List[str]
    comparison_metrics: Dict[str, Dict[str, float]]
    rankings: Dict[str, List[str]]  
    correlation_matrix: Dict[str, Dict[str, float]]
    efficient_frontier_data: Optional[Dict] = None

class PerformanceConfig(BaseModel):
    """Configuration for performance calculations"""
    risk_free_rate: float = 0.02
    confidence_levels: List[float] = [0.90, 0.95, 0.99]
    benchmark_symbol: Optional[str] = "SPY"
    calculation_frequency: str = "daily" 
    include_benchmark: bool = True
    include_drawdown_analysis: bool = True
    include_monthly_breakdown: bool = True