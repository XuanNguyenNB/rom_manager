import { NextResponse } from "next/server";
import { requireActor } from "@/lib/access";
import { createSafeSession } from "@/lib/safe-session";

export async function POST() {
  const { actor, response } = await requireActor();
  if (response) {
    return response;
  }

  const session = await createSafeSession(actor!.email);
  return NextResponse.json(session, { status: 201 });
}
