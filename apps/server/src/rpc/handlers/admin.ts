import type { RpcHandler } from "../types.js";
import { listAdminUsers, setUserAdminAccess } from "../../services/user.service.js";
import { adminListUsersSchema, adminSetAdminSchema } from "../validation.js";
import { getTelegramId } from "./shared.js";

export const listAdminUsersHandler: RpcHandler<"admin.listUsers"> = async (params, { app }) => {
  const { initData, page, pageSize, search } = adminListUsersSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return listAdminUsers(telegramId, { page, pageSize, search });
};

export const setAdminAccessHandler: RpcHandler<"admin.setAdmin"> = async (params, { app }) => {
  const { initData, userId, isAdmin } = adminSetAdminSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return setUserAdminAccess(telegramId, userId, isAdmin);
};
