# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BravoPAD** — a team recognition/feedback web app where users give "Bravos" (kudos) to colleagues, earn points, participate in challenges, and view leaderboards.

Tech stack: **Laravel 13** (PHP 8.3+) + **React 19 + TypeScript 5.7** via **Inertia.js v3**.

---

## Commands

### Initial Setup
```bash
composer run setup   # install deps, generate app key, run migrations, build assets
```

### Development
```bash
composer run dev     # starts concurrently: Laravel server + queue worker + Vite dev server
```

### Building
```bash
npm run build        # production asset build
npm run build:ssr    # SSR build
```

### Testing
```bash
composer run test    # PHP lint check + Pest test suite
php artisan test --filter=<TestName>   # run a single test
```

### Linting & Formatting
```bash
composer run lint         # fix PHP formatting (Pint)
composer run lint:check   # check PHP formatting only
npm run lint              # fix JS/TS with ESLint
npm run lint:check        # check without fixing
npm run format            # Prettier formatting
npm run format:check      # check Prettier
npm run types:check       # TypeScript type check
composer run ci:check     # full CI: all JS checks + Pest tests
```

---

## Architecture

### Request flow

All web routes go through **Inertia.js**: Laravel controllers return `Inertia::render('PageName', $props)` which hydrates a React component in `resources/js/pages/`. API-style routes return JSON and are used for the bravo feed and AI rephrasing.

### Backend (`app/`)

| Layer | Location | Role |
|---|---|---|
| Controllers | `app/Http/Controllers/` | Route handlers; thin — delegate to Eloquent |
| Models | `app/Models/` | Eloquent models with relationships |
| Auth actions | `app/Actions/Fortify/` | Fortify hooks (create user, update profile, passwords) |
| Middleware | `app/Http/Middleware/` | Standard Laravel middleware |

**Core models and relationships:**
- `User` — has many sent/received `Bravo`s; has `points_total` (denormalized, updated on each bravo)
- `Bravo` — belongs to sender `User`, receiver `User`, optional `Challenge`; many-to-many with `BravoValue` (via `bravo_bravo_value` pivot)
- `BravoValue` — predefined categories with a `multiplier` used to calculate bravo points
- `Challenge` — time-boxed events (start/end date, `points_bonus`); a bravo can be tied to an active challenge

**Points calculation:** when a Bravo is created, points = sum of selected `BravoValue.multiplier` × base, stored on the `Bravo` and added to `receiver.points_total`.

**Authentication:** Laravel Fortify with 2FA (TOTP). Routes handled in `routes/auth.php`.

### Frontend (`resources/js/`)

```
pages/        → Inertia page components (one per route)
components/   → Reusable React components; UI primitives in components/ui/ (Radix-based)
layouts/      → App / auth / settings layout wrappers
hooks/        → Custom hooks (useAppearance, useInitials, etc.)
types/        → TypeScript definitions
lib/          → Utilities (cn() for Tailwind class merging)
```

Styling uses **Tailwind CSS 4** with component variants via `class-variance-authority`. Icons come from `lucide-react`. Toasts via `sonner`. Charts via `recharts`.

Path alias `@/*` resolves to `resources/js/*`.

### Database

Default driver is **SQLite** (file: `database/database.sqlite`). Tests use SQLite in-memory. MySQL is supported via `.env`.

Migrations live in `database/migrations/`. Run them with `php artisan migrate`.

Key tables: `users`, `bravos`, `bravo_values`, `bravo_bravo_value` (pivot), `challenges`.

### Routes

- `routes/web.php` — Inertia pages (dashboard, team/leaderboard, challenges, history, shop, stats, settings)
- `routes/auth.php` — Fortify auth routes
- API-style JSON responses: bravo feed (`/bravos`), AI rephrase (`/ai/rephrase`)
