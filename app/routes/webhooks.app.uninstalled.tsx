import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
// 2026-11-18 10:41 +03: authenticateWebhookNoRefresh: answer 200 after uninstall when the offline token refresh fails (was 500, Shopify review), task #1504
import { authenticateWebhookNoRefresh } from "../lib/webhooks/verify";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticateWebhookNoRefresh(
    request,
    authenticate.webhook,
    process.env.SHOPIFY_API_SECRET || "",
  );

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  // 2026-11-18 10:41 +03: delete the shop's sessions even when no session was loaded (token refresh failed);
  // a DB error is logged, not turned into a 500 retry loop, task #1504
  try {
    await db.session.deleteMany({ where: { shop } });
  } catch (err) {
    console.error(`[webhook] ${topic} session delete failed for ${shop}:`, err);
  }

  // 2026-11-06 00:20 +03: delete the shop's stored kwtSMS credentials at once (privacy page promise), rest waits for shop/redact, why (Shopify review 1.1.4), shp-fix-submit
  try {
    await db.gatewayCredentials.deleteMany({ where: { shop } });
  } catch (err) {
    console.error(`[webhook] ${topic} credentials delete failed for ${shop}:`, err);
  }

  return new Response();
};
