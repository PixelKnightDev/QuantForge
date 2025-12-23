from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from typing import List, Optional, Dict, Any, Union
from enum import Enum
import hashlib

class DataSource(str, Enum):
    """Available data sources"""
    YAHOO_FINANCE = "yahoo_finance"
    BINANCE = "binance" 
    COINBASE = "coinbase"
    ALPACA = "alpaca"
    CSV_UPLOAD = "csv_upload"
    CUSTOM = "custom"

class DataQuality(str, Enum):
    """Data quality levels"""
    EXCELLENT = "excellent" 
    GOOD = "good"           
    FAIR = "fair"          
    POOR = "poor"        

class CacheStatus(str, Enum):
    """Cache status for data"""
    FRESH = "fresh"         # Recently updated
    STALE = "stale"         # Needs refresh
    EXPIRED = "expired"     # Must refresh
    UPDATING = "updating"   # Currently being updated

class DatasetMetadata(BaseModel):
    """Enhanced metadata for datasets"""
    dataset_id: str = Field(..., description="Unique dataset identifier")
    symbol: str = Field(..., description="Trading symbol")
    source: DataSource = Field(..., description="Data source")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Data characteristics
    total_records: int = Field(..., ge=0)
    date_range_start: datetime
    date_range_end: datetime
    interval: str = Field(..., description="Data interval (1m, 1h, 1d, etc.)")
    
    # Quality metrics
    quality_score: float = Field(..., ge=0, le=1)
    quality_level: DataQuality
    missing_data_points: int = Field(default=0, ge=0)
    anomaly_count: int = Field(default=0, ge=0)
    
    # Cache information
    cache_status: CacheStatus = Field(default=CacheStatus.FRESH)
    cache_expires_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    
    # Source-specific metadata
    source_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def generate_checksum(self, data: bytes) -> str:
        """Generate checksum for data integrity"""
        return hashlib.sha256(data).hexdigest()

class EnhancedOHLCVData(BaseModel):
    """Enhanced OHLCV data with additional fields"""
    timestamp: datetime
    open: float = Field(..., gt=0)
    high: float = Field(..., gt=0) 
    low: float = Field(..., gt=0)
    close: float = Field(..., gt=0)
    volume: float = Field(..., ge=0)
    
    # Enhanced fields
    symbol: str
    source: DataSource
    interval: str
    
    # Optional technical fields
    vwap: Optional[float] = Field(None, description="Volume Weighted Average Price")
    trades_count: Optional[int] = Field(None, ge=0)
    quote_volume: Optional[float] = Field(None, ge=0)
    
    # Data quality indicators
    is_anomaly: bool = Field(default=False)
    confidence_score: float = Field(default=1.0, ge=0, le=1)
    
    # Calculated fields
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    volume_ratio: Optional[float] = None  # Compared to average volume

class DataUploadRequest(BaseModel):
    """Request for uploading data"""
    symbol: str = Field(..., min_length=1, max_length=20)
    source: DataSource = DataSource.CSV_UPLOAD
    interval: str = "1d"
    description: Optional[str] = None
    overwrite_existing: bool = False
    
    # CSV specific options
    delimiter: str = ","
    date_column: str = "Date"
    date_format: Optional[str] = None  
    skip_rows: int = 0
    timezone: str = "UTC"

class BulkDownloadRequest(BaseModel):
    """Request for bulk data download"""
    symbols: List[str] = Field(..., min_items=1, max_items=100)
    source: DataSource = DataSource.YAHOO_FINANCE
    period: str = "1y"
    interval: str = "1d"
    
    # Processing options
    parallel_downloads: int = Field(default=5, ge=1, le=20)
    retry_failed: bool = True
    cache_results: bool = True
    
    # Filters
    min_volume: Optional[float] = None
    min_price: Optional[float] = None
    exclude_delisted: bool = True

class DataProcessingJob(BaseModel):
    """Background data processing job"""
    job_id: str = Field(..., description="Unique job identifier")
    job_type: str = Field(..., description="Type of processing job")
    status: str = Field(default="pending")  # pending, running, completed, failed
    
    # Job details
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Progress tracking
    total_items: int = Field(default=0, ge=0)
    processed_items: int = Field(default=0, ge=0)
    failed_items: int = Field(default=0, ge=0)
    
    # Results
    result_data: Dict[str, Any] = Field(default_factory=dict)
    error_messages: List[str] = Field(default_factory=list)
    
    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.total_items == 0:
            return 0.0
        return (self.processed_items / self.total_items) * 100

class DataQualityReport(BaseModel):
    """Comprehensive data quality analysis"""
    dataset_id: str
    symbol: str
    
    # Completeness metrics
    total_expected_points: int
    total_actual_points: int
    missing_data_percentage: float
    
    # Consistency metrics
    price_anomalies: int
    volume_anomalies: int
    timestamp_gaps: int
    
    # Accuracy metrics  
    duplicate_records: int
    invalid_ohlc_sequences: int  
    outlier_count: int
    
    # Timeliness metrics
    data_lag_hours: float
    last_update: datetime
    update_frequency_score: float
    
    # Overall scores
    completeness_score: float = Field(..., ge=0, le=1)
    consistency_score: float = Field(..., ge=0, le=1)
    accuracy_score: float = Field(..., ge=0, le=1)
    timeliness_score: float = Field(..., ge=0, le=1)
    overall_quality_score: float = Field(..., ge=0, le=1)
    
    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    
    @validator('overall_quality_score')
    def calculate_overall_score(cls, v, values):
        """Calculate overall quality score from component scores"""
        if all(key in values for key in ['completeness_score', 'consistency_score', 'accuracy_score', 'timeliness_score']):
            scores = [
                values['completeness_score'],
                values['consistency_score'], 
                values['accuracy_score'],
                values['timeliness_score']
            ]
            return sum(scores) / len(scores)
        return v

class ExchangeConfig(BaseModel):
    """Configuration for different exchanges"""
    exchange_name: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sandbox_mode: bool = True
    
    # Rate limiting
    requests_per_minute: int = 1200
    requests_per_second: int = 10
    
    # Data availability
    supported_intervals: List[str] = Field(default_factory=list)
    max_historical_days: int = 365
    
    # Specific settings
    base_url: str
    websocket_url: Optional[str] = None
    timezone: str = "UTC"

class CacheConfig(BaseModel):
    """Cache configuration"""
    cache_duration_minutes: int = Field(default=60, ge=1)
    max_cache_size_mb: int = Field(default=1000, ge=10)
    auto_cleanup: bool = True
    compression_enabled: bool = True
    
    # Cache strategies
    cache_market_data: bool = True
    cache_calculations: bool = True
    cache_api_responses: bool = True
    
    # Invalidation rules
    invalidate_on_new_data: bool = True
    invalidate_on_market_close: bool = False

class DataSyncStatus(BaseModel):
    """Status of data synchronization"""
    symbol: str
    source: DataSource
    last_sync: datetime
    next_sync: datetime
    sync_interval_minutes: int
    
    # Sync statistics
    successful_syncs: int = 0
    failed_syncs: int = 0
    avg_sync_duration_seconds: float = 0.0
    
    # Current status
    is_syncing: bool = False
    sync_error: Optional[str] = None
    data_points_synced: int = 0