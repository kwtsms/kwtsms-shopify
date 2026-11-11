/*
 * FILE:      app/lib/sms/kwtsms-call.test.ts
 * CREATED:   2026-11-11 16:38 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit tests for the one-request-at-a-time-per-shop queue in kwtsms-call.ts: 10 sends at the same moment
 *            whose first call fails the login make exactly 1 API call; other shops are not held up; a failing
 *            task does not stop the queue.
 * WHY:       Proves many orders arriving together cannot all try a login that has just failed.
 * USAGE:     npm test   (node --test, built-in type stripping, no extra dependency). Mock calls and an in-memory
 *            credentials flag, no database and no API call.
 * DEPENDS:   Node 22.18+ or 24 (type stripping on by default).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { callKwtsms, runForShop, NOT_CONNECTED_CODE, type KwtsmsCallDeps } from "./kwtsms-call.ts";
import type { LoginFailureStore } from "./login-pause.ts";

function fakeDeps() {
  const verified = new Map<string, boolean>();
  const failures: string[] = [];
  const store: LoginFailureStore = {
    kwtsmsLoginFailure: {
      async create({ data }) { failures.push(data.shop); return data; },
      async findMany() { return []; },
      async deleteMany() { return { count: 0 }; },
    },
  };
  const deps: KwtsmsCallDeps = {
    store,
    // a small delay, like a real database write, so the race would show if the queue were missing
    markUnverified: async (shop) => { await new Promise((r) => setTimeout(r, 5)); verified.set(shop, false); },
    isVerified: async (shop) => verified.get(shop) ?? true,
  };
  return { deps, verified, failures };
}

test("10 sends at once, the first fails the login (ERR003): exactly 1 API call", async () => {
  const { deps, failures } = fakeDeps();
  let apiCalls = 0;
  const send = async () => {
    apiCalls++;
    await new Promise((r) => setTimeout(r, 10)); // network time
    return { ok: false as const, error: { code: "ERR003", description: "wrong login", action: "" } };
  };
  const results = await Promise.all(
    Array.from({ length: 10 }, () => callKwtsms(deps, "a.myshopify.com", "saved", send)),
  );
  assert.equal(apiCalls, 1);
  assert.equal(failures.length, 1, "one failure counted");
  assert.equal(results.filter((r) => !r.ok && r.error.code === "ERR003").length, 1);
  assert.equal(results.filter((r) => !r.ok && r.error.code === NOT_CONNECTED_CODE).length, 9);
});

test("10 good sends at once: all made, one at a time", async () => {
  const { deps } = fakeDeps();
  let inFlight = 0;
  let maxInFlight = 0;
  let apiCalls = 0;
  const send = async () => {
    apiCalls++;
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight--;
    return { ok: true as const, data: { "msg-id": "x" } };
  };
  await Promise.all(Array.from({ length: 10 }, () => callKwtsms(deps, "a.myshopify.com", "saved", send)));
  assert.equal(apiCalls, 10);
  assert.equal(maxInFlight, 1);
});

test("another shop is not held up by a slow shop", async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const slow = runForShop("slow.myshopify.com", async () => { await gate; order.push("slow"); });
  await runForShop("fast.myshopify.com", async () => { order.push("fast"); });
  release();
  await slow;
  assert.deepEqual(order, ["fast", "slow"]);
});

test("a task that throws does not stop the next one", async () => {
  const failed = runForShop("a.myshopify.com", async () => { throw new Error("boom"); });
  const next = runForShop("a.myshopify.com", async () => "ran");
  await assert.rejects(failed, /boom/);
  assert.equal(await next, "ran");
});
