# ROM Manager Project Context

This document records the working context from the initial planning and deployment chat so future maintenance does not need to reconstruct decisions from memory.

## User Workflow

- The owner is a freelancer who upgrades ROMs for customer phones.
- Main brands and models:
  - LG: V60, V50, Velvet, G8.
  - Xiaomi: 15, 15 Pro, 15 Ultra, 17, 17 Pro, 17 Ultra.
  - OnePlus: 13, 15, Ace 5, Ace 6T.
  - Oppo: Find X7 Ultra, Find N5.
- Current file library is about 2 TB. A typical file is around 8 GB.
- The owner works alone, but often opens the site from a customer PC through UltraViewer.
- Customers may receive a download link over social apps and download large files before the owner starts the ROM job.
- Existing script snippets were split across Notepad files and Google Sheets.
- The app must be usable from a phone for copying links and customer scripts.

## Product Decisions

- `https://files.choimaytau.com` is the main app.
- The root page `/` is a public customer-facing lookup surface. It must not require admin login or a 6-digit safe code.
- Admin-only work lives under `/admin` and `/login`.
- AList is a sidecar for storage and direct download behavior, not the main app UI.
- Uploading large files is done outside the app with Google Drive Desktop, rclone, or AList.
- The app scans AList metadata and lets the owner classify files later.
- Do not store archive/extract passwords in this system.
- Download links default to 7 days and can be revoked.
- Multi-file packages use `/p/<token>` with separate buttons. Do not dynamically zip large ROM files through the app server.
- Large downloads must not stream through Next.js or the VPS app process.

## Architecture

- App: Next.js + TypeScript.
- Database: PostgreSQL in Docker Compose on the VPS. Supabase was discussed but not chosen for the current deployment.
- Storage sidecar: AList in Docker Compose.
- Reverse proxy: existing Nginx on the VPS.
- DNS/CDN: Cloudflare orange proxy is enabled for `files.choimaytau.com`.
- VPS:
  - IP: `43.134.51.214`.
  - Region note from owner: Singapore.
  - App path: `/opt/rom-manager`.
- GitHub repository: `https://github.com/XuanNguyenNB/rom_manager.git`.

## Current Route Model

- `/` -> public search/copy portal for customers and owner.
- `/admin` -> authenticated dashboard for classification, scripts, scans, and link creation.
- `/login` -> admin login.
- `/d/<token>` -> validates a single-file download token, then redirects to the AList-backed download URL.
- `/p/<token>` -> package page listing multiple file download buttons.
- `/_raw/d/...` -> Nginx download-only pass-through to AList `/d/...`.
- `/_alist/` -> AList native UI.

## Auth Decisions

- Admin login supports Google allowlist and credentials-based login.
- Current allowlisted admin email: `whoiamtwo4@gmail.com`.
- Local development can bypass admin auth with `DEV_AUTH_BYPASS=true`.
- Public/customer lookup must remain readable without login.
- Safe Mode with short sessions can remain as a separate optional restricted mode, but it should not block the public root page.

## AList Decisions And Debug History

- AList is mounted under `https://files.choimaytau.com/_alist/` in production.
- AList `site_url` must include the subpath: `https://files.choimaytau.com/_alist`.
- Do not wrap `/_alist/` with Nginx Basic Auth. AList is a single-page app, and Basic Auth on the subpath caused API/static requests to get `401`, which triggered repeated browser login prompts.
- If extra protection is needed later, prefer Cloudflare Access or a dedicated admin-only hostname instead of Basic Auth on the AList subpath.
- Previous issue: AList showed a blank page because the SPA assets were loaded without the `/_alist` base path. Setting `site_url` and proxying to the matching subpath fixed it.
- Previous issue: after successful AList login, the browser kept asking for login. Removing Nginx Basic Auth from `/_alist/` fixed it.
- AList official docs say the Docker admin password can be manually set with `docker exec -it alist ./alist admin set NEW_PASSWORD`.

## Deployment Notes

- Production secrets must stay in VPS `.env`, not in documentation or commits.
- The Nginx production config lives in `deploy/nginx-files.choimaytau.com.conf`.
- Typical deploy:
  - Commit and push to GitHub.
  - SSH to VPS.
  - `cd /opt/rom-manager && git pull --ff-only origin main`.
  - Rebuild/restart app containers only if app code changed.
  - Copy and reload Nginx only if `deploy/nginx-files.choimaytau.com.conf` changed.
- For routine app development, prefer local testing first. Deploy only after build/lint and a browser check.

## External References

- AList Docker/admin password docs: https://alistgo.com/guide/install/docker.html
- AList FAQ for `site_url` subpath behavior: https://alistgo.com/faq/howto
