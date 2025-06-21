// src/components/MarketData.tsx (Alternative version)
import React, { useState } from 'react';
import {
  Paper,
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

import { apiService, MarketDataResponse } from '../services/apiService';

interface MarketDataProps {
  connected: boolean;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'BTC-USD', 'ETH-USD'];

const MarketData: React.FC<MarketDataProps> = ({ connected }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
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
      const data = await apiService.getMarketData(selectedSymbol);
      setMarketData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    if (!marketData) return [];
    
    return marketData.data.slice(-30).map(point => ({
      date: new Date(point.timestamp).toLocaleDateString(),
      price: point.close
    }));
  };

  const getLatestData = () => {
    if (!marketData || marketData.data.length === 0) return null;
    return marketData.data[marketData.data.length - 1];
  };

  const latestData = getLatestData();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        📈 Market Data
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
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

        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <ShowChart />}
          onClick={loadMarketData}
          disabled={loading || !connected}
        >
          Load Data
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
              </CardContent>
            </Card>
          </Box>

          {/* Price Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Price Chart - {selectedSymbol} (Last 30 Days)
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

          {/* Data Summary */}
          <Alert severity="info">
            📊 Loaded {marketData.total_records} data points for {marketData.symbol}
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
            Select a symbol and click "Load Data" to view market information
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MarketData;