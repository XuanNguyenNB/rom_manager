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

async function main() {
  for (const device of devices) {
    await prisma.device.upsert({
      where: { brand_model: { brand: device.brand, model: device.model } },
      update: device,
      create: device,
    });
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
