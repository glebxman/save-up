import { listAdminUsers, setUserAdminAccess, resetUserPin, setUserSubscription } from "../../services/user/index.js";
import { adminListUsersSchema, adminSetAdminSchema, adminResetPinSchema, adminSetSubscriptionSchema } from "../validation.js";
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

export const resetUserPinHandler = defineAuthenticatedRpc(
  "admin.resetPin",
  adminResetPinSchema,
  ({ telegramId, userId }) => resetUserPin(telegramId, userId),
);

export const setUserSubscriptionHandler = defineAuthenticatedRpc(
  "admin.setSubscription",
  adminSetSubscriptionSchema,
  ({ telegramId, userId, planId, durationMonths }) =>
    setUserSubscription(telegramId, userId, planId, durationMonths),
);
