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
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

Replace `api` with your API service name if different. **Redeploy web** after changing any `NEXT_PUBLIC_*` variable.

## API environment variables

- `NODE_ENV=production`
- `DATABASE_URL`, `DIRECT_URL` (Supabase)
- `REDIS_URL` (Upstash)
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CORS_ORIGIN` — web URL(s), comma-separated
- `WEB_PUBLIC_URL` — public web URL

## After first successful API deploy

Run migrations once (Railway shell):

```bash
cd apps/api && npx prisma migrate deploy
```

## Custom domains

1. API: `api.easymatchbd.com`
2. Web: `easymatchbd.com` / `www`
3. Update `CORS_ORIGIN`, `WEB_PUBLIC_URL`, and `NEXT_PUBLIC_API_URL`, then redeploy both services.

## Why not `nest build`?

Railway installs with `NODE_ENV=production`, which omits devDependencies. `@nestjs/cli` is a devDependency, so `nest build` is unreliable in CI. The Railway script uses `tsc` (a production dependency), same as the Hostinger API build.
