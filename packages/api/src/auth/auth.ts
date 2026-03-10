import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/client";
import * as schema from "../db/schema";
import { env } from "../env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  trustedOrigins: [env.APP_URL, env.CLIENT_URL],
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production"
    }
  }
});

export interface NormalizedSession {
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

export const getAuthSession = async (headers: Headers): Promise<NormalizedSession | null> => {
  const rawSession = (await auth.api.getSession({
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
