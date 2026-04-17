# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Airplane Shooter Game (`/`)
- **Type**: react-vite, frontend-only (no backend)
- **Path**: `artifacts/airplane-shooter/`
- **Description**: Browser-based 2D airplane shooting game using HTML Canvas API
- **Features**:
  - Player fighter jet controlled by WASD / arrow keys
  - Auto-fire bullets shooting upward
  - 3 enemy types: Basic (slow/low HP), Fast (quick/zigzag), Tank (slow/high HP)
  - Difficulty scaling every 30 seconds (new levels)
  - Enemy shooting starts at level 2+
  - Power-ups: Double Shot, Shield, Heal (gem drops from enemies)
  - Explosion particles and Web Audio API sound effects
  - Scrolling star background
  - HUD: lives, score, level, power-up timers
  - Start screen and Game Over screen with high score persistence (localStorage)
- **Key files**:
  - `src/pages/Game.tsx` — main React component, HUD, screens
  - `src/game/GameManager.ts` — main game loop, collision detection, level/score management
  - `src/game/entities.ts` — Player, Enemy, PlayerBullet, EnemyBullet, Particle, PowerUp, Star classes
  - `src/game/constants.ts` — all tunable game constants
  - `src/game/audio.ts` — Web Audio API sound effects

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
