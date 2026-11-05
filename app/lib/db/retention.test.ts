/*
 * FILE:      app/lib/db/retention.test.ts
 * CREATED:   2026-11-06 00:20 +03
 * TASK:      shp-fix-submit
 * AUTHOR:    kwtSMS integration
 * WHAT:      Unit test for the 90-day SMS log purge (retention.ts).
 * WHY:       Proves the retention promise on the privacy page holds (Shopify review 1.1.4).
 * USAGE:     npm test   (node --test, built-in type stripping, no extra dependency)
 * DEPENDS:   Node 22.18+ or 24 (type stripping on by default).
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  purgeOldLogsIfDue,
  resetPurgeClock,
  retentionCutoff,
  type SmsLogDeleter,
} from "./retention.ts";

const DAY = 24 * 60 * 60 * 1000;

function fakeDb(rows: Date[]) {
  const calls: Date[] = [];
  const client: SmsLogDeleter = {
    smsLog: {
      async deleteMany({ where }) {
        calls.push(where.createdAt.lt);
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i] < where.createdAt.lt) rows.splice(i, 1);
        }
        return { count: before - rows.length };
      },
    },
  };
  return { client, calls, rows };
}

beforeEach(() => resetPurgeClock());

test("cutoff is exactly 90 days before now", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  assert.equal(retentionCutoff(now).toISOString(), "2026-08-08T00:00:00.000Z");
});

test("deletes only logs older than 90 days", async () => {
  const now = new Date("2026-11-06T00:00:00Z");
  const old = new Date(now.getTime() - 91 * DAY);
  const recent = new Date(now.getTime() - 89 * DAY);
  const { client, rows } = fakeDb([old, recent]);
  assert.equal(await purgeOldLogsIfDue(client, now), 1);
  assert.deepEqual(rows, [recent]);
});

test("runs at most once per 24 hours", async () => {
  const now = new Date("2026-11-06T00:00:00Z");
  const { client, calls } = fakeDb([]);
  assert.equal(await purgeOldLogsIfDue(client, now), 0);
  assert.equal(await purgeOldLogsIfDue(client, new Date(now.getTime() + DAY - 1)), null);
  assert.equal(await purgeOldLogsIfDue(client, new Date(now.getTime() + DAY)), 0);
  assert.equal(calls.length, 2);
});
