import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, TriangleAlert, CheckCircle2, Info } from "lucide-react";
import { clsx } from "clsx";

type Level = "error" | "warning" | "success" | "info";
export function Alert({
  level = "info",
  title,
  children,
  className,
  role,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  level?: Level;
  title?: ReactNode;
}) {
  const Icon = {
    error: AlertCircle,
    warning: TriangleAlert,
    success: CheckCircle2,
    info: Info,
  }[level];
  return (
    <div
      {...props}
      className={clsx("ui-alert", "ui-alert-" + level, className)}
      role={
        role ?? (level === "error" || level === "warning" ? "alert" : "status")
      }
    >
      <Icon className="ui-alert-icon" size={20} aria-hidden="true" />
      <div className="ui-alert-content">
        {title && <strong className="ui-alert-title">{title}</strong>}
        {children}
      </div>
    </div>
  );
}
