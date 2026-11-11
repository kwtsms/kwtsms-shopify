/*
 * FILE:      app/lib/webhooks/once.ts
 * CREATED:   2026-11-11 16:11 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Handles each Shopify webhook delivery once: records its X-Shopify-Webhook-Id in the WebhookDelivery
 *            table (unique key, so two concurrent deliveries cannot both pass), deletes ids older than 7 days,
 *            and runs the SMS work after the 200 response is returned.
 * WHY:       Shopify delivers the same webhook again when the first answer is slow or lost; each repeat sent the
 *            customer the same SMS again. Ignore repeated webhook deliveries and answer Shopify at once.
 * USAGE:     if (await claimWebhook(db, webhookId, shop, topic)) runAfterResponse(topic, shop, () => handler(...));
 *            return new Response();
 * DEPENDS:   a Prisma-like client with webhookDelivery.create and deleteMany; no runtime imports so node --test
 *            can load it directly.
 */

export const WEBHOOK_ID_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export interface WebhookDeliveryStore {
  webhookDelivery: {
    create(args: { data: { webhookId: string; shop: string; topic: string } }): Promise<unknown>;
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

let lastPurgeAt = 0;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * True when this delivery is new and should be handled; false when the id was already recorded.
 * No id, or a database error other than the unique key: true (handle it, as before this change).
 */
export async function claimWebhook(
  store: WebhookDeliveryStore,
  webhookId: string | null | undefined,
  shop: string,
  topic: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (now.getTime() - lastPurgeAt >= PURGE_INTERVAL_MS) {
    lastPurgeAt = now.getTime();
    store.webhookDelivery
      .deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - WEBHOOK_ID_KEEP_DAYS * DAY_MS) } } })
      .catch((err) => console.error("[webhook] purge of old delivery ids failed:", err));
  }

  if (!webhookId) return true;
  try {
    await store.webhookDelivery.create({ data: { webhookId: webhookId.slice(0, 100), shop, topic } });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) {
      console.log(`[webhook] ${topic} for ${shop}: delivery ${webhookId} already handled, skipped`);
      return false;
    }
    console.error(`[webhook] ${topic} for ${shop}: could not record delivery ${webhookId}:`, err);
    return true;
  }
}

/** Starts the work without waiting, so the route can answer Shopify at once; logs the result or the error. */
export function runAfterResponse(topic: string, shop: string, work: () => Promise<unknown>): Promise<void> {
  return work()
    .then((result) => console.log(`[webhook] ${topic} result:`, result))
    .catch((err) => console.error(`[webhook] ${topic} handler failed for ${shop}:`, err));
}

/** Test helper: forget the last purge so the next call purges. */
export function resetWebhookPurgeClock(): void {
  lastPurgeAt = 0;
}
