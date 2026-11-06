import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migrations PostgreSQL: vínculos por usuário, restrições financeiras e rollback", async (t) => {
  // Ephemeral PostgreSQL engine for schema tests only; application persistence is exclusively Neon.
  const db = new PGlite();
  try {
    for (const file of (await readdir("drizzle"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`drizzle/${file}`, "utf8"));
    const owner = "11111111-1111-4111-8111-111111111111",
      other = "22222222-2222-4222-8222-222222222222";
    const origin = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      destination = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      foreign = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      expense = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      income = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    await db.query(
      'insert into "user" (id,name,email) values ($1,$2,$3),($4,$5,$6)',
      [
        owner,
        "Teste",
        "schema-owner@example.test",
        other,
        "Outro",
        "schema-other@example.test",
      ],
    );
    await db.query(
      "insert into financial_accounts (id,user_id,name,type,initial_balance) values ($1,$2,'Origem','checking',100000),($3,$2,'Reserva','reserve',0),($4,$5,'Outra','checking',0)",
      [origin, owner, destination, foreign, other],
    );
    await db.query(
      "insert into categories (id,user_id,name,kind) values ($1,$2,'Alimentação','expense'),($3,$2,'Salário','income')",
      [expense, owner, income],
    );
    const insert = (
      kind: string,
      amount: string,
      accountId: string,
      destinationId: string | null,
      categoryId: string | null,
    ) =>
      db.query(
        "insert into transactions (user_id,kind,amount,description,account_id,destination_account_id,category_id,occurred_at) values ($1,$2,$3,'Teste',$4,$5,$6,now()) returning id",
        [owner, kind, amount, accountId, destinationId, categoryId],
      );
    await t.test("recusa movimentações cruzando usuários", async () => {
      await assert.rejects(
        insert("transfer", "100", origin, foreign, null),
        /foreign key/i,
      );
      await assert.rejects(
        insert("expense", "100", foreign, null, expense),
        /foreign key/i,
      );
    });
    await t.test(
      "recusa categorias incompatíveis e transferências inválidas",
      async () => {
        await assert.rejects(
          insert("expense", "100", origin, null, income),
          /foreign key/i,
        );
        await assert.rejects(
          insert("expense", "100", origin, null, null),
          /check constraint/i,
        );
        await assert.rejects(
          insert("transfer", "100", origin, origin, null),
          /check constraint/i,
        );
        await assert.rejects(
          insert("transfer", "100", origin, destination, expense),
          /check constraint/i,
        );
      },
    );
    await t.test(
      "recusa valores zero, negativos e fora do limite",
      async () => {
        for (const value of ["0", "-1", "9000000000001"])
          await assert.rejects(
            insert("expense", value, origin, null, expense),
            /check constraint/i,
          );
      },
    );
    await t.test(
      "transferência é uma única linha, sem dupla contagem",
      async () => {
        const result = await insert(
          "transfer",
          "25000",
          origin,
          destination,
          null,
        );
        assert.equal(result.rows.length, 1);
        const total = await db.query<{ total: number }>(
          "select count(*)::int as total from transactions",
        );
        assert.equal(total.rows[0].total, 1);
      },
    );
    await t.test("rollback remove alterações parciais após falha", async () => {
      await db.exec("begin");
      try {
        await insert("income", "12345", origin, null, income);
        await insert("transfer", "100", origin, foreign, null);
        assert.fail("deveria rejeitar");
      } catch {
        await db.exec("rollback");
      }
      const result = await db.query<{ total: number }>(
        "select count(*)::int as total from transactions where kind='income'",
      );
      assert.equal(result.rows[0].total, 0);
    });
    await t.test(
      "editar e excluir alteram somente o registro financeiro",
      async () => {
        const result = await insert("expense", "199", origin, null, expense);
        const id = (result.rows[0] as { id: string }).id;
        await db.query("update transactions set amount=299 where id=$1", [id]);
        const updated = await db.query<{ amount: bigint }>(
          "select amount from transactions where id=$1",
          [id],
        );
        assert.equal(String(updated.rows[0].amount), "299");
        await assert.rejects(
          db.query("delete from categories where id=$1", [expense]),
          /foreign key/i,
        );
        await db.query("delete from transactions where id=$1", [id]);
        const removed = await db.query(
          "select id from transactions where id=$1",
          [id],
        );
        assert.equal(removed.rows.length, 0);
      },
    );
    await t.test(
      "cartões recusam limite ou dias inconsistentes e contas de outro usuário",
      async () => {
        await assert.rejects(
          db.query(
            "insert into cards (user_id,name,institution,type,account_id,credit_limit,closing_day,due_day) values ($1,'Teste','Banco','credit',$2,1000,0,10)",
            [owner, origin],
          ),
          /check constraint/i,
        );
        await assert.rejects(
          db.query(
            "insert into cards (user_id,name,institution,type,account_id) values ($1,'Teste','Banco','debit',$2)",
            [owner, foreign],
          ),
          /foreign key/i,
        );
      },
    );
  } finally {
    await db.close();
  }
});
