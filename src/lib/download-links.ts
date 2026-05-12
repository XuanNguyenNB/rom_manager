import { prisma } from "@/lib/db";
import { getAListDownloadUrl } from "@/lib/alist";
import { addDays, randomToken, sha256 } from "@/lib/security";
import { env } from "@/lib/env";

export async function createDownloadLink(fileIds: string[], actorEmail?: string, note?: string) {
  const cleanFileIds = Array.from(new Set(fileIds.filter(Boolean)));
  if (cleanFileIds.length === 0) {
    throw new Error("At least one file is required.");
  }

  const token = randomToken(24);
  const tokenHash = sha256(token);
  const expiresAt = addDays(new Date(), env.defaultLinkDays);

  const link = await prisma.downloadLink.create({
    data: {
      tokenHash,
      kind: cleanFileIds.length === 1 ? "FILE" : "PACKAGE",
      expiresAt,
      createdBy: actorEmail,
      note,
      files: {
        create: cleanFileIds.map((fileId, index) => ({
          fileId,
          order: index,
        })),
      },
    },
    include: {
      files: {
        include: { file: true },
        orderBy: { order: "asc" },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "LINK_CREATED",
      actorType: actorEmail ? "admin" : "safe",
      actorEmail,
      entityType: "DownloadLink",
      entityId: link.id,
      linkId: link.id,
      metadata: { fileIds: cleanFileIds },
    },
  });

  return { token, link };
}

export async function getActiveLink(token: string) {
  const link = await prisma.downloadLink.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      files: {
        include: { file: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!link || link.revokedAt || link.expiresAt <= new Date()) {
    return null;
  }

  return link;
}

export async function resolveDownloadUrl(token: string, requestedFileId?: string | null) {
  const link = await getActiveLink(token);
  if (!link) {
    return null;
  }

  const entry = requestedFileId
    ? link.files.find((item) => item.fileId === requestedFileId)
    : link.files[0];

  if (!entry?.file || entry.file.status === "MISSING") {
    return null;
  }

  const downloadUrl = await getAListDownloadUrl(entry.file.alistPath);

  await prisma.downloadLink.update({
    where: { id: link.id },
    data: { downloadCount: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      action: "LINK_DOWNLOADED",
      actorType: "public",
      entityType: "RomFile",
      entityId: entry.file.id,
      linkId: link.id,
      metadata: {
        filename: entry.file.filename,
        alistPath: entry.file.alistPath,
      },
    },
  });

  return { downloadUrl, link, file: entry.file };
}
