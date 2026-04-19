import fastifyCors from "@fastify/cors";
import fp from "fastify-plugin";

import { env } from "../config/env.js";

function resolveAllowedOrigins(): true | string[] {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
}

export const corsPlugin = fp(async (app) => {
  await app.register(fastifyCors, {
    origin: resolveAllowedOrigins(),
    credentials: true,
  });
});
