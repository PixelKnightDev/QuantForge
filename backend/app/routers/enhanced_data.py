# app/routers/enhanced_data.py
# FIXED VERSION - Route order corrected

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging
from datetime import datetime
import io

from app.models.enhanced_data import (
    DataSource, BulkDownloadRequest, DataUploadRequest, DatasetMetadata,
    DataProcessingJob, DataQualityReport, CacheConfig
)
from app.services.enhanced_data_service import enhanced_data_service

logger = logging.getLogger(__name__)
router = APIRouter()

# SPECIFIC ROUTES FIRST (to avoid conflicts)

@router.post("/upload-csv", response_model=DatasetMetadata)
async def upload_csv_file(
    file: UploadFile = File(...),
    symbol: str = Form(...),
    interval: str = Form(default="1d"),
    delimiter: str = Form(default=","),
    date_column: str = Form(default="Date"),
    skip_rows: int = Form(default=0),
    overwrite_existing: bool = Form(default=False)
):
    """Upload CSV file with market data"""
    try:
        # Validate file
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        if file.size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
        
        # Read file content
        file_content = await file.read()
        
        # Create upload request
        upload_request = DataUploadRequest(
            symbol=symbol.upper(),
            interval=interval,
            delimiter=delimiter,
            date_column=date_column,
            skip_rows=skip_rows,
            overwrite_existing=overwrite_existing
        )
        
        # Process upload
        metadata = await enhanced_data_service.upload_csv_data(file_content, upload_request)
        
        logger.info(f"CSV uploaded successfully: {metadata.dataset_id}")
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/bulk-download")
async def start_bulk_download(request: BulkDownloadRequest, background_tasks: BackgroundTasks):
    """Start bulk download of multiple symbols"""
    try:
        # Validate request
        if len(request.symbols) == 0:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        if len(request.symbols) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 symbols allowed")
        
        # Start bulk download job
        job_id = await enhanced_data_service.bulk_download(request)
        
        return {
            "job_id": job_id,
            "message": f"Bulk download started for {len(request.symbols)} symbols",
            "status": "pending",
            "symbols": request.symbols
        }
        
    except Exception as e:
        logger.error(f"Bulk download error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start bulk download: {str(e)}")

@router.get("/jobs/{job_id}", response_model=DataProcessingJob)
async def get_job_status(job_id: str):
    """Get status of processing job"""
    try:
        job = await enhanced_data_service.get_job_status(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job status error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

@router.get("/data-sources")
async def get_available_data_sources():
    """Get available data sources"""
    return {
        "sources": [
            {
                "id": DataSource.YAHOO_FINANCE,
                "name": "Yahoo Finance",
                "description": "Free financial data from Yahoo Finance",
                "supported_intervals": ["1m", "2m", "5m", "15m", "30m", "1h", "1d", "5d", "1wk", "1mo"],
                "max_historical_days": 2000,
                "requires_api_key": False
            },
            {
                "id": DataSource.BINANCE,
                "name": "Binance",
                "description": "Cryptocurrency data from Binance",
                "supported_intervals": ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"],
                "max_historical_days": 1000,
                "requires_api_key": True
            },
            {
                "id": DataSource.COINBASE,
                "name": "Coinbase Pro",
                "description": "Cryptocurrency data from Coinbase Pro",
                "supported_intervals": ["1m", "5m", "15m", "1h", "6h", "1d"],
                "max_historical_days": 300,
                "requires_api_key": True
            },
            {
                "id": DataSource.CSV_UPLOAD,
                "name": "CSV Upload",
                "description": "Upload your own CSV files",
                "supported_intervals": ["custom"],
                "max_historical_days": 999999,
                "requires_api_key": False
            }
        ]
    }

@router.get("/quality-report/{symbol}", response_model=DataQualityReport)
async def get_data_quality_report(symbol: str, source: DataSource = DataSource.YAHOO_FINANCE):
    """Get data quality analysis report"""
    try:
        report = await enhanced_data_service.analyze_data_quality(symbol.upper(), source)
        return report
        
    except Exception as e:
        logger.error(f"Quality report error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate quality report: {str(e)}")

@router.post("/cache/cleanup")
async def cleanup_cache():
    """Clean up expired cache entries"""
    try:
        await enhanced_data_service.cleanup_cache()
        return {"message": "Cache cleanup completed successfully"}
        
    except Exception as e:
        logger.error(f"Cache cleanup error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache cleanup failed: {str(e)}")

@router.get("/cache/stats")
async def get_cache_statistics():
    """Get cache usage statistics"""
    try:
        cache = enhanced_data_service.cache
        
        # Get memory cache stats
        memory_entries = len(cache._memory_cache)
        
        # Get disk cache stats
        disk_entries = len(list(cache.cache_dir.glob("*.gz")))
        total_size = sum(f.stat().st_size for f in cache.cache_dir.glob("*.gz"))
        
        return {
            "memory_cache": {
                "entries": memory_entries,
                "max_age_minutes": cache.config.cache_duration_minutes
            },
            "disk_cache": {
                "entries": disk_entries,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "compression_enabled": cache.config.compression_enabled
            },
            "config": {
                "cache_duration_minutes": cache.config.cache_duration_minutes,
                "max_cache_size_mb": cache.config.max_cache_size_mb,
                "auto_cleanup": cache.config.auto_cleanup
            }
        }
        
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")

@router.get("/datasets")
async def list_datasets(
    source: Optional[DataSource] = None,
    symbol: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List available datasets with filtering"""
    try:
        # This would query a database in a real implementation
        # For now, return mock data
        mock_datasets = [
            {
                "dataset_id": "AAPL_yahoo_finance_20241201",
                "symbol": "AAPL",
                "source": DataSource.YAHOO_FINANCE,
                "created_at": "2024-12-01T10:00:00Z",
                "total_records": 252,
                "quality_score": 0.97,
                "file_size_mb": 0.5
            },
            {
                "dataset_id": "BTC-USD_yahoo_finance_20241201",
                "symbol": "BTC-USD",
                "source": DataSource.YAHOO_FINANCE,
                "created_at": "2024-12-01T10:15:00Z",
                "total_records": 365,
                "quality_score": 0.95,
                "file_size_mb": 0.7
            }
        ]
        
        # Apply filters
        filtered_datasets = mock_datasets
        if source:
            filtered_datasets = [d for d in filtered_datasets if d["source"] == source]
        if symbol:
            filtered_datasets = [d for d in filtered_datasets if d["symbol"] == symbol.upper()]
        
        # Apply pagination
        paginated = filtered_datasets[offset:offset + limit]
        
        return {
            "datasets": paginated,
            "total": len(filtered_datasets),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"List datasets error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list datasets: {str(e)}")

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    try:
        # This would delete from database and files in a real implementation
        return {
            "message": f"Dataset {dataset_id} deleted successfully",
            "deleted_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Delete dataset error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete dataset: {str(e)}")

@router.post("/validate-csv")
async def validate_csv_file(
    file: UploadFile = File(...),
    symbol: str = Form(...),
    delimiter: str = Form(default=",")
):
    """Validate CSV file format before upload"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read first few lines to validate format
        content = await file.read(1024)  # Read first 1KB
        await file.seek(0)  # Reset file pointer
        
        try:
            import pandas as pd
            df_sample = pd.read_csv(io.StringIO(content.decode('utf-8')), nrows=5, delimiter=delimiter)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
        
        # Check required columns
        required_columns = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
        missing_columns = [col for col in required_columns if col not in df_sample.columns]
        
        # Generate validation report
        validation_result = {
            "valid": len(missing_columns) == 0,
            "file_size_bytes": file.size,
            "detected_columns": list(df_sample.columns),
            "required_columns": required_columns,
            "missing_columns": missing_columns,
            "sample_rows": len(df_sample),
            "delimiter": delimiter,
            "recommendations": []
        }
        
        if missing_columns:
            validation_result["recommendations"].append(f"Add missing columns: {', '.join(missing_columns)}")
        
        if file.size > 10 * 1024 * 1024:  # 10MB
            validation_result["recommendations"].append("Large file detected. Upload may take longer.")
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.get("/health")
async def enhanced_data_service_health():
    """Health check for enhanced data service"""
    try:
        cache_stats = await get_cache_statistics()
        
        return {
            "status": "healthy",
            "service": "enhanced_data_service",
            "timestamp": datetime.now().isoformat(),
            "features": [
                "csv_upload",
                "bulk_download", 
                "multiple_data_sources",
                "data_caching",
                "quality_analysis"
            ],
            "cache_status": cache_stats,
            "supported_sources": len(DataSource),
            "active_jobs": len(enhanced_data_service.processing_jobs)
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "enhanced_data_service",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# CHANGE THIS: Move market data endpoint to more specific path to avoid conflicts
@router.get("/market-data/{symbol}")
async def get_enhanced_market_data(
    symbol: str,
    source: DataSource = DataSource.YAHOO_FINANCE,
    period: str = "1y",
    interval: str = "1d",
    use_cache: bool = True
):
    """Get enhanced market data with additional metrics"""
    try:
        data = await enhanced_data_service.download_data(
            symbol=symbol.upper(),
            source=source,
            period=period,
            interval=interval,
            use_cache=use_cache
        )
        
        if not data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        # Convert to response format
        response_data = []
        for point in data:
            response_data.append({
                "timestamp": point.timestamp.isoformat(),
                "open": point.open,
                "high": point.high,
                "low": point.low,
                "close": point.close,
                "volume": point.volume,
                "price_change": point.price_change,
                "price_change_percent": point.price_change_percent,
                "volume_ratio": point.volume_ratio,
                "confidence_score": point.confidence_score,
                "is_anomaly": point.is_anomaly
            })
        
        return {
            "symbol": symbol.upper(),
            "source": source,
            "interval": interval,
            "total_records": len(response_data),
            "start_date": data[0].timestamp.isoformat(),
            "end_date": data[-1].timestamp.isoformat(),
            "data": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced data error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get enhanced data: {str(e)}")