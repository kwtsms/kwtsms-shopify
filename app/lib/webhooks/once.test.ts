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
  type WebhookDeliveryStore,
} from "./once.ts";

const DAY = 24 * 60 * 60 * 1000;

/** Behaves like a table with a unique key on webhookId: a second insert of the same id fails with P2002. */
function memoryStore() {
  const rows = new Map<string, { shop: string; topic: string; createdAt: Date }>();
  let now = new Date("2026-11-11T12:00:00Z");
  const purges: Date[] = [];
  const store: WebhookDeliveryStore = {
    webhookDelivery: {
      async create({ data }) {
        await Promise.resolve();
        if (rows.has(data.webhookId)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        rows.set(data.webhookId, { shop: data.shop, topic: data.topic, createdAt: now });
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

test("ids older than 7 days are deleted, at most once an hour", async () => {
  const m = memoryStore();
  const t0 = new Date("2026-11-01T12:00:00Z");
  m.setNow(t0);
  await claimWebhook(m.store, "old", "a.myshopify.com", "ORDERS_PAID", t0);
  const t1 = new Date(t0.getTime() + 8 * DAY);
  m.setNow(t1);
  resetWebhookPurgeClock();
  await claimWebhook(m.store, "new", "a.myshopify.com", "ORDERS_PAID", t1);
  await new Promise((r) => setImmediate(r));
  assert.equal(m.rows.has("old"), false);
  assert.equal(m.rows.has("new"), true);
  assert.equal(m.purges.at(-1)?.toISOString(), new Date(t1.getTime() - 7 * DAY).toISOString());
  const before = m.purges.length;
  await claimWebhook(m.store, "x", "a.myshopify.com", "ORDERS_PAID", new Date(t1.getTime() + 30 * 60 * 1000));
  assert.equal(m.purges.length, before);
});

test("the SMS work runs after the caller returns and its error is caught", async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const done = runAfterResponse("ORDERS_CREATE", "a.myshopify.com", async () => {
    await gate;
    order.push("work");
    throw new Error("send failed");
  });
  order.push("response");
  release();
  await done;
  assert.deepEqual(order, ["response", "work"]);
});
