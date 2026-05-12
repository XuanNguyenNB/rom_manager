import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { activateSafeSession, SAFE_COOKIE } from "@/lib/safe-session";

const loginSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  const payload = loginSchema.parse(await request.json());
  const session = await activateSafeSession(payload.code);

  if (!session) {
    return NextResponse.json({ error: "Code invalid or expired" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, expiresAt: session.expiresAt });
  response.cookies.set(SAFE_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });

  return response;
}
