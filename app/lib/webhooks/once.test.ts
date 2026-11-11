/*
 * FILE:      app/lib/webhooks/once.test.ts
 * CREATED:   2026-11-11 16:11 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit tests for once.ts: a webhook delivery id is handled once, also when two copies arrive at the
 *            same time; ids older than 7 days are deleted; the SMS work does not hold up the response.
 * WHY:       Proves a repeated Shopify webhook delivery does not send the same SMS again.
 * USAGE:     npm test   (node --test, built-in type stripping, no extra dependency). In-memory store, no database.
 * DEPENDS:   Node 22.18+ or 24 (type stripping on by default).
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  claimWebhook,
  runAfterResponse,
  resetWebhookPurgeClock,
  resourceKey,
  type WebhookDeliveryStore,
} from "./once.ts";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Behaves like a table with unique keys on webhookId and resourceKey (both nullable, NULLs never clash): a second
 * insert with the same value in either fails with P2002.
 * 2026-11-11 16:38 +03: resourceKey added, rows keyed by webhookId or by the resource key, task shopify-review-hotfix
 */
function memoryStore() {
  const rows = new Map<string, { resourceKey: string | null; shop: string; topic: string; createdAt: Date }>();
  let now = new Date("2026-11-11T12:00:00Z");
  const purges: Date[] = [];
  let inserts = 0;
  const store: WebhookDeliveryStore = {
    webhookDelivery: {
      async create({ data }) {
        await Promise.resolve();
        const clash =
          (data.webhookId !== null && rows.has(data.webhookId)) ||
          (data.resourceKey !== null && [...rows.values()].some((r) => r.resourceKey === data.resourceKey));
        if (clash) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        inserts++;
        rows.set(data.webhookId ?? `row-${inserts}`, {
          resourceKey: data.resourceKey, shop: data.shop, topic: data.topic, createdAt: now,
        });
        return data;
      },
      async deleteMany({ where }) {
        purges.push(where.createdAt.lt);
        let count = 0;
        for (const [id, r] of rows) if (r.createdAt < where.createdAt.lt) { rows.delete(id); count++; }
        return { count };
      },
    },
  };
  return { store, rows, purges, setNow: (d: Date) => { now = d; } };
}

beforeEach(() => resetWebhookPurgeClock());

test("first delivery is handled, the repeat of the same id is skipped", async () => {
  const { store } = memoryStore();
  assert.equal(await claimWebhook(store, "wh-1", "a.myshopify.com", "ORDERS_CREATE"), true);
  assert.equal(await claimWebhook(store, "wh-1", "a.myshopify.com", "ORDERS_CREATE"), false);
  assert.equal(await claimWebhook(store, "wh-2", "a.myshopify.com", "ORDERS_CREATE"), true);
});

test("two copies arriving together: exactly one is handled", async () => {
  const { store } = memoryStore();
  const results = await Promise.all([
    claimWebhook(store, "wh-9", "a.myshopify.com", "ORDERS_PAID"),
    claimWebhook(store, "wh-9", "a.myshopify.com", "ORDERS_PAID"),
    claimWebhook(store, "wh-9", "a.myshopify.com", "ORDERS_PAID"),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("no delivery id, or a database error: handled as before", async () => {
  const { store } = memoryStore();
  assert.equal(await claimWebhook(store, undefined, "a.myshopify.com", "ORDERS_PAID"), true);
  const broken: WebhookDeliveryStore = {
    webhookDelivery: {
      async create() { throw new Error("connection lost"); },
      async deleteMany() { return { count: 0 }; },
    },
  };
  assert.equal(await claimWebhook(broken, "wh-3", "a.myshopify.com", "ORDERS_PAID"), true);
});

// 2026-11-11 16:38 +03: now is the 6th argument (payload is 5th), task shopify-review-hotfix
test("ids older than 7 days are deleted, at most once an hour", async () => {
  const m = memoryStore();
  const t0 = new Date("2026-11-01T12:00:00Z");
  m.setNow(t0);
  await claimWebhook(m.store, "old", "a.myshopify.com", "ORDERS_PAID", undefined, t0);
  const t1 = new Date(t0.getTime() + 8 * DAY);
  m.setNow(t1);
  resetWebhookPurgeClock();
  await claimWebhook(m.store, "new", "a.myshopify.com", "ORDERS_PAID", undefined, t1);
  await new Promise((r) => setImmediate(r));
  assert.equal(m.rows.has("old"), false);
  assert.equal(m.rows.has("new"), true);
  assert.equal(m.purges.at(-1)?.toISOString(), new Date(t1.getTime() - 7 * DAY).toISOString());
  const before = m.purges.length;
  await claimWebhook(m.store, "x", "a.myshopify.com", "ORDERS_PAID", undefined, new Date(t1.getTime() + 30 * 60 * 1000));
  assert.equal(m.purges.length, before);
});

test("the SMS work runs after the caller returns and its error is caught", async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  // 2026-11-11 16:39 +03: delivery id argument added, task shopify-review-hotfix
  const done = runAfterResponse("ORDERS_CREATE", "a.myshopify.com", "wh-1", async () => {
    await gate;
    order.push("work");
    throw new Error("send failed");
  });
  order.push("response");
  release();
  await done;
  assert.deepEqual(order, ["response", "work"]);
});

// 2026-11-11 16:38 +03: second key, topic + resource id from the body, task shopify-review-hotfix
test("same order event again with a new delivery id: skipped", async () => {
  const { store } = memoryStore();
  const order = { id: 5551234, updated_at: "2026-11-11T12:00:00+03:00" };
  assert.equal(await claimWebhook(store, "wh-a", "a.myshopify.com", "ORDERS_CREATE", order), true);
  assert.equal(await claimWebhook(store, "wh-b", "a.myshopify.com", "ORDERS_CREATE", order), false);
  assert.equal(await claimWebhook(store, "wh-c", "a.myshopify.com", "ORDERS_PAID", order), true, "other topic");
  assert.equal(await claimWebhook(store, "wh-d", "b.myshopify.com", "ORDERS_CREATE", order), true, "other shop");
  assert.equal(await claimWebhook(store, "wh-e", "a.myshopify.com", "ORDERS_CREATE", { id: 5551235 }), true, "other order");
});

test("customer and fulfillment ids are keys too", async () => {
  const { store } = memoryStore();
  assert.equal(await claimWebhook(store, "c1", "a.myshopify.com", "CUSTOMERS_CREATE", { id: 77 }), true);
  assert.equal(await claimWebhook(store, "c2", "a.myshopify.com", "CUSTOMERS_CREATE", { id: 77 }), false);
  assert.equal(await claimWebhook(store, "f1", "a.myshopify.com", "FULFILLMENTS_CREATE", { id: 88, order_id: 5551234 }), true);
  assert.equal(await claimWebhook(store, "f2", "a.myshopify.com", "FULFILLMENTS_CREATE", { id: 88, order_id: 5551234 }), false);
});

test("repeating topics: a real later update passes, a copy of the same update is skipped", async () => {
  const { store } = memoryStore();
  const first = { id: 88, updated_at: "2026-11-11T12:00:00+03:00" };
  const later = { id: 88, updated_at: "2026-11-11T15:00:00+03:00" };
  assert.equal(await claimWebhook(store, "u1", "a.myshopify.com", "FULFILLMENTS_UPDATE", first), true);
  assert.equal(await claimWebhook(store, "u2", "a.myshopify.com", "FULFILLMENTS_UPDATE", first), false);
  assert.equal(await claimWebhook(store, "u3", "a.myshopify.com", "FULFILLMENTS_UPDATE", later), true);
  assert.equal(await claimWebhook(store, "p1", "a.myshopify.com", "ORDERS_PARTIALLY_FULFILLED", first), true);
  assert.equal(await claimWebhook(store, "p2", "a.myshopify.com", "ORDERS_PARTIALLY_FULFILLED", later), true);
});

test("no resource id: only the delivery id is used; neither: handled", async () => {
  const { store } = memoryStore();
  assert.equal(resourceKey("a.myshopify.com", "ORDERS_CREATE", {}), null);
  assert.equal(resourceKey("a.myshopify.com", "ORDERS_CREATE", null), null);
  assert.equal(resourceKey("a.myshopify.com", "FULFILLMENTS_UPDATE", { id: 1 }), null, "repeating topic needs updated_at");
  assert.equal(await claimWebhook(store, "n1", "a.myshopify.com", "ORDERS_CREATE", {}), true);
  assert.equal(await claimWebhook(store, "n2", "a.myshopify.com", "ORDERS_CREATE", {}), true);
  assert.equal(await claimWebhook(store, undefined, "a.myshopify.com", "ORDERS_CREATE", {}), true);
  assert.equal(await claimWebhook(store, undefined, "a.myshopify.com", "ORDERS_CREATE", undefined), true);
});

test("no delivery id but a resource id: the resource key alone skips the copy", async () => {
  const { store } = memoryStore();
  assert.equal(await claimWebhook(store, undefined, "a.myshopify.com", "ORDERS_PAID", { id: 9 }), true);
  assert.equal(await claimWebhook(store, undefined, "a.myshopify.com", "ORDERS_PAID", { id: 9 }), false);
});

// 2026-11-11 16:39 +03: started and done/failed log lines, without phone numbers or message text, task shopify-review-hotfix
test("started and done/failed lines are logged, with no phone number or message text", async (t) => {
  const lines: string[] = [];
  t.mock.method(console, "log", (...a: unknown[]) => { lines.push(a.map(String).join(" ")); });
  t.mock.method(console, "error", (...a: unknown[]) => { lines.push(a.map(String).join(" ")); });
  const phone = "96512345678";
  await runAfterResponse("ORDERS_PAID", "a.myshopify.com", "wh-7", async () => ({ success: false, error: `Invalid phone number: ${phone}` }));
  await runAfterResponse("ORDERS_PAID", "a.myshopify.com", "wh-8", async () => ({ success: true, msgId: "m1" }));
  await runAfterResponse("ORDERS_PAID", "a.myshopify.com", undefined, async () => { throw new Error(`could not save ${phone} Hello Ali`); });
  assert.deepEqual(lines, [
    "[webhook] started shop=a.myshopify.com topic=ORDERS_PAID delivery=wh-7",
    "[webhook] done shop=a.myshopify.com topic=ORDERS_PAID delivery=wh-7 sent=no",
    "[webhook] started shop=a.myshopify.com topic=ORDERS_PAID delivery=wh-8",
    "[webhook] done shop=a.myshopify.com topic=ORDERS_PAID delivery=wh-8 sent=yes",
    "[webhook] started shop=a.myshopify.com topic=ORDERS_PAID delivery=none",
    "[webhook] failed shop=a.myshopify.com topic=ORDERS_PAID delivery=none reason=Error",
  ]);
});
