import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

import { docsI18n } from "#/lib/docs-i18n";

export const source = loader({
  baseUrl: "/docs",
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});
