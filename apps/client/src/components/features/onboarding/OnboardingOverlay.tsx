import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { ONBOARDING_STEPS, useOnboardingStore } from "@/stores/onboarding.store";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 10;
const BORDER_RADIUS = 26;
const TOOLTIP_GAP = 14;
const TARGET_WAIT_DELAY = 700;

function getTargetElement(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-onboarding="${target}"]`);
}

function useSpotlightRect(target: string | null, isActive: boolean): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const rafRef = useRef(0);

  const measure = useCallback(() => {
    if (!target) {
      setRect(null);
      return null;
    }

    const el = getTargetElement(target);
    if (!el) {
      setRect(null);
      return null;
    }

    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    return el;
  }, [target]);

  useLayoutEffect(() => {
    if (!isActive) return;
    measure();
  }, [isActive, measure]);

  useEffect(() => {
    if (!isActive || !target) return;

    let hasScrolledToTarget = false;
    let scrollTimer = 0;

    function revealTarget() {
      const el = measure();

      if (!el) {
        return;
      }

      if (!hasScrolledToTarget) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledToTarget = true;
        scrollTimer = window.setTimeout(measure, 420);
      }
    }

    revealTarget();

    const observer = new MutationObserver(revealTarget);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    const retryTimer = window.setInterval(revealTarget, 250);

    function onResize() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      observer.disconnect();
      window.clearInterval(retryTimer);
      window.clearTimeout(scrollTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, target, measure]);

  return rect;
}

function getSpotlightBox(rect: SpotlightRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(8, rect.left - PADDING);
  const top = Math.max(8, rect.top - PADDING);
  const width = Math.max(0, Math.min(vw - left - 8, rect.width + PADDING * 2));
  const height = Math.max(0, Math.min(vh - top - 8, rect.height + PADDING * 2));
  const radius = Math.min(BORDER_RADIUS, width / 2, height / 2);

  return { top, left, width, height, radius };
}

function SvgOverlay({ rect }: { rect: SpotlightRect | null }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-black/60"
      />
    );
  }

  const { left: x, top: y, width: w, height: h, radius: r } = getSpotlightBox(rect);

  const hole = [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");

  const outer = `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`;

  return (
    <svg
      className="fixed inset-0 z-[60]"
      height={vh}
      style={{ pointerEvents: "auto" }}
      width={vw}
    >
      <path
        d={`${outer} ${hole}`}
        fill="rgba(0,0,0,0.65)"
        fillRule="evenodd"
      />
    </svg>
  );
}

function SpotlightFrame({ rect }: { rect: SpotlightRect }) {
  const { left, top, width, height, radius } = getSpotlightBox(rect);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[61] border border-[color-mix(in_srgb,var(--accent)_86%,white_10%)] shadow-[0_0_0_9999px_transparent,0_0_32px_rgba(239,242,154,0.28)] transition-all duration-300"
      style={{
        borderRadius: radius,
        height,
        left,
        top,
        width,
      }}
    />
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block h-1.5 rounded-full transition-all duration-200 ${i === current ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-white/20"
            }`}
        />
      ))}
    </div>
  );
}

function TooltipCard({
  stepId,
  current,
  total,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isFirst,
  isLast,
}: {
  stepId: string;
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      aria-describedby={`onboarding-${stepId}-description`}
      aria-labelledby={`onboarding-${stepId}-title`}
      className="w-full max-w-sm rounded-[24px] bg-[var(--overlay)] p-5 text-[var(--overlay-foreground)] shadow-2xl"
      role="dialog"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
          {current + 1}/{total}
        </span>
        <StepDots current={current} total={total} />
      </div>

      <div className="mt-3 text-center">
        <h3 id={`onboarding-${stepId}-title`} className="m-0 text-lg font-semibold tracking-normal">
          {t(`onboarding.${stepId}.title`)}
        </h3>
        <p id={`onboarding-${stepId}-description`} className="m-0 mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {t(`onboarding.${stepId}.description`)}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!isLast && (
          <Button className="flex-shrink-0" onPress={onSkip} size="sm" variant="secondary">
            {t("onboarding.skip")}
          </Button>
        )}

        <div className="flex-1" />

        {!isFirst && (
          <Button onPress={onPrev} size="sm" variant="secondary">
            {t("onboarding.back")}
          </Button>
        )}

        <Button onPress={isLast ? onComplete : onNext} size="sm" variant="primary">
          {isLast ? t("onboarding.start") : t("onboarding.next")}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingOverlay() {
  const { isActive, currentStep, totalSteps, next, prev, skip, complete } =
    useOnboardingStore();
  const navigate = useNavigate();
  const location = useLocation();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [showPendingTargetCard, setShowPendingTargetCard] = useState(false);

  useEffect(() => {
    useOnboardingStore.getState().start();
  }, []);


  const step = ONBOARDING_STEPS[currentStep] ?? ONBOARDING_STEPS[0]!;

  useEffect(() => {
    if (!isActive) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [isActive, step.route, location.pathname, navigate]);

  useEffect(() => {
    if (!isActive) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, next, prev, skip]);

  const isOnCorrectPage = location.pathname === step.route;
  const spotlightRect = useSpotlightRect(isOnCorrectPage ? step.target : null, isActive);
  const hasTarget = step.target !== null;
  const isWaitingForTarget = isActive && hasTarget && isOnCorrectPage && !spotlightRect;

  useEffect(() => {
    setShowPendingTargetCard(false);

    if (!isWaitingForTarget) {
      return undefined;
    }

    const timer = window.setTimeout(() => setShowPendingTargetCard(true), TARGET_WAIT_DELAY);

    return () => window.clearTimeout(timer);
  }, [currentStep, isWaitingForTarget]);

  useLayoutEffect(() => {
    if (!isActive) return;

    if (!hasTarget || !spotlightRect) {
      setTooltipPos(null);
      return;
    }

    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const th = tooltip.offsetHeight;
      const tw = tooltip.offsetWidth;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spotBottom = spotlightRect.top + spotlightRect.height + PADDING;
      const spotTop = spotlightRect.top - PADDING;

      let top: number;
      if (spotBottom + TOOLTIP_GAP + th < vh - 20) {
        top = spotBottom + TOOLTIP_GAP;
      } else if (spotTop - TOOLTIP_GAP - th > 20) {
        top = spotTop - TOOLTIP_GAP - th;
      } else {
        top = Math.max(20, vh - th - 20);
      }

      let left = (vw - tw) / 2;
      left = Math.max(16, Math.min(left, vw - tw - 16));

      setTooltipPos({ top, left });
    });
  }, [isActive, hasTarget, spotlightRect, currentStep]);

  if (!isActive) return null;

  const shouldShowTooltip = !hasTarget || !!spotlightRect || showPendingTargetCard;
  const isCentered = !hasTarget || (!spotlightRect && showPendingTargetCard);

  return createPortal(
    <>
      <SvgOverlay rect={spotlightRect} />
      {spotlightRect ? <SpotlightFrame rect={spotlightRect} /> : null}

      {!shouldShowTooltip ? null : isCentered ? (
        <div
          className="fixed inset-0 z-[62] flex items-center justify-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipCard
            current={currentStep}
            isFirst={currentStep === 0}
            isLast={currentStep === totalSteps - 1}
            onComplete={complete}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
            stepId={step.id}
            total={totalSteps}
          />
        </div>
      ) : (
        <div
          ref={tooltipRef}
          className="fixed z-[62]"
          onClick={(e) => e.stopPropagation()}
          style={
            tooltipPos
              ? { top: tooltipPos.top, left: tooltipPos.left, opacity: 1, transition: "top 0.3s, left 0.3s, opacity 0.2s" }
              : { top: 0, left: 0, opacity: 0, pointerEvents: "none" as const }
          }
        >
          <TooltipCard
            current={currentStep}
            isFirst={currentStep === 0}
            isLast={currentStep === totalSteps - 1}
            onComplete={complete}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
            stepId={step.id}
            total={totalSteps}
          />
        </div>
      )}
    </>,
    document.body,
  );
}
