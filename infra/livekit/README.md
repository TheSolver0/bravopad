# OnePAD LiveKit Self-Hosted Media Stack

This stack runs the media plane separately from Laravel and Reverb.

- Laravel keeps auth, call state, recording consent, persistence, audit, and webhooks.
- Reverb keeps application realtime events: messages, typing, presence, inbox, and call status.
- LiveKit carries audio/video/screen-share media.
- Coturn provides NAT traversal fallback.
- Egress prepares the recording path for the MVP recording flow.

## Required Environment

Set these values before starting the stack:

```bash
LIVEKIT_API_KEY=lk_onepad
LIVEKIT_API_SECRET=replace-with-a-long-secret
TURN_STATIC_AUTH_SECRET=replace-with-a-long-turn-secret
TURN_REALM=media.onepad.local
```

Mirror the LiveKit values in Laravel:

```bash
MEDIA_ENABLED=true
MEDIA_PROVIDER=livekit
LIVEKIT_URL=wss://media.onepad.local
LIVEKIT_API_KEY=lk_onepad
LIVEKIT_API_SECRET=replace-with-a-long-secret
LIVEKIT_WEBHOOK_SECRET=replace-with-a-shared-webhook-secret
CALL_RECORDING_ENABLED=true
```

## Ports

- `443/TCP`: public TLS reverse proxy for LiveKit WSS/API.
- `7880/TCP`: LiveKit HTTP/WebSocket internally or for local testing.
- `7881/TCP`: LiveKit TCP fallback.
- `40000-40100/UDP`: local LiveKit SFU media range for Docker Desktop.
- `50000-60000/UDP`: recommended dedicated production LiveKit SFU media range, if not reserved by the host OS.
- `3478/UDP+TCP`: TURN.
- `5349/TCP`: TURN over TLS.

## Reverse Proxy

Terminate TLS for `media.onepad.local` and proxy WebSocket/API traffic to `livekit:7880`.
Keep Laravel/Reverb on their existing application host; do not proxy media through Laravel.

## Checks

- Confirm Laravel can receive `POST /media/livekit/webhooks`.
- Confirm clients can reach `wss://media.onepad.local`.
- Confirm UDP range is open from clients to the LiveKit host.
- Confirm restrictive networks can use TURN.

## Windows Docker Desktop Notes

Windows can reserve UDP port ranges used by Hyper-V, WSL, VPNs, or other services. If Docker fails with a message like `ports are not available` for a UDP port, inspect the reserved ranges:

```powershell
netsh interface ipv4 show excludedportrange protocol=udp
```

Choose a LiveKit `rtc.port_range_start` / `rtc.port_range_end` that does not overlap the excluded ranges, and mirror the same range in `docker-compose.yml`.
