import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  financialAccounts,
  categories,
  transactions,
  cards,
} from "@/db/schema";
import {
  accountSchema,
  cardSchema,
  categorySchema,
  transactionSchema,
} from "@/lib/validation";
import { calculateBalance } from "@/lib/finance";
import { parseMoney } from "@/lib/money";
import type { Snapshot, Transaction } from "@/types/finance";
import { z } from "zod";

export class FinanceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const defaults = [
  ["Salário", "income", "briefcase"],
  ["Freelance", "income", "banknote"],
  ["Outras receitas", "income", "tag"],
  ["Alimentação", "expense", "food"],
  ["Compras", "expense", "shopping"],
  ["Transporte", "expense", "car"],
  ["Moradia", "expense", "home"],
  ["Lazer", "expense", "sparkles"],
  ["Saúde", "expense", "heart"],
  ["Educação", "expense", "book"],
  ["Outras despesas", "expense", "tag"],
] as const;
export async function seedCategories(userId: string) {
  await getDb()
    .insert(categories)
    .values(
      defaults.map(([name, kind, icon]) => ({ userId, name, kind, icon })),
    )
    .onConflictDoNothing();
}
export async function getSnapshot(userId: string): Promise<Snapshot> {
  return getDb().transaction(
    async (tx) => {
      const accounts = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.userId, userId))
        .orderBy(financialAccounts.createdAt);
      const txs = (
        await tx
          .select()
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
      ).map((t) => ({
        ...t,
        amount: t.amount.toString(),
        occurredAt: t.occurredAt.toISOString(),
      })) satisfies Transaction[];
      const cats = await tx
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
        .orderBy(categories.name);
      const userCards = await tx
        .select()
        .from(cards)
        .where(eq(cards.userId, userId))
        .orderBy(cards.createdAt);
      return {
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type as "checking" | "cash" | "reserve",
          initialBalance: a.initialBalance.toString(),
          balance: calculateBalance(
            { id: a.id, initialBalance: a.initialBalance.toString() },
            txs,
          ).toString(),
          icon: a.icon,
          color: a.color,
          active: a.active,
        })),
        transactions: txs.map(
          ({
            id,
            kind,
            amount,
            description,
            categoryId,
            accountId,
            destinationAccountId,
            occurredAt,
            notes,
          }) => ({
            id,
            kind,
            amount,
            description,
            categoryId,
            accountId,
            destinationAccountId,
            occurredAt,
            notes,
          }),
        ),
        categories: cats.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind as "income" | "expense",
          icon: c.icon,
        })),
        cards: userCards.map((c) => ({
          id: c.id,
          name: c.name,
          institution: c.institution,
          type: c.type as "credit" | "debit",
          limit: c.limit?.toString() ?? null,
          closingDay: c.closingDay,
          dueDay: c.dueDay,
          accountId: c.accountId,
          color: c.color,
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export type Resource = "transactions" | "accounts" | "cards" | "categories";
export async function mutateFinance(
  userId: string,
  resource: Resource,
  method: string,
  body: unknown,
  rawId: string | null,
) {
  const id = rawId ? z.uuid().parse(rawId) : null;
  if (method !== "POST" && !id)
    throw new FinanceError("Identificador obrigatório.");
  return getDb().transaction(async (tx) => {
    // Serialize this user's financial changes; a transfer is one indivisible ledger row.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
    );
    const ownedActiveAccount = async (
      accountId: string,
      allowArchived = false,
    ) => {
      const [a] = await tx
        .select()
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.id, accountId),
            eq(financialAccounts.userId, userId),
          ),
        );
      if (!a || (!a.active && !allowArchived))
        throw new FinanceError(
          "Selecione uma conta ativa que pertença a você.",
        );
    };
    if (resource === "transactions") {
      if (method === "DELETE") {
        const removed = await tx
          .delete(transactions)
          .where(and(eq(transactions.id, id!), eq(transactions.userId, userId)))
          .returning({ id: transactions.id });
        if (!removed.length)
          throw new FinanceError("Transação não encontrada.", 404);
        return;
      }
      const value = transactionSchema.parse(body);
      if (id && value.id !== id)
        throw new FinanceError("Identificador inválido.");
      const [previous] = id
        ? await tx
            .select()
            .from(transactions)
            .where(
              and(eq(transactions.id, id), eq(transactions.userId, userId)),
            )
        : [];
      if (id && !previous)
        throw new FinanceError("Transação não encontrada.", 404);
      await ownedActiveAccount(
        value.accountId,
        previous?.accountId === value.accountId,
      );
      if (value.destinationAccountId)
        await ownedActiveAccount(
          value.destinationAccountId,
          previous?.destinationAccountId === value.destinationAccountId,
        );
      if (value.categoryId) {
        const [cat] = await tx
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, value.categoryId),
              eq(categories.userId, userId),
              eq(categories.kind, value.kind),
            ),
          );
        if (!cat)
          throw new FinanceError("Categoria incompatível com a transação.");
      }
      const data = {
        ...value,
        userId,
        amount: BigInt(value.amount),
        occurredAt: new Date(value.occurredAt),
        notes: value.notes || null,
        updatedAt: new Date(),
      };
      if (method === "POST") {
        const inserted = await tx
          .insert(transactions)
          .values(data)
          .onConflictDoNothing()
          .returning({ id: transactions.id });
        if (!inserted.length)
          throw new FinanceError(
            "Esta operação já foi registrada. Atualize o histórico antes de continuar.",
            409,
          );
      } else {
        const changed = await tx
          .update(transactions)
          .set(data)
          .where(and(eq(transactions.id, id!), eq(transactions.userId, userId)))
          .returning({ id: transactions.id });
        if (!changed.length)
          throw new FinanceError("Transação não encontrada.", 404);
      }
      return;
    }
    if (resource === "accounts") {
      if (method === "DELETE")
        throw new FinanceError(
          "Arquive a conta para preservar suas movimentações.",
        );
      const value = accountSchema.parse(body),
        data = {
          ...value,
          initialBalance: BigInt(value.initialBalance),
          userId,
          updatedAt: new Date(),
        };
      if (id && value.id !== id)
        throw new FinanceError("Identificador inválido.");
      if (method === "POST") {
        const created = await tx
          .insert(financialAccounts)
          .values(data)
          .onConflictDoNothing()
          .returning({ id: financialAccounts.id });
        if (!created.length)
          throw new FinanceError(
            "Esta conta já foi registrada. Atualize a página antes de continuar.",
            409,
          );
      } else if (
        !(
          await tx
            .update(financialAccounts)
            .set(data)
            .where(
              and(
                eq(financialAccounts.id, id!),
                eq(financialAccounts.userId, userId),
              ),
            )
            .returning({ id: financialAccounts.id })
        ).length
      )
        throw new FinanceError("Conta não encontrada.", 404);
      return;
    }
    if (resource === "categories") {
      if (method === "DELETE") {
        if (
          !(
            await tx
              .delete(categories)
              .where(and(eq(categories.id, id!), eq(categories.userId, userId)))
              .returning({ id: categories.id })
          ).length
        )
          throw new FinanceError("Categoria não encontrada.", 404);
      } else {
        const data = {
          ...categorySchema.parse(body),
          userId,
          updatedAt: new Date(),
        };
        if (method === "POST") await tx.insert(categories).values(data);
        else if (
          !(
            await tx
              .update(categories)
              .set(data)
              .where(and(eq(categories.id, id!), eq(categories.userId, userId)))
              .returning({ id: categories.id })
          ).length
        )
          throw new FinanceError("Categoria não encontrada.", 404);
      }
      return;
    }
    if (resource === "cards") {
      if (method === "DELETE") {
        if (
          !(
            await tx
              .delete(cards)
              .where(and(eq(cards.id, id!), eq(cards.userId, userId)))
              .returning({ id: cards.id })
          ).length
        )
          throw new FinanceError("Cartão não encontrado.", 404);
      } else {
        const value = cardSchema.parse(body);
        await ownedActiveAccount(value.accountId);
        const data = {
          ...value,
          userId,
          limit: value.type === "credit" ? parseMoney(value.limit!) : null,
          closingDay: value.type === "credit" ? Number(value.closingDay) : null,
          dueDay: value.type === "credit" ? Number(value.dueDay) : null,
          updatedAt: new Date(),
        };
        if (method === "POST") await tx.insert(cards).values(data);
        else if (
          !(
            await tx
              .update(cards)
              .set(data)
              .where(and(eq(cards.id, id!), eq(cards.userId, userId)))
              .returning({ id: cards.id })
          ).length
        )
          throw new FinanceError("Cartão não encontrado.", 404);
      }
    }
  });
}
