import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";
import {
  ProvisioningInputError,
  passwordValidationMessage,
  provisioningErrorMessage,
} from "../src/lib/provisioning";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.stdin.isTTY)
    throw new ProvisioningInputError(
      "Execute npm run user:create em um terminal interativo.",
    );
  const { getDb, closeDb } = await import("../src/db");
  const { user } = await import("../src/db/schema");
  const { createAuth } = await import("../src/lib/auth");
  const { seedCategories } = await import("../src/features/finance/service");
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  async function askHidden(prompt: string) {
    process.stdout.write(prompt);
    muted = true;
    try {
      return await rl.question("");
    } finally {
      muted = false;
      process.stdout.write("\n");
    }
  }
  try {
    const [existing] = await getDb()
      .select({ id: user.id })
      .from(user)
      .limit(1);
    if (existing) {
      await seedCategories(existing.id);
      console.log(
        "Usuário inicial já existe. Categorias verificadas; cadastro adicional bloqueado.",
      );
      return;
    }
    const nameResult = z
      .string()
      .trim()
      .min(2)
      .max(80)
      .safeParse(await rl.question("Nome: "));
    if (!nameResult.success)
      throw new ProvisioningInputError(
        "O nome precisa ter de 2 a 80 caracteres.",
      );
    const emailResult = z
      .email()
      .safeParse((await rl.question("E-mail: ")).trim().toLowerCase());
    if (!emailResult.success)
      throw new ProvisioningInputError("Informe um e-mail válido.");
    let password: string;
    while (true) {
      password = await askHidden("Senha (12 a 128 caracteres; oculta): ");
      const confirm = await askHidden("Confirme a senha: ");
      const message = passwordValidationMessage(password, confirm);
      if (!message) break;
      console.error(message);
    }
    const name = nameResult.data;
    const email = emailResult.data;
    // This instance exists only in this local CLI; the web instance always disables sign-up.
    const result = await createAuth(true).api.signUpEmail({
      body: { name, email, password },
    });
    await seedCategories(result.user.id);
    console.log(
      "Usuário criado. Entre no aplicativo com seu e-mail e sua senha.",
    );
  } finally {
    muted = false;
    rl.close();
    await closeDb();
  }
}
main().catch((error) => {
  console.error(provisioningErrorMessage(error));
  process.exitCode = 1;
});
