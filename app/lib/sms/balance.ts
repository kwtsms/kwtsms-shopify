import { KwtSmsClient, type Result, type BalanceResponse } from "../kwtsms";
import { getCredentials, saveCredentials } from "../db/credentials";
// 2026-11-11 16:06 +03: account error codes, stop retrying a login that failed, task shopify-review-hotfix
import { isAccountError } from "./account-guard";

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

  const result = await client.balance();
  // 2026-11-11 16:06 +03: wrong login or unusable account: mark the login unverified so no more calls are made until the merchant logs in again on the Gateway page, task shopify-review-hotfix
  if (!result.ok && isAccountError(result.error.code)) {
    await saveCredentials(shop, { credentialsVerified: false });
  }
  if (result.ok) {
    await saveCredentials(shop, {
      balanceAvailable: result.data.available,
      balancePurchased: result.data.purchased,
    });
  }

  return result;
}
