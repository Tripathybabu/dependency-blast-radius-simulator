# Dependency Blast Radius Simulator

An interactive platform for modeling service dependencies, simulating failures, and analyzing blast radius impact across distributed systems.

## Features

- **Service Management** — CRUD for services with criticality, status, owner, and metadata
- **Dependency Mapping** — Define and visualize dependencies with circular dependency detection
- **Interactive Graph** — React Flow-powered DAG with color-coded nodes and animated edges
- **Failure Simulation** — Select one or more services to fail; compute impacted services via BFS
- **Blast Radius Analysis** — Direct vs. indirect impact, severity scoring, dependency depth
- **Dependency Path Exploration** — Inspect the exact path that caused a service to be impacted
- **Real-Time Updates** — Socket.io broadcasts simulation events to all connected clients
- **Historical Simulations** — Persist and revisit past simulation results
- **Search & Filtering** — Filter services by status, criticality, and owner
- **Service Health Dashboard** — At-a-glance overview of healthy, degraded, and failed services

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Frontend | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS, Radix UI |
| Graph | React Flow (reactflow) |
| Data Fetching | TanStack React Query |

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) or a local PostgreSQL instance
- npm 8+

## Installation & Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd dependency-blast-radius-simulator
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

### 3. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/blast_radius_db"
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### 4. Run database migrations and seed

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
cd ..
```

### 5. Start the application

```bash
# Run both backend and frontend in parallel
npm run dev
```

- Backend: http://localhost:4000
- Frontend: http://localhost:3000

## Running Tests

There are no automated tests in this iteration. Manual testing is done via the UI and the seed data provides a realistic starting scenario.

## API Endpoints

### Services
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/services` | List all services (supports `?search=`, `?status=`, `?criticality=`, `?owner=`) |
| GET | `/api/services/stats` | Health dashboard counts |
| GET | `/api/services/:id` | Get single service with dependencies |
| POST | `/api/services` | Create service |
| PATCH | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |

### Dependencies
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dependencies` | List all dependencies |
| POST | `/api/dependencies` | Create dependency (with circular check) |
| DELETE | `/api/dependencies/:id` | Remove dependency |

### Simulations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/simulations` | List all simulations |
| GET | `/api/simulations/:id` | Get simulation detail |
| POST | `/api/simulations` | Run a new simulation |
| DELETE | `/api/simulations/:id` | Delete simulation |

## Assumptions

1. **Dependency direction**: `A depends on B` means if B fails, A is impacted (not the reverse).
2. **Severity scoring**: Computed as `criticality_weight × (1/depth) × 100`; aggregated across all impacted services plus a bonus for the failed service's own criticality.
3. **Circular dependencies**: Prevented at creation time via DFS cycle detection. The current dependency graph is always a DAG.
4. **Real-time**: Socket.io is used for live simulation events. Any connected client receives the result immediately when a simulation completes.
5. **Database**: PostgreSQL is the chosen database for its strong relational integrity guarantees, JSON column support (for storing blast radius snapshots), and array type support (for `failedServiceIds` and `dependencyPath`).

## Project Structure

```
dependency-blast-radius-simulator/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema
│   │   └── seed.ts             # Demo data seed
│   ├── src/
│   │   ├── lib/
│   │   │   ├── graphAlgorithms.ts  # BFS blast radius + cycle detection
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   └── socket.ts           # Socket.io singleton
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── services.ts
│   │   │   ├── dependencies.ts
│   │   │   └── simulations.ts
│   │   └── index.ts            # Express + Socket.io entrypoint
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/                # Next.js App Router pages
│       │   ├── page.tsx        # Dashboard
│       │   ├── services/       # Service management
│       │   ├── graph/          # Interactive visualization
│       │   ├── simulate/       # Failure simulation
│       │   └── history/        # Historical simulations
│       ├── components/
│       │   ├── graph/          # React Flow nodes and graph
│       │   ├── layout/         # Sidebar navigation
│       │   ├── services/       # Service form components
│       │   ├── dashboard/      # Stat cards
│       │   └── ui/             # Radix-based UI primitives
│       └── lib/
│           ├── api.ts          # Typed API client
│           ├── socket.ts       # Socket.io client
│           └── utils.ts        # Helpers
├── docker-compose.yml
├── Architecture.md
├── Agent.md
└── README.md
```
