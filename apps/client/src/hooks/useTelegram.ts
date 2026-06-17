import { useEffect, useState } from "react";

import type {
  TelegramHapticFeedback,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebApp,
  TelegramWindow,
} from "@/types/telegram";

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";
const DEMO_TELEGRAM_ID = Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);

const mockInitData = `user=${encodeURIComponent(
  JSON.stringify({ id: DEMO_TELEGRAM_ID, first_name: "Demo" }),
)}`;

interface UseTelegramResult {
  initData: string;
  user?: TelegramUser;
  themeParams: TelegramThemeParams;
  hapticFeedback?: TelegramHapticFeedback;
  webApp: TelegramWebApp | null;
}

export function useTelegram(): UseTelegramResult {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(
    () => (window as TelegramWindow).Telegram?.WebApp ?? null,
  );

  useEffect(() => {
    const tg = (window as TelegramWindow).Telegram?.WebApp;

    if (tg) {
      tg.ready?.();
      tg.expand?.();

      // Bot API 7.7+: prevent the swipe-down-to-close gesture so PIN screens
      // and the lock state don't get dismissed accidentally.
      tg.disableVerticalSwipes?.();

      // Bot API 6.2+: ask for confirmation when the user tries to close
      // mid-flow (e.g. while typing an amount or setting up a PIN).
      try {
        if ("isClosingConfirmationEnabled" in tg) {
          tg.isClosingConfirmationEnabled = true;
        }
      } catch {
        // Older clients expose the property as read-only — ignore.
      }

      setWebApp(tg);
    }
  }, []);

  if (USE_MOCK_API && !webApp) {
    return {
      initData: mockInitData,
      user: { id: DEMO_TELEGRAM_ID, first_name: "Demo" },
      themeParams: {},
      hapticFeedback: undefined,
      webApp: null,
    };
  }

  return {
    initData: webApp?.initData ?? "",
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams ?? {},
    hapticFeedback: webApp?.HapticFeedback,
    webApp,
  };
}
