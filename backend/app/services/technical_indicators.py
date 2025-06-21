# backend/app/services/technical_indicators.py
# Phase 3: Technical Indicators Module - Foundation for all strategies

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class IndicatorResult:
    """Container for indicator calculation results"""
    name: str
    values: pd.Series
    parameters: Dict[str, any]
    calculation_time: datetime
    data_points: int
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'name': self.name,
            'values': self.values.to_dict(),
            'parameters': self.parameters,
            'calculation_time': self.calculation_time.isoformat(),
            'data_points': self.data_points
        }

class TechnicalIndicators:
    """
    Comprehensive technical indicators library for trading strategies.
    
    All methods are static for easy use across the application.
    Supports vectorized operations for performance.
    """
    
    # =============================================================================
    # MOVING AVERAGES
    # =============================================================================
    
    @staticmethod
    def sma(data: pd.Series, period: int) -> pd.Series:
        """
        Simple Moving Average
        
        Args:
            data: Price series (usually Close prices)
            period: Number of periods for calculation
            
        Returns:
            Series with SMA values
        """
        if len(data) < period:
            logger.warning(f"Insufficient data for SMA calculation. Need {period}, got {len(data)}")
            return pd.Series(index=data.index, dtype=float)
        
        return data.rolling(window=period, min_periods=period).mean()
    
    @staticmethod
    def ema(data: pd.Series, period: int) -> pd.Series:
        """
        Exponential Moving Average
        
        Args:
            data: Price series (usually Close prices)
            period: Number of periods for calculation
            
        Returns:
            Series with EMA values
        """
        if len(data) < period:
            logger.warning(f"Insufficient data for EMA calculation. Need {period}, got {len(data)}")
            return pd.Series(index=data.index, dtype=float)
        
        return data.ewm(span=period, adjust=False).mean()
    
    @staticmethod
    def wma(data: pd.Series, period: int) -> pd.Series:
        """
        Weighted Moving Average
        
        Args:
            data: Price series
            period: Number of periods for calculation
            
        Returns:
            Series with WMA values
        """
        if len(data) < period:
            return pd.Series(index=data.index, dtype=float)
        
        weights = np.arange(1, period + 1)
        
        def calculate_wma(window):
            return np.average(window, weights=weights)
        
        return data.rolling(window=period).apply(calculate_wma, raw=True)
    
    # =============================================================================
    # MOMENTUM INDICATORS
    # =============================================================================
    
    @staticmethod
    def rsi(data: pd.Series, period: int = 14) -> pd.Series:
        """
        Relative Strength Index
        
        Args:
            data: Price series (usually Close prices)
            period: Number of periods for calculation (default: 14)
            
        Returns:
            Series with RSI values (0-100)
        """
        if len(data) < period + 1:
            logger.warning(f"Insufficient data for RSI calculation. Need {period + 1}, got {len(data)}")
            return pd.Series(index=data.index, dtype=float)
        
        # Calculate price changes
        delta = data.diff()
        
        # Separate gains and losses
        gains = delta.where(delta > 0, 0)
        losses = -delta.where(delta < 0, 0)
        
        # Calculate average gains and losses
        avg_gains = gains.rolling(window=period, min_periods=period).mean()
        avg_losses = losses.rolling(window=period, min_periods=period).mean()
        
        # Calculate relative strength
        rs = avg_gains / avg_losses
        
        # Calculate RSI
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def stochastic(high: pd.Series, low: pd.Series, close: pd.Series, 
                   k_period: int = 14, d_period: int = 3) -> Dict[str, pd.Series]:
        """
        Stochastic Oscillator
        
        Args:
            high: High price series
            low: Low price series  
            close: Close price series
            k_period: Period for %K calculation
            d_period: Period for %D smoothing
            
        Returns:
            Dictionary with 'k' and 'd' series
        """
        if len(close) < k_period:
            empty_series = pd.Series(index=close.index, dtype=float)
            return {'k': empty_series, 'd': empty_series}
        
        # Calculate %K
        lowest_low = low.rolling(window=k_period, min_periods=k_period).min()
        highest_high = high.rolling(window=k_period, min_periods=k_period).max()
        
        k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        
        # Calculate %D (smoothed %K)
        d_percent = k_percent.rolling(window=d_period, min_periods=d_period).mean()
        
        return {
            'k': k_percent,
            'd': d_percent
        }
    
    @staticmethod
    def williams_r(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        Williams %R
        
        Args:
            high: High price series
            low: Low price series
            close: Close price series
            period: Number of periods for calculation
            
        Returns:
            Series with Williams %R values (-100 to 0)
        """
        if len(close) < period:
            return pd.Series(index=close.index, dtype=float)
        
        highest_high = high.rolling(window=period, min_periods=period).max()
        lowest_low = low.rolling(window=period, min_periods=period).min()
        
        williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
        
        return williams_r
    
    # =============================================================================
    # TREND INDICATORS
    # =============================================================================
    
    @staticmethod
    def macd(data: pd.Series, fast_period: int = 12, slow_period: int = 26, 
             signal_period: int = 9) -> Dict[str, pd.Series]:
        """
        Moving Average Convergence Divergence
        
        Args:
            data: Price series (usually Close prices)
            fast_period: Fast EMA period
            slow_period: Slow EMA period  
            signal_period: Signal line EMA period
            
        Returns:
            Dictionary with 'macd', 'signal', and 'histogram' series
        """
        if len(data) < slow_period:
            empty_series = pd.Series(index=data.index, dtype=float)
            return {
                'macd': empty_series,
                'signal': empty_series, 
                'histogram': empty_series
            }
        
        # Calculate EMAs
        ema_fast = TechnicalIndicators.ema(data, fast_period)
        ema_slow = TechnicalIndicators.ema(data, slow_period)
        
        # Calculate MACD line
        macd_line = ema_fast - ema_slow
        
        # Calculate signal line
        signal_line = TechnicalIndicators.ema(macd_line, signal_period)
        
        # Calculate histogram
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Dict[str, pd.Series]:
        """
        Average Directional Index
        
        Args:
            high: High price series
            low: Low price series
            close: Close price series
            period: Number of periods for calculation
            
        Returns:
            Dictionary with 'adx', 'di_plus', 'di_minus' series
        """
        if len(close) < period + 1:
            empty_series = pd.Series(index=close.index, dtype=float)
            return {'adx': empty_series, 'di_plus': empty_series, 'di_minus': empty_series}
        
        # Calculate True Range
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Calculate Directional Movement
        dm_plus = np.where((high - high.shift(1)) > (low.shift(1) - low), 
                          np.maximum(high - high.shift(1), 0), 0)
        dm_minus = np.where((low.shift(1) - low) > (high - high.shift(1)), 
                           np.maximum(low.shift(1) - low, 0), 0)
        
        dm_plus = pd.Series(dm_plus, index=close.index)
        dm_minus = pd.Series(dm_minus, index=close.index)
        
        # Calculate smoothed values
        atr = true_range.rolling(window=period).mean()
        adm_plus = dm_plus.rolling(window=period).mean()
        adm_minus = dm_minus.rolling(window=period).mean()
        
        # Calculate Directional Indicators
        di_plus = 100 * (adm_plus / atr)
        di_minus = 100 * (adm_minus / atr)
        
        # Calculate ADX
        dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
        adx = dx.rolling(window=period).mean()
        
        return {
            'adx': adx,
            'di_plus': di_plus,
            'di_minus': di_minus
        }
    
    # =============================================================================
    # VOLATILITY INDICATORS  
    # =============================================================================
    
    @staticmethod
    def bollinger_bands(data: pd.Series, period: int = 20, std_dev: float = 2.0) -> Dict[str, pd.Series]:
        """
        Bollinger Bands
        
        Args:
            data: Price series (usually Close prices)
            period: Number of periods for moving average
            std_dev: Number of standard deviations for bands
            
        Returns:
            Dictionary with 'upper', 'middle', 'lower' series
        """
        if len(data) < period:
            empty_series = pd.Series(index=data.index, dtype=float)
            return {
                'upper': empty_series,
                'middle': empty_series,
                'lower': empty_series
            }
        
        # Calculate middle band (SMA)
        middle_band = TechnicalIndicators.sma(data, period)
        
        # Calculate standard deviation
        std = data.rolling(window=period, min_periods=period).std()
        
        # Calculate upper and lower bands
        upper_band = middle_band + (std * std_dev)
        lower_band = middle_band - (std * std_dev)
        
        return {
            'upper': upper_band,
            'middle': middle_band,
            'lower': lower_band
        }
    
    @staticmethod
    def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        Average True Range
        
        Args:
            high: High price series
            low: Low price series
            close: Close price series
            period: Number of periods for calculation
            
        Returns:
            Series with ATR values
        """
        if len(close) < period + 1:
            return pd.Series(index=close.index, dtype=float)
        
        # Calculate True Range components
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        # True Range is the maximum of the three
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Calculate ATR as moving average of True Range
        atr = true_range.rolling(window=period, min_periods=period).mean()
        
        return atr
    
    # =============================================================================
    # VOLUME INDICATORS
    # =============================================================================
    
    @staticmethod
    def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
        """
        On-Balance Volume
        
        Args:
            close: Close price series
            volume: Volume series
            
        Returns:
            Series with OBV values
        """
        if len(close) < 2:
            return pd.Series(index=close.index, dtype=float)
        
        # Calculate price direction
        price_change = close.diff()
        
        # Calculate OBV
        obv_values = []
        obv = 0
        
        for i, (price_diff, vol) in enumerate(zip(price_change, volume)):
            if i == 0:  # First value
                obv_values.append(vol)
                obv = vol
            elif price_diff > 0:  # Price up
                obv += vol
                obv_values.append(obv)
            elif price_diff < 0:  # Price down
                obv -= vol
                obv_values.append(obv)
            else:  # Price unchanged
                obv_values.append(obv)
        
        return pd.Series(obv_values, index=close.index)
    
    @staticmethod
    def vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
        """
        Volume Weighted Average Price
        
        Args:
            high: High price series
            low: Low price series
            close: Close price series
            volume: Volume series
            
        Returns:
            Series with VWAP values
        """
        if len(close) == 0:
            return pd.Series(index=close.index, dtype=float)
        
        # Calculate typical price
        typical_price = (high + low + close) / 3
        
        # Calculate volume-weighted typical price
        volume_price = typical_price * volume
        
        # Calculate cumulative sums
        cumulative_volume_price = volume_price.cumsum()
        cumulative_volume = volume.cumsum()
        
        # Calculate VWAP
        vwap = cumulative_volume_price / cumulative_volume
        
        return vwap
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    @classmethod
    def calculate_indicator(cls, indicator_name: str, data: Dict[str, pd.Series], 
                          parameters: Dict[str, any]) -> IndicatorResult:
        """
        Generic method to calculate any indicator
        
        Args:
            indicator_name: Name of the indicator to calculate
            data: Dictionary containing OHLCV data
            parameters: Parameters for the indicator
            
        Returns:
            IndicatorResult object
        """
        start_time = datetime.now()
        
        try:
            # Map indicator names to methods
            indicator_methods = {
                'sma': cls._calc_sma,
                'ema': cls._calc_ema,
                'rsi': cls._calc_rsi,
                'macd': cls._calc_macd,
                'bollinger_bands': cls._calc_bollinger_bands,
                'stochastic': cls._calc_stochastic,
                'atr': cls._calc_atr,
                'adx': cls._calc_adx,
                'obv': cls._calc_obv,
                'vwap': cls._calc_vwap,
                'williams_r': cls._calc_williams_r
            }
            
            if indicator_name not in indicator_methods:
                raise ValueError(f"Unknown indicator: {indicator_name}")
            
            # Calculate the indicator
            result = indicator_methods[indicator_name](data, parameters)
            
            # Create result object
            return IndicatorResult(
                name=indicator_name,
                values=result,
                parameters=parameters,
                calculation_time=start_time,
                data_points=len(result) if isinstance(result, pd.Series) else len(list(result.values())[0])
            )
            
        except Exception as e:
            logger.error(f"Error calculating {indicator_name}: {str(e)}")
            raise
    
    # Helper methods for calculate_indicator
    @classmethod
    def _calc_sma(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.sma(data['close'], params.get('period', 20))
    
    @classmethod
    def _calc_ema(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.ema(data['close'], params.get('period', 20))
    
    @classmethod
    def _calc_rsi(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.rsi(data['close'], params.get('period', 14))
    
    @classmethod
    def _calc_macd(cls, data: Dict[str, pd.Series], params: Dict) -> Dict[str, pd.Series]:
        return cls.macd(
            data['close'], 
            params.get('fast_period', 12),
            params.get('slow_period', 26),
            params.get('signal_period', 9)
        )
    
    @classmethod
    def _calc_bollinger_bands(cls, data: Dict[str, pd.Series], params: Dict) -> Dict[str, pd.Series]:
        return cls.bollinger_bands(
            data['close'],
            params.get('period', 20),
            params.get('std_dev', 2.0)
        )
    
    @classmethod
    def _calc_stochastic(cls, data: Dict[str, pd.Series], params: Dict) -> Dict[str, pd.Series]:
        return cls.stochastic(
            data['high'], data['low'], data['close'],
            params.get('k_period', 14),
            params.get('d_period', 3)
        )
    
    @classmethod
    def _calc_atr(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.atr(data['high'], data['low'], data['close'], params.get('period', 14))
    
    @classmethod
    def _calc_adx(cls, data: Dict[str, pd.Series], params: Dict) -> Dict[str, pd.Series]:
        return cls.adx(data['high'], data['low'], data['close'], params.get('period', 14))
    
    @classmethod
    def _calc_obv(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.obv(data['close'], data['volume'])
    
    @classmethod
    def _calc_vwap(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.vwap(data['high'], data['low'], data['close'], data['volume'])
    
    @classmethod
    def _calc_williams_r(cls, data: Dict[str, pd.Series], params: Dict) -> pd.Series:
        return cls.williams_r(data['high'], data['low'], data['close'], params.get('period', 14))
    
    @classmethod
    def get_available_indicators(cls) -> Dict[str, Dict[str, any]]:
        """
        Get list of available indicators with their parameters
        
        Returns:
            Dictionary mapping indicator names to their parameter specifications
        """
        return {
            'sma': {
                'name': 'Simple Moving Average',
                'description': 'Average price over a specified period',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'min': 2, 'max': 200}
                },
                'data_required': ['close']
            },
            'ema': {
                'name': 'Exponential Moving Average',
                'description': 'Weighted average giving more importance to recent prices',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'min': 2, 'max': 200}
                },
                'data_required': ['close']
            },
            'rsi': {
                'name': 'Relative Strength Index',
                'description': 'Momentum oscillator measuring speed and magnitude of price changes',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'min': 2, 'max': 50}
                },
                'data_required': ['close'],
                'range': [0, 100]
            },
            'macd': {
                'name': 'Moving Average Convergence Divergence',
                'description': 'Trend-following momentum indicator',
                'parameters': {
                    'fast_period': {'type': 'int', 'default': 12, 'min': 2, 'max': 50},
                    'slow_period': {'type': 'int', 'default': 26, 'min': 10, 'max': 100},
                    'signal_period': {'type': 'int', 'default': 9, 'min': 2, 'max': 20}
                },
                'data_required': ['close'],
                'returns_multiple': True
            },
            'bollinger_bands': {
                'name': 'Bollinger Bands',
                'description': 'Volatility bands around a moving average',
                'parameters': {
                    'period': {'type': 'int', 'default': 20, 'min': 5, 'max': 100},
                    'std_dev': {'type': 'float', 'default': 2.0, 'min': 0.5, 'max': 4.0}
                },
                'data_required': ['close'],
                'returns_multiple': True
            },
            'stochastic': {
                'name': 'Stochastic Oscillator',
                'description': 'Momentum indicator comparing closing price to price range',
                'parameters': {
                    'k_period': {'type': 'int', 'default': 14, 'min': 5, 'max': 50},
                    'd_period': {'type': 'int', 'default': 3, 'min': 1, 'max': 10}
                },
                'data_required': ['high', 'low', 'close'],
                'range': [0, 100],
                'returns_multiple': True
            },
            'atr': {
                'name': 'Average True Range',
                'description': 'Volatility indicator measuring market volatility',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'min': 2, 'max': 50}
                },
                'data_required': ['high', 'low', 'close']
            },
            'adx': {
                'name': 'Average Directional Index',
                'description': 'Trend strength indicator',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 50}
                },
                'data_required': ['high', 'low', 'close'],
                'range': [0, 100],
                'returns_multiple': True
            },
            'obv': {
                'name': 'On-Balance Volume',
                'description': 'Volume-based momentum indicator',
                'parameters': {},
                'data_required': ['close', 'volume']
            },
            'vwap': {
                'name': 'Volume Weighted Average Price',
                'description': 'Average price weighted by volume',
                'parameters': {},
                'data_required': ['high', 'low', 'close', 'volume']
            },
            'williams_r': {
                'name': 'Williams %R',
                'description': 'Momentum indicator similar to stochastic oscillator',
                'parameters': {
                    'period': {'type': 'int', 'default': 14, 'min': 5, 'max': 50}
                },
                'data_required': ['high', 'low', 'close'],
                'range': [-100, 0]
            }
        }


# Global instance for easy access
technical_indicators = TechnicalIndicators()