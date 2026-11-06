import { z } from "zod";
import { parseMoney } from "./money";
import { toInstant } from "./dates";
const amount = (allowNegative = false) =>
  z
    .string()
    .max(30)
    .transform((value, ctx) => {
      try {
        return parseMoney(value, allowNegative).toString();
      } catch (error) {
        ctx.addIssue({ code: "custom", message: (error as Error).message });
        return z.NEVER;
      }
    });
const positiveAmount = amount().refine(
  (value) => BigInt(value) > 0n,
  "Informe um valor maior que zero.",
);
const optionalId = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .transform((value) => value || null);
const name = z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(80);
export const transactionSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["income", "expense", "transfer"]),
    amount: positiveAmount,
    description: name,
    categoryId: optionalId,
    accountId: z.uuid("Selecione uma conta."),
    destinationAccountId: optionalId,
    occurredAt: z
      .string()
      .transform((value, ctx) => {
        try {
          return toInstant(value);
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Informe uma data e um horário válidos.",
          });
          return z.NEVER;
        }
      })
      .refine(
        (value) => new Date(value).getTime() <= Date.now() + 60_000,
        "Use uma data que não esteja no futuro.",
      ),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "transfer") {
      if (!value.destinationAccountId)
        ctx.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "Selecione a conta de destino.",
        });
      if (value.destinationAccountId === value.accountId)
        ctx.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "As contas devem ser diferentes.",
        });
      if (value.categoryId)
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "Transferências não possuem categoria.",
        });
    } else {
      if (!value.categoryId)
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "Selecione uma categoria.",
        });
      if (value.destinationAccountId)
        ctx.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "Apenas transferências possuem destino.",
        });
    }
  });
export const accountSchema = z.object({
  id: z.uuid(),
  name,
  type: z.enum(["checking", "cash", "reserve"]),
  initialBalance: amount(true),
  icon: z.enum(["wallet", "bank", "piggy", "banknote"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  active: z.boolean(),
});
export const categorySchema = z.object({
  name,
  kind: z.enum(["income", "expense"]),
  icon: z.enum([
    "tag",
    "food",
    "shopping",
    "car",
    "home",
    "sparkles",
    "briefcase",
    "heart",
    "book",
    "banknote",
  ]),
});
export const cardSchema = z
  .object({
    name,
    institution: name,
    type: z.enum(["credit", "debit"]),
    accountId: z.uuid("Selecione uma conta."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    limit: z.string().optional(),
    closingDay: z.string().optional(),
    dueDay: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "credit") {
      try {
        if (parseMoney(value.limit ?? "0") <= 0n) throw new Error();
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["limit"],
          message: "Informe um limite maior que zero.",
        });
      }
      for (const field of ["closingDay", "dueDay"] as const)
        if (
          !/^\d{1,2}$/.test(value[field] ?? "") ||
          Number(value[field]) < 1 ||
          Number(value[field]) > 31
        )
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Use um dia entre 1 e 31.",
          });
    }
  });
