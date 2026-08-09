import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

export const adminPanelClassName =
  "rounded-md border border-border/80 bg-card p-4 shadow-xs sm:p-5";

export const adminSelectClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

export const adminInputClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const adminTextareaClassName =
  "rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

export function AdminPageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
}: {
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col justify-between gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-link uppercase">{eyebrow}</p>
        ) : null}
        <h1 className={cn("text-2xl leading-tight font-semibold", eyebrow && "mt-2")}>{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminPanel({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <section className={cn(adminPanelClassName, className)}>{children}</section>;
}

export function AdminTableFrame({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border/80", className)}>
      {children}
    </div>
  );
}
