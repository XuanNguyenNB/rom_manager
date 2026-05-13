import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { env, isGoogleAuthConfigured } from "@/lib/env";
import { safeCompare, sha256 } from "@/lib/security";

export type Actor = {
  type: "admin";
  email?: string;
};

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Admin password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password ?? "";

      if (!email || !env.adminPassword || env.adminEmails.length === 0) {
        return null;
      }

      const emailAllowed = env.adminEmails.includes(email);
      const passwordMatches = safeCompare(sha256(password), sha256(env.adminPassword));

      if (!emailAllowed || !passwordMatches) {
        return null;
      }

      return { id: email, email };
    },
  }),
];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: env.nextAuthSecret || "development-secret-change-me",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ profile, user }) {
      const email = (user.email ?? profile?.email)?.toLowerCase();

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
  if (
    env.devAuthBypass ||
    (process.env.NODE_ENV !== "production" && !isGoogleAuthConfigured() && !env.adminPassword)
  ) {
    return { type: "admin", email: "dev@local" };
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
