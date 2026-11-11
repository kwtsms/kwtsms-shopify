/*
 * FILE:      app/lib/sms/login-pause.test.ts
 * CREATED:   2026-11-11 16:36 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit tests for login-pause.ts and kwtsms-call.ts: 3 failed logins in 60 s across shops pause new logins
 *            for every shop, saved verified credentials keep working, the pause ends after 5 minutes, a rolling
 *            window (not a fixed one) is used, and only failures are counted.
 * WHY:       Proves the app stops trying new kwtSMS logins after repeated failures from any shop.
 * USAGE:     npm test   (node --test, built-in type stripping, no extra dependency). In-memory store, mock calls,
 *            no database and no API call.
 * DEPENDS:   Node 22.18+ or 24 (type stripping on by default).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLoginPaused,
  recordLoginFailure,
  LOGIN_PAUSE_MS,
  LOGIN_PAUSED_MESSAGE,
  type LoginFailureStore,
} from "./login-pause.ts";
import { callKwtsms, LOGIN_PAUSED_CODE, type KwtsmsCallDeps } from "./kwtsms-call.ts";

const SEC = 1000;
const T0 = Date.UTC(2026, 10, 11, 12);

/** Behaves like the KwtsmsLoginFailure table. */
function memoryStore() {
  const rows: { shop: string; code: string; createdAt: Date }[] = [];
  const store: LoginFailureStore = {
    kwtsmsLoginFailure: {
      async create({ data }) { rows.push({ ...data }); return data; },
      async findMany({ where }) {
        return rows
          .filter((r) => r.createdAt >= where.createdAt.gte)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      async deleteMany({ where }) {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].createdAt < where.createdAt.lt) rows.splice(i, 1);
        return { count: before - rows.length };
      },
    },
  };
  return { store, rows };
}

function deps(store: LoginFailureStore) {
  const unverified: string[] = [];
  const d: KwtsmsCallDeps = { store, markUnverified: async (shop) => { unverified.push(shop); } };
  return { d, unverified };
}

const fail = (code: string) => async () => ({ ok: false as const, error: { code, description: code, action: "" } });
const okCall = () => {
  let calls = 0;
  return { fn: async () => { calls++; return { ok: true as const, data: { available: 5, purchased: 10 } }; }, get calls() { return calls; } };
};

test("3 failures across 2 shops within 60 s pause new logins for every shop", async () => {
  const { store } = memoryStore();
  await recordLoginFailure(store, "a.myshopify.com", "ERR003", T0);
  await recordLoginFailure(store, "b.myshopify.com", "ERR003", T0 + 20 * SEC);
  assert.equal((await isLoginPaused(store, T0 + 21 * SEC)).paused, false, "2 failures: not paused");
  await recordLoginFailure(store, "a.myshopify.com", "ERR003", T0 + 40 * SEC);
  const p = await isLoginPaused(store, T0 + 41 * SEC);
  assert.equal(p.paused, true);
  assert.ok(p.retryAfterMs > 0 && p.retryAfterMs <= LOGIN_PAUSE_MS);
});

test("pause ends 5 minutes after the last failure", async () => {
  const { store } = memoryStore();
  for (const t of [0, 1, 2]) await recordLoginFailure(store, "a.myshopify.com", "ERR003", T0 + t * SEC);
  assert.equal((await isLoginPaused(store, T0 + 2 * SEC + LOGIN_PAUSE_MS - 1)).paused, true);
  assert.equal((await isLoginPaused(store, T0 + 2 * SEC + LOGIN_PAUSE_MS)).paused, false);
});

test("rolling window: 3 failures spread over more than 60 s do not pause", async () => {
  const { store } = memoryStore();
  for (const t of [0, 35, 70]) await recordLoginFailure(store, "a.myshopify.com", "ERR003", T0 + t * SEC);
  assert.equal((await isLoginPaused(store, T0 + 71 * SEC)).paused, false);
  await recordLoginFailure(store, "c.myshopify.com", "ERR003", T0 + 80 * SEC); // 35, 70, 80 fall in one 60 s
  assert.equal((await isLoginPaused(store, T0 + 81 * SEC)).paused, true);
});

test("database error while reading: treated as paused", async () => {
  const broken: LoginFailureStore = {
    kwtsmsLoginFailure: {
      async create() { throw new Error("down"); },
      async findMany() { throw new Error("down"); },
      async deleteMany() { throw new Error("down"); },
    },
  };
  assert.equal((await isLoginPaused(broken, T0)).paused, true);
  await recordLoginFailure(broken, "a.myshopify.com", "ERR003", T0); // must not throw
});

test("callKwtsms: new logins are refused while paused, without any API call", async () => {
  const { store } = memoryStore();
  const { d } = deps(store);
  for (const shop of ["a.myshopify.com", "b.myshopify.com", "a.myshopify.com"]) {
    await callKwtsms(d, shop, "new", fail("ERR003"));
  }
  const c = okCall();
  const r = await callKwtsms(d, "z.myshopify.com", "new", c.fn);
  assert.equal(c.calls, 0);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.error.code === LOGIN_PAUSED_CODE && r.error.description === LOGIN_PAUSED_MESSAGE);
});

test("callKwtsms: a verified shop keeps working while new logins are paused", async () => {
  const { store } = memoryStore();
  const { d } = deps(store);
  for (let i = 0; i < 3; i++) await callKwtsms(d, `s${i}.myshopify.com`, "new", fail("ERR003"));
  assert.equal((await isLoginPaused(store)).paused, true);
  const c = okCall();
  const r = await callKwtsms(d, "verified.myshopify.com", "saved", c.fn);
  assert.equal(c.calls, 1);
  assert.equal(r.ok, true);
});

test("callKwtsms: only login or account errors are counted; saved credentials are marked unverified", async () => {
  const { store, rows } = memoryStore();
  const { d, unverified } = deps(store);
  await callKwtsms(d, "a.myshopify.com", "saved", fail("TIMEOUT"));
  await callKwtsms(d, "a.myshopify.com", "saved", fail("ERR010"));
  await callKwtsms(d, "a.myshopify.com", "saved", okCall().fn);
  assert.equal(rows.length, 0);
  assert.deepEqual(unverified, []);
  await callKwtsms(d, "a.myshopify.com", "saved", fail("ERR003"));
  await callKwtsms(d, "b.myshopify.com", "new", fail("ERR003"));
  assert.equal(rows.length, 2);
  assert.deepEqual(unverified, ["a.myshopify.com"], "new credentials are not saved, so not marked");
});
