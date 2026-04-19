import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { pool } from "./config/database.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import { authPlugin } from "./plugins/auth.js";
import { corsPlugin } from "./plugins/cors.js";
import { helmetPlugin } from "./plugins/helmet.js";
import { rpcPlugin } from "./plugins/rpc.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(authPlugin);
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });
  await app.register(rpcPlugin);

  app.get("/health", async () => ({
    ok: true,
  }));

  app.addHook("onClose", async () => {
    await pool.end();

    if (redis.status !== "end") {
      redis.disconnect();
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      message: "Unexpected server error",
    });
  });

  return app;
}
