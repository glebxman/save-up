type ImpactStyle = "light" | "medium" | "heavy";
type NotificationType = "error" | "success" | "warning";

interface TelegramHaptic {
  impactOccurred: (style: ImpactStyle) => void;
  notificationOccurred: (type: NotificationType) => void;
}

function getHaptic(): TelegramHaptic | undefined {
  return (window as Window & { Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptic } } })
    .Telegram?.WebApp?.HapticFeedback;
}

export function hapticImpact(style: ImpactStyle = "light"): void {
  getHaptic()?.impactOccurred(style);
}

export function hapticNotification(type: NotificationType): void {
  getHaptic()?.notificationOccurred(type);
}
