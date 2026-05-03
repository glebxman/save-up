import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { hapticImpact } from "@/utils/haptic";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}


type ButtonVariant = "primary" | "secondary" | "danger-soft";
type ButtonSize = "sm" | "md";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isDisabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-[0.98] disabled:hover:brightness-100",
  secondary:
    "bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]",
  "danger-soft":
    "bg-[color-mix(in_srgb,var(--danger)_16%,var(--surface-secondary))] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_24%,var(--surface-secondary))]",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-[18px] px-3 text-sm",
  md: "min-h-12 rounded-[22px] px-4 text-sm",
};

export function Button({
  children,
  className,
  fullWidth,
  isDisabled,
  onClick,
  onPress,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isDisabled) {
      hapticImpact("light");
    }
    onClick?.(e);
    if (!isDisabled) {
      onPress?.();
    }
  }

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-0 font-medium tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
    >
      {children}
    </button>
  );
}

type CardVariant = "default" | "secondary";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariantClasses: Record<CardVariant, string> = {
  default: "bg-[color-mix(in_srgb,var(--surface)_98%,transparent)]",
  secondary: "bg-[color-mix(in_srgb,var(--surface-secondary)_94%,transparent)]",
};

export function Card({ children, className, variant = "default", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[30px] backdrop-blur-xl",
        cardVariantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 {...props} className={cn("m-0 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p {...props} className={cn("m-0 text-sm text-[var(--muted)]", className)}>
      {children}
    </p>
  );
}

type ChipColor = "accent" | "warning";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor;
  size?: "sm" | "md";
  variant?: "primary";
}

const chipColorClasses: Record<ChipColor, string> = {
  accent: "bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-secondary))] text-[var(--accent-foreground)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_18%,var(--surface-secondary))] text-[var(--warning-foreground)]",
};

export function Chip({ children, className, color = "accent", size = "md", variant: _variant, ...props }: ChipProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 font-semibold",
        chipColorClasses[color],
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface InputProps extends ComponentPropsWithoutRef<"input"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

const fieldClasses =
  "min-h-12 rounded-[22px] border border-[var(--field-border)] bg-[var(--field-background)] px-4 py-3 text-sm text-[var(--field-foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:bg-[color-mix(in_srgb,var(--field-background)_70%,white_6%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]";

export function Input({ className, fullWidth, variant: _variant, ...props }: InputProps) {
  return <input {...props} className={cn(fieldClasses, fullWidth && "w-full", className)} />;
}

interface TextAreaProps extends ComponentPropsWithoutRef<"textarea"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

export function TextArea({ className, fullWidth, variant: _variant, ...props }: TextAreaProps) {
  return <textarea {...props} className={cn(fieldClasses, "min-h-[112px] resize-y", fullWidth && "w-full", className)} />;
}

interface SelectProps extends ComponentPropsWithoutRef<"select"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

export function Select({ children, className, fullWidth, variant: _variant, ...props }: SelectProps) {
  return (
    <select {...props} className={cn(fieldClasses, "appearance-none pr-10", fullWidth && "w-full", className)}>
      {children}
    </select>
  );
}

interface SpinnerProps {
  size?: "sm" | "md";
}

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
      )}
    />
  );
}

interface ProgressContextValue {
  value: number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

interface ProgressBarProps extends PropsWithChildren {
  value: number;
  "aria-label"?: string;
  color?: "accent";
  size?: "lg" | "md";
}

function ProgressBarRoot({ children, color: _color, size: _size, value, ...props }: ProgressBarProps) {
  return (
    <ProgressContext.Provider value={{ value: Math.max(0, Math.min(100, value)) }}>
      <div {...props}>{children}</div>
    </ProgressContext.Provider>
  );
}

function ProgressTrack({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-tertiary)]", className)}
    >
      {children}
    </div>
  );
}

function ProgressFill({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error("ProgressBar.Fill must be used inside ProgressBar");
  }

  return (
    <div
      {...props}
      className={cn("h-full rounded-full bg-[var(--accent)] transition-[width] duration-300", className)}
      style={{ width: `${context.value}%` }}
    />
  );
}

export const ProgressBar = Object.assign(ProgressBarRoot, {
  Track: ProgressTrack,
  Fill: ProgressFill,
});

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
        className="finance-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[var(--backdrop)] px-4 pb-4 pt-10 backdrop-blur-md"
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
  placement?: "center";
}

export function ModalContainer({ children, size = "sm", placement: _placement }: ModalContainerProps) {

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


function AvatarRoot({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex overflow-hidden rounded-full bg-[var(--surface-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function AvatarImage({ src, alt = "", className, ...props }: ComponentPropsWithoutRef<"img">) {
  return <img {...props} alt={alt} className={cn("h-full w-full object-cover", className)} src={src} />;
}

export const Avatar = Object.assign(AvatarRoot, {
  Image: AvatarImage,
});

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text";
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      className={cn(
        "animate-shimmer",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-[30px]",
        variant === "text" && "h-4 rounded-md",
        className,
      )}
    />
  );
}


export type { ReactNode };

