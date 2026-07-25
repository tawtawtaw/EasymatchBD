# Hostinger deployment — EasymatchBD

EasymatchBD is an **npm workspaces monorepo**. Hostinger’s **Next.js framework preset does not work** for this repo — it injects its own `server.js` that requires `next`, but the runtime folder has no `node_modules`. That causes permanent **503 / Cannot find module 'next'** and **cannot be fixed by redeploying alone**.

## Required: delete site and recreate

Settings can only be chosen **before the first deploy**. To fix 503, **delete the current Node.js website** and create a new one with **exactly** these values:

| Setting | Value |
|---------|--------|
| Framework preset | **Other** (never Next.js) |
| Node.js | **20.x** |
| Root directory | `./` |
| Build command | `npm run build:hostinger-web` |
| Output directory | **`hostinger-deploy`** |
| Entry file | **`server.js`** |
| Environment | `NODE_ENV=production` |

After deploy, the build log must end with:

```
=== Hostinger deploy bundle ready: hostinger-deploy/ ===
```

Runtime logs should show:

```
[easymatch] Starting standalone server on port ...
```

Test:

1. `https://YOUR-URL/hostinger-health.txt` → `Hostinger deploy OK`
2. `https://YOUR-URL/en` → home page

---

## Why Next.js preset fails

| What happens | Result |
|--------------|--------|
| Hostinger Next.js preset | Injects `server.js` at line 16: `require('next')` |
| Runtime `nodejs/` folder | No `node_modules` (only build output copied) |
| Our custom `server.js` | Ignored — Hostinger uses its template |
| Monorepo | `next` lives in `apps/web`, not at deploy root |

The **`hostinger-deploy/`** folder is a **self-contained standalone bundle** (includes traced `node_modules`). With **Framework: Other** and **Entry: server.js**, Hostinger runs our launcher, which does **not** call `require('next')`.

---

## Two Hostinger apps (later)

| Site | Domain | Purpose |
|------|--------|---------|
| Web | `easymatchbd.com` | This guide |
| API | `api.easymatchbd.com` | NestJS (`apps/api`) |

Database (Supabase) and Redis (Upstash) stay external — configure via env vars in hPanel.

### API app settings (second website)

| Setting | Value |
|---------|--------|
| Framework | **Other** or NestJS |
| Build | `npm run build -w @easymatch/shared && npm run prisma:generate -w @easymatch/api && npm run build -w @easymatch/api` |
| Start / Entry | `node apps/api/dist/main.js` or `npm run start:prod -w @easymatch/api` |

After first API deploy:

```bash
cd apps/api && npx prisma migrate deploy
```

Set `NEXT_PUBLIC_API_URL` on the web app after the API is live.

---

## Local smoke test (before Hostinger)

```bash
npm run build:hostinger-web
cd hostinger-deploy
PORT=4100 node server.js
```

Open http://localhost:4100/en
