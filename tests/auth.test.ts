import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "../src/db/schema";
import { createAuthWithAdapter } from "../src/lib/auth";

test("Better Auth: provisionamento, cadastro fechado, login, sessão e logout", async () => {
  const db = new PGlite();
  try {
    for (const file of (await readdir("drizzle"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`drizzle/${file}`, "utf8"));
    const env = {
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
    };
    const adapter = drizzleAdapter(drizzle(db, { schema }), {
      provider: "pg",
      schema,
      transaction: true,
    });
    const provisioning = createAuthWithAdapter(adapter, env, true);
    // Ephemeral credentials only; no credentials or fixture data are shipped in the application.
    const credentials = {
      name: "Teste de integração",
      email: "integration@example.test",
      password: crypto.randomUUID(),
    };
    const result = await provisioning.api.signUpEmail({ body: credentials });
    assert.ok(result.user.id);
    const auth = createAuthWithAdapter(adapter, env);
    const request = (path: string, body: unknown, cookie?: string) =>
      new Request(`${env.BETTER_AUTH_URL}/api/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: env.BETTER_AUTH_URL,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
    const signup = await auth.handler(
      request("sign-up/email", {
        ...credentials,
        email: "public@example.test",
      }),
    );
    assert.ok(signup.status >= 400, "o cadastro público deve ser recusado");
    const wrong = await auth.handler(
      request("sign-in/email", {
        email: credentials.email,
        password: "wrong-password-for-test",
      }),
    );
    assert.equal(wrong.status, 401);
    const login = await auth.handler(
      request("sign-in/email", {
        email: credentials.email,
        password: credentials.password,
      }),
    );
    assert.equal(login.status, 200);
    const cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    assert.ok(cookie.includes("session_token="));
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: cookie }),
    });
    assert.equal(session?.user.id, result.user.id);
    const logout = await auth.handler(request("sign-out", {}, cookie));
    assert.equal(logout.status, 200);
    assert.equal(
      await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }),
      null,
    );
  } finally {
    await db.close();
  }
});
