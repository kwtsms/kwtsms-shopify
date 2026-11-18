import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
// 2026-11-18 10:41 +03: authenticateWebhookNoRefresh: answer 200 after uninstall when the offline token refresh fails (was 500, Shopify review), task #1504
import { authenticateWebhookNoRefresh } from "../lib/webhooks/verify";
import { handleShopRedact } from "../lib/notifications/privacy";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticateWebhookNoRefresh(
    request,
    authenticate.webhook,
    process.env.SHOPIFY_API_SECRET || "",
  );
  console.log(`Received ${topic} webhook for ${shop}`);

  // 2026-11-06 00:20 +03: always 200 once the HMAC is verified; a DB error is logged, not turned into a 500 retry loop, why (Shopify review, GDPR webhooks), shp-fix-submit
  try {
    await handleShopRedact(shop, payload);
  } catch (err) {
    console.error(`[webhook] ${topic} handler failed for ${shop}:`, err);
  }

  return new Response();
};
