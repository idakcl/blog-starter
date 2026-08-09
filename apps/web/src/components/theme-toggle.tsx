import { Button } from "@repo/ui/components/button";
import { useTheme } from "@repo/ui/lib/theme-provider";
import { cn } from "@repo/ui/lib/utils";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { m } from "#/paraglide/messages.js";

const themeModes = ["light", "dark", "system"] as const;

type ThemeToggleLocale = "en" | "zh";

interface ThemeToggleProps extends ComponentProps<typeof Button> {
  locale?: ThemeToggleLocale;
}

export function ThemeToggle({ className, locale, ...props }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const nextTheme = themeModes[(themeModes.indexOf(theme) + 1) % themeModes.length];
  const messageOptions = locale ? { locale } : undefined;
  const themeLabels = {
    light: m.theme_light(undefined, messageOptions),
    dark: m.theme_dark(undefined, messageOptions),
    system: m.theme_system(undefined, messageOptions),
  };
  const toggleLabel = m.theme_toggle(undefined, messageOptions);
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <Button
      {...props}
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(nextTheme)}
      aria-label={`${toggleLabel}: ${themeLabels[theme]}`}
      title={`${themeLabels[theme]} -> ${themeLabels[nextTheme]}`}
      className={cn(className)}
    >
      <Icon className="size-4" />
      <span className="sr-only">{toggleLabel}</span>
    </Button>
  );
}
