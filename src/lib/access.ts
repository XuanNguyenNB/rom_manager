import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/auth";
import { getSafeActor } from "@/lib/safe-session";

export async function getActor({ allowSafe = false } = {}) {
  const admin = await getAdminActor();
  if (admin) {
    return admin;
  }

  if (allowSafe) {
    return getSafeActor();
  }

  return null;
}

export async function requireActor({ allowSafe = false } = {}) {
  const actor = await getActor({ allowSafe });

  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { actor, response: null };
}
