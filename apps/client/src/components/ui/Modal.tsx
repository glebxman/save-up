import {
  createContext,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";

import { hapticImpact } from "@/utils/haptic";
import { cn } from "./cn";

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalRoot({ children }: PropsWithChildren) {
  return <>{children}</>;
}

interface ModalBackdropProps extends PropsWithChildren {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "blur";
}

const MODAL_ANIMATION_MS = 220;

export function ModalBackdrop({ children, isOpen, onOpenChange, variant: _variant }: ModalBackdropProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      hapticImpact("light");
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, MODAL_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange?.(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, shouldRender]);

  if (!shouldRender || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ModalContext.Provider value={{ onClose: () => onOpenChange?.(false) }}>
      <div
        className="finance-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4 pt-10"
        data-state={isOpen ? "open" : "closed"}
        onClick={() => onOpenChange?.(false)}
      >
        {children}
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

interface ModalContainerProps extends PropsWithChildren {
  size?: "sm" | "md";
}

export function ModalContainer({ children, size = "sm" }: ModalContainerProps) {
  return (
    <div className={cn("w-full self-end", size === "sm" ? "max-w-sm" : "max-w-md")}>
      {children}
    </div>
  );
}

export function ModalDialog({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "finance-modal-sheet relative max-h-[calc(100vh-1rem)] overflow-y-auto rounded-[28px_28px_24px_24px] bg-[var(--overlay)] text-[var(--overlay-foreground)] before:absolute before:left-1/2 before:top-3 before:h-1.5 before:w-14 before:-translate-x-1/2 before:rounded-full before:bg-white/14 before:content-['']",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ModalCloseTrigger() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("Modal.CloseTrigger must be used inside Modal.Backdrop");
  }

  return (
    <button
      aria-label="Close modal"
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] transition hover:bg-[var(--surface-tertiary)]"
      onClick={context.onClose}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}

export function ModalHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pt-8 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function ModalBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pb-5 pt-3 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

export function ModalHeading({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 {...props} className={cn("m-0 text-xl font-semibold tracking-[-0.03em]", className)}>
      {children}
    </h2>
  );
}

export function ModalFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pb-5 pt-2 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

export const Modal = Object.assign(ModalRoot, {
  Backdrop: ModalBackdrop,
  Container: ModalContainer,
  Dialog: ModalDialog,
  CloseTrigger: ModalCloseTrigger,
  Header: ModalHeader,
  Body: ModalBody,
  Heading: ModalHeading,
  Footer: ModalFooter,
});
