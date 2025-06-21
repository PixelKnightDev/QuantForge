# app/models/strategy_models.py - FIXED for cross-indicator comparisons
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
    indicator: str  # e.g., "rsi", "sma"
    parameters: Dict[str, Any] = {}  # e.g., {"period": 14}
    operator: ConditionOperator
    value: Union[float, int, IndicatorReference]  # threshold or another indicator config
    
    class Config:
        # Allow arbitrary types for more flexible validation
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
    value: float = 1.0  # amount, percentage, or risk percentage
    max_position_size: Optional[float] = None

class RiskManagement(BaseModel):
    """Risk management rules"""
    stop_loss_percent: Optional[float] = None
    take_profit_percent: Optional[float] = None
    max_positions: int = 1
    max_daily_trades: Optional[int] = None

class Strategy(BaseModel):
    """Complete trading strategy definition"""
    name: str
    description: Optional[str] = None
    rules: List[StrategyRule]
    position_sizing: PositionSizing = PositionSizing()
    risk_management: RiskManagement = RiskManagement()
    symbols: List[str] = []  # symbols to trade
    timeframe: str = "1d"  # data timeframe
    
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
    exit_reason: str  # "signal", "stop_loss", "take_profit"

class Portfolio(BaseModel):
    """Portfolio state"""
    cash: float = 100000.0  # starting cash
    positions: List[Position] = []
    trades: List[Trade] = []
    total_value: float = 100000.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0