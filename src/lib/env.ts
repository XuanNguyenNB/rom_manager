export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  devAuthBypass: process.env.DEV_AUTH_BYPASS === "true",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  alistInternalUrl: process.env.ALIST_INTERNAL_URL ?? "http://127.0.0.1:5244",
  alistPublicDownloadBaseUrl:
    process.env.ALIST_PUBLIC_DOWNLOAD_BASE_URL ??
    process.env.ALIST_PUBLIC_BASE_URL ??
    "",
  alistToken: process.env.ALIST_TOKEN ?? "",
  alistUsername: process.env.ALIST_USERNAME ?? "",
  alistPassword: process.env.ALIST_PASSWORD ?? "",
  alistScanRoot: process.env.ALIST_SCAN_ROOT ?? "/ROM-Library",
  defaultLinkDays: Number(process.env.DEFAULT_LINK_DAYS ?? 7),
  safeSessionMinutes: Number(process.env.SAFE_SESSION_MINUTES ?? 30),
};

export function isGoogleAuthConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.nextAuthSecret);
}
