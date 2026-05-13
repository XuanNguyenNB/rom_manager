import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { serializeRomFile } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const data = await searchCatalog(query);

  return NextResponse.json({
    files: data.files.map(serializeRomFile),
  });
}
