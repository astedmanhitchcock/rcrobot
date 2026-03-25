import asyncio
import os
import logging
import time
import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from serial_bridge import SerialBridge

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

WS_TOKEN = os.getenv("WS_TOKEN")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
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


camera = cv2.VideoCapture(int(os.getenv("CAMERA_INDEX", "0")))


@app.on_event("shutdown")
async def shutdown():
    serial_bridge.disconnect()
    camera.release()


def generate_frames():
    consecutive_failures = 0
    max_failures = 10
    while True:
        success, frame = camera.read()
        if not success:
            consecutive_failures += 1
            log.warning("Camera read failed (%d/%d)", consecutive_failures, max_failures)
            if consecutive_failures >= max_failures:
                log.error("Camera unrecoverable, closing stream")
                break
            continue
        consecutive_failures = 0
        _, buffer = cv2.imencode(".jpg", frame)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    if WS_TOKEN and token != WS_TOKEN:
        await websocket.close(code=4001)
        return
    await websocket.accept()
    log.info("Client connected: %s", websocket.client)
    last_command = None
    last_command_time = 0.0
    debounce_seconds = 0.05

    try:
        while True:
            data = await websocket.receive_json()
            direction = data.get("direction")

            if direction not in VALID_DIRECTIONS:
                log.warning("Invalid command received: %s", data)
                await websocket.send_json({"error": f"invalid direction: {direction}"})
                continue

            now = time.monotonic()
            if direction != "stop" and direction == last_command and (now - last_command_time) < debounce_seconds:
                continue

            last_command = direction
            last_command_time = now

            log.info("Command: %s", direction)
            await asyncio.to_thread(serial_bridge.send, direction)
            await websocket.send_json({"ok": True, "direction": direction})

    except WebSocketDisconnect:
        log.info("Client disconnected: %s", websocket.client)
