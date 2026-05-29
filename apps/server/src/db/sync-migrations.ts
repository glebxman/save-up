import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "migrations");

const { Pool } = pg;
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function run() {
  console.log("Synchronizing migration metadata...");
  try {
    const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Can't find meta/_journal.json file at ${journalPath}`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    const entries = journal.entries;

    // Ensure the new drizzle schema and migrations table exist
    console.log("Creating/verifying 'drizzle' schema and migrations table...");
    await pool.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        "id" SERIAL PRIMARY KEY,
        "hash" text NOT NULL,
        "created_at" bigint
      )
    `);

    // Clean up public.__drizzle_migrations to avoid confusion
    console.log("Dropping old public.__drizzle_migrations table if it exists...");
    await pool.query('DROP TABLE IF EXISTS "public"."__drizzle_migrations"');

    // Reset drizzle migrations log in drizzle schema
    console.log("Cleaning up drizzle.__drizzle_migrations table...");
    await pool.query('TRUNCATE TABLE "drizzle"."__drizzle_migrations" RESTART IDENTITY');

    // Check if holdings column exists in accounts table
    const checkColumnRes = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'holdings'
    `);
    const holdingsExists = (checkColumnRes.rowCount ?? 0) > 0;
    console.log(`Does 'holdings' column exist in 'accounts' table? ${holdingsExists ? "Yes" : "No"}`);

    for (const entry of entries) {
      const sqlFile = `${entry.tag}.sql`;
      const sqlPath = path.join(migrationsFolder, sqlFile);
      
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`Migration SQL file not found: ${sqlPath}`);
      }

      // If it is 0001_new_puma and holdings doesn't exist, we don't register it,
      // so drizzle-kit migrate will run it and add the column.
      if (entry.tag === "0001_new_puma" && !holdingsExists) {
        console.log(`Skipping registration of ${entry.tag} because 'holdings' column needs to be created by running migrations.`);
        continue;
      }

      console.log(`` + `Hashing and registering migration: ${entry.tag}`);
      const sqlContent = fs.readFileSync(sqlPath, "utf-8");
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
      const when = entry.when;

      await pool.query(
        'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [hash, when]
      );
    }

    console.log("SUCCESS: Migration log synchronized perfectly!");
  } catch (error) {
    console.error("ERROR: Failed to synchronize migration log:", error);
  } finally {
    await pool.end();
  }
}

run();
