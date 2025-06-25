// src/App.tsx - Updated for Phase 3 + WebSocket Real-time Features
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
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Badge,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  Brightness4,
  Brightness7,
  CloudUpload,
  Download,
  Assessment,
  ShowChart,
  Psychology as PsychologyIcon,
  AutoGraph as AutoGraphIcon,
  Speed as SpeedIcon,
  Wifi,
  WifiOff
} from '@mui/icons-material';

// Import existing components
import ConnectionStatus from './components/ConnectionStatus';
import MarketData from './components/MarketData';
import CsvUpload from './components/CsvUpload';
import BulkDownload from './components/BulkDownload';
import DataQuality from './components/DataQuality';

// Import Visual Strategy Builder
import VisualStrategyBuilder from './components/VisualStrategyBuilder';

// Import NEW Real-time components
import EnhancedPerformanceDashboard from './components/EnhancedPerformanceDashboard';
import RealtimeDashboard from './components/RealtimeDashboard';

// Import API service
import { apiService } from './services/apiService';
// Import WebSocket service
import { websocketService } from './services/websocketService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(5); // Default to Strategy Builder
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  
  // Real-time strategy state
  const [backtestResults, setBacktestResults] = useState(null);
  const [currentStrategyId, setCurrentStrategyId] = useState<string>('');
  const [activeStrategiesCount, setActiveStrategiesCount] = useState(0);

  // Create theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      }
    },
    typography: {
      h4: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 500,
      },
    }
  });

// Updated WebSocket connection management for App.tsx
useEffect(() => {
  const initializeWebSocket = async () => {
    try {
      console.log('🔄 Initializing WebSocket connection...');
      await websocketService.connect();
      console.log('🔴 WebSocket connected successfully from App.tsx');
      
      // CLEAR PHANTOM SUBSCRIPTIONS
      console.log('🧹 Clearing any phantom subscriptions...');
      websocketService.clearAllSubscriptions();
      setActiveStrategiesCount(0);
      
      setWsConnected(true);
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setWsConnected(false);
    }
  };

  const handleConnectionStatus = (connected: boolean) => {
    setWsConnected(connected);
    console.log('📡 WebSocket status changed:', connected ? 'Connected' : 'Disconnected');
    
    if (connected) {
      console.log('✅ WebSocket is now connected and ready for real-time features');
      // Clear subscriptions on successful connection
      websocketService.clearAllSubscriptions();
      setActiveStrategiesCount(0);
    } else {
      console.log('⚠️ WebSocket disconnected - real-time features unavailable');
      setActiveStrategiesCount(0);
    }
  };

  // Set up WebSocket connection status handler
  websocketService.onConnectionStatusChange(handleConnectionStatus);
  
  // Check if already connected, if not, try to connect
  const isAlreadyConnected = websocketService.isWebSocketConnected();
  setWsConnected(isAlreadyConnected);
  
  if (isAlreadyConnected) {
    console.log('📡 WebSocket already connected');
    // Clear phantom subscriptions even if already connected
    websocketService.clearAllSubscriptions();
    setActiveStrategiesCount(0);
  } else {
    // Connect after API is ready (with small delay to ensure backend is fully loaded)
    if (apiConnected) {
      console.log('🚀 API connected, initializing WebSocket...');
      setTimeout(() => {
        initializeWebSocket();
      }, 500); // Small delay to ensure backend is ready
    }
  }

  // Monitor active strategies count (with better error handling)
  const updateActiveStrategies = () => {
    try {
      const subscribed = websocketService.getSubscribedStrategies();
      const count = subscribed.length;
      setActiveStrategiesCount(count);
      
      if (count > 0) {
        console.log(`📊 Active strategies being monitored: ${count}`, subscribed);
      }
    } catch (error) {
      console.error('❌ Error updating active strategies count:', error);
      setActiveStrategiesCount(0);
    }
  };

  // Update active strategies count periodically (less frequently)
  const interval = setInterval(updateActiveStrategies, 10000); // Every 10 seconds instead of 5

  // Initial update
  updateActiveStrategies();

  return () => {
    clearInterval(interval);
    console.log('🧹 Cleaning up WebSocket connection management');
    // Note: We don't disconnect here as other components might still need it
  };
}, [apiConnected]); // IMPORTANT: Add apiConnected as dependency

  // Test API connection
  const testConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiService.testConnection();
      setApiConnected(true);
      
      // Extended symbol list for comprehensive testing
      const EXTENDED_SYMBOLS = [
        // Major Stocks
        'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA',
        'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA', 'DIS',
        
        // Major Cryptocurrencies
        'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD', 
        'XRP-USD', 'DOT-USD', 'AVAX-USD', 'MATIC-USD', 'LTC-USD',
        'LINK-USD', 'UNI-USD'
      ];
      
      setAvailableSymbols(EXTENDED_SYMBOLS);
      console.log('📊 Extended symbols loaded:', EXTENDED_SYMBOLS.length, 'symbols');
      console.log('🔍 Symbols:', EXTENDED_SYMBOLS);
      
      console.log('✅ API Connected successfully');
    } catch (error) {
      setApiConnected(false);
      setError(error instanceof Error ? error.message : 'Connection failed');
      console.error('❌ API Connection failed:', error);
      
      // Set fallback symbols even on connection failure
      const FALLBACK_SYMBOLS = [
        'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META',
        'BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD'
      ];
      setAvailableSymbols(FALLBACK_SYMBOLS);
      console.log('🔄 Using fallback symbols:', FALLBACK_SYMBOLS);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result);
    // Refresh symbols list
    if (result.symbol && !availableSymbols.includes(result.symbol)) {
      setAvailableSymbols(prev => [...prev, result.symbol]);
    }
  };

  const handleDownloadComplete = (result: any) => {
    console.log('Download completed:', result);
    // You could show a success notification here
  };

  // Handle backtest completion from VisualStrategyBuilder
  const handleBacktestComplete = (results: any) => {
    console.log('🎯 Backtest completed:', results);
    setBacktestResults(results);
    setCurrentTab(6); // Switch to Performance Dashboard
  };

  // Handle real-time strategy start
  const handleRealtimeStrategyStart = (strategyId: string) => {
    console.log('🚀 Real-time strategy started:', strategyId);
    setCurrentStrategyId(strategyId);
    setCurrentTab(6); // Switch to Real-time Dashboard
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Backtesting Platform - Real-time Edition
          </Typography>
          
          {/* Connection Status Indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
            {/* API Status */}
            <Tooltip title={`API: ${apiConnected ? 'Connected' : 'Disconnected'}`}>
              <Chip
                icon={<ShowChart />}
                label="API"
                color={apiConnected ? 'success' : 'error'}
                size="small"
                variant="outlined"
              />
            </Tooltip>
            
            {/* WebSocket Status */}
            <Tooltip title={`WebSocket: ${wsConnected ? 'Connected' : 'Disconnected'}`}>
              <Badge badgeContent={activeStrategiesCount} color="secondary">
                <Chip
                  icon={wsConnected ? <Wifi /> : <WifiOff />}
                  label="Live"
                  color={wsConnected ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Badge>
            </Tooltip>
          </Box>
          
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Visual Builder + Real-time Updates
          </Typography>
          
          <Tooltip title="Toggle dark mode">
            <IconButton onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {/* Global Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            API Connection Error: {error}
          </Alert>
        )}

        {/* Connection Status */}
        <ConnectionStatus 
          connected={apiConnected}
          loading={loading}
          onRefresh={testConnection}
        />

        {/* Real-time Features Announcement */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            background: wsConnected 
              ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Typography variant="h5" gutterBottom align="center">
            {wsConnected ? '🔴 Real-time Trading Platform' : '🚀 Advanced Backtesting Platform'}
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            {wsConnected 
              ? 'Live WebSocket connection active • Real-time strategy monitoring • Live performance updates'
              : 'Visual Strategy Builder • Technical Indicators • Comprehensive Backtesting • Performance Analytics'
            }
          </Typography>
          <Box display="flex" justifyContent="center" gap={3}>
            <Box display="flex" alignItems="center">
              <PsychologyIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Visual Builder</Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <AutoGraphIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Live Backtesting</Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Assessment sx={{ mr: 1 }} />
              <Typography variant="body2">Performance Analytics</Typography>
            </Box>
            {wsConnected && (
              <Box display="flex" alignItems="center">
                <SpeedIcon sx={{ mr: 1 }} />
                <Typography variant="body2">Real-time Updates</Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab 
              icon={<ShowChart />} 
              label="Market Data" 
              id="tab-0"
              aria-controls="tabpanel-0"
            />
            <Tab 
              icon={<CloudUpload />} 
              label="CSV Upload" 
              id="tab-1"
              aria-controls="tabpanel-1"
            />
            <Tab 
              icon={<Download />} 
              label="Bulk Download" 
              id="tab-2"
              aria-controls="tabpanel-2"
            />
            <Tab 
              icon={<Assessment />} 
              label="Data Quality" 
              id="tab-3"
              aria-controls="tabpanel-3"
            />
            <Tab 
              icon={<PsychologyIcon />} 
              label="Strategy Builder" 
              id="tab-4"
              aria-controls="tabpanel-4"
            />
            <Tab 
              icon={<AutoGraphIcon />} 
              label="Performance" 
              id="tab-5"
              aria-controls="tabpanel-5"
            />
            <Tab 
              icon={
                <Badge badgeContent={wsConnected ? activeStrategiesCount : 0} color="error">
                  <SpeedIcon />
                </Badge>
              } 
              label="Real-time" 
              id="tab-6"
              aria-controls="tabpanel-6"
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          <MarketData connected={apiConnected} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {apiConnected ? (
            <CsvUpload onUploadComplete={handleUploadComplete} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                Please connect to the API to use CSV upload functionality
              </Alert>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {apiConnected ? (
            <BulkDownload onDownloadComplete={handleDownloadComplete} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                Please connect to the API to use bulk download functionality
              </Alert>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {apiConnected ? (
            <DataQuality availableSymbols={availableSymbols} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                Please connect to the API to use data quality analysis
              </Alert>
            </Paper>
          )}
        </TabPanel>

        {/* Visual Strategy Builder Tab */}
        <TabPanel value={currentTab} index={4}>
          {apiConnected ? (
            <VisualStrategyBuilder 
              availableSymbols={availableSymbols}
              onBacktestComplete={handleBacktestComplete}
              onRealtimeStrategyStart={handleRealtimeStrategyStart}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                Please connect to the API to use visual strategy builder
              </Alert>
            </Paper>
          )}
        </TabPanel>

        {/* Enhanced Performance Dashboard Tab */}
        <TabPanel value={currentTab} index={5}>
          {backtestResults ? (
            <EnhancedPerformanceDashboard 
              results={backtestResults}
              strategyId={currentStrategyId}
              enableRealTime={wsConnected && !!currentStrategyId}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>No Performance Data</Typography>
                <Typography>
                  Run a backtest from the Strategy Builder to see comprehensive performance analytics here.
                </Typography>
              </Alert>
            </Paper>
          )}
        </TabPanel>

        {/* Real-time Dashboard Tab */}
        <TabPanel value={currentTab} index={6}>
          {wsConnected ? (
            <RealtimeDashboard />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                <Typography variant="h6" gutterBottom>WebSocket Connection Required</Typography>
                <Typography>
                  Real-time monitoring requires an active WebSocket connection. 
                  {apiConnected 
                    ? ' The WebSocket service appears to be offline.' 
                    : ' Please ensure the API is connected and WebSocket service is running.'
                  }
                </Typography>
              </Alert>
            </Paper>
          )}
        </TabPanel>

        {/* Symbol Info */}
        {availableSymbols.length > 0 && (
          <Alert severity="success" sx={{ mb: 3 }}>
            📊 Loaded {availableSymbols.length} symbols for analysis: {availableSymbols.slice(0, 8).join(', ')}
            {availableSymbols.length > 8 && `, +${availableSymbols.length - 8} more`}
            {wsConnected && (
              <> • 🔴 Real-time monitoring available</>
            )}
          </Alert>
        )}

        {/* Enhanced Phase Progress */}
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            🎯 Platform Capabilities
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                ✅ Data Foundation Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • FastAPI backend with comprehensive endpoints<br />
                • Market data loading & CSV operations<br />
                • Data quality analysis & validation<br />
                • Bulk download & upload operations
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                ✅ Visual Strategy Builder Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Drag & drop visual interface<br />
                • 15+ technical indicators (RSI, MACD, SMA, etc.)<br />
                • Complete backtesting engine<br />
                • Strategy templates & examples
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color={wsConnected ? "success.main" : "warning.main"} gutterBottom>
                {wsConnected ? '✅' : '⚡'} Real-time Features {wsConnected ? 'Active' : 'Available'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • WebSocket real-time updates<br />
                • Live strategy monitoring<br />
                • Real-time performance metrics<br />
                • Multi-strategy dashboard
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {wsConnected 
              ? '🔴 Real-time Trading Platform Ready!' 
              : '🎉 Advanced Backtesting Platform Complete!'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ✅ Visual Builder • ✅ Technical Indicators • ✅ Comprehensive Backtesting • ✅ Performance Analytics
            {wsConnected && ' • ✅ Real-time Updates'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Backend: Strategy Engine + WebSocket Server • Frontend: React + TypeScript + Material-UI
            {wsConnected && ' • Live WebSocket Connection Active'}
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;