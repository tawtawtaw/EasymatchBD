# EasymatchBD

Monorepo for the Bangladesh matrimonial platform (web + API), based on the project SRS.

## Structure

```
EasymatchBD/
├── apps/
│   ├── api/          # NestJS REST API
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo Android member app
├── packages/
│   └── shared/       # Shared TypeScript types & constants
├── docker-compose.yml
└── Bangladesh_Matrimonial_Full_SRS.docx
```

## Prerequisites

- Node.js 20+
- PostgreSQL and Redis — via **Docker Desktop** or a **local install**

## Quick start

```bash
npm install
```

Copy environment files (PowerShell):

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

### Option A — Local PostgreSQL (if Docker image pull fails)

You already have PostgreSQL 18 on port **5432**. Create the app database once:

1. Open **pgAdmin** → connect as `postgres`
2. Open Query Tool and run `scripts/setup-local-db.sql`
3. For Redis, either fix Docker (Option B) or install [Memurai](https://www.memurai.com/) on port 6379

Then:

```bash
npm run prisma:migrate -w @easymatch/api
npm run dev
```

### Option B — Docker (PostgreSQL on port 5433)

Docker Postgres uses **5433** so it does not clash with a local PostgreSQL on 5432.

Update `apps/api/.env`:

```
DATABASE_URL=postgresql://easymatch:easymatch_dev@localhost:5433/easymatch?schema=public
```

```bash
npm run db:up
npm run prisma:migrate -w @easymatch/api
npm run dev
```

If `docker compose` fails with `EOF` while pulling images, retry on a stable connection or run `docker compose pull` again.

- Web: http://localhost:3000/en (English) or http://localhost:3000/bn (বাংলা)
- API: http://localhost:3001/api/v1
- Health: http://localhost:3001/api/v1/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web and API in parallel |
| `npm run dev:web` | Next.js only |
| `npm run dev:api` | NestJS only |
| `npm run dev:mobile` | Expo mobile app (Android) |
| `npm run build` | Build shared, API, and web |
| `npm run db:up` | Start PostgreSQL + Redis |
| `npm run db:down` | Stop containers |

## Tech stack

| Layer | Choice |
|-------|--------|
| Web | Next.js 16, React 19, Tailwind CSS |
| API | NestJS 11, Prisma, PostgreSQL |
| Cache | Redis |
| Shared | TypeScript workspace package |

## Authentication (mobile OTP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/otp/send` | Send OTP to Bangladesh mobile number |
| POST | `/api/v1/auth/otp/verify` | Verify OTP, register or sign in, get JWT |
| GET | `/api/v1/auth/me` | Get current user (Bearer token) |

Web login: http://localhost:3000/auth

In development, the OTP is logged in the API console and returned in the API response as `devOtp`.

## Profiles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/profiles/me` | Yes | Full profile with completion % |
| PUT | `/api/v1/profiles/me/personal` | Yes | Personal, education, profession, location |
| PUT | `/api/v1/profiles/me/family` | Yes | Family biodata & siblings |
| PUT | `/api/v1/profiles/me/partner` | Yes | Partner expectations |
| GET | `/api/v1/profiles/dropdowns` | No | All admin-style dropdown options |

Web editor: http://localhost:3000/profile

## Next steps

1. NID verification module
3. 3-level mutual interest / privacy engine
4. Admin portal
5. Mobile apps (React Native recommended)
