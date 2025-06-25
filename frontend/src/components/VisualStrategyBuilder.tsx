// src/components/VisualStrategyBuilder.tsx
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
  Error as ErrorIcon
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

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
  };
}

interface VisualStrategyBuilderProps {
  availableSymbols: string[];
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

const VisualStrategyBuilder: React.FC<VisualStrategyBuilderProps> = ({ availableSymbols }) => {
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
  const [notification, setNotification] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [examplesDialog, setExamplesDialog] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

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
      console.log('📊 Running backtest...');
      const portfolio = await apiService.runStrategyBacktest(strategy, selectedSymbol, startDate, endDate);
      
      // 🔍 DEBUG: Log the complete response structure
      console.log('✅ Backtest completed - FULL RESPONSE:', portfolio);
      console.log('📋 Portfolio keys:', Object.keys(portfolio));
      console.log('💰 Total value:', portfolio.total_value);
      console.log('💵 Cash:', portfolio.cash);
      console.log('📈 Trades:', portfolio.trades);
      console.log('📊 Realized PnL:', portfolio.realized_pnl);
      console.log('📊 Unrealized PnL:', portfolio.unrealized_pnl);
      console.log('📊 Total return percent:', portfolio.total_return_percent);
      
      // 🔍 DEBUG: Check different return calculation methods
      const method1 = portfolio.total_return_percent;
      const method2 = ((portfolio.total_value - 100000) / 100000 * 100);
      const method3 = (portfolio.realized_pnl / 100000 * 100);
      
      console.log('🧮 Return calculations:');
      console.log('  Method 1 (total_return_percent):', method1);
      console.log('  Method 2 (total_value based):', method2);
      console.log('  Method 3 (realized_pnl based):', method3);
      
      // Use the best available return calculation
      let totalReturn = 0;
      if (method1 !== undefined && method1 !== null && !isNaN(method1)) {
        totalReturn = method1;
        console.log('✅ Using total_return_percent:', totalReturn);
      } else if (portfolio.total_value && !isNaN(portfolio.total_value)) {
        totalReturn = method2;
        console.log('✅ Using total_value calculation:', totalReturn);
      } else if (portfolio.realized_pnl && !isNaN(portfolio.realized_pnl)) {
        totalReturn = method3;
        console.log('✅ Using realized_pnl calculation:', totalReturn);
      } else {
        console.log('❌ Could not calculate return - using 0');
      }
      
      // 🔍 DEBUG: Check trade details
      if (portfolio.trades && portfolio.trades.length > 0) {
        console.log('📊 Trade Analysis:');
        portfolio.trades.forEach((trade: any, index: number) => {
          console.log(`  Trade ${index + 1}:`, {
            entry_price: trade.entry_price,
            exit_price: trade.exit_price,
            quantity: trade.quantity,
            pnl: trade.pnl,
            pnl_percent: trade.pnl_percent
          });
        });
        
        const totalTradesPnL = portfolio.trades.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0);
        console.log('📊 Total trades P&L:', totalTradesPnL);
      } else {
        console.log('⚠️ No trades found - strategy might not have generated signals or trades');
      }
      
      setResults({
        signals: [],
        portfolio,
        summary: {
          total_return: totalReturn,
          total_trades: portfolio.trades?.length || 0,
          win_rate: portfolio.trades?.length > 0 ? 
            (portfolio.trades.filter((t: any) => (t.pnl || 0) > 0).length / portfolio.trades.length * 100) : 0,
          max_drawdown: 0 // Would need to calculate from trades
        }
      });
      
      showNotification(`Backtest completed! Total return: ${totalReturn.toFixed(2)}%`, 'success');
    } catch (error) {
      console.error('❌ Backtest failed:', error);
      showNotification('Backtest failed: ' + error, 'error');
    } finally {
      setBacktesting(false);
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
          </Paper>

          {/* Results */}
          {results && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Results
              </Typography>
              
              {results.portfolio ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Return</Typography>
                    <Typography variant="h6" color={results.summary.total_return >= 0 ? 'success.main' : 'error.main'}>
                      {results.summary.total_return.toFixed(2)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Trades</Typography>
                    <Typography variant="h6">{results.summary.total_trades}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Final Value</Typography>
                    <Typography variant="h6">${results.portfolio.total_value?.toFixed(2)}</Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2">
                  Signals Generated: {results.signals.length}
                </Typography>
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