import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";

import { getDocsUrl, type DocsLocale } from "#/lib/docs-i18n";

const DocsMdxContext = createContext<{
  locale: DocsLocale;
  slugs: string[];
} | null>(null);

const DefaultAnchor = defaultMdxComponents.a ?? "a";

export function DocsMDXProvider({
  children,
  locale,
  slugs,
}: {
  readonly children: ReactNode;
  readonly locale: DocsLocale;
  readonly slugs: string[];
}) {
  return <DocsMdxContext.Provider value={{ locale, slugs }}>{children}</DocsMdxContext.Provider>;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export function useMDXComponents() {
  const docsContext = useContext(DocsMdxContext);

  if (!docsContext) {
    return getMDXComponents();
  }

  return getMDXComponents({
    a: (props: ComponentProps<"a">) => (
      <DefaultAnchor
        {...props}
        href={resolveDocsMdxHref(props.href, docsContext.locale, docsContext.slugs)}
      />
    ),
  });
}

function resolveDocsMdxHref(
  href: ComponentProps<"a">["href"],
  locale: DocsLocale,
  slugs: string[],
) {
  if (!href?.startsWith("./") && !href?.startsWith("../")) {
    return href;
  }

  const basePath = getDocsUrl(slugs, locale);
  const baseUrl = new URL(basePath.endsWith("/") ? basePath : `${basePath}/`, "http://local");
  const resolvedUrl = new URL(href, baseUrl);

  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
