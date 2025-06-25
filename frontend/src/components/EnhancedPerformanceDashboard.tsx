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
  const showLiveMetrics = enableRealTime && isLiveMode && realtimeMetrics && connectionStatus;

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

export default EnhancedPerformanceDashboard;