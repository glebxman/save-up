import { db } from "../config/database.js";
import { users, accounts, transactions } from "./schema/index.js";
import { eq, and, isNull } from "drizzle-orm";
import { getExchangeRates } from "../services/currency.service.js";

async function run() {
  const telegramId = Number(process.argv[2]);
  if (!telegramId) {
    console.error("Please provide a Telegram ID as an argument. Example: npx tsx src/db/diagnose-user.ts 12345678");
    process.exit(1);
  }

  console.log(`Diagnosing database state for Telegram ID: ${telegramId}...`);
  try {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    if (!user) {
      console.error("User not found!");
      process.exit(1);
    }

    console.log("\n=== USER RECORD ===");
    console.log(`ID: ${user.id}`);
    console.log(`Telegram ID: ${user.telegramId}`);
    console.log(`Base Currency: ${user.currency}`);
    console.log(`User Table Balance: ${user.balance}`);
    console.log(`User Table Savings: ${user.savings}`);

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)));

    console.log("\n=== ACCOUNTS ===");
    for (const acc of userAccounts) {
      console.log(`- Account ID: ${acc.id}`);
      console.log(`  Name: "${acc.name}"`);
      console.log(`  Type: ${acc.type}`);
      console.log(`  Currency: ${acc.currency}`);
      console.log(`  Balance: ${acc.balance}`);
      console.log(`  Holdings: ${JSON.stringify(acc.holdings)}`);
    }

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), isNull(transactions.deletedAt)))
      .orderBy(transactions.occurredAt);

    console.log("\n=== TRANSACTIONS (First 20 and Last 20) ===");
    console.log(`Total active transactions: ${userTransactions.length}`);
    
    const toShow = 20;
    const showList = [];
    if (userTransactions.length <= toShow * 2) {
      showList.push(...userTransactions);
    } else {
      showList.push(...userTransactions.slice(0, toShow));
      showList.push({ isSeparator: true } as any);
      showList.push(...userTransactions.slice(-toShow));
    }

    let calculatedBalance = 0;
    for (const tx of showList) {
      if ('isSeparator' in tx) {
        console.log("  ... [truncated intermediate transactions] ...");
        continue;
      }
      console.log(`- Tx ID: ${tx.id}`);
      console.log(`  Type: ${tx.type}`);
      console.log(`  Amount: ${tx.amount}`);
      console.log(`  SavingsAmt: ${tx.savingsAmt}`);
      console.log(`  Category: ${tx.category}`);
      console.log(`  Note: "${tx.note}"`);
      console.log(`  Account ID: ${tx.accountId}`);
      console.log(`  Occurred At: ${tx.occurredAt.toISOString()}`);
    }

    const { rates } = await getExchangeRates();
    const ratesAny = rates as any;
    console.log("\n=== EXCHANGE RATES ===");
    console.log(`USD: ${rates.USD}`);
    if (user.currency && ratesAny[user.currency]) {
      console.log(`${user.currency}: ${ratesAny[user.currency]}`);
    }

  } catch (error) {
    console.error("Diagnosis failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
