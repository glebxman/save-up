import { motion } from "framer-motion";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  BalanceIcon,
  BellIcon,
  ChartIcon,
  MoneyBagIcon,
  TargetIcon,
} from "@/components/features/onboarding/welcomeIcons";
import { Button } from "@/components/ui";

interface Highlight {
  key: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
}

const HIGHLIGHTS: Highlight[] = [
  { key: "balance", Icon: BalanceIcon, iconBg: "bg-sky-500/15", iconColor: "text-sky-400" },
  { key: "limits", Icon: TargetIcon, iconBg: "bg-rose-500/15", iconColor: "text-rose-400" },
  { key: "reports", Icon: ChartIcon, iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400" },
  { key: "reminders", Icon: BellIcon, iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
];

export function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex flex-col bg-[var(--background)] text-[var(--foreground)]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[var(--app-top-padding)]">
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-8 flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"
          initial={{ scale: 0.6, opacity: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <MoneyBagIcon aria-hidden="true" className="h-14 w-14" />
        </motion.div>

        <motion.div
          animate={{ y: 0, opacity: 1 }}
          initial={{ y: 16, opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h1 className="m-0 text-center text-[2rem] font-semibold tracking-[-0.04em]">
            {t("welcome.title")}
          </h1>
          <p className="m-0 mt-3 text-center text-base text-[var(--muted)]">
            {t("welcome.subtitle")}
          </p>
        </motion.div>

        <motion.ul
          animate={{ opacity: 1 }}
          className="mt-10 grid list-none gap-3 p-0"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          {HIGHLIGHTS.map(({ key, Icon, iconBg, iconColor }, index) => (
            <motion.li
              key={key}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-start gap-4 rounded-[22px] bg-[var(--surface-secondary)] px-4 py-3"
              initial={{ y: 12, opacity: 0 }}
              transition={{ delay: 0.4 + index * 0.07, duration: 0.32 }}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                  {t(`welcome.highlights.${key}.title`)}
                </p>
                <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                  {t(`welcome.highlights.${key}.description`)}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="mt-6"
          initial={{ y: 24, opacity: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Button fullWidth onPress={() => navigate("/notifications-setup")} variant="primary">
            {t("welcome.continue")}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
