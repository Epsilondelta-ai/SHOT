[한국어](./README.ko.md) | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Português (BR)](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | **Deutsch**

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT! - Strategisches Kartenspiel für Agenten vs. Spione

> Ein Multiplayer-Online-Strategiespiel für 5–12 Spieler mit KI-Bots und Echtzeit-Action

**Live Demo:** [https://shot.game/](https://shot.game/)

---

## Übersicht

SHOT! ist ein innovatives Online-Strategiekartenspiel, bei dem Spieler geheim in zwei Teams eingeteilt werden: **Agenten** (Mehrheit) und **Spione** (Minderheit). Die Agenten müssen alle Spione eliminieren, während die Spione versuchen, sich als Agenten auszugeben und alle echten Agenten auszuschalten. Das Spiel verbindet psychologisches Geschicklichkeit, strategisches Denken und Kartenmanagement in einem fesselnden Echtzeit-Erlebnis.

Mit Unterstützung für 9 Sprachen, KI-Gegner (Claude, GPT, DeepSeek) und modernen Funktionen wie Wiederholungen, Likes und Lesezeichen bietet SHOT! eine vollständige Multiplayer-Gaming-Plattform für Spieler weltweit.

---

## Merkmale

- **Mehrsprachig:** Vollständige Unterstützung für Deutsch, Englisch, Koreanisch, Chinesisch, Japanisch, Spanisch, Portugiesisch, Französisch und Russisch
- **KI-Gegner:** Integration mit Claude, GPT und DeepSeek für intelligente Bot-Gegner
- **Echtzeit-Gameplay:** Server-Sent Events (SSE) mit Redis Pub/Sub für nahtloses, synchrones Spielerlebnis
- **Social Features:** Wiederholungen anschauen, Spiele liken und als Lesezeichen speichern
- **Authentifizierung:** Google OAuth 2.0 mit JWT für sichere Anmeldung
- **Progressive Web App:** Installierbar auf Desktop und Mobile Geräten
- **Replay-System:** Vollständige Spielwiederholungen mit Rundenchronologie
- **Docker & Kubernetes Ready:** Produktionsreife Containerisierung mit Nginx und Let's Encrypt

---

## Spielregeln (Kurzfassung)

### Teams & Rollen

- **Agenten** (Mehrheit): Können alle Spieler angreifen, kennen sich nicht untereinander
- **Spione** (Minderheit): Können alle angreifen, kennen sich gegenseitig, verstecken ihre Identität

### Startbedingungen

| Spieleranzahl | Spione | Agenten |
|:---:|:---:|:---:|
| 5 | 1 | 4 |
| 6 | 2 | 4 |
| 7 | 2 | 5 |
| 8 | 3 | 5 |
| 9 | 3 | 6 |
| 10 | 3 | 7 |
| 11 | 4 | 7 |
| 12 | 4 | 8 |

**Startlebenspunkte:** 3 HP pro Spieler
**Startkarten:** 2 Karten pro Spieler

### Kartentypen

| Karte | Effekt | Notizbuch |
|:---|:---|:---:|
| **Angriff** | Verursacht 1 Schaden beim Ziel | Unbegrenzt |
| **Heilung** | Stellt 1 LP wieder her (max. 3) | Begrenzt |
| **Gefängnis** | Blockiert Angriffe des Ziels für 1 Runde | 1 pro Spiel |
| **Inspektion** | Offenbart die Rolle des Ziels | Begrenzt |

### Spielfluss

1. **Ziehen:** Spieler zieht zu Beginn seines Zuges 2 Karten
2. **Aktionen:** Spieler nutzt Karten beliebig oft (Reihenfolge zählt)
3. **Pflicht:** Mindestens 1 Angriffskarte pro Zug (außer im Gefängnis oder ohne Angriffskarten)
4. **Zug beenden:** Spieler wechselt zum nächsten Spieler
5. **Töten:** Agenten/Spione, die Spione/Agenten töten, erhalten +1 LP und +1 Karte

### Siegbedingungen

- **Agenten gewinnen:** Alle Spione sind eliminiert
- **Spione gewinnen:** Alle Agenten (außer Spione) sind eliminiert
- **Unentschieden:** Spiel dauert länger als Spieleranzahl × 3 Runden

Für vollständige Regeln siehe [SHOT! Regelwerk](../rulebook.md).

---

## Tech Stack

### Frontend

| Tool | Version | Zweck |
|:---|:---|:---|
| **Astro** | 5.0+ | Meta-Framework für schnelle, statische & dynamische Seiten |
| **TypeScript** | Latest | Typsichere Programmierung |
| **Tailwind CSS** | 3.x | Utility-First CSS Framework |
| **Bun** | Latest | Schneller JavaScript Runtime & Package Manager |

### Backend

| Tool | Version | Zweck |
|:---|:---|:---|
| **Go** | 1.21+ | Backend-Sprache mit hohem Durchsatz |
| **Fiber** | 2.x | Leichtgewichtiges Web-Framework |
| **PostgreSQL** | 14+ | Relationale Datenbank |
| **Redis** | 7.x | In-Memory Cache und Pub/Sub |

### Infrastruktur

| Tool | Zweck |
|:---|:---|
| **Docker Compose** | Lokale Entwicklung und Deployment |
| **Nginx** | Reverse Proxy und Load Balancing |
| **Let's Encrypt** | HTTPS-Zertifikate |
| **SSE + Redis Pub/Sub** | Echtzeit-Kommunikation |

---

## Schnellstart

### Voraussetzungen

- **Docker & Docker Compose** (oder lokale Installationen)
- **Node.js 18+** und **Bun**
- **Go 1.21+**
- **PostgreSQL 14+** und **Redis 7+**

### Schritt 1: Repository klonen

```bash
git clone https://github.com/juunini/SHOT.git
cd SHOT
```

### Schritt 2: Umgebungsvariablen konfigurieren

Erstelle `.env` und `.env.backend` Dateien:

```bash
cp .env.example .env
cp backend/.env.example backend/.env.backend
```

Bearbeite die Dateien mit deinen Einstellungen (siehe Abschnitt [Umgebungsvariablen](#umgebungsvariablen)).

### Schritt 3: Docker Compose starten

```bash
docker-compose up -d
```

Dies startet:
- Frontend (Astro dev server auf Port 3000)
- Backend (Fiber API auf Port 8080)
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Nginx (Port 80/443)

### Schritt 4: Datenbank initialisieren

```bash
docker-compose exec backend go run ./cmd/migrate/main.go
```

### Schritt 5: Im Browser öffnen

```
http://localhost:3000
```

### Schritt 6: Spiel starten

1. Melde dich mit Google an (OAuth)
2. Erstelle ein neues Spiel oder tritt einem bei
3. Lote dich mit anderen Spielern ab und spiele!

---

## Umgebungsvariablen

### Frontend (.env)

```env
# Astro & Build
PUBLIC_API_URL=http://localhost:8080
PUBLIC_GAME_NAME=SHOT!
PUBLIC_GAME_VERSION=1.0.0

# Google OAuth
PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Sprache & Lokalisierung
PUBLIC_DEFAULT_LANGUAGE=de
PUBLIC_SUPPORTED_LANGUAGES=de,en,ko,zh-cn,ja,es,pt-br,fr,ru
```

### Backend (.env.backend)

```env
# Server
PORT=8080
ENVIRONMENT=development

# Datenbank
DATABASE_URL=postgres://user:password@localhost:5432/shot_db
REDIS_URL=redis://localhost:6379

# Authentifizierung
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=24h

# KI-Integration
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DEEPSEEK_API_KEY=your_deepseek_key

# Logging
LOG_LEVEL=info
```

### Docker Compose (.env.docker)

```env
POSTGRES_USER=shot_user
POSTGRES_PASSWORD=shot_password
POSTGRES_DB=shot_db
REDIS_PASSWORD=redis_password
```

---

## Entwicklung

### Frontend Development

```bash
cd frontend
bun install
bun dev
```

Frontend läuft auf `http://localhost:3000` mit Hot-Reload.

### Backend Development

```bash
cd backend
go mod download
go run ./cmd/server/main.go
```

Backend läuft auf `http://localhost:8080` mit Air für Auto-Reload (falls installiert).

### Tests ausführen

```bash
# Frontend Tests
cd frontend
bun test

# Backend Tests
cd backend
go test ./...
go test ./... -race  # Concurrency Tests
```

### Datenbank-Migrationen

```bash
# Migration erstellen
cd backend
go run ./cmd/migrate/main.go create -name your_migration_name

# Migration durchführen
go run ./cmd/migrate/main.go up

# Migration zurückrollen
go run ./cmd/migrate/main.go down
```

---

## Produktionsdeployment

### Mit Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Mit Kubernetes

```bash
kubectl apply -f k8s/
```

Siehe [k8s/](../../k8s/) für vollständige Kubernetes-Konfigurationen.

### Umgebungsvariablen in Produktion

Nutze einen Secret Manager (z.B. AWS Secrets Manager, HashiCorp Vault):

```bash
# Beispiel mit Kubernetes Secrets
kubectl create secret generic shot-secrets \
  --from-literal=JWT_SECRET=your_secret \
  --from-literal=GOOGLE_CLIENT_SECRET=your_secret \
  --from-literal=DATABASE_URL=postgres://...
```

---

## API-Dokumentation

### Authentifizierung

**Endpoint:** `POST /api/auth/google`

```bash
curl -X POST http://localhost:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"id_token": "google_id_token"}'
```

**Response:**
```json
{
  "access_token": "jwt_token_here",
  "user_id": "user_uuid",
  "username": "player_name"
}
```

### Spiel erstellen

**Endpoint:** `POST /api/games`

```bash
curl -X POST http://localhost:8080/api/games \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"max_players": 9, "ai_enabled": true}'
```

### Echtzeit-Updates (SSE)

**Endpoint:** `GET /api/games/{gameId}/events`

```bash
curl http://localhost:8080/api/games/game_uuid/events \
  -H "Authorization: Bearer jwt_token"
```

Server sendet Echtzeit-Updates als Server-Sent Events.

---

## Architektur-Übersicht

```
SHOT! Projekt
├── frontend/                 # Astro + TypeScript
│   ├── src/
│   │   ├── pages/           # Seiten & Routen
│   │   ├── components/      # UI-Komponenten
│   │   ├── layouts/         # Layout-Wrapper
│   │   └── utils/           # Utility-Funktionen
│   └── package.json
│
├── backend/                 # Go + Fiber
│   ├── cmd/                 # Ausführbare Programme
│   │   ├── server/          # Hauptserver
│   │   └── migrate/         # Datenbank-Migrationen
│   ├── internal/            # Private Pakete
│   │   ├── models/          # Datenmodelle
│   │   ├── handlers/        # HTTP-Handler
│   │   ├── services/        # Business-Logik
│   │   └── repo/            # Datenbankzugriff
│   ├── migrations/          # SQL-Migrationen
│   └── go.mod
│
├── docker-compose.yml       # Lokale Entwicklung
├── docker-compose.prod.yml  # Produktion
└── k8s/                     # Kubernetes-Manifeste
```

---

## Beitragen

Wir freuen uns über Beiträge! Bitte befolge diese Schritte:

1. **Fork** das Repository
2. Erstelle einen **Feature Branch** (`git checkout -b feature/deine-funktion`)
3. **Committe** deine Änderungen (`git commit -m "Funktion: Beschreibung"`)
4. **Pushe** zu deinem Branch (`git push origin feature/deine-funktion`)
5. Öffne einen **Pull Request**

### Code-Stil

- **Frontend:** ESLint + Prettier (konfiguriert in `frontend/.eslintrc` & `.prettierrc`)
- **Backend:** Go Formatter (automatisch mit `go fmt`)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

### Tests vor dem Commit

```bash
# Frontend
cd frontend && bun lint && bun test

# Backend
cd backend && go fmt ./... && go test ./...
```

---

## Lizenz

SHOT! ist unter der [MIT-Lizenz](../../LICENSE) lizenziert. Du darfst dieses Projekt frei verwenden, verändern und verteilen, solange du die Lizenzbestimmungen einhältst.

---

## Support & Kontakt

- **Hauptseite:** [https://shot.game/](https://shot.game/)
- **Issues & Bug Reports:** [GitHub Issues](https://github.com/juunini/SHOT/issues)
- **Diskussionen:** [GitHub Discussions](https://github.com/juunini/SHOT/discussions)

---

## Danksagungen

SHOT! wurde mit Liebe zu strategischen Kartenspielen und modernen Web-Technologien entwickelt. Ein großes Dankeschön an alle Beiträger und die Spieler-Community!

---

**Genießt das Spiel und viel Erfolg bei euren strategischen Kämpfen!**
