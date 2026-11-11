import { KwtSmsClient } from "../kwtsms";
import db from "../../db.server";
import { saveCredentials } from "../db/credentials";
// 2026-11-06 00:20 +03: 90-day SMS log purge, runs at most daily, why (Shopify review 1.1.4), shp-fix-submit
import { purgeOldLogsIfDue } from "../db/retention";
// 2026-11-11 16:06 +03: sync in order and stop after a login or account error, retry a failed sync at most once an hour, task shopify-review-hotfix
import { isSyncDue, syncAccount } from "../sms/account-guard";
// 2026-11-11 16:36 +03: pause on logins after repeated failures, shared by every path, task shopify-review-hotfix
import { kwtsmsCall } from "../sms/kwtsms-call.server";

export async function syncShopIfStale(shop: string): Promise<void> {
  // 2026-11-06 00:20 +03: purge logs older than 90 days before the credentials check, so shops without a gateway are covered too, why (Shopify review 1.1.4), shp-fix-submit
  purgeOldLogsIfDue(db).catch((err) => {
    console.error("[retention] Purge failed:", err);
  });

  const creds = await db.gatewayCredentials.findUnique({ where: { shop } });
  if (!creds || !creds.credentialsVerified || !creds.username || !creds.password) {
    return;
  }

  // 2026-11-11 16:06 +03: was "older than 24 h" only; a failed sync now waits an hour before the next try, task shopify-review-hotfix
  if (!isSyncDue(Date.now(), creds.balanceUpdatedAt, creds.syncAttemptedAt)) {
    return;
  }
  await saveCredentials(shop, { syncAttemptedAt: new Date() });

  // Run sync in background, don't block page load
  syncShop(shop, creds.username, creds.password).catch((err) => {
    console.error(`[sync] Failed for ${shop}:`, err);
  });
}

// 2026-11-11 16:06 +03: was three calls at once (balance, sender IDs, coverage) that all failed together on a wrong login, and the
// failure was never recorded; now one call at a time via syncAccount, which stops and marks the login unverified, task shopify-review-hotfix
async function syncShop(
  shop: string,
  username: string,
  password: string,
): Promise<void> {
  const client = new KwtSmsClient({ username, password });
  // 2026-11-11 16:36 +03: each call goes through kwtsmsCall, which counts a failed login towards the pause on logins after
  // repeated failures and marks the login unverified itself (so markUnverified here has nothing left to do), task shopify-review-hotfix
  const counted = {
    balance: () => kwtsmsCall(shop, "saved", () => client.balance()),
    senderIds: () => kwtsmsCall(shop, "saved", () => client.senderIds()),
    coverage: () => kwtsmsCall(shop, "saved", () => client.coverage()),
  };
  const result = await syncAccount(counted, {
    save: async (update) => {
      if (Object.keys(update).length > 0) await saveCredentials(shop, update);
    },
    markUnverified: async () => {},
  });
  if (!result.ok) {
    console.error(`[sync] Failed for ${shop}: ${result.errorCode}`);
  }
}
