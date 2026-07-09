import { db } from "../config/database.js";
import { users } from "./schema/index.js";

async function run() {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "Refusing to run: this resets the PIN/app-lock for EVERY user in the database.\n" +
        "Re-run with --confirm if this is really what you want:\n" +
        "  pnpm tsx src/db/reset-pins.ts --confirm",
    );
    process.exit(1);
  }

  console.log("Starting resetting all user PINs (passwords) on the server...");
  try {
    await db.update(users).set({
      pinHash: null,
      pinSalt: null,
    });

    console.log("Successfully reset all passwords (PINs) on the server.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to reset PINs:", error);
    process.exit(1);
  }
}

run();
