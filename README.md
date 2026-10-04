# Smart Wildlife Conservation & Anti-Poaching Monitoring System

An integrated, multi-platform monitoring and incident response system designed for Sri Lankan wildlife sanctuaries and national parks (e.g., Yala, Wilpattu, Udawalawe).

---

## 1. Project Monorepo Structure

```text
Project/
├── docs/
│   ├── architecture.md               # Complete System Architecture & Specifications
│   └── implementation-plan.md        # 5-Day Implementation Roadmap
├── packages/
│   └── shared/                       # Shared TypeScript domain contracts & types
│       └── src/
│           ├── types/                # Domain models, enums, health contracts
│           └── index.ts
├── apps/
│   ├── backend/                      # Node.js + Express + Neon PostgreSQL REST API
│   │   ├── src/
│   │   │   ├── config/               # Database pool (Neon SSL), env parser
│   │   │   ├── controllers/          # Health check & future domain controllers
│   │   │   ├── routes/               # Express routing
│   │   │   ├── middleware/           # Centralized error handler
│   │   │   ├── app.ts                # Express application factory
│   │   │   └── server.ts             # Server entry point
│   │   ├── tests/                    # Vitest unit & integration tests
│   │   └── .env.example              # Backend environment template
│   ├── web/                          # React + Tailwind CSS Web Dashboard (Desktop)
│   │   ├── src/
│   │   │   ├── App.tsx               # Command Center dashboard shell
│   │   │   ├── App.test.tsx          # Web shell unit tests
│   │   │   └── main.tsx
│   │   ├── vite.config.ts            # Vite config with backend API proxy
│   │   └── .env.example
│   └── mobile/                       # React Native + Expo Mobile Field Shell
│       ├── App.tsx                   # Ranger Field Terminal shell
│       ├── app.json                  # Expo application configuration
│       └── .env.example
├── .env.example                      # Root environment template
└── package.json                      # Workspace configuration
```

---

## 2. Prerequisites

- **Node.js:** v18.x or higher (tested on Node.js v22.x)
- **npm:** v9.x or higher (npm workspaces enabled)
- **Database:** [Neon PostgreSQL](https://neon.tech) serverless database (or local PostgreSQL)

---

## 3. Database Setup (Neon PostgreSQL)

1. Create a free account or project at [neon.tech](https://neon.tech).
2. Create a new database (e.g., `neondb`).
3. Copy your Neon connection string from the Neon console. It will look like:
   ```env
   DATABASE_URL=postgresql://neondb_owner:your_password@ep-cool-butterfly-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy the environment template into `apps/backend/.env`:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```
5. Paste your `DATABASE_URL` in `apps/backend/.env`.

> **Note on SSL:** The database client in `apps/backend/src/config/database.ts` is pre-configured with `ssl: { rejectUnauthorized: false }` for seamless compatibility with Neon's cloud serverless endpoints. If `DATABASE_URL` is omitted, the server boots in degraded mode and reports `unconfigured` on `/api/health` without crashing.

---

## 4. Running the Applications

### A. Backend API (Node.js + Express)

From the project root:

```bash
# Start backend in development mode (with hot reloading via tsx)
npm --workspace=apps/backend run dev

# Or build and run production bundle
npm --workspace=apps/backend run build
npm --workspace=apps/backend run start
```

- **API Base URL:** `http://localhost:5000`
- **Health Endpoint:** `http://localhost:5000/api/health`
- **API Welcome:** `http://localhost:5000/`

#### Health Check Verification

```bash
curl http://localhost:5000/api/health
```

Sample JSON response:
```json
{
  "status": "ok",
  "service": "smart-wildlife-backend",
  "version": "1.0.0",
  "timestamp": "2026-10-04T14:35:21.724Z",
  "uptimeSeconds": 42,
  "environment": "development",
  "database": {
    "status": "connected",
    "provider": "neon-postgres",
    "latencyMs": 35,
    "message": "Connected successfully to Neon PostgreSQL (35ms latency)."
  }
}
```

---

### B. Web Dashboard (React + Tailwind CSS)

From the project root:

```bash
# Start web development server (with hot module replacement)
npm --workspace=apps/web run dev

# Or build production static assets
npm --workspace=apps/web run build
```

- **Web Dashboard URL:** `http://localhost:5173`
- The web app automatically proxies `/api/*` requests to `http://localhost:5000/api/*`.

---

### C. Mobile Application (React Native + Expo)

From the project root:

```bash
# Start Expo development server
npm --workspace=apps/mobile start

# Or start with offline cache
npm --workspace=apps/mobile run start -- --offline
```

To run on specific targets:
- Press `w` in terminal for Web preview.
- Press `a` for Android Emulator.
- Press `i` for iOS Simulator.
- Scan QR code with the **Expo Go** mobile app on physical device.

---

## 5. Running Automated Tests

All tests use Vitest:

```bash
# Run backend tests
npm --workspace=apps/backend run test

# Run web tests
npm --workspace=apps/web run test

# Run all test suites across the monorepo
npm test
```

---

## 6. Project Foundation Verification Summary (Phase 1)

| Component | Status | Verification Detail |
|---|---|---|
| **Backend API** | Verified | Express app booted on port 5000; `/api/health` tested and responds 200 OK. |
| **Neon PostgreSQL Pool** | Verified | Health probe measures connection latency and handles missing/cold DB gracefully. |
| **Web Shell** | Verified | React + Tailwind dashboard shell built and tested; dev server serves HTTP 200 on port 5173. |
| **Mobile Shell** | Verified | Expo mobile shell with offline indicator and workflow selector validated; typechecked cleanly. |
| **Shared Contracts** | Verified | `@wildlife/shared` compiled and consumed across backend and frontend. |
| **Unit Tests** | Verified | Backend and web test suites pass cleanly with 100% success rate. |
