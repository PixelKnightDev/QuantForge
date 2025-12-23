
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, File, UploadFile
from typing import Dict, List, Optional
import asyncio
import uuid
from datetime import datetime
import logging
import yfinance as yf
import pandas as pd
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

bulk_jobs: Dict[str, dict] = {}

class BulkDownloadRequest(BaseModel):
    symbols: List[str]
    source: str = "yahoo_finance"
    period: str = "1y"
    interval: str = "1d"
    parallel_downloads: int = 5
    retry_failed: bool = True
    cache_results: bool = True


@router.post("/bulk-download")
async def start_bulk_download(
    background_tasks: BackgroundTasks,
    request: BulkDownloadRequest
):
    """Start bulk download - matches your frontend expectations"""
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        if len(request.symbols) > 100:
            raise HTTPException(status_code=400, detail="Too many symbols (max 100)")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job tracking - matches your frontend JobStatus interface
        bulk_jobs[job_id] = {
            "job_id": job_id,
            "job_type": "bulk_download",
            "status": "pending",
            "total_items": len(request.symbols),
            "processed_items": 0,
            "failed_items": 0,
            "progress_percentage": 0.0,
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "error_messages": [],
            "symbols": request.symbols,
            "period": request.period,
            "interval": request.interval,
            "source": request.source,
            "results": {},
            "errors": {}
        }
        
        # Start background download
        background_tasks.add_task(
            execute_bulk_download,
            job_id,
            request.symbols,
            request.source,
            request.period,
            request.interval,
            request.parallel_downloads,
            request.retry_failed,
            request.cache_results
        )
        
        logger.info(f"🚀 Started bulk download job {job_id} for {len(request.symbols)} symbols")
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": f"Bulk download started for {len(request.symbols)} symbols",
            "total_symbols": len(request.symbols)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to start bulk download: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start download: {str(e)}")

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status - matches your frontend polling expectations"""
    if job_id not in bulk_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = bulk_jobs[job_id]
    
    # Return in the format your frontend expects (JobStatus interface)
    return {
        "job_id": job["job_id"],
        "job_type": job["job_type"],
        "status": job["status"],
        "total_items": job["total_items"],
        "processed_items": job["processed_items"],
        "failed_items": job["failed_items"],
        "progress_percentage": job["progress_percentage"],
        "created_at": job["created_at"],
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
        "error_messages": job["error_messages"]
    }

@router.get("/data-sources")
async def get_data_sources():
    """Get available data sources - matches your frontend expectations"""
    try:
        
        data_sources = [
            {
                "id": "yahoo_finance",
                "name": "Yahoo Finance",
                "description": "Free financial data from Yahoo Finance with comprehensive coverage",
                "supported_intervals": ["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"],
                "requires_api_key": False,
                "max_historical_days": 3650  # ~10 years
            },
            {
                "id": "alpha_vantage",
                "name": "Alpha Vantage",
                "description": "Premium financial data provider with real-time and historical data",
                "supported_intervals": ["1m", "5m", "15m", "30m", "1h", "1d"],
                "requires_api_key": True,
                "max_historical_days": 7300  # ~20 years
            },
            {
                "id": "polygon",
                "name": "Polygon.io",
                "description": "High-quality financial market data for stocks, options, and crypto",
                "supported_intervals": ["1m", "5m", "15m", "30m", "1h", "1d"],
                "requires_api_key": True,
                "max_historical_days": 7300  # ~20 years
            }
        ]
        
        return {
            "sources": data_sources,
            "total_sources": len(data_sources),
            "default_source": "yahoo_finance"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get data sources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get data sources: {str(e)}")

async def execute_bulk_download(
    job_id: str,
    symbols: List[str],
    source: str,
    period: str,
    interval: str,
    parallel_downloads: int,
    retry_failed: bool,
    cache_results: bool
):
    """Background task to execute bulk download"""
    try:
        job = bulk_jobs[job_id]
        job["status"] = "running"
        job["started_at"] = datetime.now().isoformat()
        
        logger.info(f"🔄 Executing bulk download for job {job_id}")
        
        # Download symbols with limited concurrency
        semaphore = asyncio.Semaphore(parallel_downloads)
        
        async def download_single_symbol(symbol: str):
            async with semaphore:
                try:
                    logger.info(f"📥 Downloading {symbol}")
                    
                    # Use yfinance for now (can be extended to support other sources)
                    ticker = yf.Ticker(symbol)
                    data = ticker.history(period=period, interval=interval)
                    
                    if data.empty:
                        raise ValueError(f"No data available for {symbol}")
                    
                    # Convert to JSON format
                    data_json = []
                    for timestamp, row in data.iterrows():
                        data_json.append({
                            "timestamp": timestamp.isoformat(),
                            "open": float(row["Open"]) if pd.notna(row["Open"]) else None,
                            "high": float(row["High"]) if pd.notna(row["High"]) else None,
                            "low": float(row["Low"]) if pd.notna(row["Low"]) else None,
                            "close": float(row["Close"]) if pd.notna(row["Close"]) else None,
                            "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                            "symbol": symbol
                        })
                    
                    # Store successful result
                    job["results"][symbol] = data_json
                    job["processed_items"] += 1
                    job["progress_percentage"] = (job["processed_items"] / job["total_items"]) * 100
                    
                    logger.info(f"✅ Downloaded {symbol}: {len(data_json)} data points")
                    
                except Exception as e:
                    error_msg = f"Failed to download {symbol}: {str(e)}"
                    logger.error(f"❌ {error_msg}")
                    
                    job["errors"][symbol] = error_msg
                    job["error_messages"].append(error_msg)
                    job["failed_items"] += 1
                    job["processed_items"] += 1  # Still count as processed
                    job["progress_percentage"] = (job["processed_items"] / job["total_items"]) * 100
        
        # Execute all downloads
        tasks = [download_single_symbol(symbol) for symbol in symbols]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Update final job status
        job["status"] = "completed"
        job["completed_at"] = datetime.now().isoformat()
        job["progress_percentage"] = 100.0
        
        successful_count = len(job["results"])
        failed_count = job["failed_items"]
        
        logger.info(f"✅ Bulk download job {job_id} completed")
        logger.info(f"📊 Results: {successful_count} successful, {failed_count} failed")
        
        # Add summary to job
        job["summary"] = {
            "successful_downloads": successful_count,
            "failed_downloads": failed_count,
            "success_rate": (successful_count / job["total_items"]) * 100,
            "total_data_points": sum(len(data) for data in job["results"].values())
        }
        
    except Exception as e:
        logger.error(f"❌ Bulk download job {job_id} failed: {e}")
        job["status"] = "failed"
        job["completed_at"] = datetime.now().isoformat()
        job["error_messages"].append(f"Job execution failed: {str(e)}")


@router.post("/data/bulk/validate")
async def bulk_validate_symbols(symbols: List[str]):
    """Validate multiple symbols for data availability"""
    try:
        validation_results = []
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period="5d")
                
                if data.empty:
                    status = "invalid"
                    message = "No data available"
                    last_price = None
                else:
                    status = "valid"
                    message = "Data available"
                    last_price = float(data['Close'].iloc[-1])
                
                validation_results.append({
                    "symbol": symbol,
                    "status": status,
                    "message": message,
                    "last_price": last_price,
                    "data_points": len(data)
                })
                
            except Exception as e:
                validation_results.append({
                    "symbol": symbol,
                    "status": "error",
                    "message": str(e),
                    "last_price": None,
                    "data_points": 0
                })
        
        valid_count = sum(1 for r in validation_results if r["status"] == "valid")
        invalid_count = len(symbols) - valid_count
        
        return {
            "results": validation_results,
            "summary": {
                "total_symbols": len(symbols),
                "valid_symbols": valid_count,
                "invalid_symbols": invalid_count,
                "success_rate": round(valid_count / len(symbols) * 100, 1)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in bulk validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/analyze/{symbol}")
async def analyze_data_quality(
    symbol: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Analyze data quality for a given symbol"""
    try:

        ticker = yf.Ticker(symbol)
        data = ticker.history(start=start_date, end=end_date)
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        total_rows = len(data)
        missing_data = data.isnull().sum().sum()
        
        price_stats = {
            "mean": float(data['Close'].mean()),
            "std": float(data['Close'].std()),
            "min": float(data['Close'].min()),
            "max": float(data['Close'].max()),
            "volatility": float(data['Close'].pct_change().std() * 100)
        }
        
        # Volume analysis
        volume_stats = {
            "mean": float(data['Volume'].mean()),
            "zero_volume_days": int((data['Volume'] == 0).sum()),
        }
        
        # Gap analysis (price gaps > 5%)
        price_changes = data['Close'].pct_change().abs()
        large_gaps = (price_changes > 0.05).sum()
        
        # Data completeness
        expected_trading_days = pd.bdate_range(start=start_date, end=end_date)
        completeness_ratio = len(data) / len(expected_trading_days)
        
        analysis = {
            "symbol": symbol,
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "total_days": total_rows
            },
            "data_quality": {
                "completeness_ratio": round(completeness_ratio, 3),
                "missing_data_points": int(missing_data),
                "data_quality_score": round((1 - missing_data/total_rows) * completeness_ratio * 100, 1)
            },
            "price_analysis": price_stats,
            "volume_analysis": volume_stats,
            "anomalies": {
                "large_price_gaps": int(large_gaps),
                "zero_volume_days": volume_stats["zero_volume_days"],
            }
        }
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing data quality for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# JOB MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get detailed results of completed job"""
    if job_id not in bulk_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = bulk_jobs[job_id]
    
    if job["status"] not in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "summary": job.get("summary", {}),
        "successful_symbols": list(job["results"].keys()),
        "failed_symbols": list(job["errors"].keys()),
        "results": job["results"],
        "errors": job["errors"],
        "total_data_points": sum(len(data) for data in job["results"].values())
    }

@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    if job_id not in bulk_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = bulk_jobs[job_id]
    
    if job["status"] in ["completed", "failed"]:
        return {"message": f"Job already {job['status']}"}
    
    job["status"] = "cancelled"
    job["completed_at"] = datetime.now().isoformat()
    
    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "Job cancelled successfully"
    }

@router.get("/jobs")
async def list_all_jobs():
    """List all jobs (for debugging/admin)"""
    return {
        "jobs": list(bulk_jobs.values()),
        "total_jobs": len(bulk_jobs),
        "active_jobs": len([job for job in bulk_jobs.values() if job["status"] == "running"])
    }

@router.get("/health")
async def enhanced_data_health():
    """Health check for enhanced data service"""
    return {
        "status": "healthy",
        "active_jobs": len([job for job in bulk_jobs.values() if job["status"] == "running"]),
        "total_jobs": len(bulk_jobs),
        "features": [
            "Bulk data download",
            "Job tracking", 
            "Data validation",
            "Quality analysis"
        ],
        "timestamp": datetime.now().isoformat()
    }