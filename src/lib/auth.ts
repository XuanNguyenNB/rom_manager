import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env, isGoogleAuthConfigured } from "@/lib/env";

export type Actor = {
  type: "admin" | "safe";
  email?: string;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: env.nextAuthSecret || "development-secret-change-me",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: env.googleClientId || "missing-client-id",
      clientSecret: env.googleClientSecret || "missing-client-secret",
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();

      if (!email) {
        return false;
      }

      if (env.adminEmails.length === 0) {
        return process.env.NODE_ENV !== "production";
      }

      return env.adminEmails.includes(email);
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }

      return session;
    },
  },
};

export async function getAdminActor(): Promise<Actor | null> {
  if (env.devAuthBypass || (process.env.NODE_ENV !== "production" && !isGoogleAuthConfigured())) {
    return { type: "admin", email: "dev@local" };
  }

  if (!isGoogleAuthConfigured()) {
    return null;
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  if (env.adminEmails.length === 0 || !env.adminEmails.includes(email)) {
    return null;
  }

  return { type: "admin", email };
}

export async function requireAdminActor() {
  const actor = await getAdminActor();

  if (!actor) {
    throw new Error("UNAUTHORIZED");
  }

  return actor;
}
