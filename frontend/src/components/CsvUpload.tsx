// frontend/src/components/CsvUpload.tsx
import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  FileUpload,
  Assessment
} from '@mui/icons-material';

interface CsvUploadProps {
  onUploadComplete: (result: UploadResult) => void;
}

interface ValidationResult {
  valid: boolean;
  file_size_bytes: number;
  detected_columns: string[];
  required_columns: string[];
  missing_columns: string[];
  sample_rows: number;
  delimiter: string;
  recommendations: string[];
}

interface UploadResult {
  dataset_id: string;
  symbol: string;
  total_records: number;
  quality_score: number;
  file_size_bytes: number;
}

const CsvUpload: React.FC<CsvUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1d');
  const [delimiter, setDelimiter] = useState(',');
  const [skipRows, setSkipRows] = useState(0);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const INTERVALS = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' }
  ];

  const DELIMITERS = [
    { value: ',', label: 'Comma (,)' },
    { value: ';', label: 'Semicolon (;)' },
    { value: '\t', label: 'Tab' },
    { value: '|', label: 'Pipe (|)' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidation(null);
      setUploadResult(null);
      setError(null);
    }
  };

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

  const validateFile = async () => {
    if (!selectedFile || !symbol) {
      setError('Please select a file and enter a symbol');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('symbol', symbol.toUpperCase());
      formData.append('delimiter', delimiter);

      const response = await fetch('http://localhost:8000/api/enhanced-data/validate-csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const validationResult: ValidationResult = await response.json();
      setValidation(validationResult);
      setShowValidationDialog(true);

    } catch (err) {
      setError(handleError(err));
    } finally {
      setValidating(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !symbol) {
      setError('Please select a file and enter a symbol');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('symbol', symbol.toUpperCase());
      formData.append('interval', interval);
      formData.append('delimiter', delimiter);
      formData.append('skip_rows', skipRows.toString());
      formData.append('overwrite_existing', overwriteExisting.toString());

      const response = await fetch('http://localhost:8000/api/enhanced-data/upload-csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage);
      }

      const result: UploadResult = await response.json();
      setUploadResult(result);
      onUploadComplete(result);

    } catch (err) {
      setError(handleError(err));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderValidationIcon = () => {
    if (!validation) return null;
    return validation.valid ? 
      <CheckCircle color="success" /> : 
      <ErrorIcon color="error" />;
  };

  const renderValidationChipIcon = () => {
    if (!validation) return undefined;
    return validation.valid ? 
      <CheckCircle /> : 
      <ErrorIcon />;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        📁 CSV Data Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your own market data in CSV format. Supported columns: Date, Open, High, Low, Close, Volume
      </Typography>

      {/* File Selection */}
      <Box sx={{ mb: 3 }}>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="csv-file-input"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="csv-file-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={<FileUpload />}
            size="large"
            fullWidth
            sx={{ mb: 2 }}
          >
            {selectedFile ? selectedFile.name : 'Select CSV File'}
          </Button>
        </label>

        {selectedFile && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                📄 File Information
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  File Name: {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Size: {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Configuration */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        mb: 3,
        '@media (min-width: 600px)': {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)'
        }
      }}>
        <TextField
          label="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          fullWidth
          required
          placeholder="e.g., AAPL, MSFT"
          helperText="Trading symbol for the data"
        />

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

        <FormControl fullWidth>
          <InputLabel>Delimiter</InputLabel>
          <Select
            value={delimiter}
            label="Delimiter"
            onChange={(e) => setDelimiter(e.target.value)}
          >
            {DELIMITERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Skip Rows"
          type="number"
          value={skipRows}
          onChange={(e) => setSkipRows(parseInt(e.target.value) || 0)}
          fullWidth
          helperText="Number of header rows to skip"
        />
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<Assessment />}
          onClick={validateFile}
          disabled={!selectedFile || !symbol || validating || uploading}
        >
          {validating ? 'Validating...' : 'Validate'}
        </Button>

        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={uploadFile}
          disabled={!selectedFile || !symbol || uploading || validating}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </Box>

      {/* Progress */}
      {(uploading || validating) && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {uploading ? 'Uploading and processing file...' : 'Validating file format...'}
          </Typography>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ✅ Upload Successful!
          </Typography>
          <Typography variant="body2">
            Dataset ID: {uploadResult.dataset_id}<br />
            Symbol: {uploadResult.symbol}<br />
            Records: {uploadResult.total_records}<br />
            Quality Score: {(uploadResult.quality_score * 100).toFixed(1)}%<br />
            File Size: {formatFileSize(uploadResult.file_size_bytes)}
          </Typography>
        </Alert>
      )}

      {/* Validation Results Dialog */}
      <Dialog 
        open={showValidationDialog} 
        onClose={() => setShowValidationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {renderValidationIcon()}
            <Typography variant="h6">
              Validation Results
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {validation && (
            <>
              {/* Validation Status */}
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={validation.valid ? 'Valid' : 'Invalid'}
                  color={validation.valid ? 'success' : 'error'}
                  icon={renderValidationChipIcon()}
                />
              </Box>

              {/* File Details */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 File Analysis
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
                    <Typography variant="body2">
                      <strong>File Size:</strong> {formatFileSize(validation.file_size_bytes)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sample Rows:</strong> {validation.sample_rows}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Delimiter:</strong> {validation.delimiter}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Columns:</strong> {validation.detected_columns.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Column Analysis */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    📋 Column Analysis
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Detected Columns:</strong>
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {validation.detected_columns.map((col) => (
                      <Chip
                        key={col}
                        label={col}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        color={validation.required_columns.includes(col) ? 'success' : 'default'}
                      />
                    ))}
                  </Box>

                  {validation.missing_columns.length > 0 && (
                    <>
                      <Typography variant="body2" gutterBottom>
                        <strong>Missing Required Columns:</strong>
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {validation.missing_columns.map((col) => (
                          <Chip
                            key={col}
                            label={col}
                            size="small"
                            color="error"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recommendations */}
              {validation.recommendations.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      💡 Recommendations
                    </Typography>
                    <List dense>
                      {validation.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowValidationDialog(false)}>
            Close
          </Button>
          {validation?.valid && (
            <Button variant="contained" onClick={() => {
              setShowValidationDialog(false);
              uploadFile();
            }}>
              Proceed with Upload
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Help Section */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            📚 CSV Format Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your CSV file should contain the following columns:<br />
            • <strong>Date</strong> - Date in YYYY-MM-DD format<br />
            • <strong>Open</strong> - Opening price<br />
            • <strong>High</strong> - Highest price<br />
            • <strong>Low</strong> - Lowest price<br />
            • <strong>Close</strong> - Closing price<br />
            • <strong>Volume</strong> - Trading volume<br /><br />
            Maximum file size: 50MB
          </Typography>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default CsvUpload;