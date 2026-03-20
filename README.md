# RC Robot

React web app + FastAPI backend for controlling a servo-based RC robot over a local network.

## Architecture

```
[React Web App]  ──WebSocket──>  [Backend Server]  ──Serial──>  [Arduino/ESP32]
   (Vite)                         (FastAPI)                       (servo sketch)
```

---

## Backend

### Option A — Run locally (development)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env        # edit if needed
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server is available at `ws://localhost:8000/ws`.

To stop: `Ctrl+C`, then `deactivate` to exit the virtualenv.

---

### Option B — Run on Raspberry Pi (LAN deployment)

**One-time setup on the Pi:**

```bash
# SSH into the Pi
ssh pi@<pi-ip-address>

# Install git if not present
sudo apt update && sudo apt install -y git python3-venv

# Clone the repo
git clone <your-repo-url> remote-robot
cd rcrobot/backend

# Create virtualenv and install deps
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env if your Arduino is on a different port (check with: ls /dev/tty*)
```

**Start the backend on the Pi:**

```bash
ssh pi@<pi-ip-address>
cd rcrobot/backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Server is now reachable from any device on the same Wi-Fi at `ws://<pi-ip-address>:8000/ws`.

**To find the Pi's IP address:**

```bash
# On the Pi
hostname -I
```

**Shut down the backend:**

```bash
# In the same terminal: Ctrl+C
# Or from another terminal:
ssh pi@<pi-ip-address> "pkill -f uvicorn"
```

**To power off the Pi safely:**

```bash
ssh pi@<pi-ip-address> "sudo shutdown now"
```

---

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` to point at whichever backend you're running:

```
# Local backend
VITE_WS_URL=ws://localhost:5173/ws

# Pi backend
VITE_WS_URL=ws://<pi-ip-address>:8000/ws
```

**Start the dev server:**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. The status badge turns green when connected.

**For phone control on the same Wi-Fi:**

```bash
npm run dev -- --host
```

Then open `http://<your-machine-ip>:5173` on your phone. If the backend is on the Pi, set `VITE_WS_URL=ws://<pi-ip-address>:8000/ws` in `.env` before starting.

To stop: `Ctrl+C`.

---

## Full LAN setup (Pi backend + phone controller)

1. SSH into Pi, start backend (Option B above)
2. Note the Pi's IP: `hostname -I`
3. On your dev machine, set `VITE_WS_URL=ws://<pi-ip>:8000/ws` in `frontend/.env`
4. `cd frontend && npm run dev -- --host`
5. Open `http://<dev-machine-ip>:5173` on your phone
6. D-pad controls should drive the robot

---

## Firmware

See [`/firmware/README.md`](/firmware/README.md) for pin assignments and baud rate configuration.
