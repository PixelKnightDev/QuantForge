import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Refresh
} from '@mui/icons-material';

interface ConnectionStatusProps {
  connected: boolean;
  loading: boolean;
  onRefresh: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  loading,
  onRefresh
}) => {
  const getStatusIcon = () => {
    if (loading) return <CircularProgress size={20} />;
    return connected ? <CheckCircle color="success" /> : <Error color="error" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    return connected ? 'Connected' : 'Disconnected';
  };

  const getStatusColor = () => {
    if (loading) return 'warning';
    return connected ? 'success' : 'error';
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={2}>
          {getStatusIcon()}
          <Typography variant="h6">
            API Connection
          </Typography>
          <Chip
            label={getStatusText()}
            color={getStatusColor() as any}
            variant={connected ? "filled" : "outlined"}
          />
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {connected 
          ? '✅ Backend API is running and responding normally'
          : '❌ Cannot reach backend API. Make sure the server is running on port 8000'
        }
      </Typography>

      {!connected && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error.contrastText">
            <strong>To fix this:</strong><br />
            1. Open terminal and go to backend folder<br />
            2. Run: <code>python app/main.py</code><br />
            3. You should see "Uvicorn running on http://0.0.0.0:8000"<br />
            4. Click refresh above
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ConnectionStatus;