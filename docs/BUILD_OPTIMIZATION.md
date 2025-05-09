# Build Performance & Project Size Guide

This short document explains why the **`node_modules`** folder is large, why some build commands appear to download / write ~100 MB of data, and what we can (and already did) do to keep the workflow fast.

---

## 1. Why is `node_modules` ~700 MB?

The project uses several libraries that ship pre-compiled binaries (e.g. `next`, `@next/swc-darwin-arm64`, `@cloudflare/workerd`).  These packages are **required** for local development and production builds – they provide the JavaScript/TypeScript compiler (SWC) and the runtime used when we target Cloudflare.

A quick size breakdown (macOS/arm64):

| Package | Size | Reason |
|---------|------|--------|
| `next` + `@next/swc-*` | ~255 MB | The framework itself and the Rust-compiled SWC compiler that Next.js embeds. |
| `@cloudflare/workerd`  | ~80 MB  | Needed **only** when we run `pnpm run preview` (Cloudflare worker bundle). |
| `date-fns` | ~38 MB | Ships every locale (~170 files).  Only a tiny fraction ends up in the client bundle because of tree-shaking. |
| `lucide-react` | ~30 MB | All SVG icons as individual React components.  Again, tree-shaking removes the ones we don't import. |

It is normal for a modern React/Next project to have several hundred MB of dev-time dependencies.  They **do not** ship to users – the final client bundles are ~130 KB as shown by `next build`.

> The repo *does not* commit `node_modules` (it is ignored in `.gitignore`).  The large Git push you saw came from reinstalling / re-compressing packages during `pnpm install`, not from version-controlled files.

---

## 2. Observed Slow Builds – what happened?

* Running `pnpm run build` ( = `next build` ) takes ~15-20 s on an M-series Mac and produces only 7 pages.  That is healthy.
* The very long build you interrupted was most likely `pnpm run preview` or `pnpm run build:worker`.  Those scripts invoke **`opennextjs-cloudflare`** which bundles the entire app (and all of its server-side code) into a single Cloudflare Worker – that step can easily write & compress hundreds of MB.

Unless you actually need to deploy to Cloudflare Workers you can stick to:

```bash
pnpm install         # one-time
pnpm dev             # local dev server (hot-reload)
pnpm build && pnpm start   # production build / preview
```

---

## 3. Tips to Keep Things Fast

1. **Cache dependencies** – 
   * On CI/GitHub Actions enable PNPM cache with:
     ```yml
     - uses: pnpm/action-setup@v2
       with:
         cache: true
     ```
   * Locally PNPM already caches packages globally under `~/Library/pnpm/store`.  `pnpm store prune` will remove old, unused versions.

2. **Avoid full Cloudflare builds** when not needed.  Use `pnpm dev` / `next build` instead of `pnpm preview`.

3. **Lazy load heavy libraries** (future work):
   * `recharts` can be dynamically imported so it loads only on pages that show charts.
   * Icons: migrate to `lucide-react/native` imports to bundle only used icons (minor win).

4. **Remove unused locales** from `date-fns` (future task).  Example with `webpack.IgnorePlugin` or `next.config.js` once we add custom config.

---

## 4. Next Steps (tracked in GitHub Issues)

- [ ] Replace `recharts` with lighter charting lib or dynamic import (perf-nice-to-have).
- [ ] Strip `date-fns` locales via plugin.
- [ ] Evaluate if Cloudflare Worker build is actually required.

---

For now **no code-changes are required** to regain the previous quick developer experience – just use the right commands and let PNPM cache packages. 