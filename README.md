# 🚀 Advanced Trading Strategy Platform

A comprehensive, full-stack trading strategy development and backtesting platform with real-time monitoring capabilities. Build, test, and deploy trading strategies without coding using our visual strategy builder.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Strategy Builder Guide](#-strategy-builder-guide)
- [Performance Analytics](#-performance-analytics)
- [Real-time Monitoring](#-real-time-monitoring)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🏗️ Visual Strategy Builder
- **Drag-and-drop interface** for creating trading strategies
- **No coding required** - build complex strategies visually
- **20+ technical indicators** (RSI, MACD, Bollinger Bands, Moving Averages)
- **Custom conditions and logic** (AND, OR, crossovers, thresholds)
- **Risk management tools** (stop loss, take profit, position sizing)

### 📊 Advanced Performance Analytics
- **Comprehensive backtesting** on historical data
- **Enhanced trading metrics** including:
  - Average trade duration
  - Largest win/loss percentages
  - Portfolio turnover rate
  - Risk-adjusted returns (Sharpe, Sortino, Calmar ratios)
- **Risk analysis** with drawdown monitoring and VaR calculations
- **Visual performance reports** with heatmaps and distribution analysis

### 📈 Paper Trading Simulator
- **Simulated strategy monitoring** with WebSocket connections pushing live updates to the UI
- **Signal generation** and trade execution against simulated price ticks (a mean-reverting random walk seeded from the symbol's last real close - not a live market data feed; see Roadmap for wiring up a real feed)
- **Performance tracking** with live P&L updates as simulated prices move
- **Strategy health monitoring** and alerts

### 🗃️ Enhanced Data Management
- **Yahoo Finance integration** for historical and reference data (Alpha Vantage/Polygon.io/Binance/Coinbase are not yet implemented - see Roadmap)
- **Bulk data download** with parallel processing
- **Data quality analysis** and validation
- **Advanced caching** for optimal performance

## 🏛️ Architecture

```
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── StrategyBuilder/     # Visual strategy builder
│   │   │   ├── PerformanceAnalytics/ # Analytics dashboard
│   │   │   ├── RealtimeDashboard/   # Real-time monitoring
│   │   │   └── BulkDownload/        # Data management
│   │   ├── services/        # API and WebSocket services
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
│
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── routers/         # API route handlers
│   │   │   ├── strategy.py          # Strategy management
│   │   │   ├── realtime_strategy.py # Real-time operations
│   │   │   ├── enhanced_data.py     # Data management
│   │   │   └── websocket.py         # WebSocket handling
│   │   ├── services/        # Business logic services
│   │   │   ├── strategy_engine.py           # Strategy execution
│   │   │   ├── realtime_strategy_engine.py  # Real-time engine
│   │   │   ├── performance_analytics.py     # Analytics engine
│   │   │   └── technical_indicators.py      # Technical analysis
│   │   └── models/          # Data models
│   └── requirements.txt     # Python dependencies
│
└── docs/                    # Documentation
```

## 🚀 Installation

### Prerequisites
- **Node.js** (v16+)
- **Python** (3.8+)
- **Git**

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/trading-strategy-platform.git
cd trading-strategy-platform
```

2. **Set up Python environment**
```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

3. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

4. **Start the backend server**
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. **Install Node.js dependencies**
```bash
cd frontend
npm install
```

2. **Start the development server**
```bash
npm start
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🎯 Quick Start

### 1. Create Your First Strategy

1. **Navigate to Strategy Builder** in the web interface
2. **Select technical indicators** from the left panel:
   - Add RSI indicator
   - Set period to 14
3. **Create entry condition**:
   - RSI < 30 (oversold condition)
   - Connect to BUY action
4. **Create exit condition**:
   - RSI > 70 (overbought condition)
   - Connect to SELL action
5. **Set risk management**:
   - Stop loss: 2%
   - Take profit: 4%
6. **You can also use example strategies like RSI or SMI crossover**

7. **Save your strategy**

### 2. Backtest Your Strategy

1. **Select symbol** (e.g., AAPL, BTC-USD)
2. **Choose date range** (e.g., 2022-01-01 to 2024-01-01)
3. **Click "Run Backtest"**
4. **Review performance metrics**:
   - Total return, Sharpe ratio, maximum drawdown
   - Trade analysis and risk metrics
   - Visual performance charts

### 3. Deploy to Real-time

1. **Click "Deploy Live"**
2. **Configure real-time parameters**:
   - Position size, maximum positions
   - Risk limits
3. **Monitor in Real-time Dashboard**:
   - Live signals and trade execution
   - Performance tracking
   - Strategy health monitoring

## 🏗️ Strategy Builder Guide

### Technical Indicators Available

| Indicator | Description | Parameters |
|-----------|-------------|------------|
| **RSI** | Relative Strength Index | Period (default: 14) |
| **SMA** | Simple Moving Average | Period (default: 20) |
| **EMA** | Exponential Moving Average | Period (default: 20) |
| **MACD** | Moving Average Convergence Divergence | Fast: 12, Slow: 26, Signal: 9 |
| **Bollinger Bands** | Volatility-based bands | Period: 20, Std Dev: 2 |
| **Stochastic** | Momentum oscillator | %K: 14, %D: 3 |
| **Williams %R** | Momentum indicator | Period: 14 |
| **ATR** | Average True Range | Period: 14 |
| **Volume** | Trading volume analysis | - |
| **Price Action** | OHLC price data | - |

### Condition Operators

- **Comparison**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Logic**: `AND`, `OR`, `NOT`
- **Crossover**: `crosses_above`, `crosses_below`
- **Threshold**: `above`, `below`, `between`

### Example Strategies

#### RSI Mean Reversion
```
Entry: RSI(14) < 40
Exit: RSI(14) > 60
Stop Loss: 2%
Take Profit: 4%
```

#### Moving Average Crossover
```
Entry: SMA(10) crosses above SMA(20)
Exit: SMA(10) crosses below SMA(20)
Stop Loss: 3%
```

## 📊 Performance Analytics

### Enhanced Trading Metrics

#### New Metrics (v2.0)
- **Average Trade Duration**: Mean time positions are held
- **Largest Win/Loss**: Best and worst individual trade performance
- **Turnover Rate**: Annual portfolio turnover percentage
- **Risk-Adjusted Returns**: Sharpe, Sortino, and Calmar ratios

#### Traditional Metrics
- **Total Return**: Overall strategy performance
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit ÷ gross loss
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Volatility**: Standard deviation of returns

### Risk Analysis

#### Value at Risk (VaR)
- **95% VaR**: Maximum expected loss 95% of the time
- **99% VaR**: Maximum expected loss 99% of the time
- **Historical simulation** and parametric methods

#### Drawdown Analysis
- **Maximum drawdown**: Worst loss from peak
- **Drawdown duration**: Time to recover from losses
- **Underwater curve**: Visual representation of drawdown periods

### Performance Visualizations

1. **Portfolio Value Timeline**: Track growth over time
2. **Return Distribution Heatmap**: Monthly performance patterns
3. **Drawdown Analysis Chart**: Visualize risk periods
4. **P&L Distribution**: Histogram of trade returns
5. **Trade Duration Analysis**: Performance by holding period
6. **Rolling Risk Metrics**: Dynamic risk measurement

## 🔴 Paper Trading Simulator

> **Note:** This runs on simulated price data (a mean-reverting random walk seeded from the symbol's last real close), not a live market feed. The UI labels this clearly ("Simulated data" badge). See the Roadmap for wiring up a real feed (e.g. Alpaca's market data API).

### Features

- **Continuous Strategy Execution**: Strategies run continuously against simulated price ticks
- **WebSocket Connections**: Real-time updates for all connected clients
- **Signal Generation**: Buy/sell signals based on the simulated price path
- **Trade Simulation**: Paper trading with commission/slippage modeling
- **Performance Tracking**: Live P&L and portfolio updates as the simulation runs

### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// Subscribe to strategy updates
ws.send(JSON.stringify({
  type: 'subscribe_strategy',
  strategy_id: 'your_strategy_id'
}));

// Handle real-time events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'signal_generated':
      // Handle new trading signals
      console.log('New signal:', data.data);
      break;
      
    case 'trade_executed':
      // Handle trade executions
      console.log('Trade executed:', data.data);
      break;
      
    case 'performance_update':
      // Handle performance metrics updates
      console.log('Performance update:', data.data);
      break;
  }
};
```

### Strategy Deployment

1. **Deploy from Backtest**: One-click deployment from successful backtests
2. **Configure Parameters**: Set position sizing and risk limits
3. **Monitor Health**: Real-time strategy status and error handling
4. **Stop/Start Control**: Manual control over strategy execution

## 📡 API Documentation

### Core Endpoints

#### Strategy Management
```bash
# Create strategy
POST /api/strategy/create
{
  "name": "RSI Strategy",
  "rules": [...],
  "risk_management": {...}
}

# Test strategy
POST /api/strategy/test?symbol=AAPL&start_date=2023-01-01
{...strategy_config...}

# Run backtest
POST /api/strategy/backtest
{...strategy_config...}
```

#### Real-time Operations
```bash
# Start real-time strategy
POST /api/realtime/start-realtime-strategy
{
  "strategy_name": "Live RSI Strategy",
  "symbol": "AAPL",
  "initial_capital": 100000
}

# Get active strategies
GET /api/realtime/active-realtime-strategies

# Stop strategy
POST /api/realtime/stop-realtime-strategy/{strategy_id}
```

#### Data Management
```bash
# Bulk download
POST /api/enhanced-data/bulk-download
{
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "period": "1y",
  "interval": "1d"
}

# Get job status
GET /api/enhanced-data/jobs/{job_id}

# Data quality report
GET /api/enhanced-data/data/analyze/{symbol}
```

### Authentication

**Not implemented yet.** There is currently no auth on any endpoint - anyone who
can reach the API can create/stop strategies, trigger downloads, and read
internal debug endpoints. Do not deploy this with sensitive data or expect it
to be multi-tenant safe until basic auth (e.g. JWT via `fastapi.security`) is
added. This is tracked in the Roadmap.

## ⚙️ Configuration

### Environment Variables

Create `.env` files for configuration:


# Features
REACT_APP_ENABLE_REAL_TIME=true
REACT_APP_ENABLE_BULK_DOWNLOAD=true
REACT_APP_MAX_SYMBOLS_PER_STRATEGY=10
```

### Data Source Configuration

Yahoo Finance is currently the only implemented data source, configured in
`backend/app/services/enhanced_data_service.py` (`_setup_exchange_configs`).
Additional sources (Alpha Vantage, Polygon.io, a real broker feed) are on the
roadmap but not yet wired up - see Roadmap below before assuming they work.

### Production Deployment

#### Backend (FastAPI)
```bash
# Install production server
pip install gunicorn

# Start with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend (React)
```bash
# Build production bundle
npm run build

# Serve with nginx or host on Vercel/Netlify
npm install -g serve
serve -s build -l 3000
```

## 📚 Advanced Usage

### Custom Indicators

Add custom technical indicators:

```python
# backend/app/services/custom_indicators.py
def custom_momentum(prices: List[float], period: int = 10) -> List[float]:
    """Custom momentum indicator implementation"""
    momentum = []
    for i in range(len(prices)):
        if i >= period:
            mom = (prices[i] - prices[i - period]) / prices[i - period] * 100
            momentum.append(mom)
        else:
            momentum.append(0)
    return momentum
```

### Strategy Templates

Create reusable strategy templates:

```python
# backend/app/templates/strategy_templates.py
RSI_MEAN_REVERSION = {
    "name": "RSI Mean Reversion",
    "description": "Buy oversold, sell overbought conditions",
    "rules": [
        {
            "name": "Buy Oversold",
            "signal_type": "buy",
            "conditions": [
                {
                    "indicator": "RSI",
                    "parameters": {"period": 14},
                    "operator": "<",
                    "value": 30
                }
            ]
        }
    ],
    "risk_management": {
        "stop_loss_percent": 2.0,
        "take_profit_percent": 4.0
    }
}
```

### Performance Optimization

#### Backend Optimizations
- **Async processing** for data downloads
- **Caching** for frequently accessed data
- **Database indexing** for query optimization
- **Connection pooling** for external APIs

#### Frontend Optimizations
- **React.memo** for component optimization
- **useMemo/useCallback** for expensive calculations
- **Lazy loading** for large datasets
- **WebSocket connection management**

## 🐛 Troubleshooting

### Common Issues

#### WebSocket Connection Failed
```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify WebSocket endpoint
wscat -c ws://localhost:8000/ws
```

#### Data Download Errors
```bash
# Check API limits
curl http://localhost:8000/api/enhanced-data/data-sources

# Verify symbol format
curl "http://localhost:8000/api/data/market-data?symbol=AAPL&period=1mo"
```

#### Strategy Test Failures
```bash
# Validate strategy configuration
curl -X POST http://localhost:8000/api/strategy/validate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "rules": [...]}'
```

### Debug Mode

Enable debug logging:

```python
# backend/app/config/logging.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make changes and test**
```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

4. **Commit changes**
```bash
git commit -m "Add amazing feature"
```

5. **Push to branch**
```bash
git push origin feature/amazing-feature
```

6. **Open Pull Request**

### Code Style

#### Python (Backend)
- **Black** for code formatting
- **flake8** for linting
- **mypy** for type checking

```bash
black app/
flake8 app/
mypy app/
```

#### TypeScript (Frontend)
- **Prettier** for code formatting
- **ESLint** for linting

```bash
npm run format
npm run lint
```

### Contribution Guidelines

- **Write tests** for new features
- **Update documentation** for API changes
- **Follow existing code patterns**
- **Add type hints** for Python code
- **Use meaningful commit messages**

## 📄 License

No license has been chosen yet - there is no LICENSE file in this repo, so
default copyright applies (all rights reserved) until one is added.

## 🙏 Acknowledgments

- **Technical Indicators** - custom implementation in `backend/app/services/technical_indicators.py` (no TA-Lib dependency)
- **Financial Data** - Yahoo Finance via `yfinance`
- **UI Components** - Material-UI for React components
- **WebSocket** - FastAPI WebSocket support
- **Visualization** - Recharts for performance charts

## 📞 Support

- **Documentation**: [Full Documentation](pixelknightdev.github.io)
- **Email**: pratyushyadav0106@gmail.com

## 🔮 Roadmap

### Near-term (engineering foundations)
- [ ] Authentication (currently none - see Configuration > Authentication)
- [ ] Real persistence (currently everything lives in in-memory dicts and is lost on restart)
- [ ] A real live/paper-trading data feed (e.g. Alpaca) to replace the simulated price walk
- [ ] Automated tests and CI
- [ ] Wire up the CSV upload route (models/service exist but no endpoint calls them yet)

### v2.1 (Next Release)
- [ ] **Options trading** support
- [ ] **Portfolio optimization** algorithms
- [ ] **Machine learning** indicators
- [ ] **Advanced order types** (limit, stop-limit)

### v2.2 (Future)
- [ ] **Multi-asset strategies** (stocks + crypto + forex)
- [ ] **Social trading** features
- [ ] **Mobile app** (React Native)
- [ ] **Cloud deployment** templates
- [ ] **AI-powered strategy generation**
- [ ] **Institutional features** (prime brokerage integration)
- [ ] **Advanced risk management** (portfolio-level risk)
- [ ] **Real broker integration** (Interactive Brokers, TD Ameritrade)

---
