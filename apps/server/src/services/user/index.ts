/**
 * User service — public surface.
 *
 * The implementation is split by concern into focused modules:
 *  - status:      row mapping, status building, user provisioning
 *  - admin:       admin listing, access control, PIN reset
 *  - categories:  category customization, custom categories, spend limits
 *  - preferences: onboarding, language, notification settings
 *  - accounts:    account CRUD and crypto holdings
 *  - security:    PIN set/verify/remove
 *  - export:      Telegram document export
 *  - crypto:      holdings sanitation + valuation helpers
 */
export { SUPER_ADMIN_TELEGRAM_IDS, isSuperAdmin } from "./_internal.js";
export { sanitizeHoldings, cryptoHoldingsTotalUsd } from "./crypto.js";
export {
  mapUserRow,
  buildStatus,
  ensureUser,
  getStatusByTelegramId,
} from "./status.js";
export {
  requireAdminUser,
  listAdminUsers,
  setUserAdminAccess,
  resetUserPin,
  setUserSubscription,
} from "./admin.js";
export {
  setCategoryCustomization,
  addCustomCategory,
  deleteCustomCategory,
  setCategoryLimits,
} from "./categories.js";
export {
  completeOnboarding,
  setUserLanguage,
  setNotificationSettings,
} from "./preferences.js";
export {
  createAccount,
  setCryptoHolding,
  updateAccount,
  deleteAccount,
} from "./accounts.js";
export {
  setUserPin,
  verifyUserPin,
  removeUserPin,
} from "./security.js";
export { sendExportToTelegram } from "./export.js";
