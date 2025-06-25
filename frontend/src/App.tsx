// src/App.tsx - Updated for Phase 3: Visual Strategy Builder
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
  AutoGraph as AutoGraphIcon
} from '@mui/icons-material';

// Import existing components
import ConnectionStatus from './components/ConnectionStatus';
import MarketData from './components/MarketData';
import CsvUpload from './components/CsvUpload';
import BulkDownload from './components/BulkDownload';
import DataQuality from './components/DataQuality';

// Import NEW Visual Strategy Builder
import VisualStrategyBuilder from './components/VisualStrategyBuilder';

// Import API service
import { apiService } from './services/apiService';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(4); // Default to Strategy Builder
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <TrendingUp sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Backtesting Platform - Phase 3
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Visual Strategy Builder & Analytics
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

        {/* Phase 3 Feature Announcement */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Typography variant="h5" gutterBottom align="center">
            🚀 Phase 3: Visual Strategy Builder
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            New features: Visual Drag & Drop Strategy Builder • Technical Indicators • Real Backtesting • Performance Analytics
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
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

        {/* NEW Visual Strategy Builder Tab */}
        <TabPanel value={currentTab} index={4}>
          {apiConnected ? (
            <VisualStrategyBuilder availableSymbols={availableSymbols} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Alert severity="warning">
                Please connect to the API to use visual strategy builder
              </Alert>
            </Paper>
          )}
        </TabPanel>

        {/* Symbol Info */}
        {availableSymbols.length > 0 && (
          <Alert severity="success" sx={{ mb: 3 }}>
            📊 Loaded {availableSymbols.length} symbols for analysis: {availableSymbols.slice(0, 8).join(', ')}
            {availableSymbols.length > 8 && `, +${availableSymbols.length - 8} more`}
          </Alert>
        )}

        {/* Phase Progress */}
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            🎯 Development Progress
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                ✅ Phase 1-2: Data Foundation Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Backend API with FastAPI<br />
                • Market data loading & CSV upload<br />
                • Data quality analysis<br />
                • Bulk download operations
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="success.main" gutterBottom>
                ✅ Phase 3: Visual Strategy Builder Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Visual drag & drop interface<br />
                • Technical indicators (RSI, SMA, MACD, etc.)<br />
                • Real-time strategy testing<br />
                • Complete backtesting engine
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ⏳ Phase 4: Performance Dashboard (Next)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Interactive performance charts<br />
                • Advanced analytics dashboard<br />
                • Risk metrics visualization<br />
                • Strategy comparison tools
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            🎉 Phase 3: Visual Strategy Builder Complete!
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ✅ Visual Builder • ✅ Technical Indicators • ✅ Real Backtesting • ✅ Strategy Examples
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Backend: Strategy Engine + Technical Indicators • Frontend: React + TypeScript + Drag & Drop UI
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;