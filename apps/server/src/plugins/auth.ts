import fp from "fastify-plugin";

import { env } from "../config/env.js";
import { verifyTelegramInitData, type TelegramInitData } from "../utils/telegram.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticateTelegram: (initData: string) => Promise<TelegramInitData>;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorate("authenticateTelegram", async (initData: string) => {
    return verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  });
});
