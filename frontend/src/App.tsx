
import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
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
  Badge,
  Grid,
  Card,
  CardContent,
  Paper
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
  Speed as SpeedIcon
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
// Import theme
import { getTheme } from './theme';
// Import global styles
import './globals.css';

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
  const theme = getTheme(darkMode);

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

      websocketService.clearAllSubscriptions();
      setActiveStrategiesCount(0);
    } else {
      console.log('⚠️ WebSocket disconnected - real-time features unavailable');
      setActiveStrategiesCount(0);
    }
  };


  websocketService.onConnectionStatusChange(handleConnectionStatus);
  
  const isAlreadyConnected = websocketService.isWebSocketConnected();
  setWsConnected(isAlreadyConnected);
  
  if (isAlreadyConnected) {
    console.log('📡 WebSocket already connected');

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
  const interval = setInterval(updateActiveStrategies, 10000); 

  // Initial update
  updateActiveStrategies();

  return () => {
    clearInterval(interval);
    console.log('🧹 Cleaning up WebSocket connection management');
  
  };
}, [apiConnected]);

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
    setCurrentTab(6); 
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
      <AppBar position="static" elevation={1}>
        <Toolbar sx={{ py: 1, px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
            <TrendingUp sx={{ fontSize: { xs: 24, sm: 28 }, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                QuantForge
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Backtesting Platform
              </Typography>
            </Box>
          </Box>
          
          {/* Connection Status Indicators - Hidden on very small screens */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, mr: 1 }}>
            {/* API Status */}
            <Tooltip title={`API: ${apiConnected ? 'Connected' : 'Disconnected'}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    backgroundColor: apiConnected ? '#10B981' : '#EF4444',
                    animation: apiConnected ? 'pulse 2s ease-in-out infinite' : 'none'
                  }} 
                />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  API
                </Typography>
              </Box>
            </Tooltip>
            
            {/* WebSocket Status */}
            <Tooltip title={`WebSocket: ${wsConnected ? 'Connected' : 'Disconnected'} • Active: ${activeStrategiesCount}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    backgroundColor: wsConnected ? '#10B981' : '#EF4444',
                    animation: wsConnected && activeStrategiesCount > 0 ? 'pulse 1s ease-in-out infinite' : 'none'
                  }} 
                />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  Live{activeStrategiesCount > 0 ? ` (${activeStrategiesCount})` : ''}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          
          <Tooltip title="Toggle dark mode">
            <IconButton onClick={toggleDarkMode} color="inherit" size="small">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2 } }}>
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
        <Card sx={{ mb: 4, border: 'none' }}>
          <CardContent>
            <Box 
              sx={{ 
                background: wsConnected 
                  ? 'linear-gradient(135deg, #00e196ff 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
                color: 'white',
                p: 3,
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {wsConnected ? 'QuantForge' : 'QuantForge'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2.5, opacity: 0.95 }}>
                {wsConnected 
                  ? 'Live WebSocket connection active • Real-time strategy monitoring • Live performance updates'
                  : 'Visual Strategy Builder • Technical Indicators • Comprehensive Backtesting • Performance Analytics'
                }
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={6} sm={3}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <PsychologyIcon sx={{ mb: 1, fontSize: '24px' }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Visual Builder</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <AutoGraphIcon sx={{ mb: 1, fontSize: '24px' }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Live Backtesting</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Assessment sx={{ mb: 1, fontSize: '24px' }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Performance</Typography>
                  </Box>
                </Grid>
                {wsConnected && (
                  <Grid item xs={6} sm={3}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <SpeedIcon sx={{ mb: 1, fontSize: '24px' }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>Real-time</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Card sx={{ mb: 3, border: 'none' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTabs-root': {
                borderBottom: 'none',
              },
              '& .MuiTab-root': {
                minHeight: '56px',
                textTransform: 'none',
                fontWeight: 500,
              },
            }}
          >
            <Tab 
              icon={<ShowChart />} 
              iconPosition="start"
              label="Market Data" 
              id="tab-0"
              aria-controls="tabpanel-0"
            />
            <Tab 
              icon={<CloudUpload />} 
              iconPosition="start"
              label="CSV Upload" 
              id="tab-1"
              aria-controls="tabpanel-1"
            />
            <Tab 
              icon={<Download />} 
              iconPosition="start"
              label="Bulk Download" 
              id="tab-2"
              aria-controls="tabpanel-2"
            />
            <Tab 
              icon={<Assessment />} 
              iconPosition="start"
              label="Data Quality" 
              id="tab-3"
              aria-controls="tabpanel-3"
            />
            <Tab 
              icon={<PsychologyIcon />} 
              iconPosition="start"
              label="Strategy Builder" 
              id="tab-4"
              aria-controls="tabpanel-4"
            />
            <Tab 
              icon={<AutoGraphIcon />} 
              iconPosition="start"
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
              iconPosition="start"
              label="Real-time" 
              id="tab-6"
              aria-controls="tabpanel-6"
            />
          </Tabs>
        </Card>

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
            {wsConnected }
          </Alert>
        )}

         {/* Enhanced Phase Progress */}
         {/* <Card sx={{ mt: 4, border: 'none' }}>
           <CardContent>
             <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2.5 }}>
               🎯 Platform Capabilities
             </Typography>
             <Grid container spacing={2}>
               <Grid item xs={12} sm={6} md={4}>
                 <Box>
                   <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ fontWeight: 600 }}>
                     ✅ Data Foundation Complete
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     • FastAPI backend with comprehensive endpoints<br />
                     • Market data loading & CSV operations<br />
                     • Data quality analysis & validation<br />
                     • Bulk download & upload operations
                   </Typography>
                 </Box>
               </Grid>
               
               <Grid item xs={12} sm={6} md={4}>
                 <Box>
                   <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ fontWeight: 600 }}>
                     ✅ Visual Strategy Builder Complete
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     • Drag & drop visual interface<br />
                     • 15+ technical indicators (RSI, MACD, SMA, etc.)<br />
                     • Complete backtesting engine<br />
                     • Strategy templates & examples
                   </Typography>
                 </Box>
               </Grid>
               
               <Grid item xs={12} sm={6} md={4}>
                 <Box>
                   <Typography variant="subtitle2" color={wsConnected ? "success.main" : "warning.main"} gutterBottom sx={{ fontWeight: 600 }}>
                     {wsConnected ? '✅' : '⚡'} Real-time Features {wsConnected ? 'Active' : 'Available'}
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     • WebSocket real-time updates<br />
                     • Live strategy monitoring<br />
                     • Real-time performance metrics<br />
                     • Multi-strategy dashboard
                   </Typography>
                 </Box>
               </Grid>
             </Grid>
           </CardContent>
         </Card> */}

        {/* Footer */}
        {/* <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
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
        </Box> */}
      </Container>
    </ThemeProvider>
  );
}

export default App;