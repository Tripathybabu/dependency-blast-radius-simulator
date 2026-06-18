# Agent.md — AI Usage & Development Approach

## Overview

This project was built with Claude Code (claude-sonnet-4-6) as the primary AI assistant, acting as a pair-programmer throughout the entire implementation.

---

## AI Tools Used

| Tool | Purpose |
|------|---------|
| Claude Code (Claude Sonnet 4.6) | Primary implementation assistant — architecture planning, code generation, algorithm design |
| Claude Code (in-editor) | Real-time code review, type error resolution, API design iteration |

---

## Development Approach

### Phase 1 — Architecture & Planning
The assessment requirements were loaded into Claude Code as context. I discussed the architecture options (monorepo vs. separate repos, Next.js API routes vs. standalone Express, PostgreSQL vs. MongoDB) with the AI before committing to the final stack. Claude surfaced the Socket.io limitation with Next.js serverless as the key reason to use a dedicated Express backend.

### Phase 2 — Backend Implementation
Claude generated the Prisma schema, Express routes, and the two core graph algorithms (BFS blast radius, DFS cycle detection). I reviewed each file for correctness — particularly the blast radius algorithm, verifying that the reverse adjacency traversal correctly models "if B fails, A (which depends on B) is impacted."

### Phase 3 — Frontend Implementation
Claude scaffolded the Next.js App Router structure, Tailwind configuration, Radix UI components, and React Flow integration. I directed the layout decisions: sidebar navigation, split-panel simulate page, and the color-coding scheme for impact visualization.

### Phase 4 — Integration & Wiring
I worked with Claude to wire Socket.io events from the backend simulation endpoint to the frontend's real-time state updates, and to ensure React Query cache invalidation happened correctly after mutations.

### Phase 5 — Documentation
Architecture.md and this Agent.md were written collaboratively — I provided the context and constraints; Claude structured the content.

---

## Prompts & Workflows Used

Key prompt patterns during development:

1. **"Design the Prisma schema for this system"** — provided the entity definitions and asked Claude to translate them into a schema.
ma
2. **"Implement BFS blast radius traversal"** — described the domain model (source depends on target → target failure impacts source) and let Claude implement the algorithm, then verified the reverse adjacency construction was correct.

3. **"Build the React Flow graph component with impact highlighting"** — specified the color coding (red=failed, orange=direct, yellow=indirect) and node metadata requirements.

4. **"Wire Socket.io so the frontend updates in real-time when a simulation completes"** — Claude implemented both the backend emit and the frontend useEffect subscription.

5. **"Detect circular dependencies before inserting a new edge"** — described the DFS approach and asked Claude to implement it with path tracking for user-friendly error messages.

---

## What I Verified Manually

- The blast radius BFS correctly traverses the **reverse** dependency graph (not forward)
- Circular dependency detection tests: A→B→C→A is rejected; A→B + C→B is allowed
- Severity score formula produces values in expected ranges for each criticality tier
- Socket.io events arrive at the frontend before the HTTP response returns (verified in browser DevTools)
- Prisma cascade deletes remove associated dependencies and simulation results when a service is deleted

---

## Decisions I Made (Not AI)

- **Dark theme by default** — better for system monitoring tools
- **BFS over DFS for blast radius** — BFS naturally gives the minimum depth (shortest impact path) which is more meaningful for severity scoring than DFS depth-first ordering
- **Cap severity score at 1000** — prevents a single massive outage from producing a meaningless 50,000+ score
- **Layered graph layout algorithm** — implemented a Kahn's-algorithm-based topological layering instead of force-directed layout because the DAG structure makes layered positioning more readable for dependency chains
- **Denormalize blast radius as JSONB** — storing the computed result snapshot in the simulation row makes historical retrieval O(1) without re-running the algorithm
