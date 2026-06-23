# OnePAD Bravo

OnePAD Bravo is a Laravel + React application for internal recognition, engagement, team communication, events, rewards, and real-time collaboration.

The application is built around:

- employee "Bravo" recognition and points
- challenges, badges, leaderboards, rewards, and redemptions
- posts, stories, comments, likes, and notifications
- HR surveys, engagement insights, agenda/events, and event contributions
- real-time Messenger with direct/group conversations, typing indicators, presence, file transfer, read receipts, likes, edits/deletes, call history, and LiveKit-backed audio/video calls

## Stack

- Backend: PHP 8.3+, Laravel 13, Fortify, Inertia Laravel, Reverb, database queues
- Frontend: React 19, TypeScript 5.7, Inertia.js, Vite 8, Tailwind CSS 4, Radix UI, lucide-react
- Real-time app events: Laravel Reverb
- Media calls: self-hosted LiveKit SFU, Redis, Egress, Coturn
- Tests: Pest
- Formatting/linting: Laravel Pint, ESLint, Prettier, TypeScript

## High-Level Architecture

```text
Browser
  |-- HTTPS/Inertia/API ----------> Laravel app server
  |-- WSS app events -------------> Laravel Reverb
  |-- WSS LiveKit signaling ------> LiveKit
  |-- UDP/TCP media/TURN ---------> LiveKit/Coturn

Laravel
  |-- database: users, bravos, messenger, calls, call events, recording audit
  |-- queue worker: notifications, broadcasts, background jobs
  |-- Reverb: app-level real-time messages, typing, presence, notifications, call state
  |-- LiveKit token/webhook bridge: authorization, room tokens, recording consent, audit

LiveKit
  |-- SFU media plane for audio/video/screen-share
  |-- Redis for room/service coordination
  |-- Egress for recording pipeline
  |-- Coturn for NAT/firewall fallback
```

Audio/video media does not pass through Laravel or Reverb. Laravel only authorizes calls, issues room-scoped LiveKit tokens, stores call state, receives webhooks, and audits recording state.

## Repository Structure

```text
app/
  Actions/Fortify/          Fortify account and password actions
  Console/Commands/         Scheduled and operational Artisan commands
  Events/                   Broadcast events, including messenger and call updates
  Http/Controllers/         Inertia and JSON route handlers
  Models/                   Eloquent models
  Notifications/            Mail/database notifications
  Services/                 Domain services
    Media/                  LiveKit media provider, token, webhook, recording, authorization

bootstrap/                  Laravel bootstrap and middleware registration
config/                     Laravel, Reverb, queue, filesystems, media, auth config
database/
  factories/                Model factories
  migrations/               Schema migrations
  seeders/                  Initial data and demo/application seeders

infra/
  livekit/                  Local/self-hosted LiveKit stack

resources/js/
  components/               Reusable React components and UI primitives
  hooks/                    React hooks, including useMediaCall
  layouts/                  Inertia layouts
  pages/                    Inertia pages
  types/                    Shared frontend types

routes/
  web.php                   Main app and messenger routes
  api.php                   API routes
  channels.php              Broadcast channel authorization
  settings.php              Settings routes
  console.php               Scheduler definitions

tests/                      Pest feature/unit tests
```

## Requirements

- PHP 8.3 or newer
- Composer
- Node.js and npm
- SQLite for local development, or MySQL/PostgreSQL for shared environments
- Redis recommended for production queues/cache/Reverb scaling
- Docker Desktop or Docker Engine for the local LiveKit stack
- A web server for production, usually Nginx or Apache in front of PHP-FPM

## Environment

Create `.env` from the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Important environment groups:

```ini
APP_NAME=OnePAD
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=bravo-local
REVERB_APP_KEY=bravo-local-key
REVERB_APP_SECRET=bravo-local-secret
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

MEDIA_ENABLED=true
MEDIA_PROVIDER=livekit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=bravo-local-livekit
LIVEKIT_API_SECRET=1234
LIVEKIT_WEBHOOK_SECRET=1234
MEDIA_TOKEN_TTL=600
CALL_MAX_VIDEO_PARTICIPANTS=4
CALL_MAX_AUDIO_PARTICIPANTS=8
CALL_RECORDING_ENABLED=true
CALL_RECORDING_RETENTION_DAYS=30
CALL_RECORDING_DISK=private
```

For production, replace all local secrets, URLs, domains, and database settings.

## Local Setup

Install dependencies, generate the app key, run migrations, and build assets:

```bash
composer run setup
```

If you prefer manual steps:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

On Windows PowerShell, replace `cp` with `Copy-Item`.

## Development Server

Start the Laravel HTTP server, queue listener, Reverb server, and Vite dev server together:

```bash
composer run dev
```

This runs:

```text
php artisan serve
php artisan queue:listen --tries=1
php artisan reverb:start
npm run dev
```

Typical local endpoints:

- Laravel/Inertia app: `http://127.0.0.1:8000`
- Vite dev server: `http://127.0.0.1:5173`
- Reverb server: `ws://localhost:8080`
- LiveKit local server: `ws://localhost:7880`

If Reverb runs on a secure reverse-proxied hostname, use `REVERB_SCHEME=https`, `REVERB_PORT=443`, and the public WebSocket host in both `REVERB_HOST` and `VITE_REVERB_HOST`.

## LiveKit Media Server

The LiveKit stack lives in `infra/livekit/` and contains:

- `docker-compose.yml`: LiveKit, Redis, Egress, Coturn
- `livekit.yaml`: LiveKit room, RTC, TURN, Redis, API key, and webhook config
- `egress.yaml`: Egress service config
- `README.md`: media-specific operational notes

Start it locally:

```bash
cd infra/livekit
docker compose up -d
docker compose ps
```

On Windows Docker Desktop, the local UDP media range is `40000-40100/UDP` to avoid common reserved Windows port ranges. If Docker reports `ports are not available`, inspect the excluded UDP ports:

```powershell
netsh interface ipv4 show excludedportrange protocol=udp
```

Then update both `infra/livekit/docker-compose.yml` and `infra/livekit/livekit.yaml` to use a free range.

For local Laravel integration, mirror the LiveKit key and secret from `infra/livekit/livekit.yaml`:

```ini
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=bravo-local-livekit
LIVEKIT_API_SECRET=1234
LIVEKIT_WEBHOOK_SECRET=1234
```

For production, use TLS:

```ini
LIVEKIT_URL=wss://media.example.com
```

## Messenger And Calls

Messenger real-time application features use Reverb:

- messages
- typing whispers
- online/presence state
- notifications and inbox updates
- call invitations and call state updates

LiveKit handles only media:

- audio
- video
- screen sharing
- network quality/media sessions

Laravel authorizes and persists:

- call participants and media identities
- LiveKit join tokens
- call events
- recording consent
- recording audit state
- LiveKit webhooks

Recording control and audit state are implemented in Laravel. The self-hosted Egress service is included in the infrastructure, but production recording should be verified end-to-end against LiveKit Egress storage before enabling it for users.

## Testing

Run the full PHP test command:

```bash
composer run test
```

Run focused Messenger/media tests:

```bash
php artisan test tests/Feature/MessengerMediaTest.php tests/Feature/MessengerTest.php
```

Frontend and build checks:

```bash
npm run lint:check
npm run format:check
npm run types:check
npm run build
```

Full local CI command:

```bash
composer run ci:check
```

If the worktree contains unreadable generated folders, global lint/status commands can fail before reaching application files. Fix filesystem permissions or remove those generated folders outside Git if they are not needed.

## Production Deployment Overview

A production deployment has four runtime layers:

1. PHP application server
2. queue worker and scheduler
3. Reverb WebSocket server
4. LiveKit media server stack

Recommended public host layout:

```text
app.example.com      Laravel HTTPS application
ws.example.com       Reverb WSS application events
media.example.com    LiveKit WSS/API
turn.example.com     TURN/TLS, if separated from media host
```

You may host them on the same machine for a small deployment, but keep separate processes and reverse proxy routes. Do not proxy LiveKit media through Laravel.

## Production Build And Release

On the server or CI runner:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
```

Laravel's `optimize` command caches production configuration, routes, events, and views. If you change `.env`, routes, config, or service bindings after deployment, rerun:

```bash
php artisan optimize:clear
php artisan optimize
```

Ensure writable directories are owned by the PHP user:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache
```

Adjust the user/group for your server.

## PHP Server Production

A typical Nginx + PHP-FPM setup serves `public/` as the document root:

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;
    root /var/www/onepad/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Set production environment values:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.example.com
SESSION_SECURE_COOKIE=true
```

Use a production database and persistent cache/session/queue stores. Redis is recommended when you scale workers or Reverb.

## Queue Workers And Scheduler

Run queue workers as supervised processes:

```bash
php artisan queue:work --sleep=3 --tries=3 --max-time=3600
```

With Supervisor, point the command at the project directory and restart workers after each deploy:

```bash
php artisan queue:restart
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart onepad-worker:*
```

Run the scheduler every minute from cron:

```cron
* * * * * cd /var/www/onepad && php artisan schedule:run >> /dev/null 2>&1
```

## Reverb Production

Reverb should run as its own long-lived process:

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

Example production `.env`:

```ini
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=onepad-prod
REVERB_APP_KEY=replace-with-key
REVERB_APP_SECRET=replace-with-secret

REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

REVERB_HOST=ws.example.com
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

The `REVERB_SERVER_*` variables define where the Reverb process listens. The `REVERB_HOST`, `REVERB_PORT`, and `REVERB_SCHEME` variables define the public endpoint used by Laravel and browser clients.

Example Nginx reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name ws.example.com;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass http://127.0.0.1:8080;
    }
}
```

If running multiple Reverb nodes, enable scaling and back it with Redis:

```ini
REVERB_SCALING_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## LiveKit Production

Use the files in `infra/livekit/` as a starting point, then replace development keys and local ports.

Recommended production LiveKit settings:

- public TLS endpoint: `wss://media.example.com`
- API/WebSocket upstream: LiveKit `7880/TCP`
- TCP fallback: `7881/TCP`
- media UDP range: `50000-60000/UDP`, or another dedicated open range
- TURN UDP/TCP: `3478`
- TURN TLS: `5349`, or `443` if required by your network design
- Redis enabled for production LiveKit coordination
- LiveKit Egress enabled if recording is enabled

Production Laravel media environment:

```ini
MEDIA_ENABLED=true
MEDIA_PROVIDER=livekit
LIVEKIT_URL=wss://media.example.com
LIVEKIT_API_KEY=replace-with-livekit-key
LIVEKIT_API_SECRET=replace-with-livekit-secret
LIVEKIT_WEBHOOK_SECRET=replace-with-webhook-secret
MEDIA_TOKEN_TTL=600
CALL_MAX_VIDEO_PARTICIPANTS=4
CALL_MAX_AUDIO_PARTICIPANTS=8
CALL_RECORDING_ENABLED=true
CALL_RECORDING_RETENTION_DAYS=30
CALL_RECORDING_DISK=private
```

Production LiveKit reverse proxy should terminate TLS and pass WebSocket/API traffic to LiveKit:

```nginx
server {
    listen 443 ssl http2;
    server_name media.example.com;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass http://127.0.0.1:7880;
    }
}
```

Open firewall ports:

```text
443/TCP              LiveKit public WSS/API through reverse proxy
7881/TCP             LiveKit TCP fallback, if exposed directly
50000-60000/UDP      LiveKit media range, or your configured range
3478/UDP+TCP         TURN
5349/TCP             TURN over TLS
```

LiveKit webhooks must reach Laravel:

```text
POST https://app.example.com/media/livekit/webhooks
```

Keep the webhook secret aligned between Laravel and LiveKit configuration.

## Production Deploy Checklist

1. Pull or release the new code.
2. Install backend dependencies with `composer install --no-dev --optimize-autoloader`.
3. Install frontend dependencies with `npm ci`.
4. Build assets with `npm run build`.
5. Update `.env` with production app, DB, Reverb, LiveKit, mail, filesystem, and queue values.
6. Run `php artisan migrate --force`.
7. Run `php artisan optimize`.
8. Restart PHP-FPM.
9. Restart queue workers.
10. Restart Reverb.
11. Restart or deploy LiveKit/Redis/Egress/Coturn.
12. Verify app HTTPS, Reverb WSS, LiveKit WSS, UDP media, TURN fallback, and webhooks.

## Operational Checks

Application:

```bash
php artisan about
php artisan migrate:status
php artisan queue:failed
```

Reverb:

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

LiveKit local stack:

```bash
cd infra/livekit
docker compose ps
docker compose logs livekit --tail=100
docker compose logs egress --tail=100
docker compose logs coturn --tail=100
```

Build/test:

```bash
composer run test
npm run lint:check
npm run types:check
npm run build
```

## Manual QA After Deployment

Verify these flows before enabling the deployment for users:

- login and two-factor authentication
- dashboard, bravos, challenges, rewards, notifications
- direct messenger conversation
- group messenger conversation
- typing indicator
- online/presence indicator
- file transfer for image, audio, and video messages
- read receipts, message likes, edit, delete, replies
- 1:1 audio call
- 1:1 video call
- group video call up to the configured limit
- group audio call up to the configured limit
- screen sharing
- leave/rejoin call
- LiveKit unavailable state does not break messaging
- Reverb unavailable state shows real-time degradation but does not break normal HTTP pages
- recording consent and recording audit flow, if recording is enabled
- LiveKit webhook events are stored once and are idempotent

## Troubleshooting

Clear stale Laravel caches:

```bash
php artisan optimize:clear
```

Rebuild frontend assets:

```bash
npm run build
```

Restart queue workers after deploy:

```bash
php artisan queue:restart
```

Check broadcast/Reverb environment:

```ini
BROADCAST_CONNECTION=reverb
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_HOST=your-public-ws-host
REVERB_PORT=443
REVERB_SCHEME=https
```

If messages work over HTTP but real-time updates fail, inspect:

- browser console WebSocket errors
- Reverb process logs
- reverse proxy WebSocket upgrade headers
- `VITE_REVERB_*` values baked into the current frontend build

If calls fail but messaging works, inspect:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
- browser permission prompts for camera/microphone
- LiveKit container logs
- public WSS reachability to LiveKit
- UDP media port firewall rules
- TURN connectivity for restrictive networks

If Docker on Windows cannot bind LiveKit UDP ports, choose a non-reserved UDP range and update both Compose and LiveKit config.
