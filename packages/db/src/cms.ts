import "@tanstack/react-start/server-only";
import { drizzle, type AnyD1Database } from "drizzle-orm/d1";

import * as cmsSchema from "./schema/cms.sqlite";

export type CmsDatabase = ReturnType<typeof createCmsDb>;

export function createCmsDb(database: AnyD1Database) {
  return drizzle(database, { schema: cmsSchema });
}
