import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActor } from "@/lib/access";
import { prisma } from "@/lib/db";
import { uniqueStrings } from "@/lib/format";

const importSchema = z.object({
  text: z.string().min(1),
});

function parseLine(line: string) {
  const parts = line.split("\t");
  if (parts.length >= 3) {
    const [title, language, stage, body, tags = ""] = parts;
    return { title, language, stage, body, tags };
  }

  const [title, body] = line.split("|");
  return { title, language: "VI", stage: "OTHER", body, tags: "" };
}

function extractVariables(body: string) {
  return uniqueStrings(Array.from(body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((match) => match[1]));
}

export async function POST(request: NextRequest) {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const payload = importSchema.parse(await request.json());
  const lines = payload.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const created = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed.title || !parsed.body) {
      continue;
    }

    const script = await prisma.scriptTemplate.create({
      data: {
        title: parsed.title.trim(),
        language: parsed.language.trim().toUpperCase() === "EN" ? "EN" : "VI",
        stage: [
          "QUOTE",
          "WARNING",
          "BACKUP",
          "DOWNLOADING",
          "ERROR",
          "DONE",
          "SUPPORT",
          "OTHER",
        ].includes(parsed.stage.trim().toUpperCase())
          ? (parsed.stage.trim().toUpperCase() as never)
          : "OTHER",
        body: parsed.body.trim(),
        variables: extractVariables(parsed.body),
        tags: uniqueStrings(parsed.tags.split(",").map((tag) => tag.trim())),
      },
    });
    created.push(script);
  }

  await prisma.auditLog.create({
    data: {
      action: "SCRIPT_IMPORTED",
      actorType: actor!.type,
      actorEmail: actor!.email,
      metadata: { count: created.length },
    },
  });

  return NextResponse.json({ count: created.length, scripts: created });
}
