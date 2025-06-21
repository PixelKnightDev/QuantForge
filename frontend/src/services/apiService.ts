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
        console.log(`✅ API Success: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', error.message);
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

  // Get market data for a symbol
  async getMarketData(symbol: string, period: string = '1mo'): Promise<MarketDataResponse> {
    const response = await this.client.post('/api/data/market-data', {
      symbol,
      period,
      interval: '1d'
    });
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
}

// Create and export a single instance
export const apiService = new ApiService();