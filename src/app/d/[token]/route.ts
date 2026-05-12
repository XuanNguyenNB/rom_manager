import { NextRequest, NextResponse } from "next/server";
import { getActiveLink, resolveDownloadUrl } from "@/lib/download-links";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const fileId = request.nextUrl.searchParams.get("file");
  const link = await getActiveLink(token);

  if (!link) {
    return new NextResponse("Link đã hết hạn hoặc đã bị thu hồi.", { status: 410 });
  }

  if (link.kind === "PACKAGE" && !fileId) {
    return NextResponse.redirect(new URL(`/p/${token}`, request.url));
  }

  const resolved = await resolveDownloadUrl(token, fileId);
  if (!resolved) {
    return new NextResponse("Không tìm thấy file hoặc file đang bị đánh dấu missing.", {
      status: 404,
    });
  }

  return NextResponse.redirect(resolved.downloadUrl, 302);
}
