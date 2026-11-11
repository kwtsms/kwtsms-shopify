import { KwtSmsClient, type Result, type BalanceResponse } from "../kwtsms";
import { getCredentials, saveCredentials } from "../db/credentials";
// 2026-11-11 16:36 +03: was isAccountError from account-guard; the call now goes through kwtsmsCall, which counts a failed login
// towards the app-wide pause and marks the login unverified, task shopify-review-hotfix
import { kwtsmsCall } from "./kwtsms-call.server";

export async function updateBalanceFromResponse(
  shop: string,
  balanceAfter: number,
): Promise<void> {
  await saveCredentials(shop, { balanceAvailable: balanceAfter });
}

export async function syncBalance(
  shop: string,
): Promise<Result<BalanceResponse>> {
  const creds = await getCredentials(shop);
  if (!creds) {
    return {
      ok: false,
      error: {
        code: "NO_CREDENTIALS",
        description: "No gateway credentials configured",
        action: "Configure credentials in Gateway Settings",
      },
    };
  }

  // 2026-11-11 16:06 +03: record the attempt first, so a failed sync is not tried again on every send for an hour, task shopify-review-hotfix
  await saveCredentials(shop, { syncAttemptedAt: new Date() });

  const client = new KwtSmsClient({
    username: creds.username,
    password: creds.password,
  });

  // 2026-11-11 16:36 +03: via kwtsmsCall: a login or account error marks the login unverified (as before) and counts towards the
  // pause on logins after repeated failures, task shopify-review-hotfix
  const result = await kwtsmsCall(shop, "saved", () => client.balance());
  if (result.ok) {
    await saveCredentials(shop, {
      balanceAvailable: result.data.available,
      balancePurchased: result.data.purchased,
    });
  }

  return result;
}
