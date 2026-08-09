import { cn } from "@repo/ui/lib/utils";

export const siteBrandLinkClassName = "min-w-0 shrink";

export function SiteBrandText({
  className,
  name,
}: {
  readonly className?: string;
  readonly name: string;
}) {
  return (
    <span
      className={cn(
        "block max-w-full truncate text-base leading-none font-black tracking-tight",
        className,
      )}
    >
      {name}
    </span>
  );
}
