# Local Development

Use this workflow only when working on the legacy Next.js app. The current production MVP uses AList directly at `https://files.choimaytau.com`.

## What Runs Locally

- Next.js runs on the host machine at `http://localhost:3000`.
- PostgreSQL runs in Docker at `127.0.0.1:5433`.
- AList runs in Docker at `http://localhost:5244`.
- Local AList is not mounted under `/_alist/`. Production AList-only mode also uses root `/`.

Prerequisite: Docker Desktop must be installed and the `docker` command must be available in the terminal.

## First-Time Setup

```bash
cp .env.local.example .env.local
npm install
npm run db:generate
npm run local:services
npm run local:alist:password
npm run local:db
npm run dev
```

If `npm run local:alist:password` fails because AList is still starting, wait a few seconds and run it again.

Open:

- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- AList: `http://localhost:5244`

With the default local env, admin auth is bypassed by `DEV_AUTH_BYPASS=true`.

## Configure Local AList Scan

1. Open `http://localhost:5244`.
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. Add a Local storage:
   - Mount path: `/ROM-Library`
   - Root folder path: `/local-rom-library/ROM-Library`
4. Go to `http://localhost:3000/admin`.
5. Click `Rescan AList`.

The sample file at `local/alist-sample/ROM-Library/00_Inbox/README.txt` should appear as an unclassified file.

## Daily Workflow

```bash
npm run local:services
npm run dev
```

When schema or seed data changes:

```bash
npm run local:db
```

Before pushing:

```bash
npm run lint
npm run build
```

Stop local services:

```bash
npm run local:services:down
```

## Environment Notes

- `.env.local` is ignored by Git and is for local-only settings.
- Prisma commands load `.env.local` first, then `.env`.
- Production Docker still uses `.env` from the VPS.
- Download links are resolved through AList `/api/fs/get` and require a signed `raw_url`.

## When Local Is Not Enough

Test on the VPS when changing:

- Nginx routes.
- Cloudflare behavior.
- Real Google Drive mounts.
- Real large-file download behavior.
