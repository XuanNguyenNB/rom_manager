# ROM Manager

Current MVP uses AList as the main firmware portal at `https://files.choimaytau.com`.

The earlier Next.js/PostgreSQL app is kept in this repository for rollback or a future phase with metadata, expiring customer links, and audit logs. It is not on the production request path for the current MVP.

## Production MVP

- `/` -> AList public file browser.
- Guest access -> read-only list/search/download.
- Admin access -> native AList login.
- Next.js app/PostgreSQL -> stopped on VPS after AList-only verification, volumes kept for rollback.

## AList

AList is the source of truth for public firmware/tool browsing.

Recommended public root layout:

```text
FIRMWARE/
  LG/
  Xiaomi/
  OnePlus/
  Oppo/
TOOLFLASH/
DRIVERS/
GUIDE/
INBOX_PRIVATE/
```

Use filenames that include model, region, Android version, and build number so AList search is useful without a custom database.

Production AList settings:

```bash
ALIST_SITE_URL=https://files.choimaytau.com
```

The root page can use an AList `readme.md`/meta readme to show service notes and contact instructions. Do not publish bank details in the MVP.

## Nginx

`deploy/nginx-files.choimaytau.com.conf` routes the whole domain to AList on `127.0.0.1:5244` and uses long proxy timeouts with buffering disabled for large ROM downloads.

Copy it to the VPS Nginx site and reload Nginx after validation:

```bash
sudo cp deploy/nginx-files.choimaytau.com.conf /etc/nginx/sites-available/files.choimaytau.com
sudo nginx -t
sudo systemctl reload nginx
```

## Rollback

If the Next.js app is needed again:

1. Revert the Nginx config to route `/` to `127.0.0.1:3000`.
2. Restore AList `site_url` to `https://files.choimaytau.com/_alist`.
3. Start the app and postgres services:

```bash
docker compose up -d app postgres alist
```
