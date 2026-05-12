import type { RomFile, ScriptTemplate } from "@/generated/prisma/client";

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

export function serializeScript(script: ScriptTemplate) {
  return {
    ...script,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
  };
}
