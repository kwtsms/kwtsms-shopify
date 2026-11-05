import db from "../../db.server";
import { maskPhone } from "../kwtsms/phone";
// 2026-11-06 00:20 +03: 90-day SMS log purge on log write, why (Shopify review 1.1.4), shp-fix-submit
import { purgeOldLogsIfDue } from "./retention";

export interface LogFilters {
  status?: string;
  eventType?: string;
  recipientType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  phone?: string;
  page?: number;
  pageSize?: number;
}

export interface LogStats {
  totalSent: number;
  totalFailed: number;
  totalCredits: number;
  successRate: number;
}

export async function createLog(data: {
  shop: string;
  eventType: string;
  phone: string;
  recipientType?: string;
  message: string;
  senderId: string;
  status: string;
  msgId?: string;
  pointsCharged?: number;
  balanceAfter?: number;
  errorCode?: string;
  errorDescription?: string;
  apiResponse?: string;
  testMode?: boolean;
}) {
  const log = await db.smsLog.create({ data });
  // 2026-11-06 00:20 +03: also purge on write, for shops whose admin is never opened; throttled to once a day, never blocks the send, why (Shopify review 1.1.4), shp-fix-submit
  purgeOldLogsIfDue(db).catch((err) => {
    console.error("[retention] Purge failed:", err);
  });
  return log;
}

export async function getLogs(
  shop: string,
  filters: LogFilters = {},
): Promise<{ logs: Array<ReturnType<typeof formatLog>>; total: number }> {
  const where: Record<string, unknown> = { shop };
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  if (filters.status) where.status = filters.status;
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.recipientType) where.recipientType = filters.recipientType;
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
    if (filters.dateTo) dateFilter.lte = filters.dateTo;
    where.createdAt = dateFilter;
  }
  if (filters.phone) {
    where.phone = { contains: filters.phone };
  }

  const [logs, total] = await Promise.all([
    db.smsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.smsLog.count({ where }),
  ]);

  return {
    logs: logs.map(formatLog),
    total,
  };
}

function formatLog(log: {
  id: number;
  shop: string;
  eventType: string;
  phone: string;
  recipientType: string;
  message: string;
  senderId: string;
  status: string;
  msgId: string | null;
  pointsCharged: number;
  balanceAfter: number | null;
  errorCode: string | null;
  errorDescription: string | null;
  apiResponse: string | null;
  testMode: boolean;
  createdAt: Date;
}) {
  const { phone, ...rest } = log;
  return {
    ...rest,
    phoneMasked: maskPhone(phone),
  };
}

export async function clearLogs(shop: string): Promise<number> {
  const result = await db.smsLog.deleteMany({ where: { shop } });
  return result.count;
}

export async function getTotalLogCount(shop: string): Promise<number> {
  return db.smsLog.count({ where: { shop } });
}

export async function getTodaySentCount(shop: string): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return db.smsLog.count({
    where: { shop, status: "sent", createdAt: { gte: todayStart } },
  });
}

export async function getLogStats(shop: string): Promise<LogStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sent, failed, credits] = await Promise.all([
    db.smsLog.count({
      where: { shop, status: "sent", createdAt: { gte: monthStart } },
    }),
    db.smsLog.count({
      where: { shop, status: "failed", createdAt: { gte: monthStart } },
    }),
    db.smsLog.aggregate({
      where: { shop, createdAt: { gte: monthStart } },
      _sum: { pointsCharged: true },
    }),
  ]);

  const total = sent + failed;

  return {
    totalSent: sent,
    totalFailed: failed,
    totalCredits: credits._sum.pointsCharged ?? 0,
    successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
  };
}
