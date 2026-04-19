import fastifyHelmet from "@fastify/helmet";
import fp from "fastify-plugin";

export const helmetPlugin = fp(async (app) => {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
});
