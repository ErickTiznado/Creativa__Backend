# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Development with nodemon hot-reload (port 3000)
npm start            # Production start
npm test             # Run Jest with ESM support (--experimental-vm-modules)
npm run test:coverage
```

There are currently no test files implemented — the Jest + Babel setup (with `babel-plugin-transform-import-meta`) is ready for ESM tests.

## Architecture

Hexagonal Architecture (Ports & Adapters) with strict dependency direction:

```
Infrastructure → Application → Domain
```

- **`src/domain/`** — Entities and domain services (prompt building, brand sanitization). No external dependencies.
- **`src/application/ports/`** — Abstract base classes defining contracts (throw `ERR_METHOD_NOT_IMPLEMENTED`). Use cases depend only on these interfaces.
- **`src/application/use-cases/`** — Orchestrate business logic using ports. Never import from infrastructure directly.
- **`src/infrastructure/`** — All adapters: Express controllers/routes (`web/`), Supabase repositories (`persistence/supabase/`), external service adapters (`external-services/`).

**Dependency wiring** happens in route files (e.g., `campaigns.routes.js`), not in `server.js`. Each route file instantiates all its dependencies (repositories, use cases, adapters, controllers) and passes them via constructor injection.

## Key Conventions

**Controllers** use class field arrow functions:
```js
class MyController {
  myMethod = async (req, res) => { ... }
}
```

**Fire-and-forget** for background tasks (vectorization, push notifications):
```js
someAsyncFn(data).catch(err => console.error('bg task failed:', err));
// No await — response is not blocked
```

**Ports** are abstract base classes — adapters extend and override all methods.

**Private methods/fields** use `#` syntax (e.g., `#prepareContent`).

## Module System

Pure ESM (`"type": "module"`). Use `import`/`export` everywhere. Babel transforms this for Jest via `babel.config.cjs`.

> **Linux import warning:** Some imports use different casing than the actual filename. This works on Windows (case-insensitive) but will fail on Linux. Normalize casing before deploying.

## Supabase

- Schema: `devschema`
- The global Supabase client (`supabaseClient.js`) already sets `db: { schema: 'devschema' }`. Do **not** call `.schema('devschema')` again in new repositories (existing ones like `SupabaseCampaignRepository` do it redundantly — don't repeat this pattern).
- `SupabaseAuthAdapter` is a **named export**: `import { SupabaseAuthAdapter } from '...'`
- `requireAuth` middleware is a **named export** from `authMiddleware.js`

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | Supabase project credentials |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON |
| `GOOGLE_PROJECT_ID` / `GOOGLE_LOCATION` | Vertex AI config |
| `GCS_BUCKET_NAME` / `GCS_PUBLIC_URL` | Google Cloud Storage |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push notifications |
| `NICOLA_SECRET` | JWT signing secret |

## Adding a New Feature (Checklist)

1. **Port** — Define interface in `src/application/ports/MyPort.js`
2. **Use Case** — Implement in `src/application/use-cases/my-feature/MyUseCase.js`, inject port via constructor
3. **Adapter** — Implement port in `src/infrastructure/` (persistence or external-services)
4. **Controller** — Class with arrow-function methods in `src/infrastructure/web/controllers/`
5. **Route** — Wire everything in `src/infrastructure/web/routes/my.routes.js`, register in `server.js`
