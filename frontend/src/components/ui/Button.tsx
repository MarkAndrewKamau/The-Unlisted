import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-amber text-forest hover:bg-amber/90 border border-amber",
  outline: "bg-transparent text-forest border border-forest/30 hover:bg-forest/5",
  ghost: "bg-transparent text-text-muted hover:bg-border/30 border border-transparent",
  danger: "bg-transparent text-terracotta border border-terracotta hover:bg-terracotta/10",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded font-mono font-medium uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
