/*
 * FILE:      app/lib/webhooks/verify.test.ts
 * CREATED:   2026-11-18 10:37 +03
 * TASK:      #1504
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit tests for verify.ts: a valid webhook still gets through when authenticate.webhook throws the
 *            token-refresh 500; a bad HMAC gets 401; other errors are not hidden.
 * WHY:       Proves privacy webhooks answer 200 after an uninstall with an expired offline token.
 * USAGE:     npm test   (node --test, built-in type stripping).
 * DEPENDS:   Node 22.18+ or 24.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { authenticateWebhookNoRefresh, validHmac } from "./verify.ts";

const HMAC_KEY = "unit-test-key";
const BODY = JSON.stringify({ shop_id: 1, shop_domain: "demo.myshopify.com" });

function req(hmac: string): Request {
  return new Request("https://example.test/webhooks/shop/redact", {
    method: "POST",
    body: BODY,
    headers: {
      "content-type": "application/json",
      "x-shopify-hmac-sha256": hmac,
      "x-shopify-shop-domain": "demo.myshopify.com",
      "x-shopify-topic": "shop/redact",
    },
  });
}
const good = createHmac("sha256", HMAC_KEY).update(BODY, "utf8").digest("base64");
const refresh500 = async (r: Request) => {
  await r.text(); // the library reads the body before it fails
  throw new Response(undefined, { status: 500 });
};

test("validHmac accepts the right signature and rejects others", () => {
  assert.equal(validHmac(BODY, good, HMAC_KEY), true);
  assert.equal(validHmac(BODY, good, "other"), false);
  assert.equal(validHmac(BODY, null, HMAC_KEY), false);
  assert.equal(validHmac(BODY + " ", good, HMAC_KEY), false);
});

test("token-refresh 500 with a valid HMAC returns shop, topic, payload and no session", async () => {
  const w = await authenticateWebhookNoRefresh(req(good), refresh500, HMAC_KEY);
  assert.equal(w.shop, "demo.myshopify.com");
  assert.equal(w.topic, "SHOP_REDACT");
  assert.equal((w.payload as { shop_id: number }).shop_id, 1);
  assert.equal(w.session, undefined);
});

test("token-refresh 500 with a bad HMAC is 401", async () => {
  await assert.rejects(authenticateWebhookNoRefresh(req("AAAA"), refresh500, HMAC_KEY), (e) => e instanceof Response && e.status === 401);
});

test("library 401 is passed on unchanged", async () => {
  await assert.rejects(
    authenticateWebhookNoRefresh(req(good), async () => { throw new Response(undefined, { status: 401 }); }, HMAC_KEY),
    (e) => e instanceof Response && e.status === 401,
  );
});

// 2026-11-18 10:40 +03: a thrown Error (refresh refused, storage down) also falls back to the local HMAC check, #1504
test("thrown Error with a valid HMAC falls back; with a bad HMAC is 401", async () => {
  const boom = async (r: Request) => { await r.text(); throw new Error("invalid_subject_token"); };
  const w = await authenticateWebhookNoRefresh(req(good), boom, HMAC_KEY);
  assert.equal(w.topic, "SHOP_REDACT");
  await assert.rejects(authenticateWebhookNoRefresh(req("AAAA"), boom, HMAC_KEY), (e) => e instanceof Response && e.status === 401);
});

test("normal path returns the library result", async () => {
  const w = await authenticateWebhookNoRefresh(req(good), async () => ({ shop: "s", topic: "T", payload: {}, session: { id: 1 } }), HMAC_KEY);
  assert.deepEqual(w.session, { id: 1 });
});
