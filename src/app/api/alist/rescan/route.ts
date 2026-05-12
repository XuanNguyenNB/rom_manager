import { NextResponse } from "next/server";
import { requireActor } from "@/lib/access";
import { scanAListTree } from "@/lib/alist";
import { prisma } from "@/lib/db";

export async function POST() {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  try {
    const scanned = await scanAListTree();
    const seen = new Set(scanned.map((file) => file.alistPath));
    const now = new Date();

    for (const file of scanned) {
      await prisma.romFile.upsert({
        where: { alistPath: file.alistPath },
        update: {
          filename: file.filename,
          sizeBytes: file.sizeBytes,
          modifiedAt: file.modifiedAt,
          lastSeenAt: now,
          missingAt: null,
        },
        create: {
          alistPath: file.alistPath,
          filename: file.filename,
          sizeBytes: file.sizeBytes,
          modifiedAt: file.modifiedAt,
          lastSeenAt: now,
          status: "UNCLASSIFIED",
        },
      });
    }

    await prisma.romFile.updateMany({
      where: { alistPath: { in: Array.from(seen) }, status: "MISSING" },
      data: { status: "UNCLASSIFIED", missingAt: null, lastSeenAt: now },
    });

    const existing = await prisma.romFile.findMany({
      select: { id: true, alistPath: true },
    });

    const missingIds = existing
      .filter((file) => !seen.has(file.alistPath))
      .map((file) => file.id);

    if (missingIds.length > 0) {
      await prisma.romFile.updateMany({
        where: { id: { in: missingIds } },
        data: {
          status: "MISSING",
          missingAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "FILE_SCAN",
        actorType: actor!.type,
        actorEmail: actor!.email,
        metadata: {
          scanned: scanned.length,
          missing: missingIds.length,
        },
      },
    });

    return NextResponse.json({ scanned: scanned.length, missing: missingIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AList scan error.";
    console.error("AList scan failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
