import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime
import json

from config import API_HOST, API_PORT
from database import init_db, get_db
from routers import simulation, devices, tests, captures, faults, addressing
from services.kathara_service import kathara_service

app = FastAPI(
    title="University Online Examination Network Simulation API",
    description="Full-stack real network emulation backend for university exam LAN architecture",
    version="1.0.0"
)

# CORS configuration for Next.js web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(simulation.router)
app.include_router(devices.router)
app.include_router(tests.router)
app.include_router(captures.router)
app.include_router(faults.router)
app.include_router(addressing.router)

# Connected WebSocket clients
connected_clients = set()

@app.on_event("startup")
def on_startup():
    print("[*] Initializing simulation SQLite database...")
    init_db()
    print(f"[*] Simulation API running on http://{API_HOST}:{API_PORT}")

@app.websocket("/api/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            # Send periodic live telemetry heartbeat
            state = kathara_service.get_simulation_state()
            msg = {
                "event_type": "telemetry",
                "state": state,
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket.send_text(json.dumps(msg))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
    except Exception:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False)

