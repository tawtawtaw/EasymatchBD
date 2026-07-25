# Hostinger deployment — EasymatchBD

Production setup uses **two Hostinger Node.js websites** from the same GitHub repo.

| Site | Domain | Build script |
|------|--------|--------------|
| Web | `easymatchbd.com` | `npm run build:hostinger-web` |
| API | `api.easymatchbd.com` | `npm run build:hostinger-api` |

External services: **Supabase** (PostgreSQL), **Upstash** (Redis).

---

## 1. Web app (done)

| Setting | Value |
|---------|--------|
| Framework preset | **Other** |
| Node.js | **20.x** |
| Root directory | `./` |
| Build command | `npm run build:hostinger-web` |
| Output directory | `hostinger-deploy` |
| Entry file | `server.js` |
| Environment | `NODE_ENV=production`, **`EASYMATCH_RUNTIME=web`** |

After the API is live, add on the **web** site (Settings → Environment variables):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.easymatchbd.com/api/v1` |

Then **Redeploy** the web app.

---

## 2. API app (next step)

In hPanel: **Websites → Add Website → Node.js Web App → GitHub** (same repo `EasymatchBD`, branch `master`).

| Setting | Value |
|---------|--------|
| Framework preset | **Other** |
| Node.js | **20.x** |
| Root directory | `./` |
| Build command | `npm run build:hostinger-api` |
| Output directory | **`hostinger-api-deploy`** |
| Entry file | **`server.js`** |
| Domain | **`api.easymatchbd.com`** |
| Environment | **`EASYMATCH_RUNTIME=api`**, `NODE_ENV=production`, plus variables in §3 |

Hostinger runs **`npm install` automatically** before the build — there is no separate install command to set. The postbuild copies runtime `node_modules` from the monorepo into `hostinger-api-deploy/`.

Build log should end with:

```
=== Hostinger API bundle ready: hostinger-api-deploy/ ===
```

Runtime logs should show:

```
[easymatch-api] Starting on port ...
API ready on http://localhost:.../api/v1
```

Test: `https://api.easymatchbd.com/api/v1/health`

### DNS (Namecheap)

Add a subdomain pointing to Hostinger (or use **Connect domain** in hPanel):

| Type | Host | Value |
|------|------|--------|
| **CNAME** | `api` | Hostinger target (from hPanel) or `easymatchbd.com` |

---

## 3. API environment variables

In hPanel → API website → **Environment variables**. Copy values from your local `apps/api/.env` (never commit `.env`).

### Required

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | Leave unset — Hostinger injects this |
| `CORS_ORIGIN` | `https://easymatchbd.com,https://www.easymatchbd.com` |
| `WEB_PUBLIC_URL` | `https://easymatchbd.com` |
| `DATABASE_URL` | Supabase pooled URL (port **6543**, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URL (port **5432**, for migrations) |
| `REDIS_URL` | Upstash `rediss://...` URL |
| `JWT_SECRET` | Long random string (32+ chars) |

### Staff sign-in (BD mobile numbers)

| Variable | Example |
|----------|---------|
| `SUPER_ADMIN_PHONES` | `017XXXXXXXX` |
| `VERIFICATION_OFFICER_PHONES` | `017XXXXXXXX` |
| `MARRIAGE_CONSULTANT_PHONES` | (optional) |

### Optional (enable when ready)

| Variable | Purpose |
|----------|---------|
| `SSLCOMMERZ_STORE_ID` | Payments |
| `SSLCOMMERZ_STORE_PASSWORD` | Payments |
| `SSLCOMMERZ_IS_LIVE` | `false` for sandbox |
| `LIVEKIT_URL` | Video calls |
| `LIVEKIT_API_KEY` | Video calls |
| `LIVEKIT_API_SECRET` | Video calls |

---

## 4. Database migrations (once)

After the first successful API deploy, run migrations once via **hPanel → Advanced → SSH** or **Terminal**:

```bash
cd hostinger-api-deploy
npx prisma migrate deploy
```

If SSH cwd is the repo root after deploy:

```bash
cd /home/.../domains/api.easymatchbd.com/nodejs
npx prisma migrate deploy
```

---

## 5. Final checklist

- [ ] `https://easymatchbd.com/en` — home page styled correctly
- [ ] `https://api.easymatchbd.com/api/v1/health` — returns JSON `{ "status": "ok" }` or similar
- [ ] Web env `NEXT_PUBLIC_API_URL` set and web redeployed
- [ ] Login / OTP flow works end-to-end
- [ ] Prisma migrations applied

---

## Troubleshooting

### Web 503 / Cannot find module 'next'

Recreate web site with **Framework: Other**, output `hostinger-deploy`, entry `server.js`. Do **not** use the Next.js preset.

### API 503 / listen() timeout

Entry file must be `server.js` in `hostinger-api-deploy` — it loads NestJS **in-process** (no child spawn).

### Web loads but login fails

Check `NEXT_PUBLIC_API_URL` on the web app and `CORS_ORIGIN` on the API include both `https://easymatchbd.com` and `https://www.easymatchbd.com`.

---

## Local smoke tests

```bash
# Web
npm run build:hostinger-web
cd hostinger-deploy && PORT=4100 node server.js

# API
npm run build:hostinger-api
cd hostinger-api-deploy && PORT=4101 node server.js
```
