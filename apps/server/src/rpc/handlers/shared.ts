import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";
import type { ZodTypeAny, z } from "zod";

import { AppError, ErrorCode } from "../../utils/errors.js";
import type { RpcContext, RpcHandler } from "../types.js";

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
    return service({ telegramId, ...parsed }, context);
  };
}

