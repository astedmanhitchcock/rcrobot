# RC Robot — Project Context

## Project Overview
Building an RC robot with servo-based steering, controlled via a React web app over a local network. The goal is a working local controller first, with remote access as a stretch goal.

## Current Status
- [x] Basic servo turning sketch (Arduino/microcontroller) — complete
- [x] Backend server (FastAPI) — WebSocket at `/ws`, logs commands, serial bridge stubbed
- [x] React frontend controller UI
- [ ] Hardware bridge (servo sketch ↔ backend) — serial_bridge.py ready, needs COMMAND_MAP tuned to sketch
- [ ] Local network test (phone as controller)
- [x] Token auth + CORS locking added to backend and frontend
- [ ] Cloudflare Tunnel running on Pi + Vercel deployment (code ready, needs deploy)

## Architecture

```
[Vercel Frontend] ──wss://──> [Cloudflare Tunnel] ──> [Pi Backend :8000] ──serial──> [Arduino]
```

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: FastAPI (Python) + pyserial
- **Microcontroller**: Arduino / ESP32 (servo sketch already done)
- **Communication**: WebSockets (preferred over HTTP polling for low-latency RC feel)
- **Deployment (local)**: Serve React build from robot's server on local Wi-Fi
- **Deployment (remote)**: ngrok or Cloudflare Tunnel + Vercel/Netlify for frontend

## Roadmap (Ordered)
1. ~~Stand up backend server~~ ✓
2. ~~Build React UI~~ ✓
3. Wire servo sketch into backend — translate commands to serial/GPIO signals
4. Local network test — control robot from phone on same Wi-Fi
5. ~~Add token auth + lock CORS~~ ✓
6. Deploy: install cloudflared on Pi, run tunnel; deploy frontend to Vercel with env vars
7. (Stretch) Create udev rule on Pi to give Arduino a stable device name (currently /dev/ttyACM0 can change on reconnect)

## Key Decisions
- Use **WebSockets** over HTTP polling for real-time control feel
- Start with **local network only** before tackling remote access
- If using ESP32: it can host its own tiny web server (no Pi needed)
- If using Raspberry Pi: run backend there, use GPIO or serial to talk to servo controller

## Conventions
- Keep backend and frontend in separate folders (`/backend`, `/frontend`)
- Firmware lives in `/firmware`
- Document all pin assignments and serial baud rates in `/firmware/README.md`
- Use `.env` files for any configurable ports or URLs (never hardcode)

## Notes
- This project is also planned and discussed in a claude.ai Project — use this file as the source of truth for Claude Code sessions
- Update this file after major decisions or completed milestones
