import { test } from "node:test";
import assert from "node:assert/strict";
import {
  passwordValidationMessage,
  provisioningErrorMessage,
  ProvisioningInputError,
} from "../src/lib/provisioning";

test("provisionamento distingue senha curta, longa e confirmação diferente", () => {
  assert.match(passwordValidationMessage("curta", "curta")!, /pelo menos 12/);
  assert.match(
    passwordValidationMessage("a".repeat(129), "a".repeat(129))!,
    /máximo 128/,
  );
  assert.match(
    passwordValidationMessage("a".repeat(12), "b".repeat(12))!,
    /não coincidem/,
  );
  assert.equal(passwordValidationMessage("a".repeat(12), "a".repeat(12)), null);
  assert.equal(
    passwordValidationMessage("a".repeat(128), "a".repeat(128)),
    null,
  );
});
test("diagnóstico mostra causas conhecidas sem expor credenciais ou parâmetros SQL", () => {
  const sensitive = "segredo-que-nao-pode-aparecer";
  assert.match(
    provisioningErrorMessage({ cause: { code: "42P01", message: sensitive } }),
    /npm run db:migrate/,
  );
  assert.match(
    provisioningErrorMessage({ body: { code: "PASSWORD_TOO_SHORT" } }),
    /12 caracteres/,
  );
  assert.match(provisioningErrorMessage({ code: "EAI_AGAIN" }), /conexão/);
  assert.equal(
    provisioningErrorMessage(
      new ProvisioningInputError("Informe um e-mail válido."),
    ),
    "Informe um e-mail válido.",
  );
  for (const error of [
    new Error(sensitive),
    { code: "28P01", message: sensitive },
    { cause: new Error(sensitive) },
  ])
    assert.ok(!provisioningErrorMessage(error).includes(sensitive));
});
