/*
 * FILE:      app/lib/sms/kwtsms-call.server.ts
 * CREATED:   2026-11-11 16:33 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      callKwtsms (kwtsms-call.ts) bound to the app database: the login failure rows and the shop's
 *            credentials row.
 * WHY:       Keeps kwtsms-call.ts free of database imports (unit tests use an in-memory store) while every route
 *            and job calls the same function.
 * USAGE:     kwtsmsCall(shop, "saved", () => client.send(...))
 * DEPENDS:   db.server.ts (Prisma), lib/db/credentials.ts.
 */
import db from "../../db.server";
import { saveCredentials } from "../db/credentials";
import type { Result } from "../kwtsms/types";
import { callKwtsms, type CredentialMode, type KwtsmsCallDeps } from "./kwtsms-call";

const deps: KwtsmsCallDeps = {
  store: db,
  markUnverified: (shop) => saveCredentials(shop, { credentialsVerified: false }),
};

export function kwtsmsCall<T>(
  shop: string,
  mode: CredentialMode,
  call: () => Promise<Result<T>>,
): Promise<Result<T>> {
  return callKwtsms(deps, shop, mode, call);
}
