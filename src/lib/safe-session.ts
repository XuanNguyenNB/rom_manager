import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/auth";
import { addMinutes, randomCode, randomToken, sha256 } from "@/lib/security";
import { env } from "@/lib/env";

export const SAFE_COOKIE = "rom_safe_token";

export async function createSafeSession(createdBy?: string) {
  const code = randomCode();
  const now = new Date();
  const expiresAt = addMinutes(now, env.safeSessionMinutes);
  const headerStore = await headers();

  const session = await prisma.safeSession.create({
    data: {
      codeHash: sha256(code),
      expiresAt,
      createdBy,
      ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: headerStore.get("user-agent"),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SAFE_CREATED",
      actorType: "admin",
      actorEmail: createdBy,
      entityType: "SafeSession",
      entityId: session.id,
    },
  });

  return { code, expiresAt, id: session.id };
}

export async function activateSafeSession(code: string) {
  const now = new Date();
  const codeHash = sha256(code);
  const token = randomToken();
  const tokenHash = sha256(token);

  const session = await prisma.safeSession.findUnique({
    where: { codeHash },
  });

  if (!session || session.revokedAt || session.expiresAt <= now) {
    return null;
  }

  await prisma.safeSession.update({
    where: { id: session.id },
    data: {
      tokenHash,
      activatedAt: now,
      lastSeenAt: now,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SAFE_LOGIN",
      actorType: "safe",
      entityType: "SafeSession",
      entityId: session.id,
    },
  });

  return { token, expiresAt: session.expiresAt };
}

export async function getSafeActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SAFE_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = sha256(token);
  const now = new Date();
  const session = await prisma.safeSession.findUnique({
    where: { tokenHash },
  });

  if (!session || session.revokedAt || session.expiresAt <= now) {
    return null;
  }

  await prisma.safeSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  return { type: "safe" };
}
