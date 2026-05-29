/**
 * create-missing-accounts.ts
 *
 * One-time migration script for existing users who were created before the
 * multi-account feature was introduced. For every user who has zero active
 * accounts this script will:
 *
 *   1. Create a "Main / Основной" account using the user's configured currency.
 *   2. Re-attach all of the user's orphan transactions (account_id IS NULL) to
 *      that new account so that syncUserSnapshot can pick them up.
 *
 * Safe to run multiple times — users who already have accounts are skipped.
 */

import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function run() {
  console.log("=== create-missing-accounts ===");
  console.log("Database:", env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find all users who have NO active account at all
    const { rows: usersWithoutAccounts } = await client.query<{
      id: string;
      telegram_id: string;
      currency: string;
      language: string | null;
      first_name: string | null;
    }>(`
      SELECT u.id, u.telegram_id, u.currency, u.language, u.first_name
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.user_id = u.id AND a.deleted_at IS NULL
      )
      ORDER BY u.created_at
    `);

    console.log(`\nFound ${usersWithoutAccounts.length} users without accounts.\n`);

    if (usersWithoutAccounts.length === 0) {
      console.log("Nothing to do — all users already have accounts.");
      await client.query("ROLLBACK");
      return;
    }

    let created = 0;
    let reassigned = 0;

    for (const user of usersWithoutAccounts) {
      const accountName = user.language === "ru" ? "Основной" : "Main";
      const currency = user.currency || "UZS";

      // 1. Create the default account
      const { rows: newAccRows } = await client.query<{ id: string }>(`
        INSERT INTO accounts (user_id, name, type, currency, balance, created_at)
        VALUES ($1, $2, 'cash', $3, 0, NOW())
        RETURNING id
      `, [user.id, accountName, currency]);

      const newAccountId = newAccRows[0]!.id;
      created++;

      // 2. Re-attach all orphan transactions (account_id IS NULL) to the new account
      const { rowCount } = await client.query(`
        UPDATE transactions
        SET account_id = $1
        WHERE user_id = $2
          AND account_id IS NULL
          AND deleted_at IS NULL
      `, [newAccountId, user.id]);

      const count = rowCount ?? 0;
      reassigned += count;

      console.log(
        `  ✓ User ${user.first_name ?? user.telegram_id} (${user.telegram_id}): ` +
        `created account "${accountName}" [${currency}], reassigned ${count} transactions`
      );
    }

    await client.query("COMMIT");

    console.log(`\n=== Done ===`);
    console.log(`  Accounts created:       ${created}`);
    console.log(`  Transactions reassigned: ${reassigned}`);
    console.log(`\nNext step: balances will be recalculated automatically on next user request.`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nERROR — rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
