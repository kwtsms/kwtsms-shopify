/*
 * FILE:      app/lib/sms/account-guard.ts
 * CREATED:   2026-11-11 16:06 +03
 * TASK:      shopify-review-hotfix
 * AUTHOR:    kwtSMS integration
 * WHAT:      Rules that keep the app from repeating kwtSMS calls that cannot succeed: which API errors mean the
 *            login or account is not usable, when a stale balance sync is due, the account data sync in order
 *            (stops after the first login or account error), and a per-shop limit on Gateway login attempts.
 * WHY:       A wrong or expired kwtSMS login was retried on every order and page load (3 calls each time), and the
 *            Login button had no limit. Stop retrying a login that failed until the merchant logs in again.
 * USAGE:     isAccountError(code), isSyncDue(now, balanceUpdatedAt, syncAttemptedAt),
 *            syncAccount(client, store), loginThrottle.attempt(shop).
 * DEPENDS:   type-only imports, no runtime imports, so node --test can load it directly.
 */
import type { Result, BalanceResponse, SenderIdResponse, CoverageResponse } from "../kwtsms/types";

// Codes from https://www.kwtsms.com/api-documentation.html (read 2026-11-11) that apply to ALL calls and mean the
// login or the account cannot be used until the merchant changes something: API off (ERR001), wrong username or
// password (ERR003), no API access (ERR004), account blocked (ERR005), IP not in the API allowed list (ERR024),
// proxy or VPN address refused (ERR034).
export const ACCOUNT_ERROR_CODES: ReadonlySet<string> = new Set([
  "ERR001", "ERR003", "ERR004", "ERR005", "ERR024", "ERR034",
]);

export function isAccountError(code: string | undefined | null): boolean {
  return !!code && ACCOUNT_ERROR_CODES.has(code);
}

export const BALANCE_STALE_MS = 24 * 60 * 60 * 1000;
export const SYNC_RETRY_MS = 60 * 60 * 1000;

/** True when the cached balance is older than 24 h AND no sync was tried in the last hour. */
export function isSyncDue(
  now: number,
  balanceUpdatedAt: Date | string | null | undefined,
  syncAttemptedAt: Date | string | null | undefined,
): boolean {
  const lastSync = balanceUpdatedAt ? new Date(balanceUpdatedAt).getTime() : 0;
  if (now - lastSync <= BALANCE_STALE_MS) return false;
  const lastTry = syncAttemptedAt ? new Date(syncAttemptedAt).getTime() : 0;
  return now - lastTry >= SYNC_RETRY_MS;
}

export interface AccountClient {
  balance(): Promise<Result<BalanceResponse>>;
  senderIds(): Promise<Result<SenderIdResponse>>;
  coverage(): Promise<Result<CoverageResponse>>;
}

export interface AccountUpdate {
  balanceAvailable?: number;
  balancePurchased?: number;
  senderIds?: string[];
  coverage?: string[];
}

export interface AccountStore {
  save(update: AccountUpdate): Promise<void>;
  markUnverified(): Promise<void>;
}

/**
 * Balance first; on a login or account error mark the login unverified and stop (one failed call, not three).
 * Sender IDs and coverage follow one after the other, never in parallel.
 */
export async function syncAccount(
  client: AccountClient,
  store: AccountStore,
): Promise<{ ok: boolean; errorCode?: string }> {
  const balance = await client.balance();
  if (!balance.ok) {
    if (isAccountError(balance.error.code)) {
      await store.markUnverified();
    }
    return { ok: false, errorCode: balance.error.code };
  }

  const update: AccountUpdate = {
    balanceAvailable: balance.data.available,
    balancePurchased: balance.data.purchased,
  };

  const senders = await client.senderIds();
  if (senders.ok) {
    update.senderIds = senders.data.senderid;
  } else if (isAccountError(senders.error.code)) {
    await store.save(update);
    await store.markUnverified();
    return { ok: false, errorCode: senders.error.code };
  }

  const coverage = await client.coverage();
  if (coverage.ok) {
    update.coverage = coverage.data.prefixes;
  } else if (isAccountError(coverage.error.code)) {
    await store.save(update);
    await store.markUnverified();
    return { ok: false, errorCode: coverage.error.code };
  }

  await store.save(update);
  return { ok: true };
}

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/** In-memory, per process: at most `max` Gateway login attempts per shop in any `windowMs`. */
export class LoginThrottle {
  private attempts = new Map<string, number[]>();
  private max: number;
  private windowMs: number;

  constructor(max: number = LOGIN_MAX_ATTEMPTS, windowMs: number = LOGIN_WINDOW_MS) {
    this.max = max;
    this.windowMs = windowMs;
  }

  /** Records the attempt when allowed; when not, returns how long to wait. */
  attempt(shop: string, now: number = Date.now()): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const recent = (this.attempts.get(shop) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.attempts.set(shop, recent);
      return { allowed: false, retryAfterMs: this.windowMs - (now - recent[0]) };
    }
    recent.push(now);
    this.attempts.set(shop, recent);
    return { allowed: true };
  }
}

export const loginThrottle = new LoginThrottle();
