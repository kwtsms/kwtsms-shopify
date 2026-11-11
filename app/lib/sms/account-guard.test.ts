/*
 * FILE:      app/lib/sms/account-guard.test.ts
 * CREATED:   2026-11-11 16:06 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit tests for account-guard.ts: account error codes, sync due rule, ordered sync that stops after a
 *            login error, and the per-shop login attempt limit.
 * WHY:       Proves a login that failed is not retried on every order and that Gateway logins are limited.
 * USAGE:     npm test   (node --test, built-in type stripping, no extra dependency). Mock client only, no API call.
 * DEPENDS:   Node 22.18+ or 24 (type stripping on by default).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAccountError,
  isSyncDue,
  syncAccount,
  LoginThrottle,
  type AccountClient,
  type AccountUpdate,
} from "./account-guard.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function err(code: string) {
  return { ok: false as const, error: { code, description: code, action: "" } };
}

function mockClient(fail?: { at: "balance" | "senderIds" | "coverage"; code: string }) {
  const calls: string[] = [];
  const client: AccountClient = {
    async balance() {
      calls.push("balance");
      return fail?.at === "balance" ? err(fail.code) : { ok: true, data: { available: 50, purchased: 100 } };
    },
    async senderIds() {
      calls.push("senderIds");
      return fail?.at === "senderIds" ? err(fail.code) : { ok: true, data: { senderid: ["KWT-SMS"] } };
    },
    async coverage() {
      calls.push("coverage");
      return fail?.at === "coverage" ? err(fail.code) : { ok: true, data: { prefixes: ["965"] } };
    },
  };
  return { client, calls };
}

function mockStore() {
  const saved: AccountUpdate[] = [];
  let unverified = 0;
  return {
    saved,
    get unverified() { return unverified; },
    store: {
      async save(u: AccountUpdate) { saved.push(u); },
      async markUnverified() { unverified++; },
    },
  };
}

test("login and account codes are recognised, others are not", () => {
  for (const c of ["ERR001", "ERR003", "ERR004", "ERR005", "ERR024", "ERR034"]) assert.equal(isAccountError(c), true, c);
  for (const c of ["ERR010", "ERR013", "ERR028", "TIMEOUT", "NETWORK", "", undefined, null]) assert.equal(isAccountError(c), false, String(c));
});

test("sync is due only when the balance is over 24 h old and no try in the last hour", () => {
  const now = Date.UTC(2026, 10, 11, 12);
  assert.equal(isSyncDue(now, new Date(now - DAY + 1000), null), false);
  assert.equal(isSyncDue(now, new Date(now - DAY - 1000), null), true);
  assert.equal(isSyncDue(now, null, null), true);
  assert.equal(isSyncDue(now, null, new Date(now - 10 * 60 * 1000)), false);
  assert.equal(isSyncDue(now, null, new Date(now - HOUR)), true);
});

test("wrong login: one call only, login marked unverified, nothing saved", async () => {
  const { client, calls } = mockClient({ at: "balance", code: "ERR003" });
  const s = mockStore();
  const r = await syncAccount(client, s.store);
  assert.deepEqual(r, { ok: false, errorCode: "ERR003" });
  assert.deepEqual(calls, ["balance"]);
  assert.equal(s.unverified, 1);
  assert.equal(s.saved.length, 0);
});

test("IP not allowed (ERR024) also stops after one call", async () => {
  const { client, calls } = mockClient({ at: "balance", code: "ERR024" });
  const s = mockStore();
  await syncAccount(client, s.store);
  assert.deepEqual(calls, ["balance"]);
  assert.equal(s.unverified, 1);
});

test("timeout on balance: stop, login stays verified", async () => {
  const { client, calls } = mockClient({ at: "balance", code: "TIMEOUT" });
  const s = mockStore();
  const r = await syncAccount(client, s.store);
  assert.equal(r.ok, false);
  assert.deepEqual(calls, ["balance"]);
  assert.equal(s.unverified, 0);
});

test("account error on sender IDs: coverage is not called", async () => {
  const { client, calls } = mockClient({ at: "senderIds", code: "ERR005" });
  const s = mockStore();
  await syncAccount(client, s.store);
  assert.deepEqual(calls, ["balance", "senderIds"]);
  assert.equal(s.unverified, 1);
});

test("good login: three calls in order, everything saved", async () => {
  const { client, calls } = mockClient();
  const s = mockStore();
  const r = await syncAccount(client, s.store);
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(calls, ["balance", "senderIds", "coverage"]);
  assert.deepEqual(s.saved, [{ balanceAvailable: 50, balancePurchased: 100, senderIds: ["KWT-SMS"], coverage: ["965"] }]);
  assert.equal(s.unverified, 0);
});

test("login limit: 5 per shop in 10 minutes, then wait; other shops unaffected", () => {
  const t = new LoginThrottle(5, 10 * 60 * 1000);
  const now = Date.UTC(2026, 10, 11, 12);
  for (let i = 0; i < 5; i++) assert.equal(t.attempt("a.myshopify.com", now + i * 1000).allowed, true);
  const blocked = t.attempt("a.myshopify.com", now + 5000);
  assert.equal(blocked.allowed, false);
  assert.ok(!blocked.allowed && blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 10 * 60 * 1000);
  assert.equal(t.attempt("b.myshopify.com", now + 5000).allowed, true);
  assert.equal(t.attempt("a.myshopify.com", now + 10 * 60 * 1000).allowed, true);
});
