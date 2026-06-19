import { db } from "../config/database.js";
import { users } from "./schema/index.js";

async function run() {
  console.log("Starting resetting all user PINs (passwords) on the server...");
  try {
    const result = await db.update(users).set({
      pinHash: null,
      pinSalt: null,
    });
    
    console.log("Successfully reset all passwords (PINs) on the server.");
  } catch (error) {
    console.error("Failed to reset PINs:", error);
  } finally {
    process.exit(0);
  }
}

run();
