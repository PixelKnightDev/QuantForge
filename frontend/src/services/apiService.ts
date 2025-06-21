// src/services/apiService.ts
import axios, { AxiosInstance } from 'axios';

// Types for our API responses
export interface MarketDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
}

export interface MarketDataResponse {
  symbol: string;
  data: MarketDataPoint[];
  total_records: number;
}

// NEW: Enhanced market data types
export interface EnhancedMarketDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price_change: number | null;
  price_change_percent: number | null;
  volume_ratio: number | null;
  confidence_score: number;
  is_anomaly: boolean;
}

export interface EnhancedMarketDataResponse {
  symbol: string;
  source: string;
  interval: string;
  total_records: number;
  start_date: string;
  end_date: string;
  data: EnhancedMarketDataPoint[];
}

// NEW: Data quality types
export interface DataQualityReport {
  dataset_id: string;
  symbol: string;
  total_expected_points: number;
  total_actual_points: number;
  missing_data_percentage: number;
  price_anomalies: number;
  volume_anomalies: number;
  timestamp_gaps: number;
  duplicate_records: number;
  invalid_ohlc_sequences: number;
  outlier_count: number;
  data_lag_hours: number;
  last_update: string;
  update_frequency_score: number;
  completeness_score: number;
  consistency_score: number;
  accuracy_score: number;
  timeliness_score: number;
  overall_quality_score: number;
  recommendations: string[];
}

// NEW: Data source types
export interface DataSource {
  id: string;
  name: string;
  description: string;
  supported_intervals: string[];
  max_historical_days: number;
  requires_api_key: boolean;
}

export interface DataSourcesResponse {
  sources: DataSource[];
}

export interface BacktestResult {
  backtest_id: string;
  strategy_name: string;
  symbol: string;
  total_return: number;
  win_rate: number;
  total_trades: number;
  message: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Log API calls for debugging
    this.client.interceptors.request.use((config) => {
      console.log(`🚀 API Call: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Success: ${response.status} - ${response.data?.total_records || 0} records`);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', error.response?.data?.detail || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Test if backend is running
  async testConnection(): Promise<any> {
    const response = await this.client.get('/');
    return response.data;
  }

  // Get available symbols
  async getSymbols(): Promise<string[]> {
    const response = await this.client.get('/api/data/symbols');
    return response.data;
  }

  // ORIGINAL: Get basic market data for a symbol
  async getMarketData(symbol: string, period: string = '1mo'): Promise<MarketDataResponse> {
    const response = await this.client.post('/api/data/market-data', {
      symbol,
      period,
      interval: '1d'
    });
    return response.data;
  }

  // NEW: Get enhanced market data with additional metrics
  async getEnhancedMarketData(
    symbol: string, 
    period: string = '1y',
    interval: string = '1d',
    source: string = 'yahoo_finance'
  ): Promise<EnhancedMarketDataResponse> {
    const response = await this.client.get(`/api/market-data/${symbol}`, {
      params: {
        period,
        interval,
        source,
        use_cache: true
      }
    });
    return response.data;
  }

  // NEW: Get data quality report for a symbol
  async getDataQualityReport(
    symbol: string, 
    source: string = 'yahoo_finance'
  ): Promise<DataQualityReport> {
    const response = await this.client.get(`/api/quality-report/${symbol}`, {
      params: { source }
    });
    return response.data;
  }

  // NEW: Get available data sources
  async getDataSources(): Promise<DataSourcesResponse> {
    const response = await this.client.get('/api/data-sources');
    return response.data;
  }

  // NEW: Upload CSV file
  async uploadCsvFile(
    file: File,
    symbol: string,
    options: {
      interval?: string;
      delimiter?: string;
      dateColumn?: string;
      skipRows?: number;
      overwriteExisting?: boolean;
    } = {}
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('symbol', symbol);
    formData.append('interval', options.interval || '1d');
    formData.append('delimiter', options.delimiter || ',');
    formData.append('date_column', options.dateColumn || 'Date');
    formData.append('skip_rows', String(options.skipRows || 0));
    formData.append('overwrite_existing', String(options.overwriteExisting || false));

    const response = await this.client.post('/api/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // NEW: Validate CSV file before upload
  async validateCsvFile(
    file: File,
    symbol: string,
    delimiter: string = ','
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('symbol', symbol);
    formData.append('delimiter', delimiter);

    const response = await this.client.post('/api/validate-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // NEW: Start bulk download
  async startBulkDownload(
    symbols: string[],
    options: {
      source?: string;
      period?: string;
      interval?: string;
      parallelDownloads?: number;
    } = {}
  ): Promise<any> {
    const response = await this.client.post('/api/bulk-download', {
      symbols,
      source: options.source || 'yahoo_finance',
      period: options.period || '1y',
      interval: options.interval || '1d',
      parallel_downloads: options.parallelDownloads || 5,
      retry_failed: true,
      cache_results: true
    });
    return response.data;
  }

  // NEW: Get job status
  async getJobStatus(jobId: string): Promise<any> {
    const response = await this.client.get(`/api/jobs/${jobId}`);
    return response.data;
  }

  // NEW: Get cache statistics
  async getCacheStats(): Promise<any> {
    const response = await this.client.get('/api/cache/stats');
    return response.data;
  }

  // NEW: Enhanced service health check
  async getEnhancedServiceHealth(): Promise<any> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  // Run a simple backtest
  async runBacktest(strategyName: string, symbol: string): Promise<BacktestResult> {
    const response = await this.client.post('/api/backtest/run', {
      strategy: {
        name: strategyName,
        symbol: symbol
      }
    });
    return response.data;
  }

  // Utility functions
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  }

  // NEW: Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // NEW: Format quality score
  formatQualityScore(score: number): string {
    if (score >= 0.9) return `${(score * 100).toFixed(1)}% (Excellent)`;
    if (score >= 0.7) return `${(score * 100).toFixed(1)}% (Good)`;
    if (score >= 0.5) return `${(score * 100).toFixed(1)}% (Fair)`;
    return `${(score * 100).toFixed(1)}% (Poor)`;
  }

  // NEW: Get quality score color
  getQualityScoreColor(score: number): string {
    if (score >= 0.9) return '#4caf50'; // green
    if (score >= 0.7) return '#ff9800'; // orange
    if (score >= 0.5) return '#f44336'; // red
    return '#9e9e9e'; // grey
  }
}

// Create and export a single instance
export const apiService = new ApiService();