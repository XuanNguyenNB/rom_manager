import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";

export async function getActor() {
  const admin = await getAdminActor();
  if (admin) {
    return admin;
  }

  return null;
}

export async function requireActor() {
  const actor = await getActor();

  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { actor, response: null };
}
