import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActor } from "@/lib/access";
import { createDownloadLink } from "@/lib/download-links";
import { env } from "@/lib/env";

const linkSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1),
  note: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  const { actor, response } = await requireActor({ allowSafe: true });
  if (response) {
    return response;
  }

  const payload = linkSchema.parse(await request.json());
  const { token, link } = await createDownloadLink(
    payload.fileIds,
    actor?.type === "admin" ? actor.email : undefined,
    payload.note,
  );

  const path = link.kind === "FILE" ? `/d/${token}` : `/p/${token}`;

  return NextResponse.json({
    token,
    url: `${env.appUrl.replace(/\/+$/, "")}${path}`,
    path,
    expiresAt: link.expiresAt,
    kind: link.kind,
  });
}
