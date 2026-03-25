# RC Robot — Security Risks & Optimizations

## Security Risks

### HIGH — Video feed is unprotected
`GET /video_feed` has no auth. Anyone who discovers the Cloudflare tunnel URL gets a live camera stream with no credentials.

**Fix:** Add the same `?token=` query param check to `/video_feed` that exists on `/ws`.

---

### MEDIUM — WS token is visible in the URL
The token is passed as `?token=abc123` in the WebSocket URL, making it visible in browser DevTools, browser history, and Cloudflare access logs.

**Fix:** Accept the WebSocket connection first, then require the client to send the token as the first message. Reject and close if it doesn't arrive within a timeout (e.g. 5 seconds).

---

### MEDIUM — Auth silently disabled if WS_TOKEN is unset
`if WS_TOKEN and token != WS_TOKEN` — if `WS_TOKEN` is missing from `.env`, this condition short-circuits and anyone can connect. There's no warning.

**Fix:** Log a loud startup warning (or raise an error) if `WS_TOKEN` is not set.

---

### LOW — CORS falls back to wildcard
`ALLOWED_ORIGIN` defaults to `"*"` if the env var is missing. With no token set this means fully open access.

**Fix:** Default to `""` (deny all) instead of `"*"`, forcing it to be explicitly configured.

---

### LOW — No rate limiting on commands
A client with a valid token can send thousands of commands per second over the WebSocket, potentially thrashing the servo hardware.

**Fix:** Throttle commands server-side — ignore any direction command that arrives within e.g. 50ms of the last one.

---

## Performance Optimizations

### Camera — Biggest win: reduce OpenCV's frame buffer

By default, OpenCV buffers several frames internally. This means you're always seeing frames that are already ~200-500ms old before they even hit the network. Setting the buffer to 1 forces it to always serve the most recent frame.

```python
camera = cv2.VideoCapture(int(os.getenv("CAMERA_INDEX", "0")))
camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
```

This is a single line change and is likely the largest latency improvement available within the current MJPEG approach.

---

### Camera — Cap resolution and JPEG quality

Higher resolution = larger frames = more time to encode and transmit. For an RC robot you don't need 1080p.

```python
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

You can also lower JPEG encode quality (default is ~95). 60-70 is visually close but significantly smaller:

```python
_, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
```

---

### Camera — Run capture in a background thread

Currently `generate_frames()` calls `camera.read()` directly in the HTTP response generator. If the camera is slow to return a frame, the entire response stalls. A better pattern is a background thread that continuously reads frames and stores the latest one, while the HTTP endpoint just serves whatever the latest frame is.

This decouples capture rate from stream delivery rate and keeps the feed smooth even under load.

---

### Camera — WebRTC for sub-100ms latency (big lift)

MJPEG over HTTP will realistically land at 100-400ms end-to-end depending on network conditions. WebRTC is the standard approach for low-latency video and can get under 100ms, but it requires a STUN/TURN server for NAT traversal and significantly more setup. Worth considering if MJPEG latency feels too sluggish in practice.

Libraries like `aiortc` add WebRTC support to a FastAPI backend.

---

### Input — Commands are already well-optimized

The DPad uses `onPointerDown` (fires immediately on touch, before `onClick`) and sends over an open WebSocket — this is already the fastest approach available in the browser. No improvements needed here.

The one potential issue is command flooding: holding a button fires one command on press and one `stop` on release, which is correct. But if something causes repeated `pointerdown` events (e.g. a flaky touch screen), commands could pile up. A simple dedup on the frontend (don't send the same direction twice in a row) would guard against this.

---

### Input — Skip the server ACK

Currently the backend sends `{"ok": true, "direction": "..."}` back after every command. The frontend doesn't use this response. Removing it saves a small round-trip on every button press and reduces noise in the WebSocket stream.

---

## Summary Table

| Item | Effort | Impact |
|---|---|---|
| Protect `/video_feed` with token | Low | High (security) |
| Log warning when WS_TOKEN unset | Low | Medium (security) |
| Reduce OpenCV buffer to 1 | Low | High (camera latency) |
| Lower resolution + JPEG quality | Low | Medium (camera latency) |
| Background thread for frame capture | Medium | Medium (camera smoothness) |
| Move token out of WS URL | Medium | Medium (security) |
| Rate limit commands | Low | Low (safety) |
| WebRTC | High | High (camera latency) |
