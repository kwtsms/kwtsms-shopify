/*
 * FILE:      app/lib/db/retention.ts
 * CREATED:   2026-11-06 00:20 +03
 * TASK:      shp-fix-submit
 * AUTHOR:    kwtSMS integration
 * WHAT:      Deletes SMS logs older than 90 days, at most once per 24 hours per process.
 * WHY:       The privacy page promises a 90-day log retention; no purge existed (Shopify review 1.1.4).
 * USAGE:     purgeOldLogsIfDue(db) from the daily sync path and after each log write.
 * DEPENDS:   a Prisma-like client with smsLog.deleteMany; no runtime imports so node --test can load it.
 */

export const LOG_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = DAY_MS;

export interface SmsLogDeleter {
  smsLog: {
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

let lastPurgeAt = 0;

export function retentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - LOG_RETENTION_DAYS * DAY_MS);
}

/** Deletes logs of every shop older than the cutoff; returns the deleted count or null when not due. */
export async function purgeOldLogsIfDue(
  client: SmsLogDeleter,
  now: Date = new Date(),
): Promise<number | null> {
  if (now.getTime() - lastPurgeAt < PURGE_INTERVAL_MS) return null;
  lastPurgeAt = now.getTime();
  const result = await client.smsLog.deleteMany({
    where: { createdAt: { lt: retentionCutoff(now) } },
  });
  if (result.count > 0) console.log(`[retention] Deleted ${result.count} SMS logs older than ${LOG_RETENTION_DAYS} days`);
  return result.count;
}

/** Test helper: forget the last run so the next call purges. */
export function resetPurgeClock(): void {
  lastPurgeAt = 0;
}
