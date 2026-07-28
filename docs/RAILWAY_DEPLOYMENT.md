# Railway deployment (EasymatchBD monorepo)

Deploy **web** and **api** only. **mobile** is Expo/EAS — not a Railway service.

## Critical: Root Directory must be blank

Both services must use the **repo root** as Root Directory (leave the field empty).

If Root Directory is `apps/api` or `apps/web`, Railway deploys only that folder. Then `packages/shared` is missing and the API build fails with hundreds of TypeScript errors (`@easymatch/shared` not found, Prisma enums missing).

## Config as Code (recommended)

In each service’s **Settings → Config-as-code**, set:

| Service | Config file path |
|---------|------------------|
| API | `/apps/api/railway.toml` |
| Web | `/apps/web/railway.toml` |

Those files run monorepo-aware build scripts that:

1. Build `@easymatch/shared`
2. Run `prisma generate` (API only)
3. Compile with `tsc` / `next build` (no `@nestjs/cli` required at build time)

## Manual settings (if not using config files)

### API service

| Setting | Value |
|--------|--------|
| **Root Directory** | *(blank)* |
| **Build Command** | `node scripts/railway-api-build.mjs` |
| **Start Command** | `npm run start:prod -w @easymatch/api` |
| **Watch Paths** | `/apps/api/**`, `/packages/shared/**` |
| **Healthcheck** | `/api/v1/health` |

### Web service

| Setting | Value |
|--------|--------|
| **Root Directory** | *(blank)* |
| **Build Command** | `node scripts/railway-web-build.mjs` |
| **Start Command** | `npm run start -w @easymatch/web` |
| **Watch Paths** | `/apps/web/**`, `/packages/shared/**` |

## Web: API URL

After the API has a public domain:

```env
NEXT_PUBLIC_API_URL=https://api.easymatchbd.com/api/v1
```

Or Railway reference syntax:

```env
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

Replace `api` with your API service name if different. **Redeploy web** after changing any `NEXT_PUBLIC_*` variable.

The web app also rewrites same-origin `/api/v1/*` to this URL (required for SSLCommerz callbacks on `easymatchbd.com/api/v1/...`). If `NEXT_PUBLIC_API_URL` is wrong or missing at build time, login shows **Invalid response from the API (404)** because the browser hits the Next.js app instead of the API.

## Web: WhatsApp support button

The green WhatsApp FAB and contact/footer links need a support number on the **web** service (not the API):

```env
WHATSAPP_SUPPORT_NUMBER=+8801730321717
```

`WHATSAPP_SUPPORT_NUMBER` is read at **runtime** on the server (no rebuild needed after changing it — restart/redeploy is enough).

You can also use `NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER` (same value), but that is baked in at **build** time — if you only set it after deploy, you must **redeploy web** for the button to appear.

Optional disable:

```env
WHATSAPP_SUPPORT_ENABLED=false
```

If the button is missing on production, check Railway → **web** → **Variables**, set the number, then redeploy. Build logs warn when the variable is unset.

## API environment variables

- `NODE_ENV=production`
- `DATABASE_URL`, `DIRECT_URL` (Supabase — see below)
- `REDIS_URL` (Upstash)
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CORS_ORIGIN` — web URL(s), comma-separated
- `WEB_PUBLIC_URL` — public web URL
- `EXPOSE_OTP_IN_RESPONSE=true` — **staging only** until SMS is integrated; shows OTP on the login page

### Supabase on Railway — use Supavisor (recommended)

**The IPv4 add-on fixes `db.*.supabase.co` only.** Railway is most reliable with the **shared Supavisor pooler**, which is **always IPv4** on every Supabase plan (free or paid).

In Supabase → **Connect**:

1. **`DATABASE_URL`** → **Transaction pooler** (port **6543**)
2. **`DIRECT_URL`** → **Session pooler** (port **5432**, same `*.pooler.supabase.com` host)

Example shape (copy yours from the dashboard — region/host may differ):

```env
DATABASE_URL=postgresql://postgres.jrecnorpwmdlpbkffmng:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connect_timeout=30

DIRECT_URL=postgresql://postgres.jrecnorpwmdlpbkffmng:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=30
```

Notes:

- Username is `postgres.jrecnorpwmdlpbkffmng` (not plain `postgres`) on Supavisor URLs.
- URL-encode special characters in the password (`@` → `%40`).
- Do **not** copy from local `apps/api/.env` unless it already uses `pooler.supabase.com`.

**Test on Railway** (API shell):

```bash
cd apps/api && node ../../scripts/railway-test-db.mjs
```

### Paid IPv4 add-on (optional alternative)

If you enabled the IPv4 add-on, `db.[ref].supabase.co:5432` can work from Railway after DNS propagates (can take a few minutes). If it still fails, **switch to Supavisor** above — do not wait on the add-on alone.

## Troubleshooting: API crashes with Supabase P1001

**Local `prisma migrate deploy` can succeed while Railway fails.** Your PC uses `apps/api/.env` (often `db.*.supabase.co:5432`). Railway uses **Variables on the API service** — they are separate.

### Checklist

1. **Supabase dashboard** — project must not be **Paused** (click Restore if needed).
2. **Railway → API → Variables** — open `DATABASE_URL` and check the hostname:
   - ❌ `db.jrecnorpwmdlpbkffmng.supabase.co` → will crash on Railway
   - ✅ `aws-0-ap-southeast-1.pooler.supabase.com` (or similar `*.pooler.supabase.com`)
3. Set **both** on Railway (copy fresh strings from Supabase → **Connect**):
   - `DATABASE_URL` → **Transaction pooler**, port **6543**, user `postgres.jrecnorpwmdlpbkffmng`
   - `DIRECT_URL` → **Session pooler**, port **5432**, same user/host
4. Password: URL-encode `@` as `%40` in the connection string.
5. **Redeploy API** after changing variables.
6. **Deploy logs** — after redeploy, look for:
   - `DATABASE_URL target: aws-0-....pooler.supabase.com:6543` → correct
   - `Warning: db.*.supabase.co` → still wrong; fix variables

Do **not** copy `DATABASE_URL` from local `.env` to Railway unless it already uses the `pooler.supabase.com` host.

Run migrations once (Railway shell):

```bash
cd apps/api && npx prisma migrate deploy
```

## Profile photos / PDFs (upload storage)

Uploads are stored by the API via `StorageService`:

- **`STORAGE_BACKEND=local`** (default): files on disk (`UPLOAD_DIR`, e.g. `apps/api/uploads/` locally).
- **`STORAGE_BACKEND=supabase`**: private Supabase Storage bucket (recommended for Railway production).

Supabase only stores file metadata in Postgres; bytes live in Storage or on disk depending on backend.

### Production (Supabase Storage — recommended)

1. Create a **private** bucket (e.g. `profile-media`) with **5 MB** file size limit and MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
2. **API variables:**

```env
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=profile-media
```

3. Redeploy API. Startup log should show: `Storage backend: supabase (bucket=profile-media)`.

The Railway volume / `UPLOAD_DIR` is optional when using Supabase. Existing files on disk are still readable as a fallback until you re-upload.

### Production (local disk — legacy)

1. **API service → Volumes** → mount at `/data/uploads`
2. **API variable:** `UPLOAD_DIR=/data/uploads`
3. Redeploy API

### Migrate files from your PC (local disk only)

```bash
node scripts/pack-local-uploads.mjs
```

Upload `apps/api/uploads-railway-sync.tar.gz` to a temporary URL, then **Railway API shell**:

```bash
curl -L -o /tmp/uploads.tar.gz "YOUR_PUBLIC_URL"
tar -xzf /tmp/uploads.tar.gz -C /data/uploads
```

Restart API and refresh the web app.

## Custom domains

1. API: `api.easymatchbd.com`
2. Web: `easymatchbd.com` / `www`
3. Update `CORS_ORIGIN`, `WEB_PUBLIC_URL`, and `NEXT_PUBLIC_API_URL`, then redeploy both services.

## Why not `nest build`?

Railway installs with `NODE_ENV=production`, which omits devDependencies. `@nestjs/cli` is a devDependency, so `nest build` is unreliable in CI. The Railway script uses `tsc` (a production dependency), same as the Hostinger API build.
