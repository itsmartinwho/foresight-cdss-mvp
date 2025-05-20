# Development Environment Setup

This repository is a **polyglot** codebase consisting of a **Next.js 15 / React 19** front-end (TypeScript) and a standalone **Python 3.9+** script, `clinical_engine.py`. The Next.js application provides the user interface and core application logic, including an AI-powered **Advisor (Tool A)**. The `clinical_engine.py` script is a separate, non-integrated utility that serves as an early-stage prototype for a future **Diagnosis and Treatment Engine (Tool B)**. The preferred package manager for the JavaScript workspace is **pnpm**.

For details on the overall system architecture, including the Next.js frontend, Supabase backend, data layer, and descriptions of current and aspirational AI tools (Tools A, B, C, D, F), please refer to **[../../docs/architecture.md](../../docs/architecture.md)**.

---

## Prerequisites

| Tool            | Minimum Version | Installation Link |
|-----------------|-----------------|-------------------|
| Node.js         | 18 LTS          | https://nodejs.org/ |
| pnpm (CLI)      | 8               | `npm i -g pnpm` |
| Python          | 3.9             | https://python.org/ |
| pip (Python)    | 22              | Bundled with Python ≥ 3.9 |

> 💡 **Why Node 18?** Next.js 15 officially supports ≥ 18.17. Using a newer LTS (20) is also fine, but match your team's tooling.

---

## Installing JavaScript/TypeScript Dependencies

```bash
# 1. Clone the repo (if you haven't)
git clone https://github.com/<org>/foresight-cdss-mvp.git
cd foresight-cdss-mvp

# 2. Install deps using pnpm (lock-file checked-in)
pnpm install
```

The project uses the **Next.js App Router** (`src/app`) and is fully typed. ESLint/Prettier configs are inherited from `next lint` defaults. For detailed frontend architecture, see [../../docs/architecture.md](../../docs/architecture.md).

---

## Running the Development Server

```bash
pnpm run dev
```

This boots Next.js on `http://localhost:3000` with **hot-reload**. The main application views are served based on the routes defined in `src/app/`. Refer to `src/components/ForesightApp.tsx` and `docs/architecture.md` for routing and view details.

---

## Python Component (`clinical_engine.py` - Prototype for Tool B)

The `clinical_engine.py` script is a standalone Python utility, an early prototype for the aspirational **Tool B (Diagnosis and Treatment Engine)**. It is **not** the backend for the Next.js application and is not currently integrated.

For information on running and using this script independently for its prototype development, refer to [./python.md](./python.md).

The Next.js application's backend is built on **Supabase (PostgreSQL)** and custom Next.js API routes (e.g., for the AI Advisor, Tool A). See [../../docs/architecture.md#backend-architecture-and-data-layer](../../docs/architecture.md#backend-architecture-and-data-layer) for details.

---

## Environment Variables

The Next.js front-end currently does not require specific runtime environment variables for its core MVP functionality. If you add any, create a `.env.local` (ignored by git).

The standalone Python engine (`clinical_engine.py`) respects several environment variables related to its operation (timeouts, etc.) – see its dedicated documentation in [./python.md](./python.md).

For Supabase configuration (e.g., URL, anon key), these are typically managed within the Next.js application where the Supabase client is initialized (see `src/lib/supabaseClient.ts`).

---

## Common Commands

| Action                       | Command                 |
|------------------------------|-------------------------|
| Lint                         | `pnpm run lint`         |
| Production build             | `pnpm run build`        |
| Start prod server            | `pnpm run start`        |
| Type check only              | `pnpm exec tsc --noEmit`|

---

## Troubleshooting

1. **Node-gyp errors on pnpm install** → ensure Xcode CLT (macOS) or build-essentials (Linux) are present.
2. **Port 3000 is in use** → `pnpm run dev -- -p 3001`.
3. **Type mis-matches** → run `pnpm exec next lint` and follow suggestions. 