# RC Robot — Troubleshooting Guide

## Can't SSH into the Pi

**Symptom:** `ping: cannot resolve rcrobot.local: Unknown host`

mDNS isn't resolving. Find the Pi by its MAC address instead:
```bash
arp -a
```
Look for a MAC starting with `b8:27:eb`, `dc:a6:32`, or `e4:5f:01` — that's the Pi. SSH directly by IP:
```bash
ssh clubaaron@192.168.4.31
```

**If the Pi doesn't appear in `arp -a` at all**, it's either off, crashed, or lost its network connection. You'll need physical access (monitor + keyboard) to diagnose.

---

## Camera or Arduino not responding after reboot

**Root cause:** The backend starts on boot via systemd. If the camera or Arduino weren't plugged in yet when the service started, they get initialized as invalid and won't work until the backend is restarted.

**Fix:** Plug everything in, then restart the backend:
```bash
sudo systemctl restart robot-backend
journalctl -u robot-backend -f
```

Look for `Serial connection opened: /dev/ttyACM0` in the logs to confirm the Arduino connected.

---

## Camera feed is a white/blank screen

**Symptom:** `http://<pi-ip>:8000/video_feed` loads but shows nothing.

The camera opened but isn't returning frames. Run this on the Pi to test:
```bash
cd ~/remote-robot/backend
source .venv/bin/activate
python3 -c "import cv2; cam = cv2.VideoCapture(0); print('opened:', cam.isOpened()); s, f = cam.read(); print('read:', s); cam.release()"
```

If `opened: False` — see **Camera not found at /dev/video0** below.

---

## Camera not found at /dev/video0

**Symptom:** `can't open camera by index`, `opened: False`

The Pi's internal codec devices claim the low `/dev/video*` numbers, so the USB camera often ends up at `video1` or `video2` instead of `video0`.

Find the correct device:
```bash
v4l2-ctl --list-devices
```

Output will look like:
```
Anker PowerConf C200 (usb-...):
    /dev/video1
    /dev/video2
```

Test with the correct index:
```bash
python3 -c "import cv2; cam = cv2.VideoCapture(1); print('opened:', cam.isOpened()); s, f = cam.read(); print('read:', s); cam.release()"
```

Update `CAMERA_INDEX` in `backend/.env` to match:
```
CAMERA_INDEX=1
```

Restart the backend:
```bash
sudo systemctl restart robot-backend
```

---

## USB devices losing power / going to sleep

**Symptom:** Camera or Arduino stops responding, but still shows in `lsusb`.

Check USB power management:
```bash
cat /sys/bus/usb/devices/*/power/control
```

If any say `auto`, Linux is suspending those devices. Fix immediately:
```bash
echo 'on' | sudo tee /sys/bus/usb/devices/*/power/control
```

Make it permanent across reboots:
```bash
echo 'ACTION=="add", SUBSYSTEM=="usb", TEST=="power/control", ATTR{power/control}="on"' | sudo tee /etc/udev/rules.d/99-usb-power.rules
sudo udevadm control --reload-rules
```

---

## Backend won't start — address already in use

**Symptom:**
```
ERROR: [Errno 98] error while attempting to bind on address ('0.0.0.0', 8000): address already in use
```

The systemd service is already running. Don't start uvicorn manually — let the service handle it:
```bash
sudo systemctl status robot-backend
```

If you want to run uvicorn manually (e.g. to see live logs), stop the service first:
```bash
sudo systemctl stop robot-backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## WebSocket 403 errors in logs

**Symptom:** Logs show repeated `403 Forbidden` on `/ws`.

The frontend is connecting but the token doesn't match. Two likely causes:

1. **Cloudflare tunnel URL changed** — the quick tunnel gives a new URL on every restart. Update `VITE_WS_URL` and `VITE_API_URL` in Vercel env vars and redeploy.

2. **Token mismatch** — check the Pi's token:
   ```bash
   cat ~/remote-robot/backend/.env | grep WS_TOKEN
   ```
   Compare to `VITE_WS_TOKEN` in Vercel → Settings → Environment Variables. They must match exactly.

---

## opencv not installed (ModuleNotFoundError: No module named 'cv2')

The system Python doesn't have opencv — it needs to be installed in the venv:
```bash
cd ~/remote-robot/backend
source .venv/bin/activate
pip install opencv-python-headless
```

Use `opencv-python-headless` (not `opencv-python`) — the headless variant skips GUI dependencies which aren't needed on a Pi server.

---

## Day-to-day commands

```bash
# Check backend status
sudo systemctl status robot-backend

# Restart backend (after code changes or device reconnect)
sudo systemctl restart robot-backend

# View live backend logs
journalctl -u robot-backend -f

# Check tunnel status
sudo systemctl status cloudflared

# Find Pi on local network (from Mac)
arp -a

# Check connected USB devices
lsusb

# Check recent system/USB events
dmesg | tail -20
```
