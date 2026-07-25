# Hostinger deployment — EasymatchBD

EasymatchBD is an **npm workspaces monorepo** (web + API + mobile). Hostinger **Node.js Web Apps** deploy **one app per website**.

## Recommended: two Hostinger Node.js apps

| Site | Domain (example) | Purpose |
|------|------------------|---------|
| Web | `easymatchbd.com` | Next.js (`apps/web`) |
| API | `api.easymatchbd.com` | NestJS (`apps/api`) |

Database (Supabase) and Redis (Upstash) stay external — configure via env vars in hPanel.

---

## Web app settings (hPanel) — IMPORTANT

**Repository:** `tawtawtaw/EasymatchBD`  
**Branch:** `master`  
**Root directory:** `./` (repo root — required for workspaces)

| Setting | Value |
|---------|--------|
| Framework preset | **Next.js** (never **Other**) |
| Node.js | **20.x** |
| Build and output | **Default for Next.js** — do **not** customize |
| Environment | `NODE_ENV=production` |

Hostinger defaults should be:

- Build: `npm run build` → runs web-only monorepo build via root `package.json`
- Output: `.next` → postbuild copies `apps/web/.next` to repo root
- Start: `npm run start -- -p $PORT` → runs `node app.js` → `next start` in `@easymatch/web`

**Do not set a custom output directory** (`hostinger-app`, `apps/web/.next`, etc.). Custom outputs are treated as static files → **403 Forbidden**.

Settings can only be chosen **before the first deploy**. To change them later, delete the website and recreate it.

---

## API app settings (second website)

| Setting | Value |
|---------|--------|
| Install | `npm ci` |
| Build | `npm run build -w @easymatch/shared && npm run prisma:generate -w @easymatch/api && npm run build -w @easymatch/api` |
| Start | `npm run start:prod -w @easymatch/api` |

Copy production values from `apps/api/.env.example` (never commit `.env`).

After first deploy, run once (SSH or Hostinger terminal):

```bash
cd apps/api && npx prisma migrate deploy
```

---

## Fix for HTTP 503 Service Unavailable

503 means Hostinger’s proxy is up but the **Node process is not running** (or crashed on start).

503 with `Cannot find module 'next'` in `/nodejs/server.js` means Hostinger runs **`server.js`** inside the **`.next` output folder**, which has **no `node_modules`**. Postbuild now writes **`.next/server.js`** (standalone launcher, no `next` require).

| Cause | Fix |
|-------|-----|
| Hostinger runs `nodejs/server.js` | Postbuild copies launcher to `.next/server.js` |
| Output folder has no `node_modules` | Launcher starts `.next/standalone/apps/web/server.js` instead |
| Default Hostinger template requires `next` | Overridden by our standalone launcher |

---

| Cause | Fix |
|-------|-----|
| Framework **Other** | Recreate site with **Next.js** preset |
| Custom output directory | Recreate using **Default for Next.js** only |
| Domain on WordPress / static site | Attach domain to Node.js app |
| Node not running | Use defaults so Hostinger runs `npm start` |

### Quick test after deploy

1. `https://YOUR-TEMP-URL.hostingersite.com/hostinger-health.txt` → should show `Hostinger deploy OK`
2. `https://YOUR-TEMP-URL.hostingersite.com/en` → Easymatch home page

If (1) works but (2) is 403/404, Node routing issue — open Hostinger live chat and ask them to verify the Node.js process is running.

If (1) also 403, domain is not pointing at the Node.js app.

---

## Local production smoke test (before Hostinger)

```bash
cd EasymatchBD
npm ci
npm run build
PORT=4100 npm start
```

Open http://localhost:4100/en
