# Architecture

## System Overview

The Dependency Blast Radius Simulator is a monorepo fullstack application composed of three layers:

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                      │
│  Dashboard │ Services │ Graph │ Simulate │ History        │
│                   React Query + Socket.io client          │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP (REST) + WebSocket
┌───────────────────────▼──────────────────────────────────┐
│              Backend (Express + Socket.io)                 │
│   /api/services  /api/dependencies  /api/simulations      │
│              Graph Algorithms (BFS, DFS)                  │
└───────────────────────┬──────────────────────────────────┘
                        │ Prisma ORM
┌───────────────────────▼──────────────────────────────────┐
│                   PostgreSQL                              │
│  services │ dependencies │ simulations │ simulation_results│
└──────────────────────────────────────────────────────────┘
```

---

## Component Interactions

### Request Lifecycle (REST)

1. Browser sends HTTP request to Express backend.
2. Route handler validates input via Zod schemas.
3. Controller invokes Prisma to read/write PostgreSQL.
4. Response serialized as JSON and returned.

### Simulation Lifecycle (Real-time)

1. Browser POST `/api/simulations` with `{ failedServiceIds }`.
2. Backend emits `simulation:started` via Socket.io to all clients.
3. Backend fetches all services + dependencies from DB.
4. BFS blast radius algorithm runs in memory (fast, O(V+E)).
5. Results persisted to `simulations` and `simulation_results` tables.
6. Backend emits `simulation:completed` with full result payload.
7. All connected browsers receive the event and re-render in real-time.
8. HTTP response also returns the result (for non-WS consumers).

---

## Database Design

### `services`
- `id` UUID primary key
- `name` unique string
- `criticality` enum: low / medium / high / critical
- `status` enum: healthy / degraded / failed
- `owner`, `description`, `metadata` (JSONB)

### `dependencies`
- `sourceServiceId` → `targetServiceId` (unique pair)
- Meaning: "source depends on target"
- Cascade delete when either service is removed

### `simulations`
- `failedServiceIds` String[] (PostgreSQL array)
- `blastRadius` JSONB snapshot (denormalized for fast retrieval)
- `severityScore`, `impactedCount`, `maxDepth` for quick sorting

### `simulation_results`
- Per-service result rows for detailed path exploration
- `dependencyPath` String[] traces the exact graph path

### Why PostgreSQL?
- JSONB columns for flexible blast radius snapshots without extra migrations
- Array type for `failedServiceIds` and `dependencyPath`
- Strong ACID guarantees for simulation persistence
- Battle-tested for relational data with complex joins (service→dependency→simulation)

---

## Core Algorithms

### Blast Radius (BFS)

```
Input: failedServiceIds[], all services with adjacency
Output: { directlyImpacted, indirectlyImpacted, severityScore, maxDepth }

1. Build reverse adjacency map: targetId → [sourceIds that depend on it]
2. Initialize queue with failedServiceIds at depth 0
3. BFS traversal:
   a. For each node, find all dependents (reverse graph)
   b. Assign depth = parent.depth + 1
   c. depth == 1 → direct; depth > 1 → indirect
   d. severityScore = criticality_weight × (1/depth) × 100
4. Aggregate total severity + failed service criticality bonus
```

**Complexity**: O(V + E) where V = services, E = dependencies

### Circular Dependency Detection (DFS)

```
Input: existing dependencies + proposed new edge
Output: cycle path (string[]) or null

1. Build adjacency list from existing deps + proposed edge
2. DFS with visited set and in-stack set
3. If neighbor is in-stack during DFS → cycle found
4. Return the cycle path for user feedback
```

**Complexity**: O(V + E)

### Severity Scoring Formula

```
Per-service score = criticality_weight × (1 / depth) × 100

criticality_weight:
  critical → 1.0
  high     → 0.75
  medium   → 0.5
  low      → 0.25

Total severity = Σ(per-service scores) + Σ(failed service criticality bonuses)
Cap at 1000 to bound the scale.
```

---

## Design Decisions

### Monorepo Layout
Chose a simple `npm workspaces` monorepo over separate repositories. This makes it easier to share TypeScript types (if needed), run both services with a single `npm run dev`, and ship the entire project as one git repository for review.

### Express vs. Next.js API Routes
Chose a standalone Express backend over Next.js API routes to:
1. Keep the backend independently deployable and scalable
2. Use Socket.io — which requires a real HTTP server (Next.js serverless functions don't support persistent WebSocket connections)
3. Keep clear separation of concerns: frontend is purely presentation, backend is purely data + logic

### Prisma ORM
Prisma was chosen over raw SQL or other ORMs for:
- Type-safe query builder reduces runtime errors
- Schema-first migrations with `prisma migrate dev`
- Excellent TypeScript integration — generated types match the schema exactly

### React Flow
React Flow was chosen over D3.js or Cytoscape for its React-native API. It handles node dragging, zoom, pan, minimap, and edge rendering out of the box, letting us focus on domain logic (node colors, impact highlighting) rather than canvas primitives.

### TanStack React Query
All API calls are managed via React Query for:
- Automatic deduplication of concurrent requests
- Background refetching and stale-while-revalidate
- Optimistic updates on mutations
- Clean loading/error state management

### In-Memory Algorithm
The blast radius BFS runs in the Node.js process memory rather than inside PostgreSQL (e.g. recursive CTEs). Rationale:
- For the scale of a typical organization's service graph (< 10,000 nodes), in-memory BFS is instantaneous
- Recursive SQL CTEs add complexity and are harder to unit-test
- JavaScript makes it straightforward to compute and attach metadata (severity score, path array) per node during traversal

---

## Scalability Considerations

| Concern | Current approach | At scale |
|---------|-----------------|----------|
| Graph size | In-memory BFS | Redis graph or Neo4j for 100k+ nodes |
| Real-time | Single Socket.io instance | Redis adapter for multi-instance Socket.io |
| API | Single Express process | Horizontal scaling behind a load balancer |
| Database | Single PostgreSQL | Read replicas for query-heavy workloads |
| Simulation history | Stored in RDBMS | Archive to S3/cold storage for old simulations |

---

## Failure Handling Strategies

- **Circular dependency rejection**: Detected before write; API returns 409 with the cycle path displayed to the user.
- **Missing services**: Validated at simulation time; returns 404 if any `failedServiceId` doesn't exist.
- **Database errors**: Prisma P2002 (unique constraint) surfaced as 409; all other errors caught by global error handler and returned as 500.
- **Frontend errors**: React Query surfaces loading/error states on every data-dependent component; toast notifications for mutation failures.
- **WebSocket disconnection**: Socket.io auto-reconnects on client side. If the client was offline during a simulation, they can retrieve the result via the HTTP response or the history page.
