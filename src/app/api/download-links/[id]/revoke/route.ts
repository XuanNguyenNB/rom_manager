import { NextResponse } from "next/server";
import { requireActor } from "@/lib/access";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const { id } = await context.params;
  const link = await prisma.downloadLink.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: "LINK_REVOKED",
      actorType: actor!.type,
      actorEmail: actor!.email,
      entityType: "DownloadLink",
      entityId: link.id,
      linkId: link.id,
    },
  });

  return NextResponse.json({ link });
}
