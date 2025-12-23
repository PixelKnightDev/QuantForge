
import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  ShowChart
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// UPDATED: Import the new enhanced types
import { apiService, EnhancedMarketDataResponse } from '../services/apiService';

interface MarketDataProps {
  connected: boolean;
}

const SYMBOLS = [
  // Stocks
  'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META',
  
  // Crypto (known working symbols)
  'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD'
];
const PERIODS = ['5d', '1mo', '3mo', '6mo', '1y', '2y'];

const MarketData: React.FC<MarketDataProps> = ({ connected }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [selectedPeriod, setSelectedPeriod] = useState('1y'); // NEW: Add period selection
  // UPDATED: Use EnhancedMarketDataResponse type
  const [marketData, setMarketData] = useState<EnhancedMarketDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarketData = async () => {
    if (!connected) {
      setError('API not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // UPDATED: Use the new enhanced API method with period
      const data = await apiService.getEnhancedMarketData(selectedSymbol, selectedPeriod);
      setMarketData(data);
      console.log(`✅ Loaded ${data.total_records} data points for ${selectedSymbol}`);
    } catch (err) {
      console.error('❌ Market data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    if (!marketData) return [];
    
    // Show last 30 data points or all if less than 30
    const dataToShow = marketData.data.slice(-30);
    
    return dataToShow.map(point => ({
      date: new Date(point.timestamp).toLocaleDateString(),
      price: point.close,
      volume: point.volume
    }));
  };

  const getLatestData = () => {
    if (!marketData || marketData.data.length === 0) return null;
    return marketData.data[marketData.data.length - 1];
  };

  const latestData = getLatestData();

  return (
    <Card sx={{ border: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2, pb: 2, borderBottom: '2px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={700}>
            📈 Market Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Real-time market data with enhanced metrics and quality indicators
          </Typography>
        </Box>

        {/* Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Symbol</InputLabel>
            <Select
              value={selectedSymbol}
              label="Symbol"
              onChange={(e) => setSelectedSymbol(e.target.value)}
              disabled={loading || !connected}
            >
              {SYMBOLS.map((symbol) => (
                <MenuItem key={symbol} value={symbol}>
                  {symbol}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* NEW: Period selection */}
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={loading || !connected}
            >
              {PERIODS.map((period) => (
                <MenuItem key={period} value={period}>
                  {period.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <ShowChart />}
            onClick={loadMarketData}
            disabled={loading || !connected}
            size="small"
          >
            {loading ? 'Loading...' : 'Load Data'}
          </Button>
        </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Market Data Display */}
      {marketData && latestData && (
        <>
          {/* Data Summary Alert */}
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Loaded {marketData.total_records} data points for {marketData.symbol} 
            ({marketData.start_date.split('T')[0]} to {marketData.end_date.split('T')[0]})
            {/* NEW: Show enhanced fields if available */}
            {latestData.price_change !== null && (
              <span> • Latest change: {apiService.formatPercentage(latestData.price_change_percent || 0)}</span>
            )}
          </Alert>

          {/* Current Price Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 2, 
            mb: 3 
          }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Current Price
                </Typography>
                <Typography variant="h4">
                  {apiService.formatPrice(latestData.close)}
                </Typography>
                {/* NEW: Show price change if available */}
                {latestData.price_change !== null && (
                  <Typography 
                    variant="body2" 
                    color={latestData.price_change >= 0 ? 'success.main' : 'error.main'}
                  >
                    {latestData.price_change >= 0 ? '+' : ''}{latestData.price_change?.toFixed(2)} 
                    ({apiService.formatPercentage(latestData.price_change_percent || 0)})
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  24h High
                </Typography>
                <Typography variant="h5">
                  {apiService.formatPrice(latestData.high)}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  24h Low
                </Typography>
                <Typography variant="h5">
                  {apiService.formatPrice(latestData.low)}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Volume
                </Typography>
                <Typography variant="h5">
                  {apiService.formatVolume(latestData.volume)}
                </Typography>
                {/* NEW: Show volume ratio if available */}
                {latestData.volume_ratio !== null && latestData.volume_ratio !== 1 && (
                  <Typography variant="body2" color="text.secondary">
                    {(latestData.volume_ratio * 100).toFixed(0)}% of avg
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* NEW: Data Quality Indicator */}
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Data Quality
                </Typography>
                <Typography variant="h5">
                  {(latestData.confidence_score * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {latestData.is_anomaly ? '⚠️ Anomaly detected' : '✅ Normal'}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Price Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Price Chart - {selectedSymbol} (Last 30 Points)
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [apiService.formatPrice(Number(value)), 'Price']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Data Info */}
          <Alert severity="info">
            📊 Enhanced data includes price changes, volume analysis, and quality indicators • 
            Source: {marketData.source} • Interval: {marketData.interval}
          </Alert>
        </>
      )}

        {/* Empty State */}
        {!marketData && !loading && !error && (
          <Box textAlign="center" py={4}>
            <TrendingUp sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Data Loaded
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a symbol and period, then click "Load Data" to view enhanced market information
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketData;