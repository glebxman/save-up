import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function run() {
  console.log("Inspecting database:", env.DATABASE_URL);
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("Existing tables:", tables);

    for (const table of tables) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`Table "${table}" row count:`, countRes.rows[0].count);

      const columnsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      console.log(`  Columns:`, columnsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));
    }

    if (tables.includes("__drizzle_migrations")) {
      const migsRes = await pool.query(`SELECT * FROM "__drizzle_migrations" ORDER BY id ASC`);
      console.log("Migrations in __drizzle_migrations:");
      console.log(migsRes.rows);
    }
  } catch (error) {
    console.error("Inspection failed:", error);
  } finally {
    await pool.end();
  }
}

run();
