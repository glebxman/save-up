import type { SVGProps } from "react";

import type { BiometricType } from "@/types/telegram";

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
};

export function FingerprintIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5.5 11a6.5 6.5 0 0 1 12.6-2.3" />
      <path d="M12 6.5a4.5 4.5 0 0 0-4.5 4.5v3.5" />
      <path d="M14.5 8.4a4.5 4.5 0 0 1 2 3.6c0 2.5-.5 4.5-1.5 6.5" />
      <path d="M11.5 11.2a.5.5 0 0 1 1 0c0 3 .8 5 2 7" />
      <path d="M9 13.5c0 2.6.7 4.6 1.8 6.4" />
      <path d="M6.4 14.3c.4 1.6 1 3 1.7 4.2" />
    </svg>
  );
}

export function FaceIdIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 8V6.5A1.5 1.5 0 0 1 6.5 5H8" />
      <path d="M16 5h1.5A1.5 1.5 0 0 1 19 6.5V8" />
      <path d="M5 16v1.5A1.5 1.5 0 0 0 6.5 19H8" />
      <path d="M16 19h1.5A1.5 1.5 0 0 0 19 17.5V16" />
      <path d="M9 10.5v1" />
      <path d="M15 10.5v1" />
      <path d="M12 10v3.5" />
      <path d="M9 15.5c.8.7 1.8 1 3 1s2.2-.3 3-1" />
    </svg>
  );
}

/** Pick the right glyph for the reported biometric type. */
export function BiometricIcon({
  type,
  ...props
}: { type: BiometricType } & SVGProps<SVGSVGElement>) {
  if (type === "face") return <FaceIdIcon {...props} />;
  return <FingerprintIcon {...props} />;
}
