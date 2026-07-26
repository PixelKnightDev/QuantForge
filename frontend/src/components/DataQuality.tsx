
import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Assessment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  TrendingUp,
  TrendingDown,
  DataUsage
} from '@mui/icons-material';

interface DataQualityProps {
  availableSymbols: string[];
}

// ✅ FIXED: New interface matching the simple API response
interface SimpleQualityReport {
  symbol: string;
  status: string;
  timestamp: string;
  error?: string; // ✅ ADDED: Optional error field for error responses
  quality: {
    score: number;
    completeness: number;
    missing_data: number;
    total_points: number;
    duplicate_rows: number;
  };
  price: {
    mean: number;
    std: number;
    min: number;
    max: number;
    latest: number;
    volatility: number;
  };
  volume: {
    mean: number;
    std: number;
    zero_days: number;
    zero_percentage: number;
  };
  returns: {
    total: number;
    best_day: number;
    worst_day: number;
    max_drawdown: number;
  };
  period: {
    start_date: string;
    end_date: string;
    trading_days: number;
  };
  assessment: string;
  recommendations: string[];
}

const DataQuality: React.FC<DataQualityProps> = ({ availableSymbols }) => {
  const DEFAULT_SYMBOLS = [
    'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META',
    'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD'
  ];
  
  const symbolsToUse = availableSymbols.length > 0 ? availableSymbols : DEFAULT_SYMBOLS;

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedSource, setSelectedSource] = useState('yahoo_finance');
  const [report, setReport] = useState<SimpleQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only Yahoo Finance is actually implemented on the backend today.
  // (Binance/Coinbase were previously listed here but silently returned
  // relabeled Yahoo Finance data - removed rather than left misleading.)
  const DATA_SOURCES = [
    { value: 'yahoo_finance', label: 'Yahoo Finance' },
    { value: 'csv_upload', label: 'CSV Upload' }
  ];

  const handleError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err) || 'An unknown error occurred';
  };

  const parseErrorResponse = async (response: Response): Promise<string> => {
    try {
      const data = await response.json();
      return data?.detail || data?.message || `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  };

  const analyzeDataQuality = async () => {
    if (!selectedSymbol) {
      setError('Please select a symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ FIXED: Use the simple quality endpoint
      const response = await fetch(
        `http://localhost:8000/api/quality-simple/${selectedSymbol}`
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const qualityReport: SimpleQualityReport = await response.json();
      
      // ✅ FIXED: More robust error checking
      if (qualityReport.status === 'error') {
        const errorMessage = qualityReport.error || 
                           (qualityReport as any).message || 
                           'Quality analysis failed';
        throw new Error(errorMessage);
      }
      
      setReport(qualityReport);

    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Helper functions with safe number handling
  const getScoreColor = (score: number) => {
    const safeScore = Number(score) || 0;
    if (safeScore >= 90) return '#4caf50';
    if (safeScore >= 70) return '#ff9800';
    return '#f44336';
  };

  const getScoreIcon = (score: number) => {
    const safeScore = Number(score) || 0;
    if (safeScore >= 90) return <CheckCircle style={{ color: '#4caf50' }} />;
    if (safeScore >= 70) return <Warning style={{ color: '#ff9800' }} />;
    return <ErrorIcon style={{ color: '#f44336' }} />;
  };

  const getScoreLabel = (score: number) => {
    const safeScore = Number(score) || 0;
    if (safeScore >= 95) return 'Excellent';
    if (safeScore >= 85) return 'Very Good';
    if (safeScore >= 70) return 'Good';
    if (safeScore >= 50) return 'Fair';
    return 'Poor';
  };

  // ✅ FIXED: Safe formatting functions
  const formatPercentage = (value: number) => `${(Number(value) || 0).toFixed(1)}%`;
  const formatPrice = (value: number) => `$${(Number(value) || 0).toFixed(2)}`;
  const formatNumber = (value: number) => (Number(value) || 0).toLocaleString();

  const getIssueColor = (value: number, threshold: number, reverse = false) => {
    const safeValue = Number(value) || 0;
    const isIssue = reverse ? safeValue < threshold : safeValue > threshold;
    return isIssue ? '#f44336' : '#4caf50';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString || 'Unknown';
    }
  };

  return (
    <Card sx={{ border: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2, pb: 2, borderBottom: '2px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={700}>
            🔍 Data Quality Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Comprehensive analysis of data completeness, accuracy, consistency, and timeliness
          </Typography>
        </Box>

      {/* Controls */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        gap: 2, 
        mb: 3 
      }}>
        <FormControl fullWidth>
          <InputLabel>Symbol</InputLabel>
          <Select
            value={selectedSymbol}
            label="Symbol"
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            {symbolsToUse.map((symbol) => (
              <MenuItem key={symbol} value={symbol}>
                {symbol}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Data Source</InputLabel>
          <Select
            value={selectedSource}
            label="Data Source"
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            {DATA_SOURCES.map((source) => (
              <MenuItem key={source.value} value={source.value}>
                {source.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Action Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
          onClick={analyzeDataQuality}
          disabled={loading || !selectedSymbol}
          size="large"
        >
          {loading ? 'Analyzing...' : 'Analyze Data Quality'}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Symbol Info */}
      {symbolsToUse.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          📊 Available symbols: {symbolsToUse.length} ({symbolsToUse.slice(0, 5).join(', ')}
          {symbolsToUse.length > 5 && `, +${symbolsToUse.length - 5} more`})
        </Alert>
      )}

      {/* Quality Report */}
      {report && (
        <>
          {/* Overall Score */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  📊 Overall Quality Score
                </Typography>
                <Chip
                  icon={getScoreIcon(report.quality.score)}
                  label={getScoreLabel(report.quality.score)}
                  sx={{ 
                    backgroundColor: report.quality.score >= 90 ? '#e8f5e8' :
                                   report.quality.score >= 70 ? '#fff8e1' : '#ffebee',
                    color: report.quality.score >= 90 ? '#2e7d32' :
                           report.quality.score >= 70 ? '#ef6c00' : '#c62828'
                  }}
                />
              </Box>

              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {/* ✅ FIXED: Safe toFixed usage */}
                    {formatPercentage(report.quality.score)}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Number(report.quality.score) || 0}
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: '#f5f5f5',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getScoreColor(report.quality.score)
                      }
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Dataset: {report.symbol} • Last Updated: {formatDate(report.timestamp)}
              </Typography>
            </CardContent>
          </Card>

          {/* Quality Dimensions */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 3,
            mb: 3,
            '@media (min-width: 600px)': {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)'
            },
            '@media (min-width: 900px)': {
              gridTemplateColumns: 'repeat(4, 1fr)'
            }
          }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  📋 Completeness
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getScoreIcon(report.quality.completeness)}
                  <Typography variant="h6">
                    {/* ✅ FIXED: Safe formatting */}
                    {formatPercentage(report.quality.completeness)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Number(report.quality.completeness) || 0}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(report.quality.completeness)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(report.quality.total_points)} records
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  💰 Price Analysis
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUp style={{ color: '#4caf50' }} />
                  <Typography variant="h6">
                    {formatPrice(report.price.latest)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={85} // Static for display
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4caf50'
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Volatility: {formatPercentage(report.price.volatility)}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Volume Analysis
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <DataUsage style={{ color: getIssueColor(report.volume.zero_percentage, 10) }} />
                  <Typography variant="h6">
                    {formatNumber(report.volume.mean)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.max(0, 100 - Number(report.volume.zero_percentage))}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getIssueColor(report.volume.zero_percentage, 10)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {report.volume.zero_days} zero volume days
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  📈 Performance
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {Number(report.returns.total) >= 0 ? 
                    <TrendingUp style={{ color: '#4caf50' }} /> : 
                    <TrendingDown style={{ color: '#f44336' }} />
                  }
                  <Typography variant="h6">
                    {formatPercentage(report.returns.total)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, Math.abs(Number(report.returns.total)))}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: Number(report.returns.total) >= 0 ? '#4caf50' : '#f44336'
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Max Drawdown: {formatPercentage(report.returns.max_drawdown)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Detailed Analysis */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Detailed Analysis
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 3,
                '@media (min-width: 768px)': {
                  flexDirection: 'row'
                }
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Quality Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Warning style={{ color: getIssueColor(report.quality.missing_data, 5) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Missing Data: ${formatPercentage(report.quality.missing_data)}`}
                        secondary={`${report.quality.missing_data.toFixed(1)}% of expected data points`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon style={{ color: getIssueColor(report.quality.duplicate_rows, 0) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Duplicate Records: ${report.quality.duplicate_rows}`}
                        secondary="Identical timestamps with different data"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle style={{ color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Trading Days: ${report.period.trading_days}`}
                        secondary={`From ${formatDate(report.period.start_date)} to ${formatDate(report.period.end_date)}`}
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Price & Return Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp style={{ color: Number(report.returns.best_day) >= 0 ? '#4caf50' : '#f44336' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Best Day: ${formatPercentage(report.returns.best_day)}`}
                        secondary="Largest single-day gain"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown style={{ color: Number(report.returns.worst_day) <= 0 ? '#f44336' : '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Worst Day: ${formatPercentage(report.returns.worst_day)}`}
                        secondary="Largest single-day loss"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Info style={{ color: '#1976d2' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Price Range: ${formatPrice(report.price.min)} - ${formatPrice(report.price.max)}`}
                        secondary={`Average: ${formatPrice(report.price.mean)}`}
                      />
                    </ListItem>
                  </List>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Assessment & Recommendations */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💡 Assessment: {report.assessment.charAt(0).toUpperCase() + report.assessment.slice(1)}
              </Typography>
              
              {report.recommendations.length > 0 && (
                <List>
                  {report.recommendations.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Info style={{ color: '#1976d2' }} />
                      </ListItemIcon>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Data Quality Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a symbol to generate a comprehensive quality report
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Analysis includes completeness, price analysis, volume patterns, and performance metrics
            </Typography>
          </CardContent>
        </Card>
      )}
      </CardContent>
    </Card>
  );
};

export default DataQuality;