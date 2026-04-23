import { useEffect, useState } from "react";

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  secondary_bg_color?: string;
  button_color?: string;
  button_text_color?: string;
}

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramHapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
}

interface TelegramWebApp {
  initData?: string;
  themeParams?: TelegramThemeParams;
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  HapticFeedback?: TelegramHapticFeedback;
  ready?: () => void;
  expand?: () => void;
}

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";
const DEMO_TELEGRAM_ID = Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);

const mockInitData = `user=${encodeURIComponent(JSON.stringify({ id: DEMO_TELEGRAM_ID, first_name: "Demo" }))}`;

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = (window as TelegramWindow).Telegram?.WebApp;

    if (tg) {
      tg.ready?.();
      tg.expand?.();
      setWebApp(tg);
    }
  }, []);

  if (USE_MOCK_API && !webApp) {
    return {
      initData: mockInitData,
      user: { id: DEMO_TELEGRAM_ID, first_name: "Demo" } as TelegramUser,
      themeParams: {},
      hapticFeedback: undefined,
    };
  }

  return {
    initData: webApp?.initData ?? "",
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams ?? {},
    hapticFeedback: webApp?.HapticFeedback,
  };
}
