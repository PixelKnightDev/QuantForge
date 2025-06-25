// frontend/src/services/websocketService.ts - FIXED VERSION
export interface WebSocketMessage {
  type: string;
  strategy_id?: string;
  data?: any;
  timestamp: string;
  connection_id?: string;
}

export interface StrategyUpdate {
  status: string;
  config?: any;
  initial_capital?: number;
  end_time?: string;
}

export interface SignalData {
  signals: Array<{
    type: 'BUY' | 'SELL';
    strength: number;
    price: number;
    reason: string;
  }>;
  price: number;
  timestamp: string;
}

export interface TradeData {
  trades: Array<{
    id: string;
    timestamp: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    reason: string;
    signal_strength: number;
  }>;
  current_position: number;
  timestamp: string;
}

export interface PerformanceData {
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
  portfolio_value: number;
  current_position: number;
  last_updated: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnected = false;
  private connectionId: string | null = null;
  private subscribedStrategies: Set<string> = new Set();
  private connectionStatusHandlers: Array<(connected: boolean) => void> = [];

  constructor(private url: string = 'ws://localhost:8000/ws') {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Attempting WebSocket connection to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Notify connection status handlers
          this.notifyConnectionStatus(true);
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            console.log('📨 Raw WebSocket message:', event.data);
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 Parsed WebSocket message:', message);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔴 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.connectionId = null;
          
          // Notify connection status handlers
          this.notifyConnectionStatus(false);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().then(() => {
        console.log('✅ Reconnected successfully, resubscribing to strategies...');
        // Resubscribe to strategies after reconnection
        const strategiesToResubscribe = Array.from(this.subscribedStrategies);
        this.subscribedStrategies.clear(); // Clear first to avoid duplicates
        
        strategiesToResubscribe.forEach(strategyId => {
          this.subscribeToStrategy(strategyId);
        });
      }).catch((error) => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle connection establishment
    if (message.type === 'connection_established') {
      this.connectionId = message.connection_id!;
      console.log('🆔 Connection ID established:', this.connectionId);
      this.notifyHandlers('connected', message);
      return;
    }

    // Handle subscription confirmations
    if (message.type === 'subscription_confirmed') {
      console.log('✅ Strategy subscription confirmed:', message.strategy_id);
      return;
    }

    if (message.type === 'unsubscription_confirmed') {
      console.log('🚫 Strategy unsubscription confirmed:', message.strategy_id);
      return;
    }

    // Handle ping/pong
    if (message.type === 'pong') {
      console.log('🏓 Pong received');
      return;
    }

    // Notify all handlers for this message type
    this.notifyHandlers(message.type, message);

    // Notify handlers for specific strategy if applicable
    if (message.strategy_id) {
      this.notifyHandlers(`${message.type}_${message.strategy_id}`, message);
    }
  }

  private notifyHandlers(key: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(key) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ Error in message handler:', error);
      }
    });
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('❌ Error in connection status handler:', error);
      }
    });
  }

  // Subscribe to message types
  on(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  // Unsubscribe from message types
  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Strategy subscription methods
  subscribeToStrategy(strategyId: string): void {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ Cannot subscribe to strategy: WebSocket not connected');
      return;
    }

    if (this.subscribedStrategies.has(strategyId)) {
      console.log('ℹ️ Already subscribed to strategy:', strategyId);
      return;
    }

    console.log('📡 Subscribing to strategy:', strategyId);
    this.subscribedStrategies.add(strategyId);
    this.sendMessage({
      type: 'subscribe_strategy',
      strategy_id: strategyId
    });
  }

  unsubscribeFromStrategy(strategyId: string): void {
    if (!this.subscribedStrategies.has(strategyId)) {
      console.log('ℹ️ Not subscribed to strategy:', strategyId);
      return;
    }

    console.log('🚫 Unsubscribing from strategy:', strategyId);
    this.subscribedStrategies.delete(strategyId);

    if (this.isConnected && this.ws) {
      this.sendMessage({
        type: 'unsubscribe_strategy',
        strategy_id: strategyId
      });
    }
  }

  // FIXED: Clear all phantom subscriptions
  clearAllSubscriptions(): void {
    console.log('🧹 Clearing all strategy subscriptions');
    const strategies = Array.from(this.subscribedStrategies);
    
    strategies.forEach(strategyId => {
      this.unsubscribeFromStrategy(strategyId);
    });
    
    this.subscribedStrategies.clear();
    console.log('✅ All subscriptions cleared');
  }

  // Convenience methods for specific message types
  onStrategyUpdate(strategyId: string, handler: (data: StrategyUpdate) => void): void {
    this.on(`strategy_update_${strategyId}`, (message) => {
      handler(message.data as StrategyUpdate);
    });
  }

  onSignalGenerated(strategyId: string, handler: (data: SignalData) => void): void {
    this.on(`signal_generated_${strategyId}`, (message) => {
      handler(message.data as SignalData);
    });
  }

  onTradeExecuted(strategyId: string, handler: (data: TradeData) => void): void {
    this.on(`trade_executed_${strategyId}`, (message) => {
      handler(message.data as TradeData);
    });
  }

  onPerformanceUpdate(strategyId: string, handler: (data: PerformanceData) => void): void {
    this.on(`performance_update_${strategyId}`, (message) => {
      handler(message.data as PerformanceData);
    });
  }

  onMarketDataUpdate(handler: (data: MarketData) => void): void {
    this.on('market_data_update', (message) => {
      handler(message.data as MarketData);
    });
  }

  // FIXED: Improved connection status change handling
  onConnectionStatusChange(handler: (connected: boolean) => void): void {
    this.connectionStatusHandlers.push(handler);
    
    // Also add to the old system for backward compatibility
    this.on('connected', () => handler(true));
    this.on('disconnected', () => handler(false));
  }

  // Send message to server
  private sendMessage(message: Partial<WebSocketMessage>): void {
    if (this.ws && this.isConnected) {
      const fullMessage = {
        ...message,
        timestamp: new Date().toISOString()
      };
      console.log('📤 Sending WebSocket message:', fullMessage);
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
    }
  }

  // Send ping to server
  ping(): void {
    console.log('🏓 Sending ping');
    this.sendMessage({ type: 'ping' });
  }

  // Connection status
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionId(): string | null {
    return this.connectionId;
  }

  getSubscribedStrategies(): string[] {
    return Array.from(this.subscribedStrategies);
  }

  // Get subscription count
  getSubscriptionCount(): number {
    return this.subscribedStrategies.size;
  }

  // Debug method to show current state
  getDebugInfo(): object {
    return {
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      subscribedStrategies: Array.from(this.subscribedStrategies),
      subscriptionCount: this.subscribedStrategies.size,
      wsState: this.ws?.readyState,
      messageHandlers: Array.from(this.messageHandlers.keys()),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect WebSocket
  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.connectionId = null;
    this.subscribedStrategies.clear();
    this.reconnectAttempts = 0;
    
    // Notify connection status handlers
    this.notifyConnectionStatus(false);
    
    console.log('✅ WebSocket disconnected and cleaned up');
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// NO AUTO-CONNECT - Let App.tsx handle the connection timing
export default websocketService;