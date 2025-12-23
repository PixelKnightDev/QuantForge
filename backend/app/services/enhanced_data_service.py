import io
import asyncio
import aiofiles
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, AsyncGenerator
import logging
import hashlib
import json
from pathlib import Path
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor
import pickle
import gzip

from app.models.enhanced_data import (
    DataSource, DataQuality, CacheStatus, DatasetMetadata, 
    EnhancedOHLCVData, DataUploadRequest, BulkDownloadRequest,
    DataProcessingJob, DataQualityReport, ExchangeConfig,
    CacheConfig, DataSyncStatus
)

logger = logging.getLogger(__name__)

class RealDataQualityAnalyzer:
    """Real implementation of data quality analysis"""
    
    @staticmethod
    def detect_price_anomalies(data: List, threshold: float = 3.0) -> List[Dict]:
        """Detect price anomalies using statistical methods"""
        if len(data) < 10:
            return []
        
        anomalies = []
        
        # Convert to pandas for easier analysis
        prices = [d.close for d in data]
        df = pd.DataFrame({'price': prices})
        
        # Calculate rolling statistics
        window = min(20, len(data) // 2)
        df['rolling_mean'] = df['price'].rolling(window=window, min_periods=5).mean()
        df['rolling_std'] = df['price'].rolling(window=window, min_periods=5).std()
        
        for i, point in enumerate(data):
            if i < 5: 
                continue
                
            rolling_mean = df.iloc[i]['rolling_mean']
            rolling_std = df.iloc[i]['rolling_std']
            
            if pd.isna(rolling_mean) or pd.isna(rolling_std) or rolling_std == 0:
                continue
            
            z_score = abs((point.close - rolling_mean) / rolling_std)
            
            if z_score > threshold:
                anomalies.append({
                    'timestamp': point.timestamp.isoformat(),
                    'price': point.close,
                    'z_score': float(z_score),
                    'type': 'price_spike' if point.close > rolling_mean else 'price_drop'
                })
        
        return anomalies
    
    @staticmethod
    def detect_volume_anomalies(data: List, threshold: float = 5.0) -> List[Dict]:
        """Detect volume anomalies"""
        if len(data) < 10:
            return []
        
        anomalies = []
        volumes = [d.volume for d in data if d.volume > 0]
        
        if not volumes:
            return []
        
        # Calculate volume statistics
        median_volume = np.median(volumes)
        q75, q25 = np.percentile(volumes, [75, 25])
        iqr = q75 - q25
        
        for point in data:
            if point.volume <= 0:
                continue

            if point.volume > q75 + threshold * iqr:
                ratio = point.volume / median_volume if median_volume > 0 else 0
                anomalies.append({
                    'timestamp': point.timestamp.isoformat(),
                    'volume': point.volume,
                    'median_volume': median_volume,
                    'ratio': float(ratio),
                    'type': 'volume_spike'
                })
        
        return anomalies
    
    @staticmethod
    def validate_ohlc_sequence(data: List) -> List[Dict]:
        """Validate OHLC data integrity"""
        invalid_sequences = []
        
        for point in data:

            if not (point.low <= point.open <= point.high and 
                   point.low <= point.close <= point.high):
                invalid_sequences.append({
                    'timestamp': point.timestamp.isoformat(),
                    'error': 'Invalid OHLC sequence'
                })
            
            # Check for impossible values
            if any(price <= 0 for price in [point.open, point.high, point.low, point.close]):
                invalid_sequences.append({
                    'timestamp': point.timestamp.isoformat(),
                    'error': 'Non-positive price detected'
                })
        
        return invalid_sequences
    
    @staticmethod
    def detect_timestamp_gaps(data: List, expected_interval: str) -> List[Dict]:
        """Detect gaps in timestamp sequence"""
        if len(data) < 2:
            return []
        
        # Define expected intervals
        interval_deltas = {
            '1m': timedelta(minutes=1),
            '5m': timedelta(minutes=5),
            '15m': timedelta(minutes=15),
            '30m': timedelta(minutes=30),
            '1h': timedelta(hours=1),
            '1d': timedelta(days=1),
            '1wk': timedelta(weeks=1),
            '1mo': timedelta(days=30)
        }
        
        expected_delta = interval_deltas.get(expected_interval, timedelta(days=1))
        gaps = []
        
        for i in range(1, len(data)):
            actual_delta = data[i].timestamp - data[i-1].timestamp
            
            # For daily data, account for weekends and holidays
            tolerance_multiplier = 3 if expected_interval == '1d' else 1.5
            
            if actual_delta > expected_delta * tolerance_multiplier:
                gaps.append({
                    'start_time': data[i-1].timestamp.isoformat(),
                    'end_time': data[i].timestamp.isoformat(),
                    'gap_duration_hours': actual_delta.total_seconds() / 3600
                })
        
        return gaps

class DataCache:
    """Advanced caching system for market data"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache_dir = Path("data/cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: Dict[str, Tuple[datetime, any]] = {}
        
    def _generate_cache_key(self, symbol: str, source: DataSource, 
                          start: datetime, end: datetime, interval: str) -> str:
        """Generate unique cache key"""
        key_data = f"{symbol}_{source}_{start.isoformat()}_{end.isoformat()}_{interval}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, cache_key: str) -> Optional[List[EnhancedOHLCVData]]:
        """Get data from cache"""
        try:
            # Check memory cache first
            if cache_key in self._memory_cache:
                cached_time, data = self._memory_cache[cache_key]
                if datetime.now() - cached_time < timedelta(minutes=self.config.cache_duration_minutes):
                    logger.info(f"Cache hit (memory): {cache_key}")
                    return data
                else:
                    del self._memory_cache[cache_key]
            
            # Check disk cache
            cache_file = self.cache_dir / f"{cache_key}.gz"
            if cache_file.exists():
                async with aiofiles.open(cache_file, 'rb') as f:
                    compressed_data = await f.read()
                
                # Decompress and deserialize
                serialized_data = gzip.decompress(compressed_data)
                cache_entry = pickle.loads(serialized_data)
                
                # Check if cache is still valid
                cached_time = cache_entry['timestamp']
                if datetime.now() - cached_time < timedelta(minutes=self.config.cache_duration_minutes):
                    data = cache_entry['data']
                    # Store in memory cache
                    self._memory_cache[cache_key] = (cached_time, data)
                    logger.info(f"Cache hit (disk): {cache_key}")
                    return data
                else:
                    # Cache expired, remove file
                    cache_file.unlink()
            
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, cache_key: str, data: List[EnhancedOHLCVData]):
        """Store data in cache"""
        try:
            cached_time = datetime.now()
            
            # Store in memory cache
            self._memory_cache[cache_key] = (cached_time, data)
            
            # Store in disk cache if compression enabled
            if self.config.compression_enabled:
                cache_entry = {
                    'timestamp': cached_time,
                    'data': data
                }
                
                # Serialize and compress
                serialized_data = pickle.dumps(cache_entry)
                compressed_data = gzip.compress(serialized_data)
                
                cache_file = self.cache_dir / f"{cache_key}.gz"
                async with aiofiles.open(cache_file, 'wb') as f:
                    await f.write(compressed_data)
                
                logger.info(f"Data cached: {cache_key}")
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def cleanup(self):
        """Clean up expired cache entries"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=self.config.cache_duration_minutes)
            
            # Clean memory cache
            expired_keys = [
                key for key, (cached_time, _) in self._memory_cache.items()
                if cached_time < cutoff_time
            ]
            for key in expired_keys:
                del self._memory_cache[key]
            
            # Clean disk cache
            for cache_file in self.cache_dir.glob("*.gz"):
                if cache_file.stat().st_mtime < cutoff_time.timestamp():
                    cache_file.unlink()
            
            logger.info(f"Cache cleanup completed. Removed {len(expired_keys)} memory entries")
            
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")

class SymbolMapper:
    """Handle symbol format conversion for different exchanges and assets"""
    
    # Yahoo Finance crypto symbols mapping
    YAHOO_CRYPTO_MAP = {
        'BTC-USD': 'BTC-USD',
        'ETH-USD': 'ETH-USD', 
        'ETH-USE': 'ETH-USD',  # Fix typo
        'ADA-USD': 'ADA-USD',
        'SOL-USD': 'SOL-USD',
        'DOGE-USD': 'DOGE-USD',
        'XRP-USD': 'XRP-USD',
        'DOT-USD': 'DOT-USD',
        'AVAX-USD': 'AVAX-USD',
        'MATIC-USD': 'MATIC-USD',
        'LTC-USD': 'LTC-USD',
        'LINK-USD': 'LINK-USD',
        'UNI-USD': 'UNI3-USD',  # Yahoo uses UNI3-USD
        'SHIB-USD': 'SHIB-USD'
    }
    
    # Common stock symbols that work on Yahoo Finance
    YAHOO_STOCK_SYMBOLS = {
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA',
        'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC',
        'NFLX', 'ADBE', 'CRM', 'CMCSA', 'XOM', 'KO', 'PEP', 'ABT', 'TMO',
        'COST', 'AVGO', 'DHR', 'NKE', 'QCOM', 'TXN', 'LIN', 'MDT', 'UPS'
    }
    
    @classmethod
    def normalize_symbol_for_yahoo(cls, symbol: str) -> str:
        """Convert symbol to Yahoo Finance format"""
        symbol = symbol.upper().strip()
        
        # Handle crypto symbols
        if symbol in cls.YAHOO_CRYPTO_MAP:
            mapped = cls.YAHOO_CRYPTO_MAP[symbol]
            logger.info(f"Mapped crypto symbol: {symbol} -> {mapped}")
            return mapped
        
        # Handle stock symbols
        if symbol in cls.YAHOO_STOCK_SYMBOLS:
            return symbol
            
        # Handle common variations
        if symbol.endswith('-USE'):
            corrected = symbol.replace('-USE', '-USD')
            logger.info(f"Corrected symbol typo: {symbol} -> {corrected}")
            return corrected
            
        # Try as-is for other symbols
        return symbol
    
    @classmethod
    def validate_symbol(cls, symbol: str, source: DataSource) -> tuple[str, bool]:
        """Validate and normalize symbol for given source"""
        normalized = cls.normalize_symbol_for_yahoo(symbol)
        
        if source == DataSource.YAHOO_FINANCE:
            # Additional validation for Yahoo Finance
            is_crypto = normalized.endswith('-USD') and not normalized.startswith(('SPY', 'QQQ', 'IWM'))
            is_stock = normalized in cls.YAHOO_STOCK_SYMBOLS
            is_valid = is_crypto or is_stock or len(normalized) <= 5
            
            return normalized, is_valid
        
        return normalized, True  # Assume valid for other sources

# Update the _download_yahoo_finance method to use symbol mapping

async def _download_yahoo_finance_WITH_MAPPING(self, symbol: str, period: str, interval: str) -> List[EnhancedOHLCVData]:
    """Enhanced Yahoo Finance download with symbol mapping"""
    try:
        # Normalize and validate symbol
        normalized_symbol, is_valid = SymbolMapper.validate_symbol(symbol, DataSource.YAHOO_FINANCE)
        
        if not is_valid:
            logger.warning(f"Symbol {symbol} may not be valid for Yahoo Finance")
        
        def fetch_data():
            ticker = yf.Ticker(normalized_symbol)
            
            # Try different period options if the original fails
            periods_to_try = [period]
            if period not in ['1d', '5d', '1mo']:
                periods_to_try.extend(['1y', '6mo', '3mo', '1mo'])
            
            df = None
            for try_period in periods_to_try:
                try:
                    logger.info(f"Trying to fetch {normalized_symbol} with period {try_period}")
                    df = ticker.history(
                        period=try_period, 
                        interval=interval, 
                        auto_adjust=True,
                        actions=False  
                    )
                    
                    if not df.empty and len(df) > 1:
                        logger.info(f"✅ Success: {normalized_symbol} returned {len(df)} rows with period {try_period}")
                        break
                    else:
                        logger.warning(f"Empty/insufficient data for {normalized_symbol} with period {try_period}")
                        
                except Exception as e:
                    logger.warning(f"Failed to fetch {normalized_symbol} with period {try_period}: {e}")
                    continue
            
            if df is None or df.empty:
                logger.error(f"All attempts failed for {normalized_symbol}")
                return pd.DataFrame()
            
            return df
        
        # Run in thread pool
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(self.executor, fetch_data)
        
        if df.empty:
            logger.error(f"No data returned from Yahoo Finance for {symbol} (tried as {normalized_symbol})")
            return []
        
        # Convert to enhanced format
        enhanced_data = []
        
        for timestamp, row in df.iterrows():
            try:
                # Validate row data
                if pd.isna(row['Open']) or pd.isna(row['Close']) or row['Close'] <= 0:
                    logger.debug(f"Skipping invalid row for {timestamp}")
                    continue
                
                data_point = EnhancedOHLCVData(
                    timestamp=timestamp.to_pydatetime(),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=float(row['Volume']) if not pd.isna(row['Volume']) else 0.0,
                    symbol=symbol, 
                    source=DataSource.YAHOO_FINANCE,
                    interval=interval,
                    confidence_score=1.0,
                    price_change=0.0,
                    price_change_percent=0.0,
                    volume_ratio=1.0,
                    is_anomaly=False
                )
                enhanced_data.append(data_point)
                
            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"Skipping invalid data point for {timestamp}: {e}")
                continue
        
        if not enhanced_data:
            logger.error(f"No valid data points after conversion for {symbol}")
            return []
        enhanced_data = await self._calculate_enhanced_fields(enhanced_data)
        
        logger.info(f"✅ Successfully loaded {len(enhanced_data)} records for {symbol} (as {normalized_symbol})")
        return enhanced_data
        
    except Exception as e:
        logger.error(f"Yahoo Finance download error for {symbol}: {e}")
        raise

class EnhancedDataService:
    """Advanced data service with multiple sources and caching"""
    
    def __init__(self):
        self.cache_config = CacheConfig()
        self.cache = DataCache(self.cache_config)
        self.exchange_configs: Dict[DataSource, ExchangeConfig] = {}
        self.processing_jobs: Dict[str, DataProcessingJob] = {}
        self.sync_status: Dict[str, DataSyncStatus] = {}
        
        self._setup_exchange_configs()
        

        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def _setup_exchange_configs(self):
        """Initialize exchange configurations"""
        self.exchange_configs = {
            DataSource.YAHOO_FINANCE: ExchangeConfig(
                exchange_name="Yahoo Finance",
                base_url="https://query1.finance.yahoo.com",
                supported_intervals=["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"],
                max_historical_days=2000,
                requests_per_minute=2000
            ),
            DataSource.BINANCE: ExchangeConfig(
                exchange_name="Binance",
                base_url="https://api.binance.com",
                websocket_url="wss://stream.binance.com:9443",
                supported_intervals=["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"],
                max_historical_days=1000,
                requests_per_minute=1200
            ),
            DataSource.COINBASE: ExchangeConfig(
                exchange_name="Coinbase Pro",
                base_url="https://api.pro.coinbase.com",
                websocket_url="wss://ws-feed.pro.coinbase.com",
                supported_intervals=["1m", "5m", "15m", "1h", "6h", "1d"],
                max_historical_days=300,
                requests_per_minute=600
            )
        }
    
    async def download_data(self, symbol: str, source: DataSource, 
                          period: str = "1y", interval: str = "1d",
                          use_cache: bool = True) -> List[EnhancedOHLCVData]:
        """Download data from specified source with caching"""
        
        # Calculate date range
        end_date = datetime.now()
        start_date = self._parse_period_to_datetime(period, end_date)
        
        # Check cache first
        if use_cache:
            cache_key = self.cache._generate_cache_key(symbol, source, start_date, end_date, interval)
            cached_data = await self.cache.get(cache_key)
            if cached_data:
                return cached_data
        
        # Download based on source
        if source == DataSource.YAHOO_FINANCE:
            data = await self._download_yahoo_finance(symbol, period, interval)
        elif source == DataSource.BINANCE:
            data = await self._download_binance(symbol, start_date, end_date, interval)
        elif source == DataSource.COINBASE:
            data = await self._download_coinbase(symbol, start_date, end_date, interval)
        else:
            raise ValueError(f"Unsupported data source: {source}")
        
        # Cache the results
        if use_cache and data:
            await self.cache.set(cache_key, data)
        
        return data
    
    async def _download_yahoo_finance(self, symbol: str, period: str, interval: str) -> List[EnhancedOHLCVData]:
        """SIMPLE WORKING VERSION - Replace your method with this"""
        try:
            def fetch_data():
                ticker = yf.Ticker(symbol)

                # Simple, reliable call without problematic parameters
                df = ticker.history(
                    period=period, 
                    interval=interval, 
                    auto_adjust=True
                )

                logger.info(f"Yahoo Finance data for {symbol}: {len(df)} rows")
                if not df.empty:
                    logger.info(f"Date range: {df.index[0]} to {df.index[-1]}")

                return df

            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(self.executor, fetch_data)

            if df.empty:
                logger.warning(f"No data returned from Yahoo Finance for {symbol}")
                return []

            # Simple conversion to enhanced format
            enhanced_data = []

            for timestamp, row in df.iterrows():
                try:
                    # Basic validation
                    if pd.isna(row['Open']) or pd.isna(row['Close']):
                        continue
                    
                    data_point = EnhancedOHLCVData(
                        timestamp=timestamp.to_pydatetime(),
                        open=float(row['Open']),
                        high=float(row['High']),
                        low=float(row['Low']),
                        close=float(row['Close']),
                        volume=float(row['Volume']) if not pd.isna(row['Volume']) else 0.0,
                        symbol=symbol,
                        source=DataSource.YAHOO_FINANCE,
                        interval=interval,
                        confidence_score=1.0,
                        # Initialize optional fields
                        price_change=0.0,
                        price_change_percent=0.0,
                        volume_ratio=1.0,
                        is_anomaly=False
                    )
                    enhanced_data.append(data_point)

                except (ValueError, KeyError, TypeError) as e:
                    logger.warning(f"Skipping invalid data point: {e}")
                    continue
                
            # Calculate additional fields
            enhanced_data = await self._calculate_enhanced_fields(enhanced_data)

            logger.info(f"✅ Successfully loaded {len(enhanced_data)} records for {symbol}")
            return enhanced_data

        except Exception as e:
            logger.error(f"Yahoo Finance download error for {symbol}: {e}")
            raise

    async def _retry_with_alternative_period(self, symbol: str, interval: str) -> Optional[pd.DataFrame]:
        """Retry data download with alternative periods if initial request fails"""
        alternative_periods = ["6mo", "3mo", "1mo", "5d"]
        
        for alt_period in alternative_periods:
            try:
                logger.info(f"Trying alternative period: {alt_period}")
                
                def fetch_alt_data():
                    ticker = yf.Ticker(symbol)
                    return ticker.history(period=alt_period, interval=interval, repair=True)
                
                loop = asyncio.get_event_loop()
                df = await loop.run_in_executor(self.executor, fetch_alt_data)
                
                if not df.empty and len(df) > 1:
                    logger.info(f"Success with period {alt_period}: {len(df)} rows")
                    return df
                    
            except Exception as e:
                logger.debug(f"Alternative period {alt_period} failed: {e}")
                continue
        
        return None
        
    async def _download_binance(self, symbol: str, start_date: datetime, 
                                end_date: datetime, interval: str) -> List[EnhancedOHLCVData]:
        """Download from Binance API - Falls back to Yahoo Finance for now"""
        logger.info(f"Binance API not implemented yet, falling back to Yahoo Finance for {symbol}")
    
        duration = end_date - start_date
        if duration.days <= 5:
            period = "5d"
        elif duration.days <= 30:
            period = "1mo"
        elif duration.days <= 90:
            period = "3mo"
        elif duration.days <= 180:
            period = "6mo"
        elif duration.days <= 365:
            period = "1y"
        else:
            period = "2y"

        data = await self._download_yahoo_finance(symbol, period, interval)

        for point in data:
            point.source = DataSource.BINANCE
    
        logger.info(f"Fallback: Retrieved {len(data)} records for {symbol} via Yahoo Finance")
        return data
    async def _download_coinbase(self, symbol: str, start_date: datetime,
                           end_date: datetime, interval: str) -> List[EnhancedOHLCVData]:
        """Download from Coinbase API - Falls back to Yahoo Finance for now"""
        logger.info(f"Coinbase API not implemented yet, falling back to Yahoo Finance for {symbol}")
    
        duration = end_date - start_date
        if duration.days <= 5:
            period = "5d"
        elif duration.days <= 30:
            period = "1mo"
        elif duration.days <= 90:
            period = "3mo"
        elif duration.days <= 180:
            period = "6mo"
        elif duration.days <= 365:
            period = "1y"
        else:
            period = "2y"
    
        # Use Yahoo Finance as fallback but mark as Coinbase source
        data = await self._download_yahoo_finance(symbol, period, interval)
    
        # Update source to indicate it came from Coinbase request
        for point in data:
            point.source = DataSource.COINBASE
    
        logger.info(f"Fallback: Retrieved {len(data)} records for {symbol} via Yahoo Finance")
        return data
 
    
    async def _calculate_enhanced_fields(self, data: List[EnhancedOHLCVData]) -> List[EnhancedOHLCVData]:
        """FIXED: Calculate additional fields without data loss"""
        if len(data) < 2:
            logger.debug("Not enough data points for enhanced field calculation")
            return data
        
        try:
            # Calculate price changes
            for i in range(1, len(data)):
                prev_close = data[i-1].close
                current_close = data[i].close
                
                if prev_close > 0:  # Avoid division by zero
                    data[i].price_change = current_close - prev_close
                    data[i].price_change_percent = ((current_close - prev_close) / prev_close) * 100
            
            if len(data) >= 20:
                for i in range(20, len(data)):
                    recent_volumes = [data[j].volume for j in range(i-19, i+1) if data[j].volume > 0]
                    
                    if recent_volumes:
                        avg_volume = sum(recent_volumes) / len(recent_volumes)
                        if avg_volume > 0:
                            data[i].volume_ratio = data[i].volume / avg_volume
            
            logger.debug(f"Enhanced fields calculated for {len(data)} data points")
            return data
            
        except Exception as e:
            logger.error(f"Error calculating enhanced fields: {e}")
            return data  
    
    async def upload_csv_data(self, file_content: bytes, request: DataUploadRequest) -> DatasetMetadata:
        """Upload and process CSV data"""
        try:
            # Create unique dataset ID
            dataset_id = f"{request.symbol}_{DataSource.CSV_UPLOAD}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Parse CSV content
            df = pd.read_csv(
                io.BytesIO(file_content),
                delimiter=request.delimiter,
                skiprows=request.skip_rows
            )
            
            # Validate and process CSV
            processed_data = await self._process_csv_dataframe(df, request)
            
            # Generate metadata
            metadata = DatasetMetadata(
                dataset_id=dataset_id,
                symbol=request.symbol,
                source=DataSource.CSV_UPLOAD,
                total_records=len(processed_data),
                date_range_start=processed_data[0].timestamp,
                date_range_end=processed_data[-1].timestamp,
                interval=request.interval,
                quality_score=0.95,  # Will be calculated properly
                quality_level=DataQuality.GOOD,
                file_size_bytes=len(file_content),
                checksum=hashlib.sha256(file_content).hexdigest()
            )
            
            # Store processed data
            await self._store_processed_data(dataset_id, processed_data, metadata)
            
            logger.info(f"CSV upload completed: {dataset_id}")
            return metadata
            
        except Exception as e:
            logger.error(f"CSV upload error: {e}")
            raise
    
    async def _process_csv_dataframe(self, df: pd.DataFrame, request: DataUploadRequest) -> List[EnhancedOHLCVData]:
        """Process CSV DataFrame into enhanced OHLCV data"""
        return []
    
    async def bulk_download(self, request: BulkDownloadRequest) -> str:
        """Start bulk download job"""
        job_id = f"bulk_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        job = DataProcessingJob(
            job_id=job_id,
            job_type="bulk_download",
            total_items=len(request.symbols),
            status="pending"
        )
        
        self.processing_jobs[job_id] = job
        
        # Start background task
        asyncio.create_task(self._process_bulk_download(job_id, request))
        
        return job_id
    
    async def _process_bulk_download(self, job_id: str, request: BulkDownloadRequest):
        """Process bulk download in background"""
        job = self.processing_jobs[job_id]
        job.status = "running"
        job.started_at = datetime.now()
        
        try:
            # Process symbols in parallel batches
            semaphore = asyncio.Semaphore(request.parallel_downloads)
            
            async def download_symbol(symbol: str):
                async with semaphore:
                    try:
                        await self.download_data(symbol, request.source, request.period, request.interval)
                        job.processed_items += 1
                        logger.info(f"Bulk download progress: {job.progress_percentage:.1f}%")
                    except Exception as e:
                        job.failed_items += 1
                        job.error_messages.append(f"{symbol}: {str(e)}")
            
            # Execute downloads
            tasks = [download_symbol(symbol) for symbol in request.symbols]
            await asyncio.gather(*tasks, return_exceptions=True)
            
            job.status = "completed"
            job.completed_at = datetime.now()
            
        except Exception as e:
            job.status = "failed"
            job.error_messages.append(f"Bulk download failed: {str(e)}")
            logger.error(f"Bulk download error: {e}")
    
    async def analyze_data_quality(self, symbol: str, source: DataSource) -> DataQualityReport:
        """REAL implementation with timezone fix"""
        try:
            logger.info(f"🔍 Starting REAL data quality analysis for {symbol}")
            
            # Get fresh data for analysis
            data = await self.download_data(
                symbol=symbol,
                source=source,
                period="1y",
                interval="1d",
                use_cache=False
            )
            
            if not data:
                logger.warning(f"No data available for {symbol}")
                return DataQualityReport(
                    dataset_id=f"{symbol}_{source}_quality",
                    symbol=symbol,
                    total_expected_points=0,
                    total_actual_points=0,
                    missing_data_percentage=100.0,
                    price_anomalies=0,
                    volume_anomalies=0,
                    timestamp_gaps=0,
                    duplicate_records=0,
                    invalid_ohlc_sequences=0,
                    outlier_count=0,
                    data_lag_hours=999.0,
                    last_update=datetime.now(),
                    update_frequency_score=0.0,
                    completeness_score=0.0,
                    consistency_score=0.0,
                    accuracy_score=0.0,
                    timeliness_score=0.0,
                    overall_quality_score=0.0,
                    recommendations=["No data available for analysis"]
                )
            
            logger.info(f"📊 Analyzing {len(data)} data points for {symbol}")
            
            # Initialize analyzer
            analyzer = RealDataQualityAnalyzer()
            
            # Expected data points
            expected_points = 252
            actual_points = len(data)
            
            # Perform comprehensive analysis
            price_anomalies = analyzer.detect_price_anomalies(data)
            volume_anomalies = analyzer.detect_volume_anomalies(data)
            ohlc_issues = analyzer.validate_ohlc_sequence(data)
            timestamp_gaps = analyzer.detect_timestamp_gaps(data, "1d")
            
            # Check for duplicates
            timestamps = [d.timestamp for d in data]
            unique_timestamps = set(timestamps)
            duplicate_count = len(timestamps) - len(unique_timestamps)
            
            # Calculate missing data percentage
            missing_percentage = max(0, (expected_points - actual_points) / expected_points * 100)
            
            # Calculate individual scores
            completeness_score = min(1.0, actual_points / expected_points)
            consistency_score = max(0.0, 1.0 - (len(ohlc_issues) / max(1, actual_points)))
            accuracy_score = max(0.0, 1.0 - ((len(price_anomalies) + len(volume_anomalies)) / max(1, actual_points)))
            timeliness_score = max(0.0, 1.0 - (len(timestamp_gaps) / max(1, actual_points - 1)))
            
            # FIXED: Calculate data lag with proper timezone handling
            if data:
                last_update_raw = max(d.timestamp for d in data)
                
                # Handle timezone conversion safely
                try:
                    # Convert to naive datetime for comparison
                    if hasattr(last_update_raw, 'tzinfo') and last_update_raw.tzinfo is not None:
                        last_update = last_update_raw.replace(tzinfo=None)
                    else:
                        last_update = last_update_raw
                    
                    now = datetime.now()
                    data_lag_hours = (now - last_update).total_seconds() / 3600
                    
                except (TypeError, AttributeError) as e:
                    logger.warning(f"Timezone conversion issue: {e}, using fallback")
                    data_lag_hours = 24.0  # Default to 24 hours
                    last_update = datetime.now() - timedelta(hours=24)
                
                update_frequency_score = max(0.0, 1.0 - (data_lag_hours / 168))
            else:
                data_lag_hours = 999.0
                update_frequency_score = 0.0
                last_update = datetime.now()
            
            # Overall quality score
            overall_score = (
                completeness_score * 0.25 +
                consistency_score * 0.25 +
                accuracy_score * 0.20 +
                timeliness_score * 0.15 +
                update_frequency_score * 0.15
            )
            
            # Generate recommendations
            recommendations = []
            
            if missing_percentage > 20:
                recommendations.append(f"Poor data completeness: {missing_percentage:.1f}% missing")
            elif missing_percentage > 5:
                recommendations.append(f"Some missing data: {missing_percentage:.1f}% gaps")
            
            if len(price_anomalies) > 10:
                recommendations.append(f"High price anomalies: {len(price_anomalies)} detected")
            elif len(price_anomalies) > 3:
                recommendations.append(f"Price anomalies detected: {len(price_anomalies)} instances")
            
            if len(volume_anomalies) > 5:
                recommendations.append(f"Volume spikes: {len(volume_anomalies)} detected")
            
            if len(timestamp_gaps) > 5:
                recommendations.append(f"Timestamp gaps: {len(timestamp_gaps)} detected")
            
            if duplicate_count > 0:
                recommendations.append(f"Duplicates: {duplicate_count} found")
            
            if len(ohlc_issues) > 0:
                recommendations.append(f"OHLC issues: {len(ohlc_issues)} problems")
            
            if data_lag_hours > 48:
                recommendations.append(f"Stale data: {data_lag_hours:.1f}h old")
            
            if overall_score > 0.9:
                recommendations.append("Excellent quality - suitable for trading")
            elif overall_score > 0.7:
                recommendations.append("Good quality - minor issues")
            elif overall_score > 0.5:
                recommendations.append("Moderate quality - consider cleaning")
            else:
                recommendations.append("Poor quality - not recommended")
            
            if not recommendations:
                recommendations.append("Analysis complete - no major issues")
            
            # Create report
            report = DataQualityReport(
                dataset_id=f"{symbol}_{source}_quality_{datetime.now().strftime('%Y%m%d')}",
                symbol=symbol,
                total_expected_points=expected_points,
                total_actual_points=actual_points,
                missing_data_percentage=round(missing_percentage, 2),
                price_anomalies=len(price_anomalies),
                volume_anomalies=len(volume_anomalies),
                timestamp_gaps=len(timestamp_gaps),
                duplicate_records=duplicate_count,
                invalid_ohlc_sequences=len(ohlc_issues),
                outlier_count=len(price_anomalies) + len(volume_anomalies),
                data_lag_hours=round(data_lag_hours, 2),
                last_update=last_update,
                update_frequency_score=round(update_frequency_score, 3),
                completeness_score=round(completeness_score, 3),
                consistency_score=round(consistency_score, 3),
                accuracy_score=round(accuracy_score, 3),
                timeliness_score=round(timeliness_score, 3),
                overall_quality_score=round(overall_score, 3),
                recommendations=recommendations[:10]
            )
            
            logger.info(f"✅ Quality analysis for {symbol}: Score {overall_score:.3f}")
            logger.info(f"   Stats: {len(price_anomalies)} price anomalies, {len(volume_anomalies)} volume anomalies")
            
            return report
            
        except Exception as e:
            logger.error(f"Quality analysis failed for {symbol}: {e}")
            raise
    
    def _parse_period_to_datetime(self, period: str, end_date: datetime) -> datetime:
        """Convert period string to start datetime"""
        period_map = {
            "1d": timedelta(days=1),
            "5d": timedelta(days=5),
            "1mo": timedelta(days=30),
            "3mo": timedelta(days=90),
            "6mo": timedelta(days=180),
            "1y": timedelta(days=365),
            "2y": timedelta(days=730),
            "5y": timedelta(days=1825),
            "10y": timedelta(days=3650)
        }
        
        if period in period_map:
            return end_date - period_map[period]
        else:
            # Default to 1 year
            return end_date - timedelta(days=365)
    
    async def get_job_status(self, job_id: str) -> Optional[DataProcessingJob]:
        """Get status of processing job"""
        return self.processing_jobs.get(job_id)
    
    async def cleanup_cache(self):
        """Clean up expired cache entries"""
        await self.cache.cleanup()

# Global instance
enhanced_data_service = EnhancedDataService()