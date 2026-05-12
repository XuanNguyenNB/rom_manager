import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActor } from "@/lib/access";
import { prisma } from "@/lib/db";
import { splitTags, uniqueStrings } from "@/lib/format";
import { serializeScript } from "@/lib/serializers";

const scriptSchema = z.object({
  title: z.string().trim().min(1).optional(),
  language: z.enum(["VI", "EN"]).optional(),
  stage: z
    .enum(["QUOTE", "WARNING", "BACKUP", "DOWNLOADING", "ERROR", "DONE", "SUPPORT", "OTHER"])
    .optional(),
  brand: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  body: z.string().trim().min(1).optional(),
  variables: z.array(z.string()).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  active: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function extractVariables(body?: string, explicit?: string[]) {
  const found = body
    ? Array.from(body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((match) => match[1])
    : [];
  return explicit || found.length > 0 ? uniqueStrings([...(explicit ?? []), ...found]) : undefined;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const { id } = await context.params;
  const payload = scriptSchema.parse(await request.json());
  const tags = Array.isArray(payload.tags)
    ? uniqueStrings(payload.tags)
    : typeof payload.tags === "string"
      ? uniqueStrings(splitTags(payload.tags))
      : undefined;

  const script = await prisma.scriptTemplate.update({
    where: { id },
    data: {
      title: payload.title,
      language: payload.language,
      stage: payload.stage,
      brand: payload.brand || null,
      model: payload.model || null,
      body: payload.body,
      variables: extractVariables(payload.body, payload.variables),
      tags,
      active: payload.active,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "METADATA_UPDATED",
      actorType: actor!.type,
      actorEmail: actor!.email,
      entityType: "ScriptTemplate",
      entityId: script.id,
    },
  });

  return NextResponse.json({ script: serializeScript(script) });
}
