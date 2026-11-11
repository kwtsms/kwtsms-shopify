import db from "../../db.server";
import { encrypt, decrypt } from "../crypto";

export async function getCredentials(shop: string) {
  const creds = await db.gatewayCredentials.findUnique({ where: { shop } });
  if (!creds) return null;
  return { ...creds, password: decrypt(creds.password) };
}

export async function saveCredentials(
  shop: string,
  data: {
    username?: string;
    password?: string;
    senderId?: string;
    testMode?: boolean;
    senderIds?: string[];
    coverage?: string[];
    balanceAvailable?: number;
    balancePurchased?: number;
    credentialsVerified?: boolean;
    // 2026-11-11 16:06 +03: last sync attempt time, to retry a failed sync at most once an hour, task shopify-review-hotfix
    syncAttemptedAt?: Date;
  },
) {
  const updateData: Record<string, unknown> = {};

  if (data.username !== undefined) updateData.username = data.username;
  if (data.password !== undefined) updateData.password = encrypt(data.password);
  if (data.senderId !== undefined) updateData.senderId = data.senderId;
  if (data.testMode !== undefined) updateData.testMode = data.testMode;
  if (data.senderIds !== undefined) updateData.senderIds = JSON.stringify(data.senderIds);
  if (data.coverage !== undefined) updateData.coverage = JSON.stringify(data.coverage);
  if (data.balanceAvailable !== undefined) updateData.balanceAvailable = data.balanceAvailable;
  if (data.balancePurchased !== undefined) updateData.balancePurchased = data.balancePurchased;
  if (data.credentialsVerified !== undefined) updateData.credentialsVerified = data.credentialsVerified;
  if (data.syncAttemptedAt !== undefined) updateData.syncAttemptedAt = data.syncAttemptedAt;
  if (data.balanceAvailable !== undefined || data.balancePurchased !== undefined) {
    updateData.balanceUpdatedAt = new Date();
  }

  await db.gatewayCredentials.upsert({
    where: { shop },
    create: {
      shop,
      username: data.username ?? "",
      password: data.password ? encrypt(data.password) : "",
      senderIds: JSON.stringify(["KWT-SMS"]),
      coverage: JSON.stringify(["965"]),
      ...updateData,
    },
    update: updateData,
  });
}

export async function clearCredentials(shop: string) {
  const existing = await db.gatewayCredentials.findUnique({ where: { shop } });
  if (!existing) return;

  await db.gatewayCredentials.update({
    where: { shop },
    data: {
      username: "",
      password: "",
      senderId: "KWT-SMS",
      senderIds: JSON.stringify(["KWT-SMS"]),
      coverage: JSON.stringify(["965"]),
      balanceAvailable: 0,
      balancePurchased: 0,
      credentialsVerified: false,
    },
  });
}
