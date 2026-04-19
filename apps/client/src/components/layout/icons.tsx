import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5v8h11v-8" />
      <path d="M10 18.5v-4h4v4" />
    </BaseIcon>
  );
}

export function ReportIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3.5 19.5h17" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
      <path d="m19.4 15.1.7 1.2-1.9 3.2-1.4-.3a7.9 7.9 0 0 1-1.3.8l-.4 1.4H9l-.4-1.4a7.9 7.9 0 0 1-1.3-.8l-1.4.3L4 16.3l.7-1.2a7.7 7.7 0 0 1 0-1.9L4 12l1.9-3.2 1.4.3c.4-.3.8-.6 1.3-.8L9 7h6.2l.4 1.4c.5.2.9.5 1.3.8l1.4-.3L20 12l-.7 1.2c.1.6.1 1.3 0 1.9Z" />
    </BaseIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8.5 18.5h7" />
      <path d="M9 18.5a3 3 0 0 0 6 0" />
      <path d="M18 15.5H6l1.4-1.7a2.9 2.9 0 0 0 .6-1.8V10a4 4 0 1 1 8 0v2a2.9 2.9 0 0 0 .6 1.8Z" />
    </BaseIcon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </BaseIcon>
  );
}

export function ArrowDownLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 7 7 17" />
      <path d="M16 17H7V8" />
    </BaseIcon>
  );
}

export function PiggyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 13.5c0-3.3 2.8-6 6.2-6H15l2.5 2H20v3h-1.2c-.3 3.4-3.2 6-6.8 6H9.5l-1.5 1.5" />
      <path d="M8 11h.01" />
      <path d="M10 9.5h2.5" />
      <path d="M14.5 18.5v2" />
      <path d="M8.5 18.5v2" />
    </BaseIcon>
  );
}

export function CardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect width="16" height="12" x="4" y="6" rx="2.5" />
      <path d="M4 10.5h16" />
      <path d="M8 14.5h2.5" />
    </BaseIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.7L12 18l-1.8-5.5-5.7-1.7L10.2 9 12 3.5Z" />
    </BaseIcon>
  );
}

export function ThemeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.5 6.5 0 0 1 12 3.5Z" />
      <path d="M12 3.5v17" />
    </BaseIcon>
  );
}

export function LanguageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6.5h9" />
      <path d="M8.5 4v2.5a10.5 10.5 0 0 1-4 8" />
      <path d="M6.2 10.5c1.2 1.8 2.7 3.2 4.8 4.5" />
      <path d="M14.5 9.5h5" />
      <path d="m17 7.5 3 8" />
      <path d="m20 7.5-3 8" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </BaseIcon>
  );
}
