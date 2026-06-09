import type { CSSProperties, HTMLAttributes } from "react";

export type BadgeType = "info" | "warning" | "error" | "success" | "idea" | "warn" | "tip";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  type?: BadgeType;
}

const STYLES: Record<Exclude<BadgeType, "warn" | "tip">, { borderColor: string; backgroundColor: string; color: string }> = {
  info: {
    borderColor: "rgba(59, 130, 246, 0.35)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    color: "rgb(29, 78, 216)"
  },
  warning: {
    borderColor: "rgba(217, 119, 6, 0.35)",
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    color: "rgb(180, 83, 9)"
  },
  error: {
    borderColor: "rgba(220, 38, 38, 0.35)",
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    color: "rgb(185, 28, 28)"
  },
  success: {
    borderColor: "rgba(22, 163, 74, 0.35)",
    backgroundColor: "rgba(22, 163, 74, 0.12)",
    color: "rgb(21, 128, 61)"
  },
  idea: {
    borderColor: "rgba(168, 85, 247, 0.35)",
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    color: "rgb(126, 34, 206)"
  }
};

function resolveAlias(type: BadgeType) {
  if (type === "warn") return "warning";
  if (type === "tip") return "info";
  return type;
}

export function Badge(
  {
    children,
    className,
    style,
    type = "info",
    ...props
  }: BadgeProps
) {
  const resolvedType = resolveAlias(type);

  return (
    <span
      {...props}
      style={
        {
          ...STYLES[resolvedType],
          ...style
        } as CSSProperties
      }
      className={[
        "not-prose inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        typeof className === "string" ? className : undefined
      ].filter(Boolean).join(" ")}
    >
      {children}
    </span>
  );
}
