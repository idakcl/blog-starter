import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { LanguagesIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { setCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

const locales = [
  { locale: "en", label: m.language_english },
  { locale: "zh", label: m.language_zh },
] as const;

type LocaleOption = (typeof locales)[number]["locale"];

interface LanguageToggleProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  currentLocale?: LocaleOption;
  labelLocale?: LocaleOption;
  onLocaleChange?: (locale: LocaleOption) => void | Promise<void>;
}

export function LanguageToggle({
  "aria-label": ariaLabel,
  className,
  currentLocale: providedLocale,
  labelLocale,
  onLocaleChange,
  title,
  ...props
}: LanguageToggleProps = {}) {
  const currentLocale = providedLocale ?? getLocale();
  const messageOptions = labelLocale ? { locale: labelLocale } : undefined;
  const languageLabel = m.language(undefined, messageOptions);

  function handleLocaleChange(locale: LocaleOption) {
    if (onLocaleChange) {
      void onLocaleChange(locale);
      return;
    }

    void setCurrentLocale(locale);
  }

  return (
    <DropdownMenu>
      <Button
        {...props}
        render={<DropdownMenuTrigger />}
        variant="ghost"
        size="icon-sm"
        className={cn(className)}
        aria-label={ariaLabel ?? languageLabel}
        title={title ?? languageLabel}
      >
        <LanguagesIcon className="size-4" />
        <span className="sr-only">{languageLabel}</span>
      </Button>
      <DropdownMenuContent align="end">
        {locales.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.locale}
            checked={currentLocale === item.locale}
            onCheckedChange={(checked) => checked && handleLocaleChange(item.locale)}
          >
            {item.label()}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
