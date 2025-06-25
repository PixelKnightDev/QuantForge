# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.strategy_subscribers: Dict[str, List[str]] = {}  # strategy_id -> [connection_ids]
        
    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connection established: {connection_id}")
        return connection_id
        
    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            # Remove from strategy subscriptions
            for strategy_id, subscribers in self.strategy_subscribers.items():
                if connection_id in subscribers:
                    subscribers.remove(connection_id)
            logger.info(f"WebSocket connection closed: {connection_id}")
    
    async def send_personal_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def broadcast_to_strategy_subscribers(self, message: dict, strategy_id: str):
        if strategy_id in self.strategy_subscribers:
            disconnected = []
            for connection_id in self.strategy_subscribers[strategy_id]:
                try:
                    if connection_id in self.active_connections:
                        await self.active_connections[connection_id].send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting to {connection_id}: {e}")
                    disconnected.append(connection_id)
            
            # Remove disconnected clients
            for conn_id in disconnected:
                self.strategy_subscribers[strategy_id].remove(conn_id)
                self.disconnect(conn_id)
    
    def subscribe_to_strategy(self, connection_id: str, strategy_id: str):
        if strategy_id not in self.strategy_subscribers:
            self.strategy_subscribers[strategy_id] = []
        if connection_id not in self.strategy_subscribers[strategy_id]:
            self.strategy_subscribers[strategy_id].append(connection_id)
            logger.info(f"Connection {connection_id} subscribed to strategy {strategy_id}")
    
    def unsubscribe_from_strategy(self, connection_id: str, strategy_id: str):
        if strategy_id in self.strategy_subscribers and connection_id in self.strategy_subscribers[strategy_id]:
            self.strategy_subscribers[strategy_id].remove(connection_id)
            logger.info(f"Connection {connection_id} unsubscribed from strategy {strategy_id}")

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    connection_id = await manager.connect(websocket)
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat()
        }, connection_id)
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_client_message(message, connection_id)
            
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id}: {e}")
        manager.disconnect(connection_id)

async def handle_client_message(message: dict, connection_id: str):
    """Handle incoming messages from WebSocket clients"""
    message_type = message.get("type")
    
    if message_type == "subscribe_strategy":
        strategy_id = message.get("strategy_id")
        if strategy_id:
            manager.subscribe_to_strategy(connection_id, strategy_id)
            await manager.send_personal_message({
                "type": "subscription_confirmed",
                "strategy_id": strategy_id,
                "timestamp": datetime.now().isoformat()
            }, connection_id)
    
    elif message_type == "unsubscribe_strategy":
        strategy_id = message.get("strategy_id")
        if strategy_id:
            manager.unsubscribe_from_strategy(connection_id, strategy_id)
            await manager.send_personal_message({
                "type": "unsubscription_confirmed",
                "strategy_id": strategy_id,
                "timestamp": datetime.now().isoformat()
            }, connection_id)
    
    elif message_type == "ping":
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }, connection_id)

# Functions to broadcast updates (called from strategy engine)
async def broadcast_strategy_update(strategy_id: str, update_data: dict):
    """Broadcast strategy performance updates to subscribers"""
    message = {
        "type": "strategy_update",
        "strategy_id": strategy_id,
        "data": update_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast_to_strategy_subscribers(message, strategy_id)

async def broadcast_signal_generated(strategy_id: str, signal_data: dict):
    """Broadcast new trading signals to subscribers"""
    message = {
        "type": "signal_generated",
        "strategy_id": strategy_id,
        "data": signal_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast_to_strategy_subscribers(message, strategy_id)

async def broadcast_trade_executed(strategy_id: str, trade_data: dict):
    """Broadcast trade execution updates to subscribers"""
    message = {
        "type": "trade_executed",
        "strategy_id": strategy_id,
        "data": trade_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast_to_strategy_subscribers(message, strategy_id)

async def broadcast_performance_metrics(strategy_id: str, metrics_data: dict):
    """Broadcast updated performance metrics to subscribers"""
    message = {
        "type": "performance_update",
        "strategy_id": strategy_id,
        "data": metrics_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast_to_strategy_subscribers(message, strategy_id)

# Real-time data simulation (for testing)
async def simulate_real_time_data():
    """Simulate real-time market data updates"""
    import random
    
    while True:
        # Simulate price updates
        price_update = {
            "symbol": "AAPL",
            "price": round(150 + random.uniform(-5, 5), 2),
            "volume": random.randint(1000, 10000),
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to all active connections
        for connection_id in manager.active_connections:
            await manager.send_personal_message({
                "type": "market_data_update",
                "data": price_update,
                "timestamp": datetime.now().isoformat()
            }, connection_id)
        
        await asyncio.sleep(1)  # Update every second

# Start real-time simulation (optional - for testing)
# asyncio.create_task(simulate_real_time_data())