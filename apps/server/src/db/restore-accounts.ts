import { db } from "../config/database.js";
import { users, accounts, transactions } from "./schema/index.js";
import { eq, and, isNull } from "drizzle-orm";
import { syncUserSnapshot } from "../services/finance/_shared.js";
import type { UserRow } from "./schema/users.js";

async function run() {
  console.log("Restoring accounts and assigning orphan transactions...");
  try {
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in database.`);

    for (const user of allUsers) {
      try {
        console.log(`Processing user ${user.telegramId} (ID: ${user.id})...`);
        
        // Get all active accounts for this user
        const userAccounts = await db
          .select()
          .from(accounts)
          .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)));

        let defaultAccount = userAccounts.find(
          (a) => a.name === "Основной" || a.name === "Main"
        );

        // If no default account exists, create one or use the oldest active account
        if (!defaultAccount) {
          if (userAccounts.length > 0) {
            // Use the oldest account
            const sorted = userAccounts.sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            );
            defaultAccount = sorted[0];
            console.log(`  Using oldest account '${defaultAccount?.name}' as default.`);
          } else {
            // Create a new default account
            const name = user.language === "ru" ? "Основной" : "Main";
            const [newAcc] = await db
              .insert(accounts)
              .values({
                userId: user.id,
                name,
                type: "cash",
                currency: user.currency || "UZS",
                balance: 0,
              })
              .returning();
            defaultAccount = newAcc;
            console.log(`  Created new default account '${name}'.`);
          }
        }

        if (!defaultAccount) {
          console.error(`  Could not find or create default account!`);
          continue;
        }

        // Find all transactions for this user where accountId is null and link them
        const result = await db
          .update(transactions)
          .set({ accountId: defaultAccount.id })
          .where(and(eq(transactions.userId, user.id), isNull(transactions.accountId)));

        console.log(`  Linked transactions to '${defaultAccount.name}'.`);

        // Recalculate balances using syncUserSnapshot
        await db.transaction(async (tx) => {
          await syncUserSnapshot(tx, user as UserRow);
        });
        console.log(`  Recalculated balance snapshot successfully.`);
      } catch (userErr) {
        console.error(`  Error processing user ${user.telegramId}:`, userErr);
      }
    }

    console.log("SUCCESS: All accounts restored and balances synchronized successfully!");
  } catch (error) {
    console.error("ERROR: Failed to restore accounts:", error);
  } finally {
    process.exit(0);
  }
}

run();
