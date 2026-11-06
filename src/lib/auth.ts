import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { getEnvironment } from "./env";

export function createAuth(provisioning = false) {
  const env = getEnvironment();
  return createAuthWithAdapter(
    drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      transaction: true,
    }),
    env,
    provisioning,
  );
}

// Shared with integration tests; the application entry point above always uses Neon.
export function createAuthWithAdapter(
  database: ReturnType<typeof drizzleAdapter>,
  env: { BETTER_AUTH_URL: string; BETTER_AUTH_SECRET: string },
  provisioning = false,
) {
  return betterAuth({
    appName: "Fluxo",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database,
    emailAndPassword: {
      enabled: true,
      disableSignUp: !provisioning,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
