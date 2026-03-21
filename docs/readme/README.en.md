[한국어](./README.ko.md) | **English** | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Português (BR)](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT!

A multiplayer online turn-based strategy card game where two hidden teams—Agents and Spies—battle for dominance through deception and strategy.

**Live Demo:** [https://shot.game/](https://shot.game/)

**Build Status:** Alpha (v0.0.1-alpha) | **License:** MIT

---

## Overview

SHOT! is a social deduction card game designed for 5–12 players. Players are secretly divided into two teams: the **Agent Team** (majority, trying to identify and eliminate Spies) and the **Spy Team** (minority, trying to eliminate all Agents while hiding their identities).

Unlike traditional card games, SHOT! emphasizes information hiding, social deduction, and strategic decision-making. Each turn, players draw cards, manage their HP (health points), and take actions that may reveal clues about their true role.

### Key Highlights

- **5–12 players** per game (humans, AI bots, or a mix)
- **9 languages** supported (Korean, English, Chinese, Japanese, Spanish, Portuguese, French, Russian, German)
- **AI-powered opponents** via external API (supports Claude, GPT, DeepSeek, and more)
- **Complete replay system** with playback, likes, and bookmarks
- **Real-time multiplayer** via Server-Sent Events (SSE) and Redis Pub/Sub
- **Progressive Web App (PWA)** support
- **OAuth authentication** via Google Login or traditional email/password signup

---

## Features

### Gameplay

- **Secret Role Assignment**: Players are randomly assigned as Agent or Spy at game start
- **HP & Card Management**: Start with 3 HP and 2 cards; draw 2 more each turn
- **Four Card Types**:
  - **Attack** (-1 HP): Deal damage to target
  - **Heal** (+1 HP): Restore target's HP
  - **Jail** (skip 1–2 turns): Prevent target from attacking
  - **Inspect** (reveal role): Determine a player's identity
- **Strategic Killing**: Eliminate an opponent to gain +1 HP and draw +1 extra card
- **Turn Timer**: 2-minute auto-attack if player doesn't act
- **Draw Condition**: Game ends in a draw if turn count exceeds (Player Count × 3)

### Multiplayer & AI

- **Real-time Synchronization**: All players see game state updates instantly
- **AI Bot Integration**: External bots can join games via REST API
- **Mixed Games**: Play with human and AI opponents in the same session
- **Bot Management**: Admin panel to configure AI providers (Claude, GPT, DeepSeek, etc.)

### Social Features

- **Game Replays**: Every game action is recorded and can be replayed
- **Like & Bookmark**: Users can like and bookmark interesting replays
- **Player Profiles**: View stats, past games, and performance metrics
- **Global Statistics**: See leaderboards and aggregate game statistics

### Localization

- **9 Languages**: Full UI support for Korean, English, Chinese, Japanese, Spanish, Portuguese, French, Russian, and German
- **Automatic Language Detection**: Browser language is detected and users are auto-redirected
- **Regional Routing**: SEO-optimized landing pages for each language

### Security & Performance

- **JWT Authentication**: Secure token-based session management
- **Google OAuth 2.0**: Third-party authentication support
- **Rate Limiting**: Nginx-enforced request throttling
- **HTTPS/SSL**: Let's Encrypt-managed certificates with auto-renewal
- **Redis Caching**: Fast in-memory data operations and Pub/Sub messaging
- **Database Indexing**: Optimized PostgreSQL queries

---

## How to Play

### Game Setup

1. **Create or Join a Room**: The host selects 5–12 players and starts the game
2. **Role Assignment**: The system randomly assigns roles (e.g., 3 Spies, 6 Agents in a 9-player game)
3. **Spies Identify Each Other**: Spies see each other's identities; Agents do not see roles
4. **Game Begins**: Players take turns clockwise, starting from a random player

### Turn Structure

1. **Draw Phase**: Draw 2 cards
2. **Action Phase**: Choose one of the following:
   - **Attack**: Deal 1 damage to a target (must use ≥1 attack card per turn unless jailed)
   - **Heal**: Restore 1 HP to self or another player
   - **Jail**: Lock target's attack for the next 1–2 turns
   - **Inspect**: Reveal a target's role (cannot inspect confirmed identities)
3. **Card Management**: Discard cards exceeding your hand limit or lose them automatically

### Winning Conditions

- **Agent Team Wins**: All Spies are eliminated
- **Spy Team Wins**: All non-Spy Agents are eliminated
- **Draw**: Turn limit (Player Count × 3) is reached with both teams alive

### Card Limits & Deck Composition

| Card   | Max Hand | Deck Total | Notes                               |
|--------|----------|------------|------------------------------------|
| Attack | 6        | Players × 5 | Must use ≥1 per turn              |
| Heal   | 2        | Players × 2 | Can target self or others          |
| Jail   | 1        | Players × 1 | Only one Jail card per player     |
| Inspect| Unlimited| Spies × 2  | Cannot inspect confirmed roles    |

---

## Technology Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | Go | 1.25+ |
| **Framework** | Fiber | v2 |
| **Database** | PostgreSQL | 17+ |
| **ORM** | GORM | latest |
| **Cache/Messaging** | Redis | 7+ |
| **Auth** | JWT + Google OAuth 2.0 | golang-jwt/jwt v5 |
| **Cryptography** | bcrypt | golang.org/x/crypto |

**Key Dependencies**:
- `github.com/gofiber/fiber/v2` — HTTP router & middleware
- `gorm.io/driver/postgres` — PostgreSQL driver
- `github.com/redis/go-redis/v9` — Redis client
- `golang-jwt/jwt` — JWT token management
- `golang.org/x/oauth2` — Google OAuth integration

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | Astro | 5.0+ |
| **Language** | TypeScript | 5.0+ |
| **Styling** | Tailwind CSS | 3.4+ |
| **Package Manager** | Bun | latest |
| **i18n Runtime** | Paraglide (inlang) | latest |
| **Build Output** | Static Site Generation (SSG) | — |

**Key Dependencies**:
- `@astrojs/tailwind` — Tailwind integration
- `@astrojs/sitemap` — XML sitemap generation
- `@inlang/paraglide-astro` — Multi-language runtime

### Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Containerization** | Docker Compose | Multi-service orchestration |
| **Reverse Proxy** | Nginx (Alpine) | SSL termination, rate limiting, security headers |
| **SSL/TLS** | Let's Encrypt + Certbot | Auto-renewal via Docker |
| **Build Automation** | Makefile | Common development tasks |

---

## Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended) or local Go 1.25+ & Node.js/Bun
- **PostgreSQL 17+** and **Redis 7+** (if running locally)
- **Git**

### Installation (Docker Compose)

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd SHOT
   ```

2. **Copy and configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** with your values (see [Environment Variables](#environment-variables) below)

4. **Start services**:
   ```bash
   docker compose up -d
   ```

5. **Access the application**:
   - Frontend: `http://localhost` (or `https://shot.game` in production)
   - Backend API: `http://localhost:3000` (or same domain as frontend via Nginx)

### Installation (Local Development)

**Backend (Go)**:
```bash
cd backend
cp .env.example .env
# Edit .env with local DB credentials
go run main.go
```

**Frontend (Bun)**:
```bash
cd frontend
bun install
bun run dev
```

### Building for Production

**Using Docker Compose** (recommended):
```bash
docker compose -f docker-compose.prod.yml up -d
# Or with SSL setup:
bash init-letsencrypt.sh
```

**Manual Build**:
```bash
# Backend
cd backend && go build -o shot

# Frontend
cd frontend && bun run build
```

---

## Environment Variables

All environment variables are defined in `.env` at the project root. Create this file by copying `.env.example`:

```bash
cp .env.example .env
```

### Database

| Variable | Purpose | Example |
|----------|---------|---------|
| `DB_USER` | PostgreSQL username | `shot` |
| `DB_PASSWORD` | PostgreSQL password | (generate strong password) |
| `DB_NAME` | Database name | `shot` |
| `DB_HOST` | Database host (Docker: set in docker-compose.yml) | `postgres` |
| `DB_PORT` | Database port | `5432` |

### Authentication

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | Secret key for JWT signing | (generate with `openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (from Google Cloud Console) |

**Generate a secure JWT secret**:
```bash
openssl rand -hex 32
```

### URLs

| Variable | Purpose | Example |
|----------|---------|---------|
| `FRONTEND_URL` | Public frontend URL | `https://shot.game` or `http://localhost` |
| `BACKEND_URL` | Public backend URL | `https://shot.game` or `http://localhost:3000` |
| `PUBLIC_API_URL` | Frontend's API endpoint (optional) | Leave empty to use relative paths (`/api/...`) |

**Notes**:
- In production with Nginx proxy, `FRONTEND_URL` and `BACKEND_URL` can be the same domain
- If frontend and backend are on different domains, set `PUBLIC_API_URL` to the backend's full URL
- Google OAuth redirect URI: `{BACKEND_URL}/api/auth/google/callback`

### Production (SSL/Let's Encrypt)

| Variable | Purpose | Example |
|----------|---------|---------|
| `DOMAIN` | Domain name for SSL certificate | `shot.example.com` |
| `CERTBOT_EMAIL` | Email for Let's Encrypt notifications | `admin@example.com` |
| `STAGING` | Use Let's Encrypt staging (0 = production, 1 = staging) | `0` |

**Enable SSL**:
```bash
bash init-letsencrypt.sh
```

---

## Project Structure

```
SHOT/
├── backend/                 # Go backend (Fiber, GORM, PostgreSQL, Redis)
│   ├── main.go             # Entry point
│   ├── db/                 # Database & Redis setup
│   ├── models/             # GORM data models
│   ├── handlers/           # HTTP request handlers
│   ├── game/               # Game engine & logic
│   ├── hub/                # Real-time messaging (SSE, Pub/Sub)
│   └── scripts/            # Utility scripts
├── frontend/               # Astro + TypeScript frontend
│   ├── src/
│   │   ├── pages/          # Astro pages (SSG routes)
│   │   ├── components/     # Reusable components
│   │   ├── layouts/        # Page templates
│   │   └── i18n/           # Internationalization strings
│   ├── astro.config.mjs    # Astro configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
├── docs/                    # Documentation
│   ├── readme/             # README files (multi-language)
│   ├── rulebook.md         # Game rules (English)
│   └── SPEC.md             # Technical specification
├── nginx/                  # Nginx configuration
│   ├── 00-rate-limit.conf  # Rate limiting rules
│   ├── 01-security.conf    # Security headers
│   └── ...
├── e2e/                    # End-to-end tests
├── docker-compose.yml      # Development setup
├── docker-compose.prod.yml # Production setup
└── Makefile               # Build automation
```

---

## API Overview

The backend exposes RESTful endpoints for game, user, and bot management. All requests require authentication via JWT token (except login/signup).

### Authentication

- **Signup**: `POST /api/auth/signup` — Create account with email/password
- **Login**: `POST /api/auth/login` — Authenticate and receive JWT token
- **Google OAuth**: `GET /api/auth/google` → `GET /api/auth/google/callback` — OAuth flow

### Game Management

- **Create Room**: `POST /api/rooms` — Start a new game session
- **Join Room**: `POST /api/rooms/{roomId}/join` — Add player to game
- **Start Game**: `POST /api/rooms/{roomId}/start` — Begin gameplay
- **Play Turn**: `POST /api/games/{gameId}/action` — Execute turn action
- **Get Game State**: `GET /api/games/{gameId}` — Retrieve current game state

### Real-time Sync

- **Room SSE**: `GET /api/rooms/{roomId}/sse` — Stream room updates
- **Session SSE**: `GET /api/session/sse` — Stream user session updates

### Replays

- **List Replays**: `GET /api/replays` — Get all recorded games
- **Get Replay**: `GET /api/replays/{gameId}` — Fetch specific replay
- **Like Replay**: `POST /api/replays/{gameId}/like` — Add like to replay
- **Bookmark Replay**: `POST /api/replays/{gameId}/favorite` — Save to bookmarks

### Player Stats

- **Get Profile**: `GET /api/users/{userId}` — Fetch user profile & stats
- **Global Stats**: `GET /api/stats` — Retrieve leaderboards & aggregate data

### Bot Management

- **List Bots**: `GET /api/bots` — User's bot instances
- **Create Bot**: `POST /api/bots` — Register new AI bot
- **Delete Bot**: `DELETE /api/bots/{botId}` — Remove bot

For detailed API documentation, refer to the [backend spec report](../../backend-spec-report.md).

---

## Real-time Communication

SHOT! uses **Server-Sent Events (SSE)** for real-time updates and **Redis Pub/Sub** for inter-service messaging:

### SSE Client Connection

Clients open an SSE connection to:
- `GET /api/rooms/{roomId}/sse` — Subscribe to room events
- `GET /api/session/sse` — Subscribe to personal notifications

### Message Types

- `game-state-update` — Game state changed (HP, cards, turn)
- `action` — Player took an action (attack, heal, jail, inspect)
- `player-joined` — New player entered the room
- `player-left` — Player disconnected
- `game-ended` — Game finished with winner/draw
- `notification` — System message (e.g., "You were jailed")

---

## Deployment

### Docker Compose (Development)

```bash
docker compose up -d
```

Services:
- `postgres` — PostgreSQL database on port 5432
- `redis` — Redis cache on port 6379
- `backend` — Go API on port 3000
- `frontend` — Nginx static site on port 80

### Docker Compose (Production)

```bash
# 1. Set up SSL with Let's Encrypt
bash init-letsencrypt.sh

# 2. Start production services
docker compose -f docker-compose.prod.yml up -d
```

**Key Differences**:
- SSL termination at Nginx (HTTPS on 443)
- Automatic certificate renewal via Certbot
- Rate limiting enabled
- Security headers applied

### Manual Deployment

For non-Docker deployments:

1. **Install dependencies**:
   ```bash
   # Backend: Go 1.25+, PostgreSQL 17+, Redis 7+
   # Frontend: Node.js 18+ or Bun
   ```

2. **Build backend**:
   ```bash
   cd backend && go build -o shot
   ```

3. **Build frontend**:
   ```bash
   cd frontend && npm install && npm run build
   ```

4. **Set up Nginx**: Copy configs from `nginx/` directory

5. **Run services**:
   ```bash
   ./shot &                    # Backend
   serve frontend/dist/ &      # Frontend (or use Nginx)
   redis-server &              # Redis
   postgres &                  # PostgreSQL
   ```

---

## Configuration

### Nginx Rate Limiting

Edit `nginx/00-rate-limit.conf` to customize:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### Game Parameters

Modify in `backend/game/engine.go`:
- Initial HP: `const InitialHP = 3`
- Starting cards: `const StartingCards = 2`
- Cards per turn: `const CardsPerTurn = 2`
- Turn timer: `const TurnTimer = 2 * time.Minute`

### Supported Languages

Frontend: Add language code to `frontend/astro.config.mjs`:
```javascript
i18n: {
  defaultLocale: 'ko',
  locales: ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'],
}
```

---

## Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to database"
- **Solution**: Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
- Verify PostgreSQL is running: `docker ps | grep postgres`

**Problem**: "Connection refused" on port 3000
- **Solution**: Ensure backend service started: `docker logs backend`

### Authentication Errors

**Problem**: "Invalid JWT token"
- **Solution**: Regenerate `JWT_SECRET` and restart backend: `openssl rand -hex 32`

**Problem**: "Google OAuth redirect mismatch"
- **Solution**: Register `{BACKEND_URL}/api/auth/google/callback` in Google Cloud Console

### Real-time Sync Lag

**Problem**: Game state not updating in real-time
- **Solution**: Check Redis connection in logs: `docker logs backend | grep redis`
- Restart Redis: `docker restart redis`

### Build Failures

**Problem**: "Port 5432 already in use"
- **Solution**: Stop existing services: `docker compose down`

**Problem**: "Module not found" in Go
- **Solution**: Run `go mod tidy` in `backend/` directory

---

## Development

### Running Tests

**Backend**:
```bash
cd backend && go test ./...
```

**Frontend**:
```bash
cd frontend && npm test
```

### Code Style

- **Backend**: Follow `gofmt` standards; run `go fmt ./...`
- **Frontend**: Use Prettier; run `npm run format`

### Building Locally

**Backend**:
```bash
cd backend
go run main.go
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview build output
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature/my-feature`
5. Submit a Pull Request

### Code Review Guidelines

- All code must pass linting (gofmt for Go, Prettier for TypeScript)
- Tests required for new features
- Documentation updates for API changes
- No secrets or credentials in commits

---

## License

SHOT! is released under the **MIT License**. See [LICENSE](../../LICENSE) for details.

---

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/epsilondelta/shot/issues)
- **Discussions**: Join our community at [GitHub Discussions](https://github.com/epsilondelta/shot/discussions)
- **Live Demo**: Play at [https://shot.game/](https://shot.game/)

---

## Credits

**SHOT!** is developed and maintained by the core team. Special thanks to:
- Fiber framework for a performant Go HTTP server
- Astro for a modern static site generator
- Inlang Paraglide for i18n at build time
- PostgreSQL and Redis for reliable data storage and messaging

---

**Last Updated**: March 21, 2026
**Version**: 0.0.1-alpha
**Status**: Active Development
