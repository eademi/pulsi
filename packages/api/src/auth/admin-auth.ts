import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/client";
import {
  adminAccount,
  adminSession,
  adminUser,
  adminVerification
} from "../db/schema";
import { env } from "../env";

export const adminAuth = betterAuth({
  secret: env.ADMIN_AUTH_SECRET,
  baseURL: env.APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: adminUser,
      session: adminSession,
      account: adminAccount,
      verification: adminVerification
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  trustedOrigins: [env.APP_URL, env.ADMIN_URL],
  advanced: {
    cookiePrefix: "pulsi_admin",
    defaultCookieAttributes: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: env.NODE_ENV === "production"
    }
  }
});

export interface NormalizedAdminSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

export const getAdminAuthSession = async (
  headers: Headers
): Promise<NormalizedAdminSession | null> => {
  const rawSession = (await adminAuth.api.getSession({
    headers
  })) as
    | {
        user: { id: string; email: string; name: string; image?: string | null };
        session: { id: string; expiresAt: Date | string };
      }
    | null;

  if (!rawSession) {
    return null;
  }

  return {
    user: rawSession.user,
    session: {
      id: rawSession.session.id,
      expiresAt: new Date(rawSession.session.expiresAt).toISOString()
    }
  };
};
