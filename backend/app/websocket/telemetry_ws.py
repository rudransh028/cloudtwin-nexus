from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Broadcast simulated real-time telemetry stream every 3s
            await asyncio.sleep(3)
            payload = {
                "type": "TELEMETRY_UPDATE",
                "cpuAvg": round(64.0 + random.uniform(-3, 4), 1),
                "memoryAvg": round(71.0 + random.uniform(-2, 3), 1),
                "requestRate": int(4850 + random.uniform(-150, 200)),
                "avgLatency": int(95 + random.uniform(-8, 12)),
                "errorRate": round(max(0.1, 0.3 + random.uniform(-0.1, 0.15)), 2)
            }
            await websocket.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WS client disconnected: {e}")
        manager.disconnect(websocket)
