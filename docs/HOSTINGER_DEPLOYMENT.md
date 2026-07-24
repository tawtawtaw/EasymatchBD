# Hostinger deployment — EasymatchBD

EasymatchBD is an **npm workspaces monorepo** (web + API + mobile). Hostinger **Node.js Web Apps** deploy **one app per website**.

## Recommended: two Hostinger Node.js apps

| Site | Domain (example) | Purpose |
|------|------------------|---------|
| Web | `easymatchbd.com` | Next.js (`apps/web`) |
| API | `api.easymatchbd.com` | NestJS (`apps/api`) |

Database (Supabase) and Redis (Upstash) stay external — configure via env vars in hPanel.

---

## Web app settings (hPanel)

**Repository:** `tawtawtaw/EasymatchBD`  
**Branch:** `master`  
**Root directory:** `/` (repo root — required for workspaces)

| Setting | Value |
|---------|--------|
| Node.js | **20** |
| Install | `npm ci` |
| Build | `npm run build -w @easymatch/shared && npm run build -w @easymatch/web` |
| Start | `npm run start -w @easymatch/web` |
| PORT | Set automatically by Hostinger — do **not** hardcode `4100` |

### Web environment variables

```env
NODE_ENV=production
PORT=<leave Hostinger default / auto>
NEXT_PUBLIC_API_URL=https://api.easymatchbd.com/api/v1
NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER=01XXXXXXXXX
```

Point the domain to this Node.js app (not legacy PHP/static hosting).

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

```env
NODE_ENV=production
CORS_ORIGIN=https://easymatchbd.com,https://www.easymatchbd.com
WEB_PUBLIC_URL=https://easymatchbd.com
DATABASE_URL=...
DIRECT_URL=...
REDIS_URL=...
JWT_SECRET=...
```

---

## Fix for HTTP 403 Forbidden

A **403 on Hostinger** usually means the **Node process is not running** or the **domain still points at old static/PHP hosting**, not your Node app.

### Checklist

1. **Deployment logs** (hPanel → your Node app → Deployments / Logs)
   - Build must finish with **success**
   - Look for `next build` completing without errors

2. **Start command**
   - Use: `npm run start -w @easymatch/web`
   - App must listen on **`0.0.0.0`** and **`process.env.PORT`** (fixed in `apps/web/package.json`)

3. **Wrong hosting type**
   - Domain must be attached to the **Node.js Web App**, not an empty website folder
   - Remove/disable old PHP site on the same domain if it conflicts

4. **Monorepo build**
   - Build **shared** before web:  
     `npm run build -w @easymatch/shared && npm run build -w @easymatch/web`
   - Install must run at **repo root** (`npm ci`), not only inside `apps/web`

5. **Test URLs**
   - Home redirects to locale: try `https://yourdomain.com/en` (not only `/`)
   - Temporary Hostinger URL from hPanel (before DNS) — test that first

6. **Cloudflare / WAF**
   - If the domain uses Cloudflare “Checking your browser”, that is not a 403 from Next.js
   - Pause Cloudflare proxy briefly to test origin, or allow Hostinger IP

7. **API not required for first page load**
   - Home page degrades if API is down (empty dropdowns) but should still **render** — if you see 403, the web process itself is likely down

### Common mistakes

| Mistake | Symptom |
|---------|---------|
| Start: `next start -p 4100` only | Proxy cannot reach app → 403/502 |
| Root directory: `apps/web` only | `@easymatch/shared` build fails |
| Only API deployed on main domain | 403 or wrong app |
| Forgot `npm ci` at monorepo root | Build fails |

---

## Git auto-deploy

hPanel → Node app → **Connect GitHub** → enable deploy on push to `master`.

After changing start/build settings or `package.json`, **Redeploy** manually once, then push to Git for future updates.

---

## Local production smoke test (before Hostinger)

```bash
cd EasymatchBD
npm ci
npm run build -w @easymatch/shared && npm run build -w @easymatch/web
PORT=4100 npm run start -w @easymatch/web
```

Open http://localhost:4100/en
