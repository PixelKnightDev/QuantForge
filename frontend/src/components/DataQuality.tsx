// frontend/src/components/DataQuality.tsx
import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assessment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  TrendingUp,
  TrendingDown,
  ExpandMore,
  DataUsage
} from '@mui/icons-material';

interface DataQualityProps {
  availableSymbols: string[];
}

interface QualityReport {
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

const DataQuality: React.FC<DataQualityProps> = ({ availableSymbols }) => {
  // FIXED: Add default symbols as fallback
  const DEFAULT_SYMBOLS = [
    'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META',
    'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD'
  ];
  
  // Use availableSymbols if provided and not empty, otherwise use defaults
  const symbolsToUse = availableSymbols.length > 0 ? availableSymbols : DEFAULT_SYMBOLS;

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedSource, setSelectedSource] = useState('yahoo_finance');
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DATA_SOURCES = [
    { value: 'yahoo_finance', label: 'Yahoo Finance' },
    { value: 'binance', label: 'Binance' },
    { value: 'coinbase', label: 'Coinbase Pro' },
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
      // FIXED: Use the correct API endpoint
      const response = await fetch(
        `http://localhost:8000/api/quality-report/${selectedSymbol}?source=${selectedSource}`
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const qualityReport: QualityReport = await response.json();
      setReport(qualityReport);

    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return '#4caf50';
    if (score >= 0.7) return '#ff9800';
    return '#f44336';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.9) return <CheckCircle style={{ color: '#4caf50' }} />;
    if (score >= 0.7) return <Warning style={{ color: '#ff9800' }} />;
    return <ErrorIcon style={{ color: '#f44336' }} />;
  };

  console.log('🔍 DEBUG - Symbols being used:', symbolsToUse);
  console.log('🔍 DEBUG - Available symbols prop:', availableSymbols);

  const getScoreLabel = (score: number) => {
    if (score >= 0.95) return 'Excellent';
    if (score >= 0.85) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Fair';
    return 'Poor';
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getIssueColor = (value: number, threshold: number, reverse = false) => {
    const isIssue = reverse ? value < threshold : value > threshold;
    return isIssue ? '#f44336' : '#4caf50';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // FIXED: Add debug log to see what symbols are available
  console.log('DataQuality symbols:', { availableSymbols, symbolsToUse });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🔍 Data Quality Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive analysis of data completeness, accuracy, consistency, and timeliness
      </Typography>

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
            {/* FIXED: Use symbolsToUse instead of availableSymbols */}
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
                  icon={getScoreIcon(report.overall_quality_score)}
                  label={getScoreLabel(report.overall_quality_score)}
                  sx={{ 
                    backgroundColor: report.overall_quality_score >= 0.9 ? '#e8f5e8' :
                                   report.overall_quality_score >= 0.7 ? '#fff8e1' : '#ffebee',
                    color: report.overall_quality_score >= 0.9 ? '#2e7d32' :
                           report.overall_quality_score >= 0.7 ? '#ef6c00' : '#c62828'
                  }}
                />
              </Box>

              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatPercentage(report.overall_quality_score)}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={report.overall_quality_score * 100}
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: '#f5f5f5',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getScoreColor(report.overall_quality_score)
                      }
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Dataset: {report.dataset_id} • Last Updated: {formatDate(report.last_update)}
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
                  {getScoreIcon(report.completeness_score)}
                  <Typography variant="h6">
                    {formatPercentage(report.completeness_score)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={report.completeness_score * 100}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(report.completeness_score)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {report.total_actual_points} / {report.total_expected_points} records
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  🎯 Accuracy
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getScoreIcon(report.accuracy_score)}
                  <Typography variant="h6">
                    {formatPercentage(report.accuracy_score)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={report.accuracy_score * 100}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(report.accuracy_score)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {report.outlier_count} outliers detected
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  🔄 Consistency
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getScoreIcon(report.consistency_score)}
                  <Typography variant="h6">
                    {formatPercentage(report.consistency_score)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={report.consistency_score * 100}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(report.consistency_score)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {report.duplicate_records} duplicates
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  ⏰ Timeliness
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getScoreIcon(report.timeliness_score)}
                  <Typography variant="h6">
                    {formatPercentage(report.timeliness_score)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={report.timeliness_score * 100}
                  sx={{ 
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(report.timeliness_score)
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {report.data_lag_hours.toFixed(1)}h lag
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
                    Data Issues
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Warning style={{ color: getIssueColor(report.missing_data_percentage, 5) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Missing Data: ${report.missing_data_percentage.toFixed(1)}%`}
                        secondary={`${Math.max(0, report.total_expected_points - report.total_actual_points)} missing records`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp style={{ color: getIssueColor(report.price_anomalies, 5) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Price Anomalies: ${report.price_anomalies}`}
                        secondary="Unusual price movements detected"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <DataUsage style={{ color: getIssueColor(report.volume_anomalies, 3) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Volume Anomalies: ${report.volume_anomalies}`}
                        secondary="Unusual volume patterns detected"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon style={{ color: getIssueColor(report.invalid_ohlc_sequences, 0) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Invalid OHLC: ${report.invalid_ohlc_sequences}`}
                        secondary="Records where High < Low or similar issues"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Integrity
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Info style={{ color: getIssueColor(report.timestamp_gaps, 10) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Timestamp Gaps: ${report.timestamp_gaps}`}
                        secondary="Missing time periods in the dataset"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Warning style={{ color: getIssueColor(report.duplicate_records, 0) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Duplicate Records: ${report.duplicate_records}`}
                        secondary="Identical timestamps with different data"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown style={{ color: getIssueColor(report.outlier_count, 20) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Statistical Outliers: ${report.outlier_count}`}
                        secondary="Data points that deviate significantly"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle style={{ color: getIssueColor(report.update_frequency_score, 0.8, true) }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Update Frequency: ${formatPercentage(report.update_frequency_score)}`}
                        secondary="Consistency of data updates"
                      />
                    </ListItem>
                  </List>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  💡 Recommendations ({report.recommendations.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
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
              </AccordionDetails>
            </Accordion>
          )}
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
              Select a symbol and data source to generate a comprehensive quality report
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Analysis includes completeness, accuracy, consistency, and timeliness metrics
            </Typography>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
};

export default DataQuality;