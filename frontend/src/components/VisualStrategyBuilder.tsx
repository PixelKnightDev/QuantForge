// src/components/VisualStrategyBuilder.tsx - Fixed with required props
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  Stack,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  DragIndicator as DragIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { apiService } from '../services/apiService';
import PerformanceDashboard from './PerformanceDashboard';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface StrategyCondition {
  indicator: string;
  parameters: Record<string, any>;
  operator: string;
  value: number | string | Record<string, any>;
}

interface StrategyRule {
  name: string;
  signal_type: 'buy' | 'sell';
  conditions: StrategyCondition[];
  logical_operator?: 'and' | 'or';
}

interface StrategyConfig {
  name: string;
  description: string;
  timeframe?: string;
  rules: StrategyRule[];
  position_sizing: {
    method: string;
    value: number;
  };
  risk_management: {
    stop_loss_percent?: number;
    take_profit_percent?: number;
    max_positions?: number;
  };
  symbols?: string[];
}

interface IndicatorInfo {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

interface BacktestResults {
  signals: any[];
  portfolio: any;
  summary: {
    total_return: number;
    total_trades: number;
    win_rate: number;
    max_drawdown: number;
    sharpe_ratio?: number;
    performance_assessment?: string;
  };
  performance_data?: any; // Complete performance analytics data
  enhanced_analytics?: boolean; // Flag for enhanced vs legacy data
}

// UPDATED PROPS INTERFACE
interface VisualStrategyBuilderProps {
  availableSymbols: string[];
  onBacktestComplete?: (results: any) => void;        // NEW
  onRealtimeStrategyStart?: (strategyId: string) => void; // NEW
}

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

const ConditionBuilder: React.FC<{
  condition: StrategyCondition;
  indicators: IndicatorInfo[];
  operators: string[];
  onChange: (condition: StrategyCondition) => void;
  onDelete: () => void;
}> = ({ condition, indicators, operators, onChange, onDelete }) => {
  const handleIndicatorChange = (indicator: string) => {
    const indicatorInfo = indicators.find(ind => ind.name === indicator);
    const defaultParams: Record<string, any> = {};
    
    // Set default parameters based on indicator
    if (indicatorInfo?.parameters) {
      Object.entries(indicatorInfo.parameters).forEach(([key, description]) => {
        if (description.includes('default:')) {
          const match = description.match(/default:\s*(\d+(?:\.\d+)?)/);
          if (match) {
            defaultParams[key] = parseFloat(match[1]);
          }
        } else if (key === 'period') {
          defaultParams[key] = 14; // Common default
        }
      });
    }

    onChange({
      ...condition,
      indicator,
      parameters: defaultParams
    });
  };

  const handleParameterChange = (paramKey: string, value: any) => {
    onChange({
      ...condition,
      parameters: {
        ...condition.parameters,
        [paramKey]: value
      }
    });
  };

  const selectedIndicator = indicators.find(ind => ind.name === condition.indicator);

  return (
    <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <DragIcon color="action" />
        <Typography variant="subtitle2" fontWeight="bold" flex={1}>
          Condition
        </Typography>
        <IconButton size="small" onClick={onDelete} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {/* Indicator Selection */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Indicator</InputLabel>
            <Select
              value={condition.indicator || ''}
              onChange={(e) => handleIndicatorChange(e.target.value)}
              label="Indicator"
            >
              {indicators.map((indicator) => (
                <MenuItem key={indicator.name} value={indicator.name}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {indicator.name.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {indicator.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Parameters */}
        {selectedIndicator && Object.keys(selectedIndicator.parameters).length > 0 && (
          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              {Object.entries(selectedIndicator.parameters).map(([paramKey, description]) => (
                <TextField
                  key={paramKey}
                  label={paramKey}
                  size="small"
                  type="number"
                  value={condition.parameters?.[paramKey] || ''}
                  onChange={(e) => handleParameterChange(paramKey, parseFloat(e.target.value) || 0)}
                  helperText={description}
                />
              ))}
            </Stack>
          </Grid>
        )}

        {/* Operator */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator || ''}
              onChange={(e) => onChange({ ...condition, operator: e.target.value })}
              label="Operator"
            >
              {operators.map((op) => (
                <MenuItem key={op} value={op}>
                  {op === 'gt' ? '>' : 
                   op === 'lt' ? '<' : 
                   op === 'gte' ? '>=' : 
                   op === 'lte' ? '<=' : 
                   op === 'eq' ? '=' : 
                   op === 'cross_above' ? 'Crosses Above' :
                   op === 'cross_below' ? 'Crosses Below' : op}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Value */}
        <Grid item xs={12} md={4}>
          <TextField
            label="Value"
            size="small"
            type="number"
            fullWidth
            value={typeof condition.value === 'number' ? condition.value : ''}
            onChange={(e) => onChange({ ...condition, value: parseFloat(e.target.value) || 0 })}
            helperText="Threshold value for comparison"
          />
        </Grid>
      </Grid>
    </Card>
  );
};

const RuleBuilder: React.FC<{
  rule: StrategyRule;
  indicators: IndicatorInfo[];
  operators: string[];
  onChange: (rule: StrategyRule) => void;
  onDelete: () => void;
}> = ({ rule, indicators, operators, onChange, onDelete }) => {
  const addCondition = () => {
    const newCondition: StrategyCondition = {
      indicator: '',
      parameters: {},
      operator: 'gt',
      value: 0
    };
    
    onChange({
      ...rule,
      conditions: [...rule.conditions, newCondition]
    });
  };

  const updateCondition = (index: number, condition: StrategyCondition) => {
    const updatedConditions = [...rule.conditions];
    updatedConditions[index] = condition;
    onChange({ ...rule, conditions: updatedConditions });
  };

  const deleteCondition = (index: number) => {
    const updatedConditions = rule.conditions.filter((_, i) => i !== index);
    onChange({ ...rule, conditions: updatedConditions });
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip 
            label={rule.signal_type?.toUpperCase() || 'SIGNAL'} 
            color={rule.signal_type === 'buy' ? 'success' : 'error'}
            variant="filled"
          />
          <TextField
            label="Rule Name"
            size="small"
            value={rule.name || ''}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            placeholder={`${rule.signal_type} Rule`}
          />
        </Box>
        <IconButton onClick={onDelete} color="error">
          <DeleteIcon />
        </IconButton>
      </Box>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Signal Type</InputLabel>
            <Select
              value={rule.signal_type || 'buy'}
              onChange={(e) => onChange({ ...rule, signal_type: e.target.value as 'buy' | 'sell' })}
              label="Signal Type"
            >
              <MenuItem value="buy">🟢 Buy Signal</MenuItem>
              <MenuItem value="sell">🔴 Sell Signal</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Logical Operator</InputLabel>
            <Select
              value={rule.logical_operator || 'and'}
              onChange={(e) => onChange({ ...rule, logical_operator: e.target.value as 'and' | 'or' })}
              label="Logical Operator"
            >
              <MenuItem value="and">AND (All conditions must be true)</MenuItem>
              <MenuItem value="or">OR (Any condition can be true)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Conditions ({rule.conditions.length})
      </Typography>

      {rule.conditions.map((condition, index) => (
        <ConditionBuilder
          key={index}
          condition={condition}
          indicators={indicators}
          operators={operators}
          onChange={(updated) => updateCondition(index, updated)}
          onDelete={() => deleteCondition(index)}
        />
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={addCondition}
        variant="outlined"
        fullWidth
        sx={{ mt: 2 }}
      >
        Add Condition
      </Button>
    </Paper>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VisualStrategyBuilder: React.FC<VisualStrategyBuilderProps> = ({ 
  availableSymbols, 
  onBacktestComplete,           // NEW PROP
  onRealtimeStrategyStart       // NEW PROP
}) => {
  // State management
  const [strategy, setStrategy] = useState<StrategyConfig>({
    name: 'My Strategy',
    description: 'Custom trading strategy',
    timeframe: '1d',
    rules: [],
    position_sizing: {
      method: 'fixed_amount',
      value: 10000
    },
    risk_management: {
      stop_loss_percent: 5,
      take_profit_percent: 10,
      max_positions: 1
    }
  });

  const [indicators, setIndicators] = useState<IndicatorInfo[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [examples, setExamples] = useState<any>({});
  const [selectedSymbol, setSelectedSymbol] = useState(availableSymbols[0] || 'AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [deploying, setDeploying] = useState(false); // NEW STATE
  const [notification, setNotification] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [examplesDialog, setExamplesDialog] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Update selected symbol when available symbols change
  useEffect(() => {
    if (availableSymbols.length > 0 && !availableSymbols.includes(selectedSymbol)) {
      setSelectedSymbol(availableSymbols[0]);
    }
  }, [availableSymbols, selectedSymbol]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading strategy builder data...');
      
      // Load indicators
      const indicatorsResponse = await apiService.getAvailableIndicators();
      console.log('📊 Indicators response:', indicatorsResponse);
      
      if (indicatorsResponse.indicators && Array.isArray(indicatorsResponse.indicators)) {
        setIndicators(indicatorsResponse.indicators);
        setOperators(indicatorsResponse.operators || ['gt', 'lt', 'gte', 'lte', 'eq']);
      } else {
        throw new Error('Invalid indicators response format');
      }
      
      // Load examples
      const examplesResponse = await apiService.getStrategyExamples();
      console.log('📁 Examples response:', examplesResponse);
      setExamples(examplesResponse.examples || examplesResponse);
      
      showNotification('Strategy builder loaded successfully!', 'success');
    } catch (error) {
      console.error('❌ Failed to load strategy builder:', error);
      showNotification('Failed to load strategy builder: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addRule = (signalType: 'buy' | 'sell') => {
    const newRule: StrategyRule = {
      name: `${signalType} Rule ${strategy.rules.length + 1}`,
      signal_type: signalType,
      conditions: [],
      logical_operator: 'and'
    };
    
    setStrategy({
      ...strategy,
      rules: [...strategy.rules, newRule]
    });
  };

  const updateRule = (index: number, rule: StrategyRule) => {
    const updatedRules = [...strategy.rules];
    updatedRules[index] = rule;
    setStrategy({ ...strategy, rules: updatedRules });
  };

  const deleteRule = (index: number) => {
    const updatedRules = strategy.rules.filter((_, i) => i !== index);
    setStrategy({ ...strategy, rules: updatedRules });
  };

  const loadExample = (exampleKey: string) => {
    if (examples[exampleKey]) {
      setStrategy(examples[exampleKey]);
      setExamplesDialog(false);
      showNotification(`Loaded example: ${examples[exampleKey].name}`, 'success');
    }
  };

  const testStrategy = async () => {
    if (strategy.rules.length === 0) {
      showNotification('Please add at least one rule to test the strategy', 'error');
      return;
    }

    setTesting(true);
    try {
      console.log('🧪 Testing strategy...');
      console.log('📋 Strategy details:', {
        name: strategy.name,
        rules: strategy.rules.length,
        symbol: selectedSymbol,
        dateRange: `${startDate} to ${endDate}`
      });
      
      // Log each rule for debugging
      strategy.rules.forEach((rule, index) => {
        console.log(`Rule ${index + 1} (${rule.signal_type}):`, {
          name: rule.name,
          conditions: rule.conditions.length,
          logical_operator: rule.logical_operator
        });
        
        rule.conditions.forEach((condition, condIndex) => {
          console.log(`  Condition ${condIndex + 1}:`, {
            indicator: condition.indicator,
            parameters: condition.parameters,
            operator: condition.operator,
            value: condition.value
          });
        });
      });
      
      const signals = await apiService.testStrategy(strategy, selectedSymbol, startDate, endDate);
      console.log('✅ Test completed:', signals);
      console.log('📊 Signal breakdown:');
      console.log(`  Total signals: ${signals.length}`);
      console.log(`  Buy signals: ${signals.filter(s => s.signal_type === 'buy').length}`);
      console.log(`  Sell signals: ${signals.filter(s => s.signal_type === 'sell').length}`);
      
      if (signals.length === 0) {
        console.log('⚠️ No signals generated - possible issues:');
        console.log('  1. Date range might be too short');
        console.log('  2. Indicator conditions might be too strict');
        console.log('  3. Symbol might not have enough data');
        console.log('  4. Indicator parameters might need adjustment');
        
        showNotification('No signals generated - try adjusting conditions or date range', 'warning');
      } else {
        // Show first few signals for debugging
        console.log('📈 First 5 signals:', signals.slice(0, 5));
      }
      
      setResults({
        signals,
        portfolio: null,
        summary: {
          total_return: 0,
          total_trades: signals.length,
          win_rate: 0,
          max_drawdown: 0
        }
      });
      
      showNotification(`Strategy test completed! Generated ${signals.length} signals.`, signals.length > 0 ? 'success' : 'warning');
    } catch (error) {
      console.error('❌ Strategy test failed:', error);
      showNotification('Strategy test failed: ' + error, 'error');
    } finally {
      setTesting(false);
    }
  };

  const runBacktest = async () => {
    if (strategy.rules.length === 0) {
      showNotification('Please add at least one rule to run backtest', 'error');
      return;
    }

    setBacktesting(true);
    try {
      console.log('📊 Running enhanced backtest...');
      
      const backtestResults = await apiService.runStrategyBacktest(
        strategy, 
        selectedSymbol, 
        startDate, 
        endDate,
        100000
      );
      
      console.log('✅ Backtest completed:', backtestResults);
      
      // Handle enhanced response
      if (backtestResults.performance_metrics && backtestResults.performance_report) {
        console.log('📊 Enhanced analytics detected');
        
        const performanceMetrics = backtestResults.performance_metrics;
        const performanceReport = backtestResults.performance_report;
        
        const totalReturn = performanceMetrics.returns.total_return_percent;
        const sharpeRatio = performanceMetrics.risk_adjusted.sharpe_ratio;
        const maxDrawdown = performanceMetrics.risk.max_drawdown;
        const totalTrades = performanceMetrics.trading.total_trades;
        const winRate = performanceMetrics.trading.win_rate;
        const performanceAssessment = performanceReport.summary.strategy_performance;
        
        const finalResults = {
          signals: [],
          portfolio: backtestResults.portfolio,
          summary: {
            total_return: totalReturn,
            total_trades: totalTrades,
            win_rate: winRate,
            max_drawdown: maxDrawdown,
            sharpe_ratio: sharpeRatio,
            performance_assessment: performanceAssessment
          },
          performance_data: backtestResults,
          enhanced_analytics: true
        };
        
        setResults(finalResults);
        
        // NEW: Call the callback to notify parent component
        if (onBacktestComplete) {
          console.log('🔄 Notifying App.tsx of backtest completion');
          onBacktestComplete(backtestResults);
        }
        
        showNotification(
          `✅ ${performanceAssessment} Strategy! Return: ${totalReturn.toFixed(2)}%, Sharpe: ${sharpeRatio.toFixed(2)}`, 
          performanceAssessment === 'Excellent' ? 'success' : 'info'
        );
        
      } else {
        console.log('📊 Legacy response detected');
        
        // Handle legacy response
        const portfolio = backtestResults.portfolio || backtestResults;
        
        const finalResults = {
          signals: [],
          portfolio: portfolio,
          summary: {
            total_return: portfolio.total_return_percent || 0,
            total_trades: portfolio.trades?.length || 0,
            win_rate: 0,
            max_drawdown: 0
          },
          enhanced_analytics: false
        };
        
        setResults(finalResults);
        
        // NEW: Call the callback even for legacy results
        if (onBacktestComplete) {
          console.log('🔄 Notifying App.tsx of backtest completion (legacy)');
          onBacktestComplete(backtestResults);
        }
        
        showNotification(`Backtest completed! Return: ${(portfolio.total_return_percent || 0).toFixed(2)}%`, 'success');
      }
      
    } catch (error: any) {
      console.error('❌ Backtest failed:', error);
      showNotification('Backtest failed: ' + error.message, 'error');
    } finally {
      setBacktesting(false);
    }
  };

  // NEW: Deploy real-time strategy function
// Replace your deployRealtimeStrategy function with this fixed version:

  const deployRealtimeStrategy = async () => {
    if (strategy.rules.length === 0) {
      showNotification('Please add at least one rule to deploy real-time strategy', 'error');
      return;
    }

    setDeploying(true);
    try {
      console.log('🚀 Deploying real-time strategy...');
      
      // Build strategy configuration for real-time deployment
      const realtimePayload = {
        strategy_name: strategy.name,
        symbol: selectedSymbol,
        initial_capital: strategy.position_sizing.value,
        max_position: strategy.risk_management.max_positions || 1,
        position_size: Math.floor(strategy.position_sizing.value / 100), // Convert to reasonable position size
        strategy_type: 'custom_visual_strategy',
        parameters: {
          rules: strategy.rules,
          position_sizing: strategy.position_sizing,
          risk_management: strategy.risk_management,
          timeframe: strategy.timeframe || '1d'
        }
      };

      console.log('📋 Real-time strategy payload:', realtimePayload);

      // FIX: Use absolute URL to backend port 8000, not relative URL
      const response = await fetch('http://localhost:8000/api/realtime/start-realtime-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(realtimePayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to deploy strategy: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Real-time strategy deployed:', result);

      // Call the callback to notify parent component
      if (onRealtimeStrategyStart) {
        console.log('🔄 Notifying App.tsx of real-time strategy start');
        onRealtimeStrategyStart(result.strategy_id);
      }

      showNotification(
        `🔴 Real-time strategy "${strategy.name}" deployed successfully! Strategy ID: ${result.strategy_id}`, 
        'success'
      );

    } catch (error: any) {
      console.error('❌ Real-time deployment failed:', error);
      showNotification('Real-time deployment failed: ' + error.message, 'error');
    } finally {
      setDeploying(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification(message);
    setNotificationSeverity(severity);
  };

  const isStrategyValid = strategy.rules.length > 0 && 
    strategy.rules.every(rule => rule.conditions.length > 0);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <PsychologyIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Visual Strategy Builder
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Drag, drop, and configure your trading strategy visually
              </Typography>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => setExamplesDialog(true)}
            >
              Examples
            </Button>
            <Button
              variant="outlined"
              startIcon={testing ? <CircularProgress size={20} /> : <TrendingUpIcon />}
              onClick={testStrategy}
              disabled={testing || !isStrategyValid}
            >
              {testing ? 'Testing...' : 'Test Strategy'}
            </Button>
            <Button
              variant="contained"
              startIcon={backtesting ? <CircularProgress size={20} /> : <PlayIcon />}
              onClick={runBacktest}
              disabled={backtesting || !isStrategyValid}
              size="large"
            >
              {backtesting ? 'Running...' : 'Run Backtest'}
            </Button>
            {/* NEW: Real-time deployment button */}
            <Button
              variant="contained"
              color="error"
              startIcon={deploying ? <CircularProgress size={20} /> : <SpeedIcon />}
              onClick={deployRealtimeStrategy}
              disabled={deploying || !isStrategyValid}
              size="large"
            >
              {deploying ? 'Deploying...' : 'Deploy Live'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {loading && (
        <Box display="flex" justifyContent="center" mb={3}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Strategy Configuration */}
        <Grid item xs={12} lg={8}>
          {/* Strategy Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Strategy Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Strategy Name"
                  fullWidth
                  value={strategy.name}
                  onChange={(e) => setStrategy({ ...strategy, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Timeframe</InputLabel>
                  <Select
                    value={strategy.timeframe || '1d'}
                    onChange={(e) => setStrategy({ ...strategy, timeframe: e.target.value })}
                    label="Timeframe"
                  >
                    <MenuItem value="1d">1 Day</MenuItem>
                    <MenuItem value="1h">1 Hour</MenuItem>
                    <MenuItem value="4h">4 Hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={strategy.description}
                  onChange={(e) => setStrategy({ ...strategy, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Rules Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
              <Typography variant="h6" fontWeight="bold" flex={1}>
                Trading Rules ({strategy.rules.length})
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addRule('buy')}
                  variant="contained"
                  color="success"
                  size="small"
                >
                  Add Buy Rule
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addRule('sell')}
                  variant="contained"
                  color="error"
                  size="small"
                >
                  Add Sell Rule
                </Button>
              </Stack>
            </Box>

            {strategy.rules.length === 0 ? (
              <Alert severity="info" sx={{ my: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  No rules defined yet
                </Typography>
                <Typography variant="body2">
                  Add buy and sell rules to define your trading strategy. Each rule can have multiple conditions.
                </Typography>
              </Alert>
            ) : (
              strategy.rules.map((rule, index) => (
                <RuleBuilder
                  key={index}
                  rule={rule}
                  indicators={indicators}
                  operators={operators}
                  onChange={(updated) => updateRule(index, updated)}
                  onDelete={() => deleteRule(index)}
                />
              ))
            )}
          </Paper>

          {/* Risk Management */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Risk Management & Position Sizing
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Position Size"
                    type="number"
                    fullWidth
                    value={strategy.position_sizing.value}
                    onChange={(e) => setStrategy({
                      ...strategy,
                      position_sizing: {
                        ...strategy.position_sizing,
                        value: parseFloat(e.target.value) || 0
                      }
                    })}
                    helperText="Amount to invest per trade"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sizing Method</InputLabel>
                    <Select
                      value={strategy.position_sizing.method}
                      onChange={(e) => setStrategy({
                        ...strategy,
                        position_sizing: {
                          ...strategy.position_sizing,
                          method: e.target.value
                        }
                      })}
                      label="Sizing Method"
                    >
                      <MenuItem value="fixed_amount">Fixed Amount ($)</MenuItem>
                      <MenuItem value="fixed_percent">Fixed Percent (%)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Stop Loss %"
                    type="number"
                    fullWidth
                    value={strategy.risk_management.stop_loss_percent || ''}
                    onChange={(e) => setStrategy({
                      ...strategy,
                      risk_management: {
                        ...strategy.risk_management,
                        stop_loss_percent: parseFloat(e.target.value) || undefined
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Take Profit %"
                    type="number"
                    fullWidth
                    value={strategy.risk_management.take_profit_percent || ''}
                    onChange={(e) => setStrategy({
                      ...strategy,
                      risk_management: {
                        ...strategy.risk_management,
                        take_profit_percent: parseFloat(e.target.value) || undefined
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Max Positions"
                    type="number"
                    fullWidth
                    value={strategy.risk_management.max_positions || 1}
                    onChange={(e) => setStrategy({
                      ...strategy,
                      risk_management: {
                        ...strategy.risk_management,
                        max_positions: parseInt(e.target.value) || 1
                      }
                    })}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Right Panel - Testing & Results */}
        <Grid item xs={12} lg={4}>
          {/* Test Configuration */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Backtest Configuration
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Symbol</InputLabel>
                <Select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  label="Symbol"
                >
                  {availableSymbols.map(symbol => (
                    <MenuItem key={symbol} value={symbol}>{symbol}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Paper>

          {/* Strategy Status */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Strategy Status
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {isStrategyValid ? (
                <CheckCircleIcon color="success" />
              ) : (
                <ErrorIcon color="error" />
              )}
              <Typography color={isStrategyValid ? 'success.main' : 'error.main'}>
                {isStrategyValid ? 'Strategy Ready' : 'Strategy Incomplete'}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Rules: {strategy.rules.length}<br />
              Conditions: {strategy.rules.reduce((sum, rule) => sum + rule.conditions.length, 0)}<br />
              Indicators: {indicators.length} available
            </Typography>

            {/* NEW: Deployment Options */}
            {isStrategyValid && (
              <Box mt={2}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  🚀 Deployment Options
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Run Backtest → View Performance Dashboard<br />
                  • Deploy Live → Real-time Strategy Monitoring
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Results */}
          {results && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                {results.enhanced_analytics ? '📊 Enhanced Backtest Results' : 'Basic Backtest Results'}
              </Typography>
              
              {/* Enhanced Quick Summary Cards */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center" p={2} bgcolor="primary.50" borderRadius={1}>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {results.summary.total_return.toFixed(2)}%
                    </Typography>
                    <Typography variant="caption">Total Return</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center" p={2} bgcolor="success.50" borderRadius={1}>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      {results.summary.total_trades}
                    </Typography>
                    <Typography variant="caption">Total Trades</Typography>
                  </Box>
                </Grid>
                {results.enhanced_analytics && (
                  <>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2} bgcolor="info.50" borderRadius={1}>
                      <Typography variant="h6" color="info.main" fontWeight="bold">
                        {results.summary.sharpe_ratio?.toFixed(2) || 'N/A'}
                      </Typography>
                      <Typography variant="caption">Sharpe Ratio</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2} bgcolor="warning.50" borderRadius={1}>
                      <Typography variant="h6" color="warning.main" fontWeight="bold">
                        {results.summary.max_drawdown?.toFixed(2) || 'N/A'}%
                      </Typography>
                      <Typography variant="caption">Max Drawdown</Typography>
                    </Box>
                  </Grid>
                  </>
                )}
              </Grid>

              {/* Performance Assessment */}
              {results.enhanced_analytics && results.summary.performance_assessment && (
                <Alert 
                  severity={
                    results.summary.performance_assessment === 'Excellent' ? 'success' :
                    results.summary.performance_assessment === 'Good' ? 'info' :
                    results.summary.performance_assessment === 'Average' ? 'warning' : 'error'
                  } 
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    Strategy Assessment: {results.summary.performance_assessment}
                  </Typography>
                </Alert>
              )}

              {/* Enhanced Performance Dashboard */}
              {results.performance_data && results.enhanced_analytics && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    📊 Comprehensive Performance Analysis
                  </Typography>
                  <PerformanceDashboard 
                    results={results.performance_data} 
                    loading={backtesting}
                  />
                </Box>
              )}

              {/* Legacy Portfolio Display for Compatibility */}
              {(!results.enhanced_analytics || !results.performance_data) && results.portfolio && (
                <Box>
                  <Typography>
                    Realized P&L: ${results.portfolio.realized_pnl?.toFixed(2)}
                  </Typography>
                </Box>
              )}

              {/* NEW: Next Steps after Results */}
              {results.enhanced_analytics && (
                <Box mt={2}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    🎯 Next Steps
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label="View Full Analytics" 
                      size="small" 
                      color="primary" 
                      onClick={() => onBacktestComplete && onBacktestComplete(results.performance_data)}
                    />
                    <Chip 
                      label="Deploy Live" 
                      size="small" 
                      color="error" 
                      onClick={deployRealtimeStrategy}
                    />
                  </Stack>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Examples Dialog */}
      <Dialog open={examplesDialog} onClose={() => setExamplesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Example Strategies</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {Object.entries(examples).map(([key, example]: [string, any]) => (
              <Grid item xs={12} md={6} key={key}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {example.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {example.description}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Rules: {example.rules?.length || 0} • 
                      Risk: {example.risk_management?.stop_loss_percent || 0}% Stop Loss
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => loadExample(key)}
                      variant="contained"
                    >
                      Load Strategy
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExamplesDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notificationSeverity} onClose={() => setNotification('')}>
          {notification}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VisualStrategyBuilder;