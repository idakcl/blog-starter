import { createCmsDb, type CmsDatabase } from "@repo/db/cms";
import { env } from "cloudflare:workers";

let _db: CmsDatabase | undefined;

export function getCmsDb(): CmsDatabase {
  return (_db ??= createCmsDb(env.CMS_DB));
}
