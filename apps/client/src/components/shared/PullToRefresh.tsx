import { useState, useEffect, useRef, type PropsWithChildren } from "react";
import { motion, useAnimation } from "framer-motion";
import { Spinner } from "@/components/ui";

interface PullToRefreshProps extends PropsWithChildren {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
}

const PULL_THRESHOLD = 80;

export function PullToRefresh({ children, onRefresh, isRefreshing: externalRefreshing }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);
  const controls = useAnimation();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (externalRefreshing !== undefined) {
      setIsRefreshing(externalRefreshing);
      if (!externalRefreshing) {
        setPullDistance(0);
        void controls.start({ y: 0 });
      }
    }
  }, [externalRefreshing, controls]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || window.scrollY > 0) return;
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = touch.pageY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing || window.scrollY > 0) return;

    const touchStart = touchStartRef.current;
    const touch = e.touches[0];
    if (touchStart === undefined || !touch) return;

    const currentY = touch.pageY;

    const diff = currentY - touchStart;

    if (diff > 0) {
      const dampedDiff = Math.pow(diff, 0.8);
      setPullDistance(dampedDiff);
      void controls.set({ y: dampedDiff });

      if (dampedDiff > 5) {
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isRefreshing) return;

    touchStartRef.current = undefined;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      void controls.start({ y: 60 });
      try {
        await onRefresh();
      } finally {
        if (mountedRef.current) {
          setIsRefreshing(false);
          setPullDistance(0);
          void controls.start({ y: 0 });
        }
      }
    } else {
      setPullDistance(0);
      void controls.start({ y: 0 });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden pointer-events-none"
        style={{ height: 60, top: -60 }}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : pullDistance * 2,
            scale: Math.min(1, pullDistance / PULL_THRESHOLD)
          }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring", damping: 20 }}
          className="flex items-center justify-center bg-[var(--surface)] rounded-full p-2 shadow-lg border border-[var(--separator)]"
        >
          {isRefreshing ? (
            <Spinner size="sm" />
          ) : (
            <svg
              className="w-5 h-5 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </motion.div>
      </div>

      <motion.div animate={controls} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
        {children}
      </motion.div>
    </div>
  );
}
