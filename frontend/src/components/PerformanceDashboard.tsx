// src/components/PerformanceDashboard.tsx
import React from 'react';
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
  TableRow
} from '@mui/material';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PerformanceMetrics {
  returns: {
    total_return_percent: number;
    total_return_dollar: number;
    annualized_return: number;
    cagr: number;
  };
  risk: {
    volatility: number;
    max_drawdown: number;
    max_drawdown_dollar: number;
    var_95: number;
    var_99: number;
  };
  risk_adjusted: {
    sharpe_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
  };
  trading: {
    total_trades: number;
    win_rate: number;
    avg_trade_duration_hours: number;
    largest_win_percent: number;
    largest_loss_percent: number;
    turnover_percent: number;
  };
  additional: {
    profit_factor: number;
    expectancy: number;
    recovery_factor: number;
    beta: number;
  };
}

interface BacktestResults {
  strategy: {
    name: string;
    description: string;
    timeframe: string;
  };
  backtest_config: {
    symbol: string;
    start_date: string;
    end_date: string;
    initial_capital: number;
    data_points: number;
  };
  portfolio: {
    cash: number;
    total_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    total_return_percent: number;
    positions: any[];
    trades: any[];
  };
  performance_metrics: PerformanceMetrics;
  performance_report: {
    summary: any;
    recommendations: string[];
    risk_assessment: string;
  };
}

interface PerformanceDashboardProps {
  results: BacktestResults | null;
  loading?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = 'primary' }) => {
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

  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          {title}
        </Typography>
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

const RiskGauge: React.FC<{ value: number; max: number; label: string; color: string }> = ({ 
  value, max, label, color 
}) => {
  const percentage = Math.min((Math.abs(value) / max) * 100, 100);
  
  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" fontWeight="medium">{label}</Typography>
        <Typography variant="body2" sx={{ color }}>{value.toFixed(2)}%</Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={percentage} 
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'grey.300',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color
          }
        }}
      />
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ results, loading = false }) => {
  if (!results) {
    return (
      <Box p={3}>
        <Alert severity="info">
          <Typography variant="h6">No Performance Data</Typography>
          <Typography>Run a backtest to see comprehensive performance analytics here.</Typography>
        </Alert>
      </Box>
    );
  }

  const { performance_metrics: metrics, performance_report: report, portfolio, strategy } = results;

  // Performance assessment color
  const getPerformanceColor = (sharpe: number) => {
    if (sharpe > 1.5) return 'success';
    if (sharpe > 1.0) return 'info';
    if (sharpe > 0.5) return 'warning';
    return 'error';
  };

  const performanceColor = getPerformanceColor(metrics.risk_adjusted.sharpe_ratio);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          📊 Performance Analytics
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          {strategy.name} • {results.backtest_config.symbol} • {strategy.timeframe}
        </Typography>
        
        <Grid container spacing={2} mt={2}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" fontWeight="bold">
              {metrics.returns.total_return_percent.toFixed(2)}%
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Return</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" fontWeight="bold">
              {metrics.risk_adjusted.sharpe_ratio.toFixed(2)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Sharpe Ratio</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" fontWeight="bold">
              {metrics.risk.max_drawdown.toFixed(2)}%
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Max Drawdown</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" fontWeight="bold">
              {metrics.trading.total_trades}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Trades</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total Return"
            value={`${metrics.returns.total_return_percent.toFixed(2)}%`}
            subtitle={`${metrics.returns.total_return_dollar.toFixed(2)} profit`}
            color={metrics.returns.total_return_percent >= 0 ? 'success' : 'error'}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Sharpe Ratio"
            value={metrics.risk_adjusted.sharpe_ratio.toFixed(2)}
            subtitle="Risk-adjusted return"
            color={performanceColor}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Max Drawdown"
            value={`${metrics.risk.max_drawdown.toFixed(2)}%`}
            subtitle={`${metrics.risk.max_drawdown_dollar.toFixed(2)} loss`}
            color={metrics.risk.max_drawdown < 10 ? 'success' : metrics.risk.max_drawdown < 20 ? 'warning' : 'error'}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Win Rate"
            value={`${metrics.trading.win_rate.toFixed(1)}%`}
            subtitle={`${Math.round(metrics.trading.total_trades * metrics.trading.win_rate / 100)} winning trades`}
            color={metrics.trading.win_rate >= 60 ? 'success' : metrics.trading.win_rate >= 50 ? 'info' : 'warning'}
          />
        </Grid>
      </Grid>

      {/* Risk Assessment */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          🛡️ Risk Assessment
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <RiskGauge 
              value={metrics.risk.volatility} 
              max={50} 
              label="Volatility" 
              color={metrics.risk.volatility < 15 ? '#4caf50' : metrics.risk.volatility < 25 ? '#ff9800' : '#f44336'} 
            />
            <RiskGauge 
              value={metrics.risk.max_drawdown} 
              max={30} 
              label="Maximum Drawdown" 
              color={metrics.risk.max_drawdown < 10 ? '#4caf50' : metrics.risk.max_drawdown < 20 ? '#ff9800' : '#f44336'} 
            />
            <RiskGauge 
              value={Math.abs(metrics.risk.var_95)} 
              max={10} 
              label="Value at Risk (95%)" 
              color={Math.abs(metrics.risk.var_95) < 3 ? '#4caf50' : Math.abs(metrics.risk.var_95) < 5 ? '#ff9800' : '#f44336'} 
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box p={2} bgcolor="grey.50" borderRadius={2}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Risk Level: <Chip label={report.risk_assessment} color={
                  report.risk_assessment === 'Low Risk' ? 'success' :
                  report.risk_assessment === 'Medium Risk' ? 'warning' : 'error'
                } />
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Risk-Adjusted Metrics:
              </Typography>
              <Typography variant="body2">
                • Sharpe Ratio: {metrics.risk_adjusted.sharpe_ratio.toFixed(2)} {metrics.risk_adjusted.sharpe_ratio > 1.5 ? '(Excellent)' : metrics.risk_adjusted.sharpe_ratio > 1.0 ? '(Good)' : '(Needs Improvement)'}
              </Typography>
              <Typography variant="body2">
                • Sortino Ratio: {metrics.risk_adjusted.sortino_ratio.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                • Calmar Ratio: {metrics.risk_adjusted.calmar_ratio.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Detailed Metrics Table */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          📈 Detailed Performance Metrics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Trading Metrics</Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Total Trades</TableCell>
                    <TableCell align="right">{metrics.trading.total_trades}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Win Rate</TableCell>
                    <TableCell align="right">{metrics.trading.win_rate.toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Avg Trade Duration</TableCell>
                    <TableCell align="right">{metrics.trading.avg_trade_duration_hours.toFixed(1)} hours</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Largest Win</TableCell>
                    <TableCell align="right">{metrics.trading.largest_win_percent.toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Largest Loss</TableCell>
                    <TableCell align="right">{metrics.trading.largest_loss_percent.toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Turnover</TableCell>
                    <TableCell align="right">{metrics.trading.turnover_percent.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Advanced Metrics</Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Profit Factor</TableCell>
                    <TableCell align="right">{metrics.additional.profit_factor.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Expectancy</TableCell>
                    <TableCell align="right">${metrics.additional.expectancy.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Recovery Factor</TableCell>
                    <TableCell align="right">{metrics.additional.recovery_factor.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Beta</TableCell>
                    <TableCell align="right">{metrics.additional.beta.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Volatility</TableCell>
                    <TableCell align="right">{metrics.risk.volatility.toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>VaR (99%)</TableCell>
                    <TableCell align="right">{metrics.risk.var_99.toFixed(2)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      {/* Recommendations */}
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          🎯 Strategy Recommendations
        </Typography>
        {report.recommendations.map((recommendation, index) => (
          <Alert 
            key={index} 
            severity={recommendation.includes('good') || recommendation.includes('excellent') ? 'success' : 'info'}
            sx={{ mb: 1 }}
          >
            {recommendation}
          </Alert>
        ))}
      </Paper>

      {/* Portfolio Summary */}
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          💼 Portfolio Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box textAlign="center" p={2}>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                ${portfolio.total_value.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Final Value</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center" p={2}>
              <Typography variant="h5" fontWeight="bold">
                ${portfolio.cash.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Available Cash</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center" p={2}>
              <Typography variant="h5" fontWeight="bold" color={portfolio.realized_pnl >= 0 ? 'success.main' : 'error.main'}>
                ${portfolio.realized_pnl.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Realized P&L</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center" p={2}>
              <Typography variant="h5" fontWeight="bold">
                {portfolio.positions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Open Positions</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Trade History Table */}
      {portfolio.trades && portfolio.trades.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📈 Trade History (Last 10 Trades)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Entry Date</TableCell>
                  <TableCell>Exit Date</TableCell>
                  <TableCell align="right">Entry Price</TableCell>
                  <TableCell align="right">Exit Price</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">P&L %</TableCell>
                  <TableCell>Exit Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portfolio.trades.slice(-10).map((trade: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{new Date(trade.entry_timestamp).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(trade.exit_timestamp).toLocaleDateString()}</TableCell>
                    <TableCell align="right">${trade.entry_price.toFixed(2)}</TableCell>
                    <TableCell align="right">${trade.exit_price.toFixed(2)}</TableCell>
                    <TableCell align="right">{trade.quantity.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={trade.pnl >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        ${trade.pnl.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={trade.pnl_percent >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {trade.pnl_percent.toFixed(2)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trade.exit_reason} 
                        size="small"
                        color={
                          trade.exit_reason === 'take_profit' ? 'success' :
                          trade.exit_reason === 'stop_loss' ? 'error' :
                          'default'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {portfolio.trades.length > 10 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing last 10 trades of {portfolio.trades.length} total trades
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default PerformanceDashboard;