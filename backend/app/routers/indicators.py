# backend/app/routers/indicators.py
# Phase 3: Technical Indicators API Endpoints - FIXED VERSION

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field, validator
import logging
from datetime import datetime
import pandas as pd
import asyncio
import numpy as np

from app.models.enhanced_data import DataSource
from app.services.enhanced_data_service import enhanced_data_service
from app.services.technical_indicators import TechnicalIndicators, IndicatorResult

logger = logging.getLogger(__name__)
router = APIRouter()

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class IndicatorRequest(BaseModel):
    """Request model for calculating indicators"""
    symbol: str = Field(..., description="Trading symbol (e.g., AAPL, BTC-USD)")
    indicator: str = Field(..., description="Indicator name (e.g., rsi, macd, bollinger_bands)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Indicator parameters")
    period: str = Field(default="1y", description="Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y)")
    interval: str = Field(default="1d", description="Data interval (1d, 1h, 5m, etc.)")
    source: DataSource = Field(default=DataSource.YAHOO_FINANCE, description="Data source")

    @validator('indicator')
    def validate_indicator(cls, v):
        available = TechnicalIndicators.get_available_indicators()
        if v not in available:
            raise ValueError(f"Unknown indicator: {v}. Available: {list(available.keys())}")
        return v

class IndicatorResponse(BaseModel):
    """Response model for indicator calculations"""
    symbol: str
    indicator: str
    parameters: Dict[str, Any]
    data_points: int
    calculation_time: str
    values: Dict[str, Any]  # Can be single series or multiple series
    metadata: Dict[str, Any]

class MultiIndicatorRequest(BaseModel):
    """Request model for calculating multiple indicators"""
    symbol: str
    indicators: List[Dict[str, Any]] = Field(..., description="List of indicators with parameters")
    period: str = Field(default="1y")
    interval: str = Field(default="1d") 
    source: DataSource = Field(default=DataSource.YAHOO_FINANCE)

class BulkIndicatorRequest(BaseModel):
    """Request model for calculating indicators across multiple symbols"""
    symbols: List[str] = Field(..., min_items=1, max_items=20)
    indicator: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    period: str = Field(default="1y")
    interval: str = Field(default="1d")
    source: DataSource = Field(default=DataSource.YAHOO_FINANCE)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# REPLACEMENT for the get_market_data_for_indicators function in your app/routers/indicators.py
# Replace lines approximately 65-120 in your indicators.py file

async def get_market_data_for_indicators(symbol: str, period: str, interval: str, 
                                        source: DataSource) -> Dict[str, pd.Series]:
    """Get market data and convert to DataFrame for indicator calculations - FIXED VERSION"""
    try:
        logger.info(f"🔄 Fetching market data for {symbol} (period={period}, interval={interval}, source={source})")
        
        # FIXED: Use the working enhanced_data_service.download_data method directly
        # This calls the same service that powers /api/market-data/{symbol}
        data = await enhanced_data_service.download_data(
            symbol=symbol,
            source=source,
            period=period,
            interval=interval,
            use_cache=True
        )
        
        logger.info(f"📊 Raw data response: {type(data)}, length: {len(data) if data else 'None'}")
        
        if not data or len(data) == 0:
            # More specific error message
            logger.error(f"No data returned for {symbol} from {source}")
            raise ValueError(f"No market data available for {symbol}. Please try a different symbol or check if {symbol} is a valid ticker.")
        
        # Convert List[EnhancedOHLCVData] to pandas DataFrame
        df_data = []
        for point in data:
            try:
                # Validate the data point has required fields
                if not hasattr(point, 'close') or point.close is None or point.close <= 0:
                    logger.debug(f"Skipping invalid data point: close={getattr(point, 'close', 'missing')}")
                    continue
                    
                df_data.append({
                    'timestamp': point.timestamp,
                    'open': float(point.open) if hasattr(point, 'open') and point.open is not None else float(point.close),
                    'high': float(point.high) if hasattr(point, 'high') and point.high is not None else float(point.close),
                    'low': float(point.low) if hasattr(point, 'low') and point.low is not None else float(point.close),
                    'close': float(point.close),
                    'volume': float(point.volume) if hasattr(point, 'volume') and point.volume is not None else 0.0
                })
            except (AttributeError, ValueError, TypeError) as point_error:
                logger.warning(f"Error processing data point: {point_error}")
                continue
        
        if not df_data:
            raise ValueError(f"No valid data points found for {symbol} - all data points were invalid")
        
        # Create DataFrame with timestamp index
        df = pd.DataFrame(df_data)
        df.set_index('timestamp', inplace=True)
        df.sort_index(inplace=True)  # Ensure chronological order
        
        # Remove any rows with all NaN values
        df = df.dropna(how='all')
        
        if df.empty:
            raise ValueError(f"All data points invalid for {symbol} after cleaning")
        
        logger.info(f"✅ Successfully processed {len(df)} data points for {symbol}")
        logger.info(f"📈 Date range: {df.index[0]} to {df.index[-1]}")
        logger.info(f"💰 Latest close price: ${df['close'].iloc[-1]:.2f}")
        
        # Create series dictionary for indicator calculations
        series_data = {
            'open': df['open'],
            'high': df['high'], 
            'low': df['low'],
            'close': df['close'],
            'volume': df['volume']
        }
        
        # Log series info for debugging
        logger.info(f"📊 Series summary - Close: {len(series_data['close'])} points, "
                   f"Range: ${series_data['close'].min():.2f} - ${series_data['close'].max():.2f}")
        
        return series_data
        
    except ValueError as e:
        # Re-raise ValueError with original message
        logger.error(f"❌ Data validation error for {symbol}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"💥 Unexpected error getting market data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market data: {str(e)}")

def format_indicator_response(symbol: str, indicator_name: str, result: Any, 
                            parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Format indicator calculation result for API response"""
    try:
        if isinstance(result, pd.Series):
            # Single series result
            values = {
                'values': result.dropna().to_dict(),
                'type': 'single_series'
            }
        elif isinstance(result, dict):
            # Multiple series result (e.g., MACD, Bollinger Bands)
            values = {
                'type': 'multiple_series',
                'series': {}
            }
            for key, series in result.items():
                if isinstance(series, pd.Series):
                    values['series'][key] = series.dropna().to_dict()
        else:
            values = {'values': result, 'type': 'raw'}
        
        # Calculate some basic statistics
        if isinstance(result, pd.Series):
            stats = {
                'count': int(result.count()),
                'mean': float(result.mean()) if not result.empty else None,
                'std': float(result.std()) if not result.empty else None,
                'min': float(result.min()) if not result.empty else None,
                'max': float(result.max()) if not result.empty else None,
                'latest': float(result.iloc[-1]) if not result.empty and pd.notna(result.iloc[-1]) else None
            }
        elif isinstance(result, dict) and all(isinstance(v, pd.Series) for v in result.values()):
            stats = {}
            for key, series in result.items():
                stats[key] = {
                    'count': int(series.count()),
                    'latest': float(series.iloc[-1]) if not series.empty and pd.notna(series.iloc[-1]) else None
                }
        else:
            stats = {}
        
        return {
            'symbol': symbol,
            'indicator': indicator_name,
            'parameters': parameters,
            'data_points': stats.get('count', 0) if isinstance(stats, dict) and 'count' in stats else 0,
            'calculation_time': datetime.now().isoformat(),
            'values': values,
            'statistics': stats,
            'metadata': {
                'source': 'technical_indicators_service',
                'version': '1.0',
                'calculation_method': 'pandas_vectorized'
            }
        }
        
    except Exception as e:
        logger.error(f"Error formatting indicator response: {e}")
        raise

def extract_typed_parameters(query_params: Dict[str, str], 
                           valid_params: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Extract and type-cast parameters from query string with flexible mapping"""
    typed_parameters = {}
    
    # Common parameter aliases
    param_aliases = {
        'period': ['period', 'rsi_period', 'sma_period', 'ema_period', 'bb_period'],
        'fast_period': ['fast_period', 'fast'],
        'slow_period': ['slow_period', 'slow'],
        'signal_period': ['signal_period', 'signal'],
        'std_dev': ['std_dev', 'std', 'deviation'],
        'rsi_period': ['rsi_period', 'period'],
        'sma_period': ['sma_period', 'period'],
        'ema_period': ['ema_period', 'period'],
        'bb_period': ['bb_period', 'period']
    }
    
    # First pass: direct parameter matching
    for param_name, param_info in valid_params.items():
        if param_name in query_params:
            typed_parameters[param_name] = _convert_param_type(
                query_params[param_name], 
                param_info.get('type', 'str'),
                param_name
            )
    
    # Second pass: try aliases for missing parameters
    for param_name, param_info in valid_params.items():
        if param_name in typed_parameters:
            continue  # Already found
            
        # Check aliases
        possible_names = param_aliases.get(param_name, [param_name])
        for alias in possible_names:
            if alias in query_params:
                typed_parameters[param_name] = _convert_param_type(
                    query_params[alias], 
                    param_info.get('type', 'str'),
                    param_name
                )
                logger.info(f"Parameter alias mapping: {alias} -> {param_name}")
                break
    
    return typed_parameters

def _convert_param_type(value: str, param_type: str, param_name: str) -> Any:
    """Convert parameter value to correct type"""
    try:
        if param_type == 'int':
            return int(value)
        elif param_type == 'float':
            return float(value)
        elif param_type == 'bool':
            return value.lower() in ('true', '1', 'yes', 'on')
        else:
            return value
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type for parameter {param_name}: expected {param_type}, got '{value}'"
        )

# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/available")
async def get_available_indicators():
    """Get list of all available technical indicators with their parameters"""
    try:
        indicators = TechnicalIndicators.get_available_indicators()
        
        return {
            "indicators": indicators,
            "total_count": len(indicators),
            "categories": {
                "moving_averages": ["sma", "ema"],
                "momentum": ["rsi", "stochastic", "williams_r"],
                "trend": ["macd", "adx"],
                "volatility": ["bollinger_bands", "atr"],
                "volume": ["obv", "vwap"]
            },
            "documentation": {
                "description": "Technical indicators for trading strategy development",
                "usage": "Use POST /calculate to compute indicators for specific symbols",
                "parameters": "Each indicator has customizable parameters with defaults"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting available indicators: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get indicators: {str(e)}")

@router.post("/calculate")
async def calculate_indicator(request: IndicatorRequest):
    """Calculate a single technical indicator for a symbol"""
    try:
        logger.info(f"Calculating {request.indicator} for {request.symbol}")
        
        # Get market data
        market_data = await get_market_data_for_indicators(
            request.symbol, request.period, request.interval, request.source
        )
        
        # Get indicator method and calculate
        available_indicators = TechnicalIndicators.get_available_indicators()
        indicator_info = available_indicators[request.indicator]
        
        # Validate required data
        required_data = indicator_info.get('data_required', ['close'])
        missing_data = [col for col in required_data if col not in market_data]
        if missing_data:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required data columns: {missing_data}"
            )
        
        # Calculate the indicator using the generic method
        result = TechnicalIndicators.calculate_indicator(
            request.indicator, 
            market_data, 
            request.parameters
        )
        
        # Format response
        response = format_indicator_response(
            request.symbol, 
            request.indicator, 
            result.values, 
            request.parameters
        )
        
        logger.info(f"Successfully calculated {request.indicator} for {request.symbol}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating indicator: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")

@router.get("/calculate/{symbol}/{indicator}")

# REPLACEMENT for the calculate_indicator_simple function in your app/routers/indicators.py
# Replace lines approximately 320-420 in your indicators.py file

@router.get("/calculate/{symbol}/{indicator}")
async def calculate_indicator_simple(
    request: Request,
    symbol: str,
    indicator: str,
    period: str = Query(default="1y", description="Data period (1d, 5d, 1mo, 1y, etc.)"),
    interval: str = Query(default="1d", description="Data interval (1d, 1h, 5m, etc.)"),
    source: DataSource = Query(default=DataSource.YAHOO_FINANCE, description="Data source")
):
    """Simple GET endpoint for calculating indicators with URL parameters
    
    Example: /calculate/AAPL/rsi?rsi_period=14&period=1y
    Example: /calculate/AAPL/macd?fast_period=12&slow_period=26&signal_period=9
    """
    try:
        logger.info(f"🎯 Simple calculation request: {indicator} for {symbol}")
        
        # Extract all query parameters for debugging
        query_params = dict(request.query_params)
        logger.info(f"📋 All query parameters: {query_params}")
        
        # FIXED: Remove standard parameters we already captured
        # Don't remove 'period' from indicator params since it might be an indicator parameter
        standard_params = {'interval', 'source'}
        indicator_query_params = {k: v for k, v in query_params.items() if k not in standard_params}
        logger.info(f"🔧 Indicator-specific parameters: {indicator_query_params}")
        
        # Check if indicator exists
        try:
            available = TechnicalIndicators.get_available_indicators()
            logger.info(f"📊 Available indicators: {list(available.keys())}")
        except Exception as e:
            logger.error(f"❌ Could not get available indicators: {e}")
            raise HTTPException(status_code=500, detail=f"Indicator service error: {str(e)}")
        
        if indicator not in available:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown indicator: {indicator}. Available: {list(available.keys())}"
            )
        
        # Get indicator info
        indicator_info = available[indicator]
        valid_params = indicator_info.get('parameters', {})
        logger.info(f"🎛️ Valid parameters for {indicator}: {valid_params}")
        
        # FIXED: Better parameter handling - distinguish between data period and indicator period
        data_period = period  # This is the data period (1y, 6mo, etc.)
        
        # Handle RSI specifically (common issue)
        if indicator.lower() == 'rsi':
            # For RSI, try multiple parameter names
            rsi_period = None
            if 'rsi_period' in indicator_query_params:
                rsi_period = int(indicator_query_params['rsi_period'])
            elif 'period' in indicator_query_params:
                # FIXED: Check if it's a numeric value (indicator period) vs data period format
                period_value = indicator_query_params['period']
                try:
                    # If it's a number, treat it as indicator period
                    rsi_period = int(period_value)
                    # Override data_period to default since user meant indicator period
                    data_period = "1y"
                    logger.info(f"🔧 Detected numeric period {rsi_period} as RSI period, using default data period: {data_period}")
                except ValueError:
                    # If it's not a number, it might be a data period format, use default indicator period
                    rsi_period = 14
                    logger.info(f"🔧 Period '{period_value}' seems to be data period, using default RSI period: {rsi_period}")
            else:
                rsi_period = 14  # Default
            
            indicator_params = {'period': rsi_period}
            logger.info(f"🎯 RSI parameters: {indicator_params}, Data period: {data_period}")

        # Handle SMA/EMA specifically
        elif indicator.lower() in ['sma', 'ema']:
            ma_period = None
            if f'{indicator.lower()}_period' in indicator_query_params:
                ma_period = int(indicator_query_params[f'{indicator.lower()}_period'])
            elif 'period' in indicator_query_params:
                # FIXED: Check if it's a numeric value (indicator period) vs data period format
                period_value = indicator_query_params['period']
                try:
                    # If it's a number, treat it as indicator period
                    ma_period = int(period_value)
                    # Override data_period to default since user meant indicator period
                    data_period = "1y"
                    logger.info(f"🔧 Detected numeric period {ma_period} as {indicator.upper()} period, using default data period: {data_period}")
                except ValueError:
                    # If it's not a number, it might be a data period format, use default indicator period
                    ma_period = 20
                    logger.info(f"🔧 Period '{period_value}' seems to be data period, using default {indicator.upper()} period: {ma_period}")
            else:
                ma_period = 20  # Default
            
            indicator_params = {'period': ma_period}
            logger.info(f"🎯 {indicator.upper()} parameters: {indicator_params}, Data period: {data_period}")
        # Handle MACD specifically
        elif indicator.lower() == 'macd':
            indicator_params = {
                'fast_period': int(indicator_query_params.get('fast_period', 12)),
                'slow_period': int(indicator_query_params.get('slow_period', 26)),
                'signal_period': int(indicator_query_params.get('signal_period', 9))
            }
            logger.info(f"🎯 MACD parameters: {indicator_params}, Data period: {data_period}")
            
        # Handle Bollinger Bands specifically
        elif indicator.lower() == 'bollinger_bands':
            bb_period = None
            if 'bb_period' in indicator_query_params:
                bb_period = int(indicator_query_params['bb_period'])
            elif 'period' in indicator_query_params:
                # FIXED: Check if it's a numeric value (indicator period) vs data period format
                period_value = indicator_query_params['period']
                try:
                    # If it's a number, treat it as indicator period
                    bb_period = int(period_value)
                    # Override data_period to default since user meant indicator period
                    data_period = "1y"
                    logger.info(f"🔧 Detected numeric period {bb_period} as Bollinger Bands period, using default data period: {data_period}")
                except ValueError:
                    # If it's not a number, it might be a data period format, use default indicator period
                    bb_period = 20
                    logger.info(f"🔧 Period '{period_value}' seems to be data period, using default Bollinger Bands period: {bb_period}")
            else:
                bb_period = 20  # Default
                
            indicator_params = {
                'period': bb_period,
                'std_dev': float(indicator_query_params.get('std_dev', 2.0))
            }
            logger.info(f"🎯 Bollinger Bands parameters: {indicator_params}, Data period: {data_period}")

        # Handle other indicators generically
        else:
            try:
                indicator_params = extract_typed_parameters(indicator_query_params, valid_params)
                logger.info(f"🎯 Generic parameters for {indicator}: {indicator_params}, Data period: {data_period}")
            except Exception as param_error:
                logger.error(f"❌ Parameter extraction failed: {param_error}")
                # Use defaults if parameter extraction fails
                indicator_params = {}
        
        # Create request object and calculate
        calc_request = IndicatorRequest(
            symbol=symbol,
            indicator=indicator,
            parameters=indicator_params,
            period=data_period,  # FIXED: Use the correct data period
            interval=interval,
            source=source
        )
        
        logger.info(f"🚀 Calculating {indicator} for {symbol} with params: {indicator_params}, data period: {data_period}")
        
        # Calculate using the main endpoint
        result = await calculate_indicator(calc_request)
        
        # Add endpoint info to metadata
        result['metadata']['endpoint'] = 'simple_get'
        result['metadata']['query_parameters'] = query_params
        result['metadata']['processed_parameters'] = indicator_params
        result['metadata']['data_period_used'] = data_period
        
        logger.info(f"✅ Successfully calculated {indicator} for {symbol}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error in simple calculation endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")

@router.get("/examples")
async def get_indicator_examples():
    """Get example URLs for all indicators"""
    try:
        available = TechnicalIndicators.get_available_indicators()
        examples = {}
        
        for indicator, info in available.items():
            params = info.get('parameters', {})
            
            # Create example query string
            example_params = []
            for param_name, param_info in params.items():
                default_val = param_info.get('default', 
                    20 if 'period' in param_name else 
                    2.0 if 'std' in param_name else 
                    14)
                example_params.append(f"{param_name}={default_val}")
            
            query_string = "&".join(example_params) if example_params else ""
            example_url = f"/api/indicators/calculate/AAPL/{indicator}"
            if query_string:
                example_url += f"?{query_string}"
                
            examples[indicator] = {
                "url": example_url,
                "description": info.get('description', f'{indicator.upper()} technical indicator'),
                "parameters": params
            }
        
        return {
            "examples": examples,
            "base_url": "http://localhost:8000",
            "note": "Replace AAPL with your desired symbol"
        }
        
    except Exception as e:
        return {"error": str(e)}

@router.get("/test/{indicator}")
async def test_indicator_with_sample_data(indicator: str):
    """Test indicator calculation with sample data"""
    try:
        # Create sample OHLCV data
        dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
        np.random.seed(42)  # For reproducible results
        
        # Generate realistic price data
        base_price = 100
        returns = np.random.normal(0.001, 0.02, 100)  # Daily returns
        prices = [base_price]
        
        for ret in returns:
            prices.append(prices[-1] * (1 + ret))
        
        # Create OHLCV data
        sample_data = {
            'open': pd.Series([p * (1 + np.random.normal(0, 0.005)) for p in prices[:-1]], index=dates),
            'high': pd.Series([p * (1 + abs(np.random.normal(0, 0.01))) for p in prices[:-1]], index=dates),
            'low': pd.Series([p * (1 - abs(np.random.normal(0, 0.01))) for p in prices[:-1]], index=dates),
            'close': pd.Series(prices[:-1], index=dates),
            'volume': pd.Series(np.random.randint(1000000, 5000000, 100), index=dates)
        }
        
        # Test the indicator
        if indicator.lower() == "rsi":
            result = TechnicalIndicators.calculate_indicator(
                'rsi', sample_data, {'period': 14}
            )
        elif indicator.lower() == "macd":
            result = TechnicalIndicators.calculate_indicator(
                'macd', sample_data, {'fast_period': 12, 'slow_period': 26, 'signal_period': 9}
            )
        elif indicator.lower() == "sma":
            result = TechnicalIndicators.calculate_indicator(
                'sma', sample_data, {'period': 20}
            )
        else:
            return {"error": f"Test not implemented for {indicator}"}
        
        return {
            "indicator": indicator,
            "test_data_points": len(sample_data['close']),
            "result_points": len(result.values) if hasattr(result, 'values') else 0,
            "sample_values": str(result.values.tail() if hasattr(result.values, 'tail') else result.values),
            "status": "success"
        }
        
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@router.get("/health")
async def health_check():
    """Health check for indicators service"""
    try:
        # Test basic functionality
        test_data = {
            'close': pd.Series([100, 101, 99, 102, 98, 103, 97, 104, 96, 105])
        }
        
        # Test a simple indicator calculation
        result = TechnicalIndicators.sma(test_data['close'], 5)
        
        return {
            "status": "healthy",
            "service": "technical_indicators",
            "timestamp": datetime.now().isoformat(),
            "available_indicators": len(TechnicalIndicators.get_available_indicators()),
            "test_calculation": "passed" if not result.empty else "failed",
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "technical_indicators",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )