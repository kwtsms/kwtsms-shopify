import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
// 2026-11-11 16:11 +03: ignore repeated webhook deliveries and answer Shopify before the SMS work, task shopify-review-hotfix
import db from "../db.server";
import { claimWebhook, runAfterResponse } from "../lib/webhooks/once";
import { handleOrderCancelled } from "../lib/notifications/order";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic, webhookId } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // 2026-11-11 16:11 +03: was awaited before the 200, so a slow kwtSMS call made Shopify deliver again and the SMS went twice;
  // now a repeated delivery id is skipped and the SMS work runs after the response, task shopify-review-hotfix
  // 2026-11-11 16:38 +03: payload passed for the second key (topic + resource id), task shopify-review-hotfix
  if (await claimWebhook(db, webhookId, shop, topic, payload)) {
    // 2026-11-11 16:39 +03: delivery id passed for the started/done log lines, task shopify-review-hotfix
    void runAfterResponse(topic, shop, webhookId, () => handleOrderCancelled(shop, payload));
  }

  return new Response();
};
