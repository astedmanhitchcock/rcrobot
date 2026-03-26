import asyncio
import os
import logging
import time
import uuid
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

# --- Session / queue state ---
connections: dict[str, WebSocket] = {}
queue: list[str] = []          # ordered list of client_ids; index 0 = controller
controller_id: str | None = None
session_lock = asyncio.Lock()
idle_task: asyncio.Task | None = None


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


async def _send_state_to_all():
    """Send each connected client their current role and queue position."""
    for i, cid in enumerate(queue):
        ws = connections.get(cid)
        if ws:
            await ws.send_json({
                "type": "role_update",
                "role": "controller" if i == 0 else "queued",
                "queue_position": i,
                "queue_length": len(queue),
            })
    for cid, ws in connections.items():
        if cid not in queue:
            await ws.send_json({"type": "queue_state", "queue_length": len(queue)})


async def _advance_queue(reason: str):
    """Pop current controller and promote next. Caller must hold session_lock."""
    global controller_id, idle_task
    if controller_id and controller_id in connections:
        await connections[controller_id].send_json({"type": "control_lost", "reason": reason})
    if queue:
        queue.pop(0)
    if idle_task and not idle_task.done():
        idle_task.cancel()
        idle_task = None
    if queue:
        controller_id = queue[0]
        log.info("Control passed to %s (%s)", controller_id, reason)
        idle_task = asyncio.create_task(idle_watcher(controller_id))
    else:
        controller_id = None
        log.info("Queue empty after %s", reason)
    await _send_state_to_all()


async def idle_watcher(client_id: str):
    """Wait 30s idle, countdown 30s with warnings, then revoke control."""
    try:
        await asyncio.sleep(30)
        for remaining in range(30, 0, -1):
            ws = connections.get(client_id)
            if ws:
                await ws.send_json({"type": "idle_warning", "countdown_seconds": remaining})
            await asyncio.sleep(1)
        async with session_lock:
            if controller_id == client_id:
                await _advance_queue(reason="idle_timeout")
    except asyncio.CancelledError:
        pass


def _reset_idle_task(client_id: str):
    global idle_task
    if idle_task and not idle_task.done():
        idle_task.cancel()
    idle_task = asyncio.create_task(idle_watcher(client_id))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    global controller_id, idle_task

    if WS_TOKEN and token != WS_TOKEN:
        await websocket.close(code=4001)
        return
    await websocket.accept()

    client_id = str(uuid.uuid4())
    connections[client_id] = websocket
    log.info("Client connected: %s", client_id)

    async with session_lock:
        await websocket.send_json({"type": "session_assigned", "client_id": client_id})
        if not queue:
            queue.append(client_id)
            controller_id = client_id
            _reset_idle_task(client_id)
            await websocket.send_json({
                "type": "role_update",
                "role": "controller",
                "queue_position": 0,
                "queue_length": 1,
            })
        else:
            await websocket.send_json({
                "type": "role_update",
                "role": "observer",
                "queue_position": None,
                "queue_length": len(queue),
            })

    last_command = None
    last_command_time = 0.0
    debounce_seconds = 0.05

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if "direction" in data and not msg_type:
                direction = data.get("direction")
                if direction not in VALID_DIRECTIONS:
                    await websocket.send_json({"error": f"invalid direction: {direction}"})
                    continue
                if client_id != controller_id:
                    continue
                now = time.monotonic()
                if direction != "stop" and direction == last_command and (now - last_command_time) < debounce_seconds:
                    continue
                last_command = direction
                last_command_time = now
                log.info("Command from %s: %s", client_id, direction)
                await asyncio.to_thread(serial_bridge.send, direction)
                await websocket.send_json({"ok": True, "direction": direction})
                _reset_idle_task(client_id)

            elif msg_type == "keep_alive":
                if client_id == controller_id:
                    _reset_idle_task(client_id)

            elif msg_type == "join_queue":
                async with session_lock:
                    if client_id not in queue:
                        queue.append(client_id)
                        await _send_state_to_all()

            elif msg_type == "leave_queue":
                async with session_lock:
                    if client_id == controller_id:
                        await _advance_queue(reason="yielded")
                    elif client_id in queue:
                        queue.remove(client_id)
                        await websocket.send_json({
                            "type": "role_update",
                            "role": "observer",
                            "queue_position": None,
                            "queue_length": len(queue),
                        })
                        await _send_state_to_all()

    except WebSocketDisconnect:
        log.info("Client disconnected: %s", client_id)
        del connections[client_id]
        async with session_lock:
            was_controller = (client_id == controller_id)
            if was_controller:
                await _advance_queue(reason="disconnect")
            elif client_id in queue:
                queue.remove(client_id)
                await _send_state_to_all()
