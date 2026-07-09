import type { Db } from "./db/client";
import type { AuthIdentity } from "./auth";

export type ServerCtx = {
  db: Db;
  identity: AuthIdentity | null;
};
