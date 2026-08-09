import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { LogOutIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { m } from "#/paraglide/messages.js";

type SignOutButtonProps = {
  readonly buttonClassName?: string;
  readonly className?: string;
  readonly size?: ComponentProps<typeof Button>["size"];
  readonly variant?: ComponentProps<typeof Button>["variant"];
};

export function SignOutButton({
  buttonClassName,
  className,
  size = "lg",
  variant = "destructive",
}: SignOutButtonProps) {
  const queryClient = useQueryClient();

  return (
    <form
      action="/api/account/logout"
      method="post"
      className={cn("w-fit", className)}
      onSubmit={() => {
        queryClient.setQueryData(authQueryOptions().queryKey, null);
        queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
      }}
    >
      <Button
        type="submit"
        className={cn("w-full justify-center", buttonClassName)}
        variant={variant}
        size={size}
      >
        <LogOutIcon className="size-4" />
        {m.sign_out()}
      </Button>
    </form>
  );
}
