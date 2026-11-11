/*
 * FILE:      app/lib/sms/login-pause.ts
 * CREATED:   2026-11-11 16:33 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      One app-wide pause on kwtSMS logins after repeated failures. Every failed kwtSMS login or account
 *            error (any shop, any path) is stored as a row in the KwtsmsLoginFailure table. When 3 failures fall
 *            inside any 60 s, logins with new or unverified credentials are paused for 5 minutes, for every shop.
 * WHY:       All shops call kwtSMS from this one server address, and the kwtSMS server stops answering an address
 *            after repeated failed logins. A per-shop limit is not enough when many shops fail at the same time.
 *            The rows live in the database so every app process sees the same count.
 * USAGE:     await isLoginPaused(db)            -> { paused: boolean, retryAfterMs }
 *            await recordLoginFailure(db, shop, code)
 * DEPENDS:   a Prisma-like client with kwtsmsLoginFailure.create, findMany and deleteMany; no runtime imports, so
 *            node --test can load it directly.
 */

export const LOGIN_FAILURE_LIMIT = 3;
export const LOGIN_FAILURE_WINDOW_MS = 60 * 1000;
export const LOGIN_PAUSE_MS = 5 * 60 * 1000;
const KEEP_FAILURES_MS = 60 * 60 * 1000;

export const LOGIN_PAUSED_MESSAGE = "Login is paused for a few minutes. Try again shortly.";

export interface LoginFailureStore {
  kwtsmsLoginFailure: {
    create(args: { data: { shop: string; code: string; createdAt: Date } }): Promise<unknown>;
    findMany(args: {
      where: { createdAt: { gte: Date } };
      orderBy: { createdAt: "asc" };
    }): Promise<{ createdAt: Date }[]>;
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

/**
 * Paused when LOGIN_FAILURE_LIMIT failures fall inside one LOGIN_FAILURE_WINDOW_MS (rolling) and the last of them
 * is less than LOGIN_PAUSE_MS ago. A database error counts as paused: no new login is tried while the count
 * cannot be read.
 */
export async function isLoginPaused(
  store: LoginFailureStore,
  now: number = Date.now(),
): Promise<{ paused: boolean; retryAfterMs: number }> {
  let times: number[];
  try {
    const rows = await store.kwtsmsLoginFailure.findMany({
      where: { createdAt: { gte: new Date(now - LOGIN_PAUSE_MS - LOGIN_FAILURE_WINDOW_MS) } },
      orderBy: { createdAt: "asc" },
    });
    times = rows.map((r) => new Date(r.createdAt).getTime());
  } catch (err) {
    console.error("[kwtsms] could not read the login failure count, logins paused:", err);
    return { paused: true, retryAfterMs: LOGIN_PAUSE_MS };
  }

  let pausedUntil = 0;
  for (let i = LOGIN_FAILURE_LIMIT - 1; i < times.length; i++) {
    if (times[i] - times[i - LOGIN_FAILURE_LIMIT + 1] < LOGIN_FAILURE_WINDOW_MS) {
      pausedUntil = Math.max(pausedUntil, times[i] + LOGIN_PAUSE_MS);
    }
  }
  return pausedUntil > now
    ? { paused: true, retryAfterMs: pausedUntil - now }
    : { paused: false, retryAfterMs: 0 };
}

/** Stores one failed login or account error and deletes rows older than an hour. Never throws. */
export async function recordLoginFailure(
  store: LoginFailureStore,
  shop: string,
  code: string,
  now: number = Date.now(),
): Promise<void> {
  try {
    await store.kwtsmsLoginFailure.create({
      data: { shop: shop.slice(0, 100), code: code.slice(0, 20), createdAt: new Date(now) },
    });
    await store.kwtsmsLoginFailure.deleteMany({ where: { createdAt: { lt: new Date(now - KEEP_FAILURES_MS) } } });
  } catch (err) {
    console.error(`[kwtsms] could not record a login failure for ${shop}:`, err);
  }
}
