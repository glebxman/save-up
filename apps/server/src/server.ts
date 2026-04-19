import { env } from "./config/env.js";
import { buildApp } from "./app.js";

function isAddressInUseError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });
  } catch (error) {
    if (isAddressInUseError(error)) {
      app.log.warn(`Port ${env.PORT} is already in use. Assuming the backend is already running and skipping this instance.`);
      await app.close();
      process.exit(0);
    }

    throw error;
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
