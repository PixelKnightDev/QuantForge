// frontend/src/components/RealtimeDashboard.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { 
  websocketService, 
  StrategyUpdate, 
  SignalData, 
  TradeData, 
  PerformanceData,
  MarketData
} from '../services/websocketService';
import { apiService } from '../services/apiService';

interface RealtimeStrategy {
  id: string;
  name: string;
  symbol: string;
  status: 'active' | 'stopped' | 'paused';
  performance: PerformanceData;
  recentSignals: SignalData[];
  recentTrades: TradeData['trades'];
  marketData: MarketData | null;
  start_time?: string;
  strategy_type?: string;
}

const RealtimeDashboard: React.FC = () => {
  const [strategies, setStrategies] = useState<RealtimeStrategy[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real deployed strategies from backend
  const fetchActiveStrategies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching active real-time strategies...');
      
      // Call the backend API to get real deployed strategies
      const response = await apiService.getActiveRealtimeStrategies();
      
      console.log('📊 Active strategies response:', response);
      
      if (response.active_strategies && Array.isArray(response.active_strategies)) {
        const activeStrategies = response.active_strategies.map((strategy: any) => ({
          id: strategy.strategy_id,
          name: strategy.name || 'Unknown Strategy',
          symbol: strategy.symbol || 'Unknown',
          status: strategy.status === 'active' ? 'active' : 'stopped',
          performance: strategy.current_performance || {
            total_trades: 0,
            winning_trades: 0,
            win_rate: 0,
            total_pnl: 0,
            portfolio_value: 100000,
            current_position: 0,
            last_updated: new Date().toISOString()
          },
          recentSignals: [],
          recentTrades: [],
          marketData: null,
          start_time: strategy.start_time,
          strategy_type: strategy.strategy_type
        }));
        
        setStrategies(activeStrategies);
        
        console.log(`✅ Loaded ${activeStrategies.length} active strategies:`, activeStrategies);
        
        // Subscribe to WebSocket updates for each strategy
        activeStrategies.forEach((strategy: RealtimeStrategy) => {
          if (strategy.status === 'active') {
            console.log(`📡 Subscribing to strategy: ${strategy.id}`);
            subscribeToStrategy(strategy.id);
          }
        });
        
      } else {
        console.log('📭 No active strategies found');
        setStrategies([]);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching active strategies:', error);
      setError(`Failed to fetch strategies: ${error.message}`);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize connection and handlers
  useEffect(() => {
    console.log('🔄 Initializing RealtimeDashboard...');
    
    // Connection status handler
    const handleConnectionStatus = (connected: boolean) => {
      setConnectionStatus(connected);
      console.log('📡 WebSocket status in dashboard:', connected);
      
      if (connected) {
        // Fetch strategies when connected
        fetchActiveStrategies();
      }
    };

    websocketService.onConnectionStatusChange(handleConnectionStatus);

    // Set initial connection status
    const initialStatus = websocketService.isWebSocketConnected();
    setConnectionStatus(initialStatus);
    console.log('📡 Initial WebSocket status:', initialStatus);

    // Fetch strategies immediately if already connected
    if (initialStatus) {
      fetchActiveStrategies();
    }

    // Market data handler (global)
    const handleMarketData = (data: MarketData) => {
      setStrategies(prev => prev.map(strategy => ({
        ...strategy,
        marketData: data
      })));
    };

    websocketService.onMarketDataUpdate(handleMarketData);

    return () => {
      // Cleanup handlers
      websocketService.off('connected', () => handleConnectionStatus(true));
      websocketService.off('disconnected', () => handleConnectionStatus(false));
    };
  }, [fetchActiveStrategies]);

  // Subscribe to strategy updates
  const subscribeToStrategy = useCallback((strategyId: string) => {
    console.log(`🔔 Setting up WebSocket subscriptions for strategy: ${strategyId}`);
    
    // Strategy update handler
    websocketService.onStrategyUpdate(strategyId, (data: StrategyUpdate) => {
      console.log(`📈 Strategy update for ${strategyId}:`, data);
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { ...strategy, status: data.status as any }
          : strategy
      ));
    });

    // Signal generated handler
    websocketService.onSignalGenerated(strategyId, (data: SignalData) => {
      console.log(`🎯 Signal generated for ${strategyId}:`, data);
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { 
              ...strategy, 
              recentSignals: [data, ...strategy.recentSignals].slice(0, 10) // Keep last 10
            }
          : strategy
      ));
    });

    // Trade executed handler
    websocketService.onTradeExecuted(strategyId, (data: TradeData) => {
      console.log(`💰 Trade executed for ${strategyId}:`, data);
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { 
              ...strategy, 
              recentTrades: [...data.trades, ...strategy.recentTrades].slice(0, 20) // Keep last 20
            }
          : strategy
      ));
    });

    // Performance update handler
    websocketService.onPerformanceUpdate(strategyId, (data: PerformanceData) => {
      console.log(`📊 Performance update for ${strategyId}:`, data);
      setStrategies(prev => prev.map(strategy => 
        strategy.id === strategyId 
          ? { ...strategy, performance: data }
          : strategy
      ));
    });

    // Subscribe via WebSocket
    websocketService.subscribeToStrategy(strategyId);
  }, []);

  // Remove strategy
  const removeStrategy = useCallback(async (strategyId: string) => {
    try {
      console.log(`🛑 Stopping strategy: ${strategyId}`);
      
      // Call backend to stop the strategy
      await apiService.stopRealtimeStrategy(strategyId);
      
      // Unsubscribe from WebSocket updates
      websocketService.unsubscribeFromStrategy(strategyId);
      
      // Remove from local state
      setStrategies(prev => prev.filter(strategy => strategy.id !== strategyId));
      
      console.log(`✅ Strategy ${strategyId} stopped and removed`);
      
    } catch (error: any) {
      console.error(`❌ Error stopping strategy ${strategyId}:`, error);
      setError(`Failed to stop strategy: ${error.message}`);
    }
  }, []);

  // Refresh strategies
  const refreshStrategies = () => {
    console.log('🔄 Manually refreshing strategies...');
    fetchActiveStrategies();
  };

  // Demo: Add sample strategy (for testing)
  const addSampleStrategy = async () => {
    try {
      console.log('🔄 Adding sample strategy...');
      
      const response = await fetch('http://localhost:8000/api/realtime/start-demo-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add sample strategy: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Sample strategy added:', result);
      
      // Refresh the strategies list
      fetchActiveStrategies();
      
    } catch (error: any) {
      console.error('❌ Error adding sample strategy:', error);
      setError(`Failed to add sample strategy: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Real-time Strategies...</h3>
          <p className="text-gray-600">Fetching active strategies from backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Real-time Strategy Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              {connectionStatus ? 'Connected' : 'Disconnected'}
            </div>
            <button
              onClick={refreshStrategies}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={addSampleStrategy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Sample Strategy
            </button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="float-right font-bold text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Strategies Grid */}
      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Strategies</h3>
          <p className="text-gray-600 mb-4">
            {connectionStatus 
              ? 'Deploy a strategy from the Visual Strategy Builder or add a sample strategy to start real-time monitoring'
              : 'Connect to WebSocket to see active strategies'
            }
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={addSampleStrategy}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Sample Strategy
            </button>
            <button
              onClick={refreshStrategies}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Strategies
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {strategies.map(strategy => (
            <StrategyCard 
              key={strategy.id} 
              strategy={strategy} 
              onRemove={() => removeStrategy(strategy.id)}
              isSelected={selectedStrategyId === strategy.id}
              onSelect={() => setSelectedStrategyId(strategy.id)}
            />
          ))}
        </div>
      )}

      {/* Detailed View */}
      {selectedStrategyId && (
        <div className="mt-8">
          {strategies.find(s => s.id === selectedStrategyId) && (
            <DetailedStrategyView 
              strategy={strategies.find(s => s.id === selectedStrategyId)!} 
            />
          )}
        </div>
      )}
    </div>
  );
};

// Strategy Card Component (updated to show more info)
interface StrategyCardProps {
  strategy: RealtimeStrategy;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onRemove, isSelected, onSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{strategy.name}</h3>
          <p className="text-sm text-gray-600">{strategy.symbol} • {strategy.strategy_type || 'Strategy'}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(strategy.status)}`}>
            {strategy.status.toUpperCase()}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Strategy ID */}
      <div className="mb-4">
        <p className="text-xs text-gray-500">Strategy ID: {strategy.id}</p>
        {strategy.start_time && (
          <p className="text-xs text-gray-500">
            Started: {new Date(strategy.start_time).toLocaleString()}
          </p>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Portfolio Value</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(strategy.performance.portfolio_value)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">P&L</p>
          <p className={`text-lg font-semibold ${
            strategy.performance.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {strategy.performance.total_pnl >= 0 ? '+' : ''}{formatCurrency(strategy.performance.total_pnl)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-lg font-semibold text-gray-900">{strategy.performance.win_rate}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Trades</p>
          <p className="text-lg font-semibold text-gray-900">{strategy.performance.total_trades}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Recent Activity</p>
        {strategy.recentSignals.length > 0 ? (
          <div className="space-y-1">
            {strategy.recentSignals.slice(0, 2).map((signal, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className={`px-2 py-1 rounded ${
                  signal.signals[0]?.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {signal.signals[0]?.type}
                </span>
                <span className="text-gray-600">
                  {new Date(signal.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No recent activity</p>
        )}
      </div>

      {/* Market Data */}
      {strategy.marketData && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Market Data</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{strategy.marketData.symbol}</span>
            <span className="font-semibold">${strategy.marketData.price.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Detailed Strategy View Component (same as before)
interface DetailedStrategyViewProps {
  strategy: RealtimeStrategy;
}

const DetailedStrategyView: React.FC<DetailedStrategyViewProps> = ({ strategy }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {strategy.name} - Detailed View
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Signals</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {strategy.recentSignals.length > 0 ? (
              strategy.recentSignals.map((signalData, index) => (
                <div key={index} className="border rounded-lg p-3">
                  {signalData.signals.map((signal, signalIndex) => (
                    <div key={signalIndex} className="flex justify-between items-center">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          signal.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {signal.type}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">{signal.reason}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${signal.price.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(signalData.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No signals generated yet</p>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Trades</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {strategy.recentTrades.length > 0 ? (
              strategy.recentTrades.map((trade, index) => (
                <div key={trade.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.type}
                      </span>
                      <span className="ml-2 text-sm font-medium">{trade.quantity} shares</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${trade.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{trade.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No trades executed yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;