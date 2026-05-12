import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const devices = [
  { brand: "LG", model: "V60", aliases: ["LG V60", "LM-V600"], chipset: "Snapdragon 865" },
  { brand: "LG", model: "V50", aliases: ["LG V50", "LM-V500"], chipset: "Snapdragon 855" },
  { brand: "LG", model: "Velvet", aliases: ["LG Velvet", "LM-G900"], chipset: "Snapdragon 765G" },
  { brand: "LG", model: "G8", aliases: ["LG G8", "LM-G820"], chipset: "Snapdragon 855" },
  { brand: "Xiaomi", model: "15", aliases: ["Xiaomi 15", "Mi 15"] },
  { brand: "Xiaomi", model: "15 Pro", aliases: ["Xiaomi 15 Pro", "Mi 15 Pro"] },
  { brand: "Xiaomi", model: "15 Ultra", aliases: ["Xiaomi 15 Ultra", "Mi 15 Ultra"] },
  { brand: "Xiaomi", model: "17", aliases: ["Xiaomi 17"] },
  { brand: "Xiaomi", model: "17 Pro", aliases: ["Xiaomi 17 Pro"] },
  { brand: "Xiaomi", model: "17 Ultra", aliases: ["Xiaomi 17 Ultra"] },
  { brand: "OnePlus", model: "13", aliases: ["OnePlus 13", "OP13"] },
  { brand: "OnePlus", model: "15", aliases: ["OnePlus 15", "OP15"] },
  { brand: "OnePlus", model: "Ace 5", aliases: ["OnePlus Ace5", "OnePlus Ace 5"] },
  { brand: "OnePlus", model: "Ace 6T", aliases: ["OnePlus Ace6T", "OnePlus Ace 6T"] },
  { brand: "Oppo", model: "Find X7 Ultra", aliases: ["Oppo Find X7Ultra", "Find X7 Ultra"] },
  { brand: "Oppo", model: "Find N5", aliases: ["Oppo Find N5", "Find N5"] },
];

const scripts = [
  {
    title: "Báo giá up ROM",
    language: "VI" as const,
    stage: "QUOTE" as const,
    body:
      "Dạ máy {model} em có thể hỗ trợ up ROM. Chi phí là {gia}, thời gian dự kiến {thoi_gian}. Trước khi làm anh/chị vui lòng sao lưu dữ liệu quan trọng giúp em.",
    variables: ["model", "gia", "thoi_gian"],
    tags: ["bao-gia", "rom"],
  },
  {
    title: "Cảnh báo sao lưu dữ liệu",
    language: "VI" as const,
    stage: "WARNING" as const,
    body:
      "Lưu ý: quá trình up ROM có thể mất toàn bộ dữ liệu trong máy. Anh/chị xác nhận đã sao lưu ảnh, danh bạ, Zalo và tài khoản quan trọng trước khi em thao tác nhé.",
    variables: [],
    tags: ["canh-bao", "backup"],
  },
  {
    title: "Send download link",
    language: "EN" as const,
    stage: "DOWNLOADING" as const,
    body:
      "Please download this file first: {link}. The file may be large, so keep the browser open until it finishes. I will continue the service after the download is complete.",
    variables: ["link"],
    tags: ["download", "customer"],
  },
  {
    title: "Hoàn tất up ROM",
    language: "VI" as const,
    stage: "DONE" as const,
    body:
      "Máy {model} đã up ROM xong. Anh/chị kiểm tra giúp em sóng, Wi-Fi, camera, CH Play và tài khoản trước khi kết thúc phiên hỗ trợ nhé.",
    variables: ["model"],
    tags: ["hoan-tat"],
  },
];

async function main() {
  for (const device of devices) {
    await prisma.device.upsert({
      where: { brand_model: { brand: device.brand, model: device.model } },
      update: device,
      create: device,
    });
  }

  for (const script of scripts) {
    const existing = await prisma.scriptTemplate.findFirst({
      where: { title: script.title, language: script.language },
    });

    if (!existing) {
      await prisma.scriptTemplate.create({ data: script });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
