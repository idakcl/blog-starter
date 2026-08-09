import "@tanstack/react-start/server-only";
import { drizzle, type AnyD1Database } from "drizzle-orm/d1";

import * as authSchema from "./schema/auth.schema";

export type AuthDatabase = ReturnType<typeof createAuthDb>;

export function createAuthDb(database: AnyD1Database) {
  return drizzle(database, { schema: authSchema });
}
