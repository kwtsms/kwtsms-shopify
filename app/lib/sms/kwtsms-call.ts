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
 *            2026-11-11 16:37 +03: calls of one shop now run one at a time (runForShop), and saved credentials are
 *            re-read right before each call, task shopify-review-hotfix.
 * USAGE:     callKwtsms(deps, shop, "saved" | "new" | "proven", () => client.balance())
 *            "saved":  the shop's stored credentials; refused when no longer verified, never paused by other
 *                      shops' failures.
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
  // 2026-11-11 16:37 +03: re-read the shop's credentialsVerified right before each call, task shopify-review-hotfix
  isVerified(shop: string): Promise<boolean>;
}

export const LOGIN_PAUSED_CODE = "LOGIN_PAUSED";
// 2026-11-11 16:37 +03: answer for a call refused because the saved login was marked unverified, task shopify-review-hotfix
export const NOT_CONNECTED_CODE = "GATEWAY_NOT_CONNECTED";
export const NOT_CONNECTED_MESSAGE = "Gateway not connected. Go to Gateway page to log in.";

// 2026-11-11 16:37 +03: one request at a time per shop (in this process). Many orders arriving together used to read
// credentialsVerified once and all call kwtSMS before the first failed login marked it unverified; now each call waits
// for the previous one of the same shop and re-reads the flag first, task shopify-review-hotfix
const shopTails = new Map<string, Promise<unknown>>();

export function runForShop<T>(shop: string, task: () => Promise<T>): Promise<T> {
  const previous = shopTails.get(shop) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  shopTails.set(shop, tail);
  void tail.then(() => {
    if (shopTails.get(shop) === tail) shopTails.delete(shop);
  });
  return run;
}

export function callKwtsms<T>(
  deps: KwtsmsCallDeps,
  shop: string,
  mode: CredentialMode,
  call: () => Promise<Result<T>>,
): Promise<Result<T>> {
  // 2026-11-11 16:37 +03: was unqueued with no re-read; now queued per shop and checked right before the call, task shopify-review-hotfix
  return runForShop(shop, () => callNow(deps, shop, mode, call));
}

async function callNow<T>(
  deps: KwtsmsCallDeps,
  shop: string,
  mode: CredentialMode,
  call: () => Promise<Result<T>>,
): Promise<Result<T>> {
  // 2026-11-11 16:49 +03: the pause now applies to saved logins too: failures from many shops at once must stop every
  // call, not only new logins; the next order after the pause works again, task shopify-review-hotfix
  if ((await isLoginPaused(deps.store)).paused) {
    return { ok: false, error: { code: LOGIN_PAUSED_CODE, description: LOGIN_PAUSED_MESSAGE, action: "" } };
  }
  // 2026-11-11 16:37 +03: saved credentials: re-read the flag, an earlier queued call may have just marked it unverified;
  // a database error here refuses the call, task shopify-review-hotfix
  if (mode === "saved") {
    let verified = false;
    try {
      verified = await deps.isVerified(shop);
    } catch (err) {
      console.error(`[kwtsms] could not read the login state for ${shop}:`, err);
    }
    if (!verified) {
      return { ok: false, error: { code: NOT_CONNECTED_CODE, description: NOT_CONNECTED_MESSAGE, action: "" } };
    }
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
