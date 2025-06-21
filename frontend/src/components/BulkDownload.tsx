// frontend/src/components/BulkDownload.tsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Download,
  Add,
  Delete,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Info
} from '@mui/icons-material';

interface BulkDownloadProps {
  onDownloadComplete: (results: JobStatus) => void;
}

interface JobStatus {
  job_id: string;
  job_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  progress_percentage: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_messages: string[];
}

interface DataSource {
  id: string;
  name: string;
  description: string;
  supported_intervals: string[];
  requires_api_key: boolean;
  max_historical_days: number;
}

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const BulkDownload: React.FC<BulkDownloadProps> = ({ onDownloadComplete }) => {
  const [symbols, setSymbols] = useState<string[]>(['AAPL']);
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedSource, setSelectedSource] = useState('yahoo_finance');
  const [period, setPeriod] = useState('1y');
  const [interval, setInterval] = useState('1d');
  const [parallelDownloads, setParallelDownloads] = useState(5);
  
  const [activeJobs, setActiveJobs] = useState<JobStatus[]>([]);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  
  const [showJobDetails, setShowJobDetails] = useState(false);

  const PERIODS = [
    { value: '1d', label: '1 Day' },
    { value: '5d', label: '5 Days' },
    { value: '1mo', label: '1 Month' },
    { value: '3mo', label: '3 Months' },
    { value: '6mo', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: '2y', label: '2 Years' },
    { value: '5y', label: '5 Years' }
  ];

  const INTERVALS = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1wk', label: '1 Week' }
  ];

  // Error handling helper
  const handleError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err) || 'An unknown error occurred';
  };

  // API error response parser
  const parseErrorResponse = async (response: Response): Promise<string> => {
    try {
      const data = await response.json();
      return data?.detail || data?.message || `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  };

  // Load data sources on mount
  useEffect(() => {
    loadDataSources();
  }, []);

  // Poll job status when downloading
  useEffect(() => {
    let intervalId: number;
    
    if (currentJob && currentJob.status === 'running') {
      intervalId = window.setInterval(() => {
        pollJobStatus(currentJob.job_id);
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentJob]);

  const loadDataSources = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/enhanced-data/data-sources');
      
      if (!response.ok) {
        throw new Error('Failed to load data sources');
      }
      
      const data = await response.json();
      setDataSources(data.sources || []);
    } catch (err) {
      console.error('Failed to load data sources:', handleError(err));
      setError('Failed to load data sources');
    }
  };

  const addSymbol = () => {
    const trimmedSymbol = newSymbol.trim().toUpperCase();
    if (trimmedSymbol && !symbols.includes(trimmedSymbol)) {
      setSymbols([...symbols, trimmedSymbol]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbolToRemove: string) => {
    setSymbols(symbols.filter(symbol => symbol !== symbolToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      addSymbol();
    }
  };

  const startBulkDownload = async () => {
    if (symbols.length === 0) {
      setError('Please add at least one symbol');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const request = {
        symbols,
        source: selectedSource,
        period,
        interval,
        parallel_downloads: parallelDownloads,
        retry_failed: true,
        cache_results: true
      };

      const response = await fetch('http://localhost:8000/api/enhanced-data/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Start polling for job status
      setCurrentJob({
        job_id: result.job_id,
        job_type: 'bulk_download',
        status: 'pending',
        total_items: symbols.length,
        processed_items: 0,
        failed_items: 0,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        error_messages: []
      });

    } catch (err) {
      setError(handleError(err));
      setIsDownloading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/enhanced-data/jobs/${jobId}`);
      
      if (response.ok) {
        const jobStatus: JobStatus = await response.json();
        setCurrentJob(jobStatus);
        
        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          setIsDownloading(false);
          onDownloadComplete(jobStatus);
          
          if (jobStatus.status === 'completed') {
            setActiveJobs(prev => [...prev, jobStatus]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to poll job status:', handleError(err));
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': 
        return <CheckCircle color="success" />;
      case 'failed': 
        return <ErrorIcon color="error" />;
      case 'running': 
        return <Schedule color="primary" />;
      default: 
        return <Schedule color="action" />;
    }
  };

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'info';
      default: return 'default';
    }
  };

  const calculateDuration = (startTime?: string, endTime?: string): string => {
    if (!startTime || !endTime) return '-';
    
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    return `${duration}s`;
  };

  const calculateSuccessRate = (totalItems: number, processedItems: number, failedItems: number): string => {
    if (totalItems === 0) return '0%';
    
    const successfulItems = processedItems - failedItems;
    const rate = (successfulItems / totalItems) * 100;
    return `${rate.toFixed(1)}%`;
  };

  const selectedSourceData = dataSources.find(ds => ds.id === selectedSource);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        📦 Bulk Data Download
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Download market data for multiple symbols simultaneously from various data sources
      </Typography>

      {/* Symbol Management */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            📊 Symbols ({symbols.length})
          </Typography>
          
          {/* Add Symbol */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Add Symbol"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              size="small"
              placeholder="e.g., MSFT, TSLA"
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addSymbol}
              disabled={!newSymbol.trim()}
            >
              Add
            </Button>
          </Box>

          {/* Symbol List */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {symbols.map((symbol) => (
              <Chip
                key={symbol}
                label={symbol}
                onDelete={() => removeSymbol(symbol)}
                deleteIcon={<Delete />}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>

          {symbols.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No symbols added. Add some symbols to start bulk download.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Download Configuration */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        mb: 3,
        '@media (min-width: 600px)': {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)'
        },
        '@media (min-width: 900px)': {
          gridTemplateColumns: 'repeat(4, 1fr)'
        }
      }}>
        <FormControl fullWidth>
          <InputLabel>Data Source</InputLabel>
          <Select
            value={selectedSource}
            label="Data Source"
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            {dataSources.map((source) => (
              <MenuItem key={source.id} value={source.id}>
                {source.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Interval</InputLabel>
          <Select
            value={interval}
            label="Interval"
            onChange={(e) => setInterval(e.target.value)}
          >
            {INTERVALS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Parallel Downloads"
          type="number"
          value={parallelDownloads}
          onChange={(e) => setParallelDownloads(parseInt(e.target.value) || 1)}
          inputProps={{ min: 1, max: 20 }}
          fullWidth
          helperText="1-20 concurrent downloads"
        />
      </Box>

      {/* Data Source Info */}
      {selectedSourceData && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              ℹ️ {selectedSourceData.name} Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedSourceData.description}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1,
              '@media (min-width: 600px)': {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)'
              }
            }}>
              <Typography variant="caption" color="text.secondary">
                Max Historical: {selectedSourceData.max_historical_days} days
              </Typography>
              <Typography variant="caption" color="text.secondary">
                API Key Required: {selectedSourceData.requires_api_key ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={isDownloading ? <Schedule /> : <Download />}
          onClick={startBulkDownload}
          disabled={isDownloading || symbols.length === 0}
          size="large"
        >
          {isDownloading ? 'Downloading...' : `Download ${symbols.length} Symbols`}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadDataSources}
        >
          Refresh Sources
        </Button>
      </Box>

      {/* Current Job Progress */}
      {currentJob && currentJob.status === 'running' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                🚀 Download Progress
              </Typography>
              <Button
                size="small"
                startIcon={<Info />}
                onClick={() => setShowJobDetails(true)}
              >
                Details
              </Button>
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={currentJob.progress_percentage} 
              sx={{ mb: 1 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              {currentJob.processed_items} of {currentJob.total_items} completed 
              ({currentJob.progress_percentage.toFixed(1)}%)
              {currentJob.failed_items > 0 && ` • ${currentJob.failed_items} failed`}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Completed Jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              📋 Recent Downloads
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Symbols</TableCell>
                    <TableCell>Completed</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeJobs.slice(-5).map((job) => (
                    <TableRow key={job.job_id}>
                      <TableCell>
                        <Chip
                          icon={renderStatusIcon(job.status)}
                          label={job.status}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{job.total_items}</TableCell>
                      <TableCell>{job.processed_items}</TableCell>
                      <TableCell>{job.failed_items}</TableCell>
                      <TableCell>
                        {calculateDuration(job.started_at, job.completed_at)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setCurrentJob(job);
                              setShowJobDetails(true);
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Job Details Dialog */}
      <Dialog 
        open={showJobDetails} 
        onClose={() => setShowJobDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Job Details: {currentJob?.job_id}
        </DialogTitle>
        
        <DialogContent>
          {currentJob && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
              '@media (min-width: 600px)': {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)'
              }
            }}>
              <Box>
                <Typography variant="subtitle2">Status</Typography>
                <Chip
                  icon={renderStatusIcon(currentJob.status)}
                  label={currentJob.status}
                  color={getStatusColor(currentJob.status)}
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle2">Progress</Typography>
                <Typography>{currentJob.processed_items} / {currentJob.total_items}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">Success Rate</Typography>
                <Typography>
                  {calculateSuccessRate(currentJob.total_items, currentJob.processed_items, currentJob.failed_items)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">Failed Items</Typography>
                <Typography color={currentJob.failed_items > 0 ? 'error' : 'text.primary'}>
                  {currentJob.failed_items}
                </Typography>
              </Box>

              {currentJob.error_messages.length > 0 && (
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="subtitle2" gutterBottom>Error Messages</Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {currentJob.error_messages.map((errorMsg, index) => (
                      <Alert key={index} severity="error" sx={{ mb: 1 }}>
                        {errorMsg}
                      </Alert>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowJobDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BulkDownload;