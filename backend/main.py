import asyncio
import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from serial_bridge import SerialBridge

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_DIRECTIONS = {"forward", "backward", "left", "right", "stop"}

serial_bridge = SerialBridge(
    port=os.getenv("SERIAL_PORT", "/dev/ttyUSB0"),
    baud=int(os.getenv("BAUD_RATE", "9600")),
)


@app.on_event("startup")
async def startup():
    serial_bridge.connect()


@app.on_event("shutdown")
async def shutdown():
    serial_bridge.disconnect()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    log.info("Client connected: %s", websocket.client)
    try:
        while True:
            data = await websocket.receive_json()
            direction = data.get("direction")

            if direction not in VALID_DIRECTIONS:
                log.warning("Invalid command received: %s", data)
                await websocket.send_json({"error": f"invalid direction: {direction}"})
                continue

            log.info("Command: %s", direction)
            await asyncio.to_thread(serial_bridge.send, direction)
            await websocket.send_json({"ok": True, "direction": direction})

    except WebSocketDisconnect:
        log.info("Client disconnected: %s", websocket.client)
