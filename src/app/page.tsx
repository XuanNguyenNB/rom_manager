import { redirect } from "next/navigation";
import { DashboardClient, type FileDto, type LinkDto } from "@/components/dashboard-client";
import { getAdminActor } from "@/lib/auth";
import { getCatalogData } from "@/lib/catalog";

function serializeFile(file: {
  id: string;
  alistPath: string;
  filename: string;
  sizeBytes: bigint | null;
  modifiedAt: Date | null;
  brand: string | null;
  model: string | null;
  region: string | null;
  androidVersion: string | null;
  buildNumber: string | null;
  fileType: string;
  status: string;
  tags: string[];
  note: string | null;
  checksum: string | null;
  updatedAt: Date;
}): FileDto {
  return {
    ...file,
    sizeBytes: file.sizeBytes?.toString() ?? null,
    modifiedAt: file.modifiedAt?.toISOString() ?? null,
    updatedAt: file.updatedAt.toISOString(),
  };
}

export default async function Home() {
  const actor = await getAdminActor();

  if (!actor) {
    redirect("/login");
  }

  const data = await getCatalogData();

  return (
    <DashboardClient
      actorEmail={actor.email}
      dbReady={data.dbReady}
      initialDevices={data.devices.map((device) => ({
        id: device.id,
        brand: device.brand,
        model: device.model,
        aliases: device.aliases,
        chipset: device.chipset,
      }))}
      initialFiles={data.files.map(serializeFile)}
      initialLinks={
        data.links.map((link) => ({
          id: link.id,
          kind: link.kind,
          expiresAt: link.expiresAt.toISOString(),
          revokedAt: link.revokedAt?.toISOString() ?? null,
          downloadCount: link.downloadCount,
          createdAt: link.createdAt.toISOString(),
          files: link.files.map((item) => ({ file: serializeFile(item.file) })),
        })) satisfies LinkDto[]
      }
      initialScripts={data.scripts.map((script) => ({
        id: script.id,
        title: script.title,
        language: script.language,
        brand: script.brand,
        model: script.model,
        stage: script.stage,
        body: script.body,
        variables: script.variables,
        tags: script.tags,
      }))}
    />
  );
}
