/*
 * FILE:      app/lib/sms/kwtsms-call.ts
 * CREATED:   2026-11-11 16:33 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      The one way the app makes a kwtSMS API call for a shop. Before the call: credentials that are new
 *            (Gateway login) are refused while logins are paused (login-pause.ts). After the call: a login or
 *            account error is counted towards the app-wide pause and, for saved credentials, marks the shop's
 *            login unverified so no further call is made until the merchant logs in again.
 * WHY:       Every path (Gateway login, Reload, send, balance sync, background sync) must count its failed logins
 *            in the same place, so the app pauses logins after repeated failures across all shops.
 * USAGE:     callKwtsms(deps, shop, "saved" | "new" | "proven", () => client.balance())
 *            "saved":  the shop's stored credentials; never paused by other shops' failures.
 *            "new":    credentials typed on the Gateway page; refused while logins are paused.
 *            "proven": new credentials that just passed a call in the same request; not checked again.
 * DEPENDS:   account-guard.ts, login-pause.ts (no other runtime imports, so node --test can load it directly).
 */
import type { Result } from "../kwtsms/types";
import { isAccountError } from "./account-guard.ts";
import {
  isLoginPaused,
  recordLoginFailure,
  LOGIN_PAUSED_MESSAGE,
  type LoginFailureStore,
} from "./login-pause.ts";

export type CredentialMode = "saved" | "new" | "proven";

export interface KwtsmsCallDeps {
  store: LoginFailureStore;
  markUnverified(shop: string): Promise<void>;
}

export const LOGIN_PAUSED_CODE = "LOGIN_PAUSED";

export async function callKwtsms<T>(
  deps: KwtsmsCallDeps,
  shop: string,
  mode: CredentialMode,
  call: () => Promise<Result<T>>,
): Promise<Result<T>> {
  if (mode === "new" && (await isLoginPaused(deps.store)).paused) {
    return { ok: false, error: { code: LOGIN_PAUSED_CODE, description: LOGIN_PAUSED_MESSAGE, action: "" } };
  }

  const result = await call();

  if (!result.ok && isAccountError(result.error.code)) {
    await recordLoginFailure(deps.store, shop, result.error.code);
    if (mode === "saved") {
      try {
        await deps.markUnverified(shop);
      } catch (err) {
        console.error(`[kwtsms] could not mark the login unverified for ${shop}:`, err);
      }
    }
  }
  return result;
}
