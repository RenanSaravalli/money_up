export class ProvisioningInputError extends Error {}

export function passwordValidationMessage(
  password: string,
  confirmation: string,
) {
  if (password.length < 12)
    return "A senha precisa ter pelo menos 12 caracteres. Tente novamente.";
  if (password.length > 128)
    return "A senha pode ter no máximo 128 caracteres. Tente novamente.";
  if (password !== confirmation)
    return "As senhas não coincidem. Digite a senha e a confirmação novamente.";
  return null;
}

// Never print raw errors: database errors can include SQL parameters or credentials.
export function provisioningErrorMessage(error: unknown): string {
  if (error instanceof ProvisioningInputError) return error.message;
  const messages: Record<string, string> = {
    PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 12 caracteres.",
    PASSWORD_TOO_LONG: "A senha pode ter no máximo 128 caracteres.",
    USER_ALREADY_EXISTS:
      "Este usuário já existe. Entre no aplicativo ou execute o comando novamente para verificar as categorias.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
      "Este usuário já existe. Entre no aplicativo ou execute o comando novamente para verificar as categorias.",
    FAILED_TO_CREATE_USER:
      "O Better Auth não conseguiu criar o usuário. Verifique se as migrations foram aplicadas com npm run db:migrate.",
    "42P01":
      "As tabelas necessárias não existem. Execute npm run db:migrate e tente novamente.",
    "42703":
      "O schema está desatualizado. Execute npm run db:migrate e tente novamente.",
    "28P01":
      "O Neon recusou as credenciais. Confira DATABASE_URL no .env.local.",
    "23505":
      "O usuário já foi cadastrado. Execute o comando novamente para verificar seu cadastro.",
    EAI_AGAIN:
      "Não foi possível resolver o endereço do Neon. Verifique sua conexão e tente novamente.",
    ENOTFOUND:
      "Endereço do Neon não encontrado. Confira DATABASE_URL e sua conexão.",
    ECONNREFUSED:
      "A conexão com o Neon foi recusada. Verifique a disponibilidade do banco.",
    ETIMEDOUT:
      "A conexão com o Neon demorou demais. Verifique sua conexão e tente novamente.",
  };
  let current = error;
  for (
    let depth = 0;
    depth < 6 && current && typeof current === "object";
    depth++
  ) {
    const detail = current as {
      code?: string;
      body?: { code?: string };
      cause?: unknown;
    };
    const code = detail.body?.code ?? detail.code;
    if (code && messages[code]) return messages[code];
    current = detail.cause;
  }
  return "Não foi possível provisionar. Confira DATABASE_URL, BETTER_AUTH_SECRET e BETTER_AUTH_URL no .env.local e execute npm run db:migrate.";
}
