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
 * USAGE:     if (await claimWebhook(db, webhookId, shop, topic, payload))
 *              runAfterResponse(topic, shop, webhookId, () => handler(...));
 *            (2026-11-11 16:39 +03: payload and webhookId arguments added, task shopify-review-hotfix)
 *            return new Response();
 * DEPENDS:   a Prisma-like client with webhookDelivery.create and deleteMany; only node:crypto at runtime, so
 *            node --test can load it directly.
 *            2026-11-11 16:38 +03: second key per row, a hash of shop + topic + resource id (order, customer or
 *            fulfillment id from the verified body), so the same event sent again with a new delivery id is also
 *            skipped, task shopify-review-hotfix.
 */
// 2026-11-11 16:38 +03: hash for the resource key (fits a short unique column), task shopify-review-hotfix
import { createHash } from "node:crypto";

export const WEBHOOK_ID_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export interface WebhookDeliveryStore {
  webhookDelivery: {
    // 2026-11-11 16:38 +03: webhookId may be null now, resourceKey added, task shopify-review-hotfix
    create(args: {
      data: { webhookId: string | null; resourceKey: string | null; shop: string; topic: string };
    }): Promise<unknown>;
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

let lastPurgeAt = 0;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

// 2026-11-11 16:38 +03: topics that can come more than once for the same resource with new content (each shipment
// update, each partial fulfillment): their key also holds updated_at, so only a copy of the same event is skipped,
// task shopify-review-hotfix
const REPEATING_TOPICS: ReadonlySet<string> = new Set(["FULFILLMENTS_UPDATE", "ORDERS_PARTIALLY_FULFILLED"]);

/**
 * 2026-11-11 16:38 +03: sha256 of shop + topic + resource id (+ updated_at for repeating topics), or null when the
 * body has no id (or a repeating topic has no updated_at): then only the delivery id is used, task shopify-review-hotfix
 */
export function resourceKey(shop: string, topic: string, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const { id, updated_at: updatedAt } = payload as { id?: unknown; updated_at?: unknown };
  if (!((typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && id !== ""))) return null;
  const t = topic.toUpperCase().replace(/[/.]/g, "_");
  let key = `${shop}|${t}|${id}`;
  if (REPEATING_TOPICS.has(t)) {
    if (typeof updatedAt !== "string" || updatedAt === "") return null;
    key += `|${updatedAt}`;
  }
  return createHash("sha256").update(key).digest("hex");
}

/**
 * True when this delivery is new and should be handled; false when the delivery id, or the same event for the same
 * resource, was already recorded.
 * No id and no resource key, or a database error other than the unique key: true (handle it, as before this change).
 * 2026-11-11 16:38 +03: payload added (5th argument, before now) for the resource key, task shopify-review-hotfix
 */
export async function claimWebhook(
  store: WebhookDeliveryStore,
  webhookId: string | null | undefined,
  shop: string,
  topic: string,
  payload?: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  if (now.getTime() - lastPurgeAt >= PURGE_INTERVAL_MS) {
    lastPurgeAt = now.getTime();
    store.webhookDelivery
      .deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - WEBHOOK_ID_KEEP_DAYS * DAY_MS) } } })
      .catch((err) => console.error("[webhook] purge of old delivery ids failed:", err));
  }

  // 2026-11-11 16:38 +03: one row holds both keys; a unique clash on either means already handled, task shopify-review-hotfix
  const key = resourceKey(shop, topic, payload);
  if (!webhookId && !key) return true;
  try {
    await store.webhookDelivery.create({
      data: { webhookId: webhookId ? webhookId.slice(0, 100) : null, resourceKey: key, shop, topic },
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) {
      console.log(`[webhook] ${topic} for ${shop}: delivery ${webhookId} or the same event already handled, skipped`);
      return false;
    }
    console.error(`[webhook] ${topic} for ${shop}: could not record delivery ${webhookId}:`, err);
    return true;
  }
}

/** Starts the work without waiting, so the route can answer Shopify at once; logs the result or the error. */
// 2026-11-11 16:39 +03: was one "result" line that printed the whole result (it can hold a phone number); now a "started"
// line when the work begins and a "done" or "failed" line when it ends (shop, topic, delivery id, sent yes/no; no phone
// number, no message text), so work cut off by a restart shows as "started" with no end line, task shopify-review-hotfix
export function runAfterResponse(
  topic: string,
  shop: string,
  webhookId: string | null | undefined,
  work: () => Promise<unknown>,
): Promise<void> {
  const tag = `shop=${shop} topic=${topic} delivery=${webhookId ?? "none"}`;
  console.log(`[webhook] started ${tag}`);
  return Promise.resolve()
    .then(work)
    .then((result) => {
      const sent = typeof result === "object" && result !== null && (result as { success?: unknown }).success === true;
      console.log(`[webhook] done ${tag} sent=${sent ? "yes" : "no"}`);
    })
    .catch((err) => {
      // error name and code only: a database error message can hold the phone number it tried to write
      const name = err instanceof Error ? err.name : "error";
      const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
      console.error(`[webhook] failed ${tag} reason=${name}${typeof code === "string" ? ` code=${code}` : ""}`);
    });
}

/** Test helper: forget the last purge so the next call purges. */
export function resetWebhookPurgeClock(): void {
  lastPurgeAt = 0;
}
