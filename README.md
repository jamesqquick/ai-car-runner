# Cloudflare Car Runner

A 3D endless-runner racing game built entirely on the Cloudflare developer platform. No origin servers, no external services -- Workers, AI, D1, Durable Objects, and Dynamic Workers running at the edge.

Players dodge obstacles on a procedurally-generated road, compete on a global leaderboard, create AI-generated game remixes by describing a theme in natural language, and spectate live races in real time.

## Features

- **3D Racing Game** -- Three.js-powered endless runner with procedural obstacle spawning, collision detection, speed lines, crash effects, and camera shake. Supports keyboard, gamepad, device tilt, and touch controls.
- **AI Remix System** -- Describe a theme (e.g. "underwater neon city") and Workers AI (Llama 3.1 8B) generates a complete game variant with custom colors, speeds, difficulty, and special mechanics. Each remix gets its own isolated Dynamic Worker.
- **AI Race Commentary** -- Real-time AI-generated commentary triggered by game events (near misses, speed milestones, crashes), spoken aloud via the browser's Speech Synthesis API.
- **Live Spectator Dashboard** -- A Durable Object with WebSocket Hibernation manages real-time connections. Spectators see live racer cards with speed, distance, and time -- updated every 500ms.
- **Global Leaderboard** -- D1-backed leaderboards with global and per-remix rankings, live polling, and in-game mini-leaderboard.
- **Remix Gallery** -- Browse and play community-created remixes with color swatches, creator attribution, and shareable QR codes.
- **Mobile Support** -- Responsive layouts, hamburger nav, on-screen touch controls, and device orientation input.

## Tech Stack

| Technology | Role |
|---|---|
| [Astro 6](https://astro.build/) | Server-rendered pages with React islands |
| [React 19](https://react.dev/) | Interactive UI components |
| [Three.js](https://threejs.org/) | 3D game rendering |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | SSR, API routes, WebSocket upgrades, custom routing |
| [Workers AI](https://developers.cloudflare.com/workers-ai/) | Llama 3.1 8B for remix generation and race commentary |
| [D1](https://developers.cloudflare.com/d1/) | SQLite database for users, scores, and remixes |
| [Durable Objects](https://developers.cloudflare.com/durable-objects/) | Real-time spectator hub with WebSocket Hibernation |
| [Dynamic Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/dynamic-workers/) | Isolated Worker instances per remix |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Cloudflare account with Workers, D1, Workers AI, and Durable Objects enabled

### Install

```bash
npm install
```

### Set Up D1

Create a D1 database and apply the schema:

```bash
wrangler d1 create car-runner-db
wrangler d1 execute car-runner-db --file=schema.sql
```

Update `wrangler.jsonc` with your database ID:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "car-runner-db",
    "database_id": "<your-database-id>"
  }
]
```

### Run Locally

```bash
npm run dev
```

This starts the Astro dev server with Cloudflare's platform proxy, giving you access to D1, Workers AI, and Durable Objects bindings locally.

### Deploy

```bash
npm run deploy
```

Builds the Astro site and deploys to Cloudflare Workers via Wrangler.

## Project Structure

```
src/
  worker.ts               # Custom Worker entry: routes /app/* to Dynamic Workers, rest to Astro
  handle-app.ts           # Dynamic Worker handler for remix configs
  spectator-hub.ts        # SpectatorHub Durable Object (WebSocket Hibernation)
  remix-config.ts         # RemixConfig type + defaults
  pages/
    index.astro           # Home / Lobby
    play.astro            # Main game
    login.astro           # Login (name + email)
    leaderboard.astro     # Leaderboard
    about.astro           # Architecture + tech explainer
    gallery/              # Community remixes gallery
    remix/                # Remix creation + per-remix lobby/play
    spectate/             # Real-time spectator dashboard
    ws/                   # WebSocket upgrade endpoint
    api/                  # API routes (login, score, leaderboard, commentary, remix, qr, health)
  components/
    game/
      GameCanvas.tsx      # Three.js game engine: scene, physics, input, scoring
      HUD.tsx             # In-game overlay (score, speed, lives, countdown)
      CommentaryOverlay.tsx
      TouchControls.tsx   # Mobile touch input
    LoginScreen.tsx
    LobbyScreen.tsx
    PlayPage.tsx
    LeaderboardPage.tsx
    GalleryGrid.tsx
    RemixChat.tsx         # Chat UI for AI remix creation
    SpectatorDashboard.tsx
    AboutPage.tsx
  lib/
    api.ts                # Client-side API helpers
    config.ts             # Remix config resolution + game constants
    engine/physics.ts     # AABB + near-miss collision detection
    scene/                # Three.js scene setup
    models/               # 3D models (car, road, obstacles, scenery)
    effects/              # Particle effects (speed lines, crash)
    services/             # Commentary + spectator WebSocket services
  layouts/
    BaseLayout.astro      # HTML shell (fonts: Orbitron + Inter)
    PageLayout.astro      # Nav header + user dropdown
  styles/
    global.css            # Design tokens, reset, buttons, responsive rules
schema.sql                # D1 database schema
wrangler.jsonc            # Cloudflare bindings config
```

## Cloudflare Bindings

Configured in `wrangler.jsonc`:

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 Database | Users, scores, remixes |
| `AI` | Workers AI | Llama 3.1 8B inference |
| `SPECTATOR_HUB` | Durable Object | Real-time WebSocket hub |
| `LOADER` | Worker Loaders | Dynamic Worker instances for remixes |
| `ASSETS` | Static Assets | Astro build output |

## Database Schema

Three tables in D1:

- **users** -- `id`, `name`, `email`, `created_at`
- **scores** -- `id`, `user_id`, `score`, `remix_id`, `created_at` (indexed by score DESC, user, and remix)
- **remixes** -- `id`, `user_id`, `prompt`, `config`, `created_at`

## License

MIT
