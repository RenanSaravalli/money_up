import { z } from "zod";
const environmentSchema = z.object({
  DATABASE_URL: z.url().refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        url.hostname.endsWith(".neon.tech") &&
        ["require", "verify-full"].includes(
          url.searchParams.get("sslmode") ?? "",
        )
      );
    } catch {
      return false;
    }
  }, "Use uma URL PostgreSQL do Neon com sslmode=require."),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z
    .url()
    .refine(
      (value) =>
        process.env.NODE_ENV !== "production" || value.startsWith("https://"),
      "HTTPS obrigatório em produção.",
    ),
});
export function environmentStatus() {
  const parsed = environmentSchema.safeParse(process.env);
  return {
    ready: parsed.success,
    missing: parsed.success
      ? []
      : [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
  };
}
export function getEnvironment() {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      "Configuração incompleta. Consulte o .env.example e o README.",
    );
  return parsed.data;
}
