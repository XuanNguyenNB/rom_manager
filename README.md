# ROM Manager

Personal web app for ROM freelancers: catalog ROM/tool files from AList/Google Drive, search customer scripts, generate 7-day download links, and open a restricted Safe Mode on customer machines.

- Customer lookup: `/`
- Admin dashboard: `/admin`
- Admin login: `/login`

## Local Development

```bash
cp .env.local.example .env.local
npm install
npm run db:generate
npm run local:services
npm run local:alist:password
npm run local:db
npm run dev
```

Local development uses Docker for PostgreSQL and AList, then runs Next.js directly on `http://localhost:3000`. See `docs/local-development.md` for the full workflow. The project context and deployment decisions are recorded in `docs/project-context.md`.

## Database

Use PostgreSQL. After configuring `DATABASE_URL`:

```bash
npm run db:migrate
npm run db:seed
```

The first migration enables `pg_trgm` and creates the tables for devices, files, scripts, download links, safe sessions, and audit logs.

## AList

1. Start AList and add Google Drive storage mounted at `/ROM-Library`.
2. Recommended Drive layout:

```text
ROM-Library/
  00_Inbox/
  01_ROM/
  02_Tools/
  03_Drivers/
  04_Bundles/
  99_Archive/
```

3. Set these env vars:

```bash
ALIST_INTERNAL_URL=http://alist:5244/_alist
ALIST_PUBLIC_DOWNLOAD_BASE_URL=https://files.choimaytau.com/_raw
ALIST_USERNAME=admin
ALIST_PASSWORD=...
ALIST_SCAN_ROOT=/ROM-Library
```

`/_raw/d/...` is the public download-only route used after the app validates `/d/<token>`. AList is exposed below `/_alist/` with its native login, so set AList `site_url` to `https://files.choimaytau.com/_alist` and include the same `/_alist` base path in `ALIST_INTERNAL_URL`. Do not wrap this subpath with Nginx Basic Auth because the AList single-page app can repeatedly prompt for login when its API/static fetches are challenged by the proxy. If an extra perimeter is needed, put AList behind Cloudflare Access or a dedicated admin-only hostname.

`ALIST_SCAN_ROOT` must match the actual AList mount path. Use `/ROM-Library` if the Google Drive storage is mounted there, or `/Drive` if that is the mount path configured in AList.

## VPS Deployment

```bash
cp .env.example .env
docker compose up -d postgres alist
docker compose build app
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed
docker compose up -d
```

Copy `deploy/nginx-files.choimaytau.com.conf` into Nginx sites, adjust SSL with Certbot, then reload Nginx.

## Google Login

Create a Google OAuth Web Client with callback:

```text
https://files.choimaytau.com/api/auth/callback/google
```

Set:

```bash
NEXTAUTH_URL=https://files.choimaytau.com
NEXTAUTH_SECRET=<random secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=your-email@gmail.com
ADMIN_PASSWORD=<strong admin password>
```

## Import Scripts

Use the app UI to create scripts one by one, or POST bulk text to `/api/import/scripts`.

Supported line formats:

```text
title<TAB>language<TAB>stage<TAB>body<TAB>tag1,tag2
title|body
```

Template variables use `{ten_khach}`, `{model}`, `{gia}`, `{thoi_gian}`, `{link}`.
