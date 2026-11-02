import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { clsx } from "clsx";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={clsx(
        "ui-button",
        "ui-button-" + variant,
        "ui-button-size-" + size,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading && (
        <LoaderCircle className="ui-spinner" size={16} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
