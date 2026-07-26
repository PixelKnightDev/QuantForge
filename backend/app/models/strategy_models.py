
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Union, Literal, Any
from datetime import datetime
from enum import Enum

class SignalType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class ConditionOperator(str, Enum):
    GT = "gt"  # greater than
    LT = "lt"  # less than
    GTE = "gte"  # greater than or equal
    LTE = "lte"  # less than or equal
    EQ = "eq"  # equal
    CROSS_ABOVE = "cross_above"
    CROSS_BELOW = "cross_below"

class LogicalOperator(str, Enum):
    AND = "and"
    OR = "or"

class IndicatorReference(BaseModel):
    """Reference to another indicator for cross-indicator comparisons"""
    indicator: str
    parameters: Dict[str, Any] = {}

class IndicatorCondition(BaseModel):
    """Single condition comparing indicator value to threshold or another indicator"""
    indicator: str  
    parameters: Dict[str, Any] = {}  
    operator: ConditionOperator
    value: Union[float, int, IndicatorReference]  
    
    class Config:
        
        arbitrary_types_allowed = True

class StrategyRule(BaseModel):
    """A rule that generates buy/sell signals"""
    name: str
    signal_type: SignalType
    conditions: List[IndicatorCondition]
    logical_operator: LogicalOperator = LogicalOperator.AND
    
class PositionSizing(BaseModel):
    """Position sizing configuration"""
    method: Literal["fixed_amount", "fixed_percent", "risk_percent"] = "fixed_percent"
    value: float = 1.0
    max_position_size: Optional[float] = None

class RiskManagement(BaseModel):
    """Risk management rules"""
    stop_loss_percent: Optional[float] = None
    take_profit_percent: Optional[float] = None
    max_positions: int = 1
    max_daily_trades: Optional[int] = None

class TransactionCosts(BaseModel):
    """Modeled trading frictions applied on every fill"""
    commission_percent: float = 0.0
    commission_fixed: float = 0.0
    slippage_percent: float = 0.05

class Strategy(BaseModel):
    """Complete trading strategy definition"""
    name: str
    description: Optional[str] = None
    rules: List[StrategyRule]
    position_sizing: PositionSizing = PositionSizing()
    risk_management: RiskManagement = RiskManagement()
    transaction_costs: TransactionCosts = TransactionCosts()
    symbols: List[str] = []
    timeframe: str = "1d"
    
class Signal(BaseModel):
    """Generated trading signal"""
    timestamp: datetime
    symbol: str
    signal_type: SignalType
    price: float
    rule_name: str
    confidence: Optional[float] = None
    metadata: Dict = {}

class Position(BaseModel):
    """Open trading position"""
    symbol: str
    entry_timestamp: datetime
    entry_price: float
    quantity: float
    position_type: Literal["long", "short"] = "long"
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    entry_commission: float = 0.0

class Trade(BaseModel):
    """Completed trade"""
    symbol: str
    entry_timestamp: datetime
    exit_timestamp: datetime
    entry_price: float
    exit_price: float
    quantity: float
    position_type: Literal["long", "short"] = "long"
    pnl: float
    pnl_percent: float
    rule_name: str
    exit_reason: str
    gross_pnl: float = 0.0
    commission: float = 0.0

class EquityPoint(BaseModel):
    """A single mark-to-market snapshot of the portfolio during simulation"""
    timestamp: datetime
    value: float
    cash: float
    unrealized_pnl: float = 0.0

class Portfolio(BaseModel):
    """Portfolio state"""
    cash: float = 100000.0
    positions: List[Position] = []
    trades: List[Trade] = []
    total_value: float = 100000.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    total_return_percent: float = 0.0
    equity_curve: List[EquityPoint] = []