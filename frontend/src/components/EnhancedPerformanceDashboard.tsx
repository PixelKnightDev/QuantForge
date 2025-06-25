// src/components/EnhancedPerformanceDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Badge,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Timeline,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff
} from '@mui/icons-material';

// Import your existing PerformanceDashboard component
import PerformanceDashboard from './PerformanceDashboard';

// Import WebSocket service
import { 
  websocketService, 
  PerformanceData, 
  SignalData, 
  TradeData, 
  StrategyUpdate 
} from '../services/websocketService';

import { apiService, EnhancedTradingMetrics } from '../services/apiService';

// ============================================================================
// REAL-TIME INTERFACES
// ============================================================================

interface RealTimeMetrics {
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
  portfolio_value: number;
  current_position: number;
  last_updated: string;
}

interface RecentActivity {
  signals: Array<{
    type: 'BUY' | 'SELL';
    strength: number;
    price: number;
    reason: string;
    timestamp: string;
  }>;
  trades: Array<{
    id: string;
    timestamp: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    reason: string;
  }>;
}

interface EnhancedPerformanceDashboardProps {
  results: any | null;  // Your existing BacktestResults
  loading?: boolean;
  strategyId?: string;
  enableRealTime?: boolean;
}

// ============================================================================
// REAL-TIME COMPONENTS
// ============================================================================

const ConnectionStatus: React.FC<{ connected: boolean }> = ({ connected }) => (
  <Box display="flex" alignItems="center" gap={1}>
    {connected ? (
      <>
        <Wifi color="success" />
        <Typography variant="body2" color="success.main">Live</Typography>
      </>
    ) : (
      <>
        <WifiOff color="error" />
        <Typography variant="body2" color="error.main">Offline</Typography>
      </>
    )}
  </Box>
);

const LiveMetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  isLive?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, subtitle, color = 'primary', isLive = false, trend = 'neutral' }) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) {
        return `$${(val / 1000000).toFixed(2)}M`;
      } else if (Math.abs(val) >= 1000) {
        return `$${(val / 1000).toFixed(1)}K`;
      } else if (title.toLowerCase().includes('percent') || title.toLowerCase().includes('rate')) {
        return `${val.toFixed(2)}%`;
      } else {
        return val.toFixed(2);
      }
    }
    return val;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" fontSize="small" />;
      case 'down': return <TrendingDown color="error" fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%',
        border: isLive ? '2px solid' : 'none',
        borderColor: isLive ? 'success.main' : 'transparent',
        position: 'relative'
      }}
    >
      {isLive && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'success.main',
            animation: 'pulse 2s infinite'
          }}
        />
      )}
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" fontWeight="medium">
            {title}
          </Typography>
          {getTrendIcon()}
        </Box>
        <Typography variant="h5" fontWeight="bold" color={`${color}.main`} gutterBottom>
          {formatValue(value)}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityFeed: React.FC<{ 
  signals: RecentActivity['signals'];
  trades: RecentActivity['trades'];
}> = ({ signals, trades }) => {
  const [activeTab, setActiveTab] = useState<'signals' | 'trades'>('signals');

  return (
    <Paper elevation={2} sx={{ p: 3, height: '400px' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          📡 Live Activity Feed
        </Typography>
        <Box>
          <Chip 
            label={`Signals (${signals.length})`}
            color={activeTab === 'signals' ? 'primary' : 'default'}
            onClick={() => setActiveTab('signals')}
            sx={{ mr: 1, cursor: 'pointer' }}
          />
          <Chip 
            label={`Trades (${trades.length})`}
            color={activeTab === 'trades' ? 'primary' : 'default'}
            onClick={() => setActiveTab('trades')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Box>

      <Box sx={{ height: '300px', overflowY: 'auto' }}>
        {activeTab === 'signals' ? (
          signals.length > 0 ? (
            signals.map((signal, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={signal.type}
                      color={signal.type === 'BUY' ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="body2" fontWeight="medium">
                      ${signal.price.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(signal.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {signal.reason} (Strength: {(signal.strength * 100).toFixed(1)}%)
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
              No recent signals
            </Typography>
          )
        ) : (
          trades.length > 0 ? (
            trades.map((trade, index) => (
              <Box key={trade.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={trade.type}
                      color={trade.type === 'BUY' ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {trade.quantity} @ ${trade.price.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {trade.reason}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
              No recent trades
            </Typography>
          )
        )}
      </Box>
    </Paper>
  );
};

const EnhancedTradingMetricsPanel: React.FC<{
  metrics: EnhancedTradingMetrics;
  isLive?: boolean;
  }> = ({ metrics, isLive = false }) => {
  const formatDuration = (hours: number): string => {
      if (hours < 1) return `${(hours * 60).toFixed(0)}min`;
      if (hours < 24) return `${hours.toFixed(1)}h`;
      if (hours < 168) return `${(hours / 24).toFixed(1)}d`;
      return `${(hours / 168).toFixed(1)}w`;
    };

    const getMetricColor = (value: number, type: 'positive' | 'negative' | 'neutral' = 'positive'): string => {
      if (type === 'positive') return value > 0 ? '#4caf50' : '#f44336';
      if (type === 'negative') return value < 0 ? '#4caf50' : '#f44336';
      return '#2196f3';
    };

    const getTurnoverColor = (turnover: number): string => {
      if (turnover <= 100) return '#4caf50';  // Low turnover - good
      if (turnover <= 300) return '#ff9800';  // Medium turnover - ok
      return '#f44336';                       // High turnover - potentially bad
    };

    return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🎯 Enhanced Trading Metrics
        {isLive && (
          <Chip 
            label="LIVE" 
            color="success" 
            size="small" 
            sx={{ 
              fontSize: '0.7rem',
              animation: 'pulse 2s infinite'
            }} 
          />
        )}
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        ✨ Now includes the 4 missing metrics: Trade Duration, Largest Win/Loss, and Turnover Rate
      </Alert>

      <Grid container spacing={3}>
        {/* NEW METRICS ROW */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
            🆕 New Enhanced Metrics
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ border: '2px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  ⏱️ Avg Trade Duration
                </Typography>
                <Chip label="NEW" color="success" size="small" />
              </Box>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {formatDuration(metrics.avg_trade_duration_hours)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.avg_trade_duration_hours.toFixed(1)} hours total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ border: '2px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  📈 Largest Win
                </Typography>
                <Chip label="NEW" color="success" size="small" />
              </Box>
              <Typography 
                variant="h5" 
                fontWeight="bold" 
                color={getMetricColor(metrics.largest_win_percent, 'positive')}
              >
                +{metrics.largest_win_percent.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Best performing trade
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ border: '2px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  📉 Largest Loss
                </Typography>
                <Chip label="NEW" color="success" size="small" />
              </Box>
              <Typography 
                variant="h5" 
                fontWeight="bold" 
                color={getMetricColor(metrics.largest_loss_percent, 'negative')}
              >
                {metrics.largest_loss_percent.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Worst performing trade
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1} sx={{ border: '2px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  🔄 Turnover Rate
                </Typography>
                <Chip label="NEW" color="success" size="small" />
              </Box>
              <Typography 
                variant="h5" 
                fontWeight="bold" 
                sx={{ color: getTurnoverColor(metrics.turnover_percent) }}
              >
                {metrics.turnover_percent.toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Annual portfolio turnover
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* TRADITIONAL METRICS ROW */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
            📊 Traditional Trading Metrics
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <LiveMetricCard
            title="Total Trades"
            value={metrics.total_trades}
            subtitle="Completed transactions"
            color="info"
            isLive={isLive}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <LiveMetricCard
            title="Win Rate"
            value={`${metrics.win_rate.toFixed(1)}%`}
            subtitle="Percentage of profitable trades"
            color={metrics.win_rate >= 50 ? 'success' : 'warning'}
            isLive={isLive}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <LiveMetricCard
            title="Profit Factor"
            value={metrics.profit_factor.toFixed(2)}
            subtitle="Gross profit / gross loss"
            color={metrics.profit_factor >= 1.5 ? 'success' : 'warning'}
            isLive={isLive}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <LiveMetricCard
            title="Expectancy"
            value={`${metrics.expectancy.toFixed(2)}%`}
            subtitle="Expected profit per trade"
            color={metrics.expectancy >= 0 ? 'success' : 'error'}
            isLive={isLive}
          />
        </Grid>
      </Grid>

      {/* Enhanced Metrics Summary */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          📋 Enhanced Metrics Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>Trading Frequency:</strong> {formatDuration(metrics.avg_trade_duration_hours)} average hold time
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>Performance Range:</strong> {metrics.largest_loss_percent.toFixed(1)}% to +{metrics.largest_win_percent.toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>Activity Level:</strong> {metrics.turnover_percent.toFixed(0)}% annual turnover
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>Success Rate:</strong> {metrics.win_rate.toFixed(1)}% of {metrics.total_trades} trades
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

// ADD this helper function:
const extractEnhancedTradingMetrics = (results: any): EnhancedTradingMetrics | undefined => {
  if (!results?.performance_metrics?.trading) {
    return undefined;
  }
  
  const trading = results.performance_metrics.trading;
  return {
    total_trades: trading.total_trades || 0,
    win_rate: trading.win_rate || 0,
    avg_trade_duration_hours: trading.avg_trade_duration_hours || 0,
    largest_win_percent: trading.largest_win_percent || 0,
    largest_loss_percent: trading.largest_loss_percent || 0,
    turnover_percent: trading.turnover_percent || 0,
    profit_factor: trading.profit_factor || 0,
    expectancy: trading.expectancy || 0,
    best_trade: trading.best_trade || 0,
    worst_trade: trading.worst_trade || 0,
    avg_win: trading.avg_win || 0,
    avg_loss: trading.avg_loss || 0
  };
};

// ============================================================================
// MAIN ENHANCED COMPONENT
// ============================================================================

const EnhancedPerformanceDashboard: React.FC<EnhancedPerformanceDashboardProps> = ({ 
  results, 
  loading = false,
  strategyId,
  enableRealTime = true
}) => {
  // State for real-time data
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({ signals: [], trades: [] });
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(enableRealTime);
  const [strategyStatus, setStrategyStatus] = useState<'active' | 'stopped' | 'paused'>('stopped');
  const enhancedTradingMetrics = extractEnhancedTradingMetrics(results);

  // WebSocket connection and handlers
  useEffect(() => {
    if (!enableRealTime || !strategyId) return;

    // Connection status handler
    const handleConnectionStatus = (connected: boolean) => {
      setConnectionStatus(connected);
    };

    // Performance update handler
    const handlePerformanceUpdate = (data: PerformanceData) => {
      setRealtimeMetrics({
        total_trades: data.total_trades,
        winning_trades: data.winning_trades,
        win_rate: data.win_rate,
        total_pnl: data.total_pnl,
        portfolio_value: data.portfolio_value,
        current_position: data.current_position,
        last_updated: data.last_updated
      });
    };

    // Signal handler
    const handleSignalGenerated = (data: SignalData) => {
      setRecentActivity(prev => ({
        ...prev,
        signals: [{
          ...data.signals[0],
          timestamp: data.timestamp
        }, ...prev.signals].slice(0, 10) // Keep last 10
      }));
    };

    // Trade handler
    const handleTradeExecuted = (data: TradeData) => {
      setRecentActivity(prev => ({
        ...prev,
        trades: [...data.trades, ...prev.trades].slice(0, 20) // Keep last 20
      }));
    };

    // Strategy update handler
    const handleStrategyUpdate = (data: StrategyUpdate) => {
      setStrategyStatus(data.status as any);
    };

    // Set up WebSocket handlers
    websocketService.onConnectionStatusChange(handleConnectionStatus);
    websocketService.onPerformanceUpdate(strategyId, handlePerformanceUpdate);
    websocketService.onSignalGenerated(strategyId, handleSignalGenerated);
    websocketService.onTradeExecuted(strategyId, handleTradeExecuted);
    websocketService.onStrategyUpdate(strategyId, handleStrategyUpdate);

    // Subscribe to strategy updates
    if (isLiveMode) {
      websocketService.subscribeToStrategy(strategyId);
    }

    // Set initial connection status
    setConnectionStatus(websocketService.isWebSocketConnected());

    return () => {
      // Cleanup: unsubscribe from strategy
      websocketService.unsubscribeFromStrategy(strategyId);
    };
  }, [strategyId, enableRealTime, isLiveMode]);

  // Toggle live mode
  const toggleLiveMode = useCallback(() => {
    if (!strategyId) return;

    setIsLiveMode(prev => {
      const newMode = !prev;
      if (newMode) {
        websocketService.subscribeToStrategy(strategyId);
      } else {
        websocketService.unsubscribeFromStrategy(strategyId);
      }
      return newMode;
    });
  }, [strategyId]);

  // Determine if we should show live metrics overlay
  const showLiveMetrics = !!(enableRealTime && isLiveMode && realtimeMetrics && connectionStatus);

  return (
    <Box>
      {/* Real-time Controls Header */}
      {enableRealTime && strategyId && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" fontWeight="bold">
                  🔴 Real-time Monitoring
                </Typography>
                <Badge 
                  color={strategyStatus === 'active' ? 'success' : 'default'}
                  variant="dot"
                >
                  <Chip 
                    label={strategyStatus.toUpperCase()}
                    color={strategyStatus === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Badge>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
                <ConnectionStatus connected={connectionStatus} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={isLiveMode}
                      onChange={toggleLiveMode}
                      color="primary"
                    />
                  }
                  label="Live Updates"
                />
                <Tooltip title="Strategy Controls">
                  <Box>
                    <IconButton color="success" size="small">
                      <PlayArrow />
                    </IconButton>
                    <IconButton color="warning" size="small">
                      <Pause />
                    </IconButton>
                    <IconButton color="error" size="small">
                      <Stop />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Live Metrics Overlay */}
      {showLiveMetrics && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '2px solid', borderColor: 'success.main' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom color="success.main">
            📊 Live Performance Metrics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <LiveMetricCard
                title="Portfolio Value"
                value={realtimeMetrics.portfolio_value}
                subtitle="Live value"
                color="success"
                isLive={true}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <LiveMetricCard
                title="Total P&L"
                value={realtimeMetrics.total_pnl}
                subtitle="Realized profit/loss"
                color={realtimeMetrics.total_pnl >= 0 ? 'success' : 'error'}
                isLive={true}
                trend={realtimeMetrics.total_pnl >= 0 ? 'up' : 'down'}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <LiveMetricCard
                title="Live Win Rate"
                value={`${realtimeMetrics.win_rate.toFixed(1)}%`}
                subtitle={`${realtimeMetrics.winning_trades}/${realtimeMetrics.total_trades} trades`}
                color="info"
                isLive={true}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <LiveMetricCard
                title="Current Position"
                value={realtimeMetrics.current_position}
                subtitle="Shares held"
                color="primary"
                isLive={true}
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Last updated: {new Date(realtimeMetrics.last_updated).toLocaleString()}
          </Typography>
        </Paper>
      )}

      {/* Activity Feed (only show in live mode) */}
      {showLiveMetrics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} lg={8}>
            <ActivityFeed signals={recentActivity.signals} trades={recentActivity.trades} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper elevation={2} sx={{ p: 3, height: '400px' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                📈 Quick Stats
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Recent Activity (Last Hour)</Typography>
                <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="body2">Signals Generated:</Typography>
                  <Typography variant="body2" fontWeight="bold">{recentActivity.signals.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="body2">Trades Executed:</Typography>
                  <Typography variant="body2" fontWeight="bold">{recentActivity.trades.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="body2">Connection Uptime:</Typography>
                  <Typography variant="body2" fontWeight="bold" color={connectionStatus ? 'success.main' : 'error.main'}>
                    {connectionStatus ? '99.9%' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* ADD NEW: Enhanced Trading Metrics Panel */}
      {!!enhancedTradingMetrics && (
        <EnhancedTradingMetricsPanel 
          metrics={enhancedTradingMetrics}
          isLive={showLiveMetrics}
        />
      )}

      {/* Original Performance Dashboard */}
      <PerformanceDashboard results={results} loading={loading} />

      {/* Real-time Status Footer */}
      {enableRealTime && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            {isLiveMode && connectionStatus ? (
              <>🟢 Real-time monitoring active • Strategy: {strategyId} • Updates every second</>
            ) : isLiveMode && !connectionStatus ? (
              <>🔴 Real-time monitoring enabled but disconnected • Attempting to reconnect...</>
            ) : (
              <>⚪ Real-time monitoring disabled • Enable to see live strategy performance</>
            )}
          </Typography>
        </Paper>
      )}

      {/* Add CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

// ADD this test component to debug and verify the enhanced metrics:
export const TestEnhancedMetrics: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      // Test the backend endpoint
      const results = await apiService.testEnhancedTradingMetrics();
      setTestResults(results);
      console.log('✅ Enhanced metrics test results:', results);
    } catch (error) {
      console.error('❌ Enhanced metrics test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unkown error occured'
      setTestResults({ success: false, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        🧪 Test Enhanced Trading Metrics
      </Typography>
      
      <button 
        onClick={runTest} 
        disabled={loading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>

      {testResults && (
        <Box>
          <Alert severity={testResults.success ? 'success' : 'error'} sx={{ mb: 2 }}>
            {testResults.success ? 'Test completed successfully!' : `Test failed: ${testResults.error}`}
          </Alert>
          
          {testResults.success && testResults.enhanced_metrics && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Enhanced Metrics:</Typography>
                <pre style={{ 
                  fontSize: '12px', 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {JSON.stringify(testResults.enhanced_metrics, null, 2)}
                </pre>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Explanations:</Typography>
                {testResults.explanation && Object.entries(testResults.explanation).map(([key, value]) => (
                  <Typography key={key} variant="body2" sx={{ mb: 1 }}>
                    <strong>{key}:</strong> {value as string}
                  </Typography>
                ))}
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default EnhancedPerformanceDashboard;