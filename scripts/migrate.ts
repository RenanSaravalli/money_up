import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
loadEnvConfig(process.cwd());
async function main() {
  const { getDb, closeDb } = await import("../src/db");
  try {
    await migrate(getDb(), { migrationsFolder: "./drizzle" });
    console.log("Migrations aplicadas ao Neon.");
  } finally {
    await closeDb();
  }
}
main().catch(() => {
  console.error(
    "Falha ao aplicar migrations. Verifique DATABASE_URL, acesso ao Neon e o schema.",
  );
  process.exitCode = 1;
});
