import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleCustomerRedact } from "../lib/notifications/privacy";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // 2026-11-06 00:20 +03: always 200 once the HMAC is verified; a DB error is logged, not turned into a 500 retry loop, why (Shopify review, GDPR webhooks), shp-fix-submit
  try {
    await handleCustomerRedact(shop, payload);
  } catch (err) {
    console.error(`[webhook] ${topic} handler failed for ${shop}:`, err);
  }

  return new Response();
};
