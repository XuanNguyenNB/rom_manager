# ROM Manager Project Context

This document records deployment decisions so future maintenance does not need to reconstruct the chat history.

## Current MVP

- `https://files.choimaytau.com` is an AList-only firmware portal.
- AList is the primary UI at `/`, not a sidecar under `/_alist`.
- Guest/customer access is public read-only for list/search/download.
- Admin work uses native AList login.
- The earlier Next.js/PostgreSQL app remains in the repo and on the VPS only for rollback or a future phase.
- Cloudflare should be DNS-only for `files.choimaytau.com` so large ROM downloads do not depend on Cloudflare proxy behavior.

## User Workflow

- The owner is a freelancer who upgrades ROMs for customer phones.
- Main brands and models:
  - LG: V60, V50, Velvet, G8.
  - Xiaomi: 15, 15 Pro, 15 Ultra, 17, 17 Pro, 17 Ultra.
  - OnePlus: 13, 15, Ace 5, Ace 6T.
  - Oppo: Find X7 Ultra, Find N5.
- Current file library is about 2 TB. A typical ROM file is around 8 GB.
- Customers may receive a link over social apps and download large files before the owner starts the ROM job.
- MVP prioritizes a reliable firmware/tool browser over metadata, scripts, expiring links, or audit logs.

## Public Portal Shape

- Use AList list layout for filename/date/size scanning.
- Use root readme/meta content for:
  - Mobile software service note.
  - Zalo/contact instruction.
  - Note that customers can download files before service starts.
- Do not publish bank details or QR payment info in the MVP.
- Suggested root folders:
  - `FIRMWARE/`
  - `TOOLFLASH/`
  - `DRIVERS/`
  - `GUIDE/`
  - `INBOX_PRIVATE/`
- Suggested firmware nesting: `FIRMWARE/<Brand>/<Model>/`.
- Filenames should include model, region, Android version, and build/build date when possible.

## VPS And Services

- VPS IP: `43.134.51.214`.
- App path: `/opt/rom-manager`.
- GitHub repository: `https://github.com/XuanNguyenNB/rom_manager.git`.
- AList Docker service remains the active service.
- Next.js `app` and `postgres` services may be stopped after AList-only verification, but volumes should not be deleted.

## AList Notes

- Production `site_url`: `https://files.choimaytau.com`.
- Previous subpath setup was `https://files.choimaytau.com/_alist`; do not use it for the AList-only MVP.
- Previous issues with blank page and repeated login were caused by subpath/proxy mismatch and Basic Auth around AList.
- Guest should remain enabled but read-only. Do not grant upload, write, delete, move, copy, WebDAV write, or offline download to guest.
- Change the AList admin password after any password is exposed in chat.

## Deployment Notes

- Update repo config and push before production changes.
- On VPS:
  - Pull latest repo.
  - Restart AList if Docker env or config changes.
  - Copy `deploy/nginx-files.choimaytau.com.conf` into `/etc/nginx/sites-available/files.choimaytau.com`.
  - Run `sudo nginx -t` and reload Nginx.
  - Verify public read-only access and downloads.
  - Stop `app` and `postgres` only after verification.

## Rollback

- Route `/` back to Next.js on `127.0.0.1:3000`.
- Restore AList `site_url` to `https://files.choimaytau.com/_alist`.
- Start all services with `docker compose up -d app postgres alist`.

## External References

- AList Docker/admin password docs: https://alistgo.com/guide/install/docker.html
- AList style settings: https://alistgo.com/zh/config/style.html
- AList preview/readme settings: https://alistgo.com/config/preview
- AList side actions: https://alistgo.com/config/side
- AList reverse proxy: https://alistgo.com/guide/install/reverse-proxy
