# ROM Manager

Personal web app for ROM freelancers: catalog ROM/tool files from AList/Google Drive, search customer scripts, generate 7-day download links, and open a restricted Safe Mode on customer machines.

## Local Development

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

Local development automatically bypasses Google login when OAuth env vars are empty. Production does not.

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
ALIST_INTERNAL_URL=http://alist:5244
ALIST_PUBLIC_DOWNLOAD_BASE_URL=https://files.choimaytau.com/_raw
ALIST_USERNAME=admin
ALIST_PASSWORD=...
ALIST_SCAN_ROOT=/ROM-Library
```

`/_raw/d/...` is the public download-only route used after the app validates `/d/<token>`. Keep `/_alist` protected with Basic Auth or IP allowlist.

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
```

## Import Scripts

Use the app UI to create scripts one by one, or POST bulk text to `/api/import/scripts`.

Supported line formats:

```text
title<TAB>language<TAB>stage<TAB>body<TAB>tag1,tag2
title|body
```

Template variables use `{ten_khach}`, `{model}`, `{gia}`, `{thoi_gian}`, `{link}`.
