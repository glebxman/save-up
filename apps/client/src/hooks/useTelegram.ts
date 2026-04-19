import { useEffect } from "react";

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

export function useTelegram() {
  const webApp = (window as TelegramWindow).Telegram?.WebApp;

  useEffect(() => {
    webApp?.ready?.();
    webApp?.expand?.();
  }, [webApp]);

  return {
    initData: webApp?.initData ?? "",
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams ?? {},
    hapticFeedback: webApp?.HapticFeedback,
  };
}
