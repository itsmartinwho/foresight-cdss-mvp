# Development Environment Setup

This repository is a **polyglot** codebase consisting of a **Next.js 15 / React 19** front-end (TypeScript) and a standalone **Python 3.9+** Clinical Decision Support Engine (`clinical_engine.py`). The preferred package manager for the JavaScript workspace is **pnpm**.

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

The project uses the **latest App Router** (`src/app`) and is fully typed. ESLint/Prettier configs are inherited from `next lint` defaults.

---

## Running the Development Server

```bash
pnpm run dev
```

This boots Next.js on `http://localhost:3000` with **hot-reload**. The counter, patient list, consultation, and diagnostic advisor pages are available under their respective routes.

---

## Python Component

Refer to `.cursor/rules/python.md` for a deep dive, but the TL;DR is:

```bash
python -m venv .venv
source .venv/bin/activate
pip install pydantic>=1.10
python clinical_engine.py  # run your own tests
```

Currently the React app **mocks** CDSS behaviour in `src/lib/clinicalEngineService.ts`. No cross-language bridge exists yet.

---

## Environment Variables

The front-end doesn't need runtime env-vars for the MVP. If you add any, create a `.env.local` (ignored by git). The Python engine respects several vars (timeouts, etc.) – see its doc.

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