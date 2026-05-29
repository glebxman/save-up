import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../config/database.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log("Starting migration diagnostic run...");
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "migrations"),
    });
    console.log("SUCCESS: Migrations applied successfully!");
  } catch (error) {
    console.error("ERROR: Migration failed!");
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
