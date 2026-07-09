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
  const origin = resolveAllowedOrigins();

  await app.register(fastifyCors, {
    origin,
    // Reflecting any origin ("*") together with credentials is the classic "any
    // site, with credentials" CORS misconfiguration — only send credentials when
    // the allow-list is actually restricted to specific origins.
    credentials: origin !== true,
  });
});
