import { cn } from "@repo/ui/lib/utils";

export const siteBrandLinkClassName = "min-w-0 shrink";

export function SiteBrandText({
  avatarUrl,
  className,
  description,
  name,
}: {
  readonly avatarUrl?: string;
  readonly className?: string;
  readonly description?: string;
  readonly name: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <SiteBrandAvatar avatarUrl={avatarUrl} name={name} />
      <span className="flex min-w-0 flex-col">
        <span className="block truncate text-lg leading-tight font-black tracking-tight sm:text-xl">
          {name}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function SiteBrandAvatar({
  avatarUrl,
  name,
}: {
  readonly avatarUrl?: string;
  readonly name: string;
}) {
  if (avatarUrl) {
    return (
      <img
        alt=""
        className="size-11 shrink-0 rounded-md border border-border object-cover"
        src={avatarUrl}
      />
    );
  }

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-muted text-sm font-bold text-muted-foreground">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
