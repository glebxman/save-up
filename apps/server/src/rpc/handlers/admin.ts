import { listAdminUsers, setUserAdminAccess } from "../../services/user.service.js";
import { adminListUsersSchema, adminSetAdminSchema } from "../validation.js";
import { defineAuthenticatedRpc } from "./shared.js";

export const listAdminUsersHandler = defineAuthenticatedRpc(
  "admin.listUsers",
  adminListUsersSchema,
  ({ telegramId, page, pageSize, search }) =>
    listAdminUsers(telegramId, { page, pageSize, search }),
);

export const setAdminAccessHandler = defineAuthenticatedRpc(
  "admin.setAdmin",
  adminSetAdminSchema,
  ({ telegramId, userId, isAdmin }) => setUserAdminAccess(telegramId, userId, isAdmin),
);
