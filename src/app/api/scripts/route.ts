import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActor } from "@/lib/access";
import { prisma } from "@/lib/db";
import { splitTags, uniqueStrings } from "@/lib/format";
import { serializeScript } from "@/lib/serializers";

const scriptSchema = z.object({
  title: z.string().trim().min(1),
  language: z.enum(["VI", "EN"]).default("VI"),
  stage: z
    .enum(["QUOTE", "WARNING", "BACKUP", "DOWNLOADING", "ERROR", "DONE", "SUPPORT", "OTHER"])
    .default("OTHER"),
  brand: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  body: z.string().trim().min(1),
  variables: z.array(z.string()).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

function extractVariables(body: string, explicit?: string[]) {
  const found = Array.from(body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((match) => match[1]);
  return uniqueStrings([...(explicit ?? []), ...found]);
}

export async function POST(request: NextRequest) {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const payload = scriptSchema.parse(await request.json());
  const tags = Array.isArray(payload.tags)
    ? uniqueStrings(payload.tags)
    : typeof payload.tags === "string"
      ? uniqueStrings(splitTags(payload.tags))
      : [];

  const script = await prisma.scriptTemplate.create({
    data: {
      title: payload.title,
      language: payload.language,
      stage: payload.stage,
      brand: payload.brand || null,
      model: payload.model || null,
      body: payload.body,
      variables: extractVariables(payload.body, payload.variables),
      tags,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SCRIPT_IMPORTED",
      actorType: actor!.type,
      actorEmail: actor!.email,
      entityType: "ScriptTemplate",
      entityId: script.id,
    },
  });

  return NextResponse.json({ script: serializeScript(script) }, { status: 201 });
}
