import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button, Input } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import type { NotificationFrequency } from "@/types/finance";

type Mode = "off" | "per_day" | "every_n_days";

const TIMES_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const DAYS_OPTIONS = [1, 2, 3, 4, 7, 14, 30] as const;

function defaultPerDayTimes(count: number): string[] {
  // Spread between 09:00 and 21:00, evenly.
  if (count <= 1) return ["09:00"];
  const start = 9 * 60;
  const end = 21 * 60;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const minute = Math.round(start + step * i);
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });
}

function fromStoredFrequency(
  frequency: NotificationFrequency | undefined,
  enabled: boolean | undefined,
): { mode: Mode; times: string[]; days: number; singleTime: string } {
  if (enabled === false) {
    return { mode: "off", times: defaultPerDayTimes(1), days: 3, singleTime: "09:00" };
  }
  if (!frequency) {
    return { mode: "every_n_days", times: defaultPerDayTimes(1), days: 3, singleTime: "09:00" };
  }
  if (frequency.mode === "per_day") {
    return {
      mode: "per_day",
      times: frequency.times.length ? frequency.times : defaultPerDayTimes(1),
      days: 3,
      singleTime: "09:00",
    };
  }
  return {
    mode: "every_n_days",
    times: defaultPerDayTimes(1),
    days: frequency.days,
    singleTime: frequency.time,
  };
}

export function NotificationsSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, setNotificationSettingsMutation } = useFinance();

  const initial = useMemo(
    () => fromStoredFrequency(status?.user.notificationFrequency, status?.user.notificationsEnabled),
    [status?.user.notificationFrequency, status?.user.notificationsEnabled],
  );

  const [mode, setMode] = useState<Mode>(initial.mode);
  const [times, setTimes] = useState<string[]>(initial.times);
  const [days, setDays] = useState<number>(initial.days);
  const [singleTime, setSingleTime] = useState(initial.singleTime);

  // If status arrives later (first launch with empty cache), seed local state once.
  useEffect(() => {
    if (status) {
      setMode(initial.mode);
      setTimes(initial.times);
      setDays(initial.days);
      setSingleTime(initial.singleTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.user.id]);

  const handleSave = () => {
    const enabled = mode !== "off";
    const frequency: NotificationFrequency =
      mode === "per_day"
        ? { mode: "per_day", times: [...times].sort() }
        : { mode: "every_n_days", days, time: singleTime };

    const timezoneOffset = -new Date().getTimezoneOffset();

    setNotificationSettingsMutation.mutate(
      { enabled, frequency, timezoneOffset },
      { onSuccess: () => navigate("/", { replace: true }) },
    );
  };

  const isPending = setNotificationSettingsMutation.isPending;

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 z-40 flex flex-col bg-[var(--background)] text-[var(--foreground)]"
      exit={{ opacity: 0, x: -16 }}
      initial={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[var(--app-top-padding)]">
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          initial={{ y: 12, opacity: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <p className="m-0 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
            {t("notifications.eyebrow")}
          </p>
          <h1 className="m-0 mt-2 text-[1.75rem] font-semibold tracking-[-0.03em]">
            {t("notifications.title")}
          </h1>
          <p className="m-0 mt-2 text-sm text-[var(--muted)]">{t("notifications.description")}</p>
        </motion.div>

        <motion.div
          animate={{ opacity: 1 }}
          className="mt-6 grid gap-2"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.15 }}
        >
          {(["off", "per_day", "every_n_days"] as Mode[]).map((option) => (
            <button
              key={option}
              className={`flex items-center justify-between gap-3 rounded-[20px] border-2 px-4 py-3 text-left transition-all duration-200 ${
                mode === option
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-secondary))]"
                  : "border-transparent bg-[var(--surface-secondary)]"
              }`}
              onClick={() => setMode(option)}
              type="button"
            >
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                  {t(`notifications.modes.${option}.title`)}
                </p>
                <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                  {t(`notifications.modes.${option}.description`)}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  mode === option ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--separator)]"
                }`}
              >
                {mode === option ? (
                  <span className="block h-2 w-2 rounded-full bg-[var(--accent-foreground)]" />
                ) : null}
              </span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === "per_day" ? (
            <motion.section
              key="per_day"
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid gap-3"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {t("notifications.howManyTimes")}
              </p>
              <div className="flex flex-wrap gap-2">
                {TIMES_LABELS.map((n) => {
                  const active = times.length === n;
                  return (
                    <button
                      key={n}
                      className={`min-w-12 rounded-[14px] px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "bg-[var(--surface-secondary)] text-[var(--foreground)]"
                      }`}
                      onClick={() => setTimes(defaultPerDayTimes(n))}
                      type="button"
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {t("notifications.times")}
              </p>
              <div className="grid gap-2">
                {times.map((time, index) => (
                  <Input
                    key={index}
                    aria-label={t("notifications.timeLabel", { index: index + 1 })}
                    fullWidth
                    onChange={(event) => {
                      const next = [...times];
                      next[index] = event.target.value;
                      setTimes(next);
                    }}
                    type="time"
                    value={time}
                  />
                ))}
              </div>
            </motion.section>
          ) : null}

          {mode === "every_n_days" ? (
            <motion.section
              key="every_n_days"
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid gap-3"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {t("notifications.everyN")}
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OPTIONS.map((option) => {
                  const active = days === option;
                  return (
                    <button
                      key={option}
                      className={`min-w-12 rounded-[14px] px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "bg-[var(--surface-secondary)] text-[var(--foreground)]"
                      }`}
                      onClick={() => setDays(option)}
                      type="button"
                    >
                      {t("notifications.daysShort", { count: option })}
                    </button>
                  );
                })}
              </div>

              <label className="mt-2 grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {t("notifications.atTime")}
                <Input
                  fullWidth
                  onChange={(event) => setSingleTime(event.target.value)}
                  type="time"
                  value={singleTime}
                />
              </label>
            </motion.section>
          ) : null}

          {mode === "off" ? (
            <motion.div
              key="off"
              animate={{ opacity: 1 }}
              className="mt-6 rounded-[20px] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              {t("notifications.offHint")}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="mt-6"
          initial={{ y: 24, opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <Button fullWidth isDisabled={isPending} onPress={handleSave} variant="primary">
            {isPending
              ? t("notifications.saving", { defaultValue: "Saving…" })
              : t("notifications.save")}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
