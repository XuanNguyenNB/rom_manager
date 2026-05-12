import { prisma } from "@/lib/db";
import type {
  Device,
  RomFile,
  ScriptTemplate,
  DownloadLink,
  DownloadLinkFile,
} from "@/generated/prisma/client";

export type CatalogData = {
  devices: Device[];
  files: RomFile[];
  scripts: ScriptTemplate[];
  links: Array<DownloadLink & { files: Array<DownloadLinkFile & { file: RomFile }> }>;
  dbReady: boolean;
};

const fallbackDevices: Device[] = [
  {
    id: "fallback-lg-v60",
    brand: "LG",
    model: "V60",
    aliases: ["LG V60", "LM-V600"],
    codename: null,
    chipset: "Snapdragon 865",
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fallback-oneplus-13",
    brand: "OnePlus",
    model: "13",
    aliases: ["OnePlus 13", "OP13"],
    codename: null,
    chipset: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fallbackScripts: ScriptTemplate[] = [
  {
    id: "fallback-script-warning",
    title: "Cảnh báo sao lưu dữ liệu",
    language: "VI",
    brand: null,
    model: null,
    deviceId: null,
    stage: "WARNING",
    body:
      "Lưu ý: quá trình up ROM có thể mất toàn bộ dữ liệu trong máy. Anh/chị xác nhận đã sao lưu trước khi em thao tác nhé.",
    variables: [],
    tags: ["canh-bao", "backup"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getCatalogData(): Promise<CatalogData> {
  try {
    const [devices, files, scripts, links] = await Promise.all([
      prisma.device.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
      prisma.romFile.findMany({
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 150,
      }),
      prisma.scriptTemplate.findMany({
        where: { active: true },
        orderBy: [{ language: "asc" }, { stage: "asc" }, { title: "asc" }],
        take: 150,
      }),
      prisma.downloadLink.findMany({
        include: {
          files: {
            include: { file: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return { devices, files, scripts, links, dbReady: true };
  } catch {
    return {
      devices: fallbackDevices,
      files: [],
      scripts: fallbackScripts,
      links: [],
      dbReady: false,
    };
  }
}

export async function searchCatalog(query: string) {
  const q = query.trim();
  const normalized = q.toLowerCase();

  if (!q) {
    return {
      files: await prisma.romFile.findMany({
        orderBy: { updatedAt: "desc" },
        take: 80,
      }),
      scripts: await prisma.scriptTemplate.findMany({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        take: 80,
      }),
    };
  }

  const devices = await prisma.device.findMany({
    where: {
      OR: [
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { aliases: { has: q } },
      ],
    },
  });

  const deviceTerms = devices.flatMap((device) => [device.brand, device.model, ...device.aliases]);
  const terms = Array.from(new Set([q, normalized, ...deviceTerms].filter(Boolean)));

  const [files, scripts] = await Promise.all([
    prisma.romFile.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { filename: { contains: term, mode: "insensitive" as const } },
          { alistPath: { contains: term, mode: "insensitive" as const } },
          { brand: { contains: term, mode: "insensitive" as const } },
          { model: { contains: term, mode: "insensitive" as const } },
          { region: { contains: term, mode: "insensitive" as const } },
          { androidVersion: { contains: term, mode: "insensitive" as const } },
          { buildNumber: { contains: term, mode: "insensitive" as const } },
          { tags: { has: term } },
        ]),
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 80,
    }),
    prisma.scriptTemplate.findMany({
      where: {
        active: true,
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" as const } },
          { body: { contains: term, mode: "insensitive" as const } },
          { brand: { contains: term, mode: "insensitive" as const } },
          { model: { contains: term, mode: "insensitive" as const } },
          { tags: { has: term } },
        ]),
      },
      orderBy: [{ language: "asc" }, { stage: "asc" }, { title: "asc" }],
      take: 80,
    }),
  ]);

  return { files, scripts };
}
