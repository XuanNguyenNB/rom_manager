import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActor } from "@/lib/access";
import { prisma } from "@/lib/db";
import { splitTags, uniqueStrings } from "@/lib/format";
import { serializeRomFile } from "@/lib/serializers";

const fileSchema = z.object({
  brand: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  androidVersion: z.string().trim().optional().nullable(),
  buildNumber: z.string().trim().optional().nullable(),
  fileType: z.enum(["ROM", "TOOL", "DRIVER", "PATCH", "GUIDE", "BUNDLE", "OTHER"]).optional(),
  status: z.enum(["UNCLASSIFIED", "TESTED", "UNTESTED", "BAD", "ARCHIVED", "MISSING"]).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  note: z.string().trim().optional().nullable(),
  checksum: z.string().trim().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const { id } = await context.params;
  const payload = fileSchema.parse(await request.json());
  const tags = Array.isArray(payload.tags)
    ? uniqueStrings(payload.tags)
    : typeof payload.tags === "string"
      ? uniqueStrings(splitTags(payload.tags))
      : undefined;

  const file = await prisma.romFile.update({
    where: { id },
    data: {
      brand: payload.brand || null,
      model: payload.model || null,
      region: payload.region || null,
      androidVersion: payload.androidVersion || null,
      buildNumber: payload.buildNumber || null,
      fileType: payload.fileType,
      status: payload.status,
      tags,
      note: payload.note || null,
      checksum: payload.checksum || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "METADATA_UPDATED",
      actorType: actor!.type,
      actorEmail: actor!.email,
      entityType: "RomFile",
      entityId: file.id,
    },
  });

  return NextResponse.json({ file: serializeRomFile(file) });
}
