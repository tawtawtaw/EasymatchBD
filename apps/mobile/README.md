# EasymatchBD Mobile (Android)

Member-only Android app for EasymatchBD, built with Expo and React Navigation.

## Prerequisites

- Node.js 20+
- EasymatchBD API running (`npm run dev:api` from repo root)
- Android emulator or physical device with Expo Go / dev client

## Setup

From the monorepo root:

```bash
npm install
npm run build -w @easymatch/shared
```

Copy environment file:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/mobile/.env`:

| Environment | `EXPO_PUBLIC_API_URL` |
|-------------|------------------------|
| Android emulator | `http://10.0.2.2:4101/api/v1` |
| Physical device (same Wi‑Fi) | `http://YOUR_PC_LAN_IP:4101/api/v1` |
| ngrok / remote | `https://your-host.ngrok.dev/api/v1` |

## Run (same workflow as BCS mobile)

From **`apps/mobile`** (recommended — matches BCS):

```bash
cd apps/mobile
npm install   # first time only, from repo root: npm install
copy .env.example .env   # Windows
npm start
```

Or from repo root:

```bash
npm run dev:mobile
```

Scan the QR code with **Expo Go**, same as BCS.

If LAN fails (Something went wrong), use tunnel — like BCS ngrok:

```bash
cd apps/mobile
npm run start:tunnel
```

## What's included (v0.1 scaffold)

- Mobile OTP sign-in (member only)
- Trusted device restore
- Bottom tabs: Home, Discovery, Connections, Messages, Profile
- Sign out

Discovery, connections, messaging, and full profile editing are placeholders for the next milestones.

## Build APK for external testers (EAS preview)

Preview builds bake in the **public ngrok URL** (`https://easymatchbd.ngrok.dev`) so testers outside your Wi‑Fi can use the app. Your PC must keep **API + web + ngrok** running while they test (see below).

### One-time setup

1. Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

2. Confirm `apps/mobile/google-services.json` exists (Firebase package `com.easymatchbd.member`).

3. Optional — set WhatsApp support on EAS (preview environment):

```bash
cd apps/mobile
eas env:create --name EXPO_PUBLIC_WHATSAPP_SUPPORT_NUMBER --value "01XXXXXXXXX" --environment preview --visibility plaintext
```

### Start backend for remote testers

From the **repo root**, in separate terminals (or use your usual dev workflow):

```bash
npm run dev          # API :4101 + web :4100
npm run tunnel       # https://easymatchbd.ngrok.dev → web :4100 (API proxied via /api/v1)
npm run tunnel:status
```

Ensure `apps/api/.env` includes `https://easymatchbd.ngrok.dev` in `CORS_ORIGIN`.

### Build preview APK

```bash
cd apps/mobile
npm run build:preview
```

Or both platforms later:

```bash
npx eas build --platform android --profile preview
```

When the build finishes, open the link in the terminal or [expo.dev](https://expo.dev) → your project → **Builds** → download the **APK**.

### Share with testers

1. Send them the **APK download link** from the EAS build page (or download the APK and share via Drive/WhatsApp).
2. On Android: enable **Install unknown apps** for the browser or file app they use.
3. Install and open **EasymatchBD** — sign in with a test member account.
4. Remind them: the app only works while your ngrok tunnel and dev servers are running.

To change the public URL later, edit `env` under `preview` in `eas.json` (or `eas env:update`) and run a new preview build.

## Build APK (EAS) — quick reference

```bash
cd apps/mobile
npx eas build --platform android --profile preview
```

## Package name

`com.easymatchbd.member`
