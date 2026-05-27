import type { SVGProps } from "react";

/**
 * Welcome screen iconography.
 * Stroked, rounded, currentColor-friendly so each card can pick its own tint.
 */

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
};

export function MoneyBagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 4h6l-1.4 2.4A6.5 6.5 0 0 1 18 12a7 7 0 1 1-12 0 6.5 6.5 0 0 1 4.4-5.6L9 4Z" />
      <path d="M12 9v6" />
      <path d="M14 11h-3a1.2 1.2 0 0 0 0 2.4h2a1.2 1.2 0 0 1 0 2.4h-3" />
    </svg>
  );
}

export function BalanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

export function TargetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3" height="7" rx="1" />
      <rect x="11" y="7" width="3" height="11" rx="1" />
      <rect x="16" y="14" width="3" height="4" rx="1" />
    </svg>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 17h12l-1.3-1.6a3 3 0 0 1-.7-1.9V11a4 4 0 1 0-8 0v2.5a3 3 0 0 1-.7 1.9L6 17Z" />
      <path d="M10.5 19.5a2 2 0 0 0 3 0" />
    </svg>
  );
}
