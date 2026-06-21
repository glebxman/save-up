import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";
import type { ZodTypeAny, z } from "zod";

import { AppError, ErrorCode } from "../../utils/errors.js";
import type { RpcContext, RpcHandler } from "../types.js";

import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getBotMessage } from "../../utils/i18n.js";

const maintenancePath = path.join(os.tmpdir(), "finance-twa-maintenance.json");

export function isMaintenanceMode(): boolean {
  return fs.existsSync(maintenancePath);
}

export async function getTelegramId(
  initData: string,
  authenticateTelegram: (value: string) => Promise<{ user?: { id?: number } }>,
): Promise<number> {
  const telegramAuth = await authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Telegram user ID is missing in initData");
  }

  return telegramId;
}

/**
 * Builds a typed RPC handler from a zod schema and a service function.
 * Eliminates the repeated `schema.parse(params); getTelegramId(...); service(...)` pattern.
 *
 * The schema dictates the parsed shape passed to the service. The handler
 * still satisfies `RpcHandler<M>`, so its result type matches RpcMethodMap.
 */
export function defineAuthenticatedRpc<
  M extends RpcMethod,
  Schema extends ZodTypeAny,
 >(
  _method: M,
  schema: Schema,
  service: (
    args: { telegramId: number } & z.infer<Schema>,
    context: RpcContext,
  ) => Promise<RpcMethodMap[M]["result"]>,
): RpcHandler<M> {
  return async (params, context) => {
    const parsed = schema.parse(params) as z.infer<Schema>;
    const telegramId = await getTelegramId(
      (parsed as { initData: string }).initData,
      context.app.authenticateTelegram.bind(context.app),
    );

    if (isMaintenanceMode()) {
      const [user] = await db
        .select({ isAdmin: users.isAdmin, language: users.language })
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      const isAdmin = user?.isAdmin ?? false;
      if (!isAdmin) {
        const lang = user?.language ?? "en";
        const msg = getBotMessage("maintenance_mode", lang) || "Бот находится на технических работах. Пожалуйста, попробуйте позже.";
        throw new AppError(ErrorCode.FORBIDDEN, msg);
      }
    }

    return service({ telegramId, ...parsed }, context);
  };
}

