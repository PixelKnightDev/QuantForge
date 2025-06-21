// src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Brightness4,
  Brightness7
} from '@mui/icons-material';

// Import our components
import ConnectionStatus from './components/ConnectionStatus';
import MarketData from './components/MarketData';

// Import API service
import { apiService } from './services/apiService';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      }
    }
  });

  // Test API connection
  const testConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiService.testConnection();
      setApiConnected(true);
      console.log('✅ API Connected successfully');
    } catch (error) {
      setApiConnected(false);
      setError(error instanceof Error ? error.message : 'Connection failed');
      console.error('❌ API Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test connection when app loads
  useEffect(() => {
    testConnection();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Backtesting Platform - React Frontend
          </Typography>
          
          <Tooltip title="Toggle dark mode">
            <IconButton onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        
        {/* Global Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Connection Status */}
        <ConnectionStatus 
          connected={apiConnected}
          loading={loading}
          onRefresh={testConnection}
        />

        {/* Market Data */}
        <MarketData connected={apiConnected} />

        {/* Footer */}
        <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            🎉 React Frontend - Phase 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✅ React + TypeScript • ✅ Material-UI • ✅ API Integration • ✅ Charts
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;