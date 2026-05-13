import type { RomFile } from "@/generated/prisma/client";

export function serializeRomFile(file: RomFile) {
  return {
    ...file,
    sizeBytes: file.sizeBytes?.toString() ?? null,
    modifiedAt: file.modifiedAt?.toISOString() ?? null,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    missingAt: file.missingAt?.toISOString() ?? null,
    lastSeenAt: file.lastSeenAt?.toISOString() ?? null,
  };
}
