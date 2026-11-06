import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { getEnvironment } from "@/lib/env";

const globalDb = globalThis as unknown as { fluxoPool?: Pool };
export function getDb() {
  const { DATABASE_URL } = getEnvironment();
  const pool = (globalDb.fluxoPool ??= new Pool({
    connectionString: DATABASE_URL,
    enableChannelBinding: true,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  }));
  return drizzle(pool, { schema });
}
export async function closeDb() {
  await globalDb.fluxoPool?.end();
  globalDb.fluxoPool = undefined;
}
