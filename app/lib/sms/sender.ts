import { KwtSmsClient, normalize, cleanMessage, countPages } from "../kwtsms";
import { getCredentials } from "../db/credentials";
import { getSetting } from "../db/settings";
import { getTemplate } from "../db/templates";
import { createLog } from "../db/logs";
import { renderTemplate, type TemplateData } from "./templates";
import { updateBalanceFromResponse, syncBalance } from "./balance";

export interface SendResult {
  success: boolean;
  msgId?: string;
  pointsCharged?: number;
  error?: string;
}

/**
 * Unified send function. Handles single and multiple numbers,
 * deduplication, normalization, coverage check, balance check,
 * global toggles (SMS on/off, test mode), and auto-chunking for 200+ numbers.
 *
 * Balance is checked once before sending. After any successful send,
 * local balance is updated from the API response. No unnecessary API calls.
 */
export async function send(params: {
  shop: string;
  phone: string | string[];
  message: string;
  eventType: string;
  senderId?: string;
  testMode?: boolean;
  recipientType?: string;
}): Promise<SendResult> {
  const { shop, message, eventType } = params;

  // ── Global toggles ──
  const smsEnabled = await getSetting(shop, "sms_enabled");
  if (smsEnabled === "false") {
    return { success: false, error: "SMS notifications are disabled" };
  }

  // ── Get credentials ──
  const creds = await getCredentials(shop);
  if (!creds || !creds.credentialsVerified) {
    return { success: false, error: "Gateway not connected. Go to Gateway page to log in." };
  }

  const testMode = params.testMode ?? creds.testMode;
  const senderId = params.senderId ?? creds.senderId;
  const recipientType = params.recipientType ?? "customer";
  const defaultCountryCode = (await getSetting(shop, "default_country_code")) ?? "965";

  // ── Normalize, deduplicate, and validate phones ──
  const rawPhones = Array.isArray(params.phone) ? params.phone : [params.phone];
  const seen = new Set<string>();
  const normalized: string[] = [];
  const invalid: string[] = [];

  for (const raw of rawPhones) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const result = normalize(trimmed, defaultCountryCode);
    if (!result.valid) {
      invalid.push(trimmed);
      continue;
    }
    if (!seen.has(result.normalized)) {
      seen.add(result.normalized);
      normalized.push(result.normalized);
    }
  }

  if (normalized.length === 0) {
    const errorMsg = invalid.length > 0
      ? `Invalid phone number: ${invalid[0]}`
      : "No phone number provided";
    await createLog({
      shop, eventType, phone: rawPhones[0] ?? "",
      recipientType, message, senderId,
      status: "failed", errorCode: "PHONE_INVALID", errorDescription: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // ── Coverage check (only if coverage list exists) ──
  const coverage = JSON.parse(creds.coverage || "[]") as string[];
  if (coverage.length > 0) {
    const uncovered = normalized.filter(
      (phone) => !coverage.some((prefix) => phone.startsWith(prefix)),
    );
    if (uncovered.length === normalized.length) {
      await createLog({
        shop, eventType, phone: normalized[0],
        recipientType, message, senderId,
        status: "skipped", errorCode: "NO_COVERAGE",
        errorDescription: "No numbers in coverage area",
      });
      return { success: false, error: "No numbers in coverage area" };
    }
    // Remove uncovered numbers silently, send to covered ones only
    if (uncovered.length > 0) {
      for (const phone of uncovered) {
        normalized.splice(normalized.indexOf(phone), 1);
      }
    }
  }

  // ── Sync balance if stale (>24 hours) ──
  let availableBalance = creds.balanceAvailable;
  const STALE_MS = 24 * 60 * 60 * 1000;
  const lastSync = creds.balanceUpdatedAt ? new Date(creds.balanceUpdatedAt).getTime() : 0;
  if (Date.now() - lastSync > STALE_MS) {
    const synced = await syncBalance(shop);
    if (synced.ok) {
      availableBalance = synced.data.available;
    }
  }

  // ── Balance check (once, before sending) ──
  // 2026-11-05 18:27 +03: text was "Insufficient SMS credits. Recharge at kwtsms.com"; no recharge call to action (Shopify 1.2.1 pause), shp-strip-prices
  if (availableBalance <= 0) {
    await createLog({
      shop, eventType, phone: normalized.join(","),
      recipientType, message, senderId,
      status: "failed", errorCode: "ZERO_BALANCE",
      errorDescription: "Your kwtSMS account balance is too low to send this message.",
    });
    return { success: false, error: "Your kwtSMS account balance is too low to send this message." };
  }

  // ── Create client ──
  const client = new KwtSmsClient({
    username: creds.username,
    password: creds.password,
    senderId,
    testMode,
  });

  // ── Clean and validate message length ──
  const cleanedMessage = cleanMessage(message);
  const MAX_PAGES = 7;
  const pageInfo = countPages(cleanedMessage);
  if (pageInfo.pages > MAX_PAGES) {
    const maxChars = pageInfo.isUnicode ? 67 * MAX_PAGES : 153 * MAX_PAGES;
    await createLog({
      shop, eventType, phone: normalized.join(","),
      recipientType, message: cleanedMessage, senderId,
      status: "failed", errorCode: "MSG_TOO_LONG",
      errorDescription: `Message is ${pageInfo.pages} pages (max ${MAX_PAGES}). ${pageInfo.chars} chars, limit ~${maxChars}`,
    });
    return { success: false, error: `Message too long: ${pageInfo.pages} pages (max ${MAX_PAGES})` };
  }

  // ── Send ──
  const result = await client.send(normalized, cleanedMessage, {
    senderId,
    test: testMode,
  });

  if (result.ok) {
    await createLog({
      shop, eventType, phone: normalized.join(","),
      recipientType, message: cleanedMessage, senderId,
      status: "sent",
      msgId: result.data["msg-id"],
      pointsCharged: result.data["points-charged"],
      balanceAfter: result.data["balance-after"],
      apiResponse: JSON.stringify(result.data),
      testMode,
    });

    // Update local balance from API response
    await updateBalanceFromResponse(shop, result.data["balance-after"]);

    return {
      success: true,
      msgId: result.data["msg-id"],
      pointsCharged: result.data["points-charged"],
    };
  }

  // ── Failed ──
  await createLog({
    shop, eventType, phone: normalized.join(","),
    recipientType, message: cleanedMessage, senderId,
    status: "failed",
    errorCode: result.error.code,
    errorDescription: result.error.description,
    apiResponse: JSON.stringify(result.error),
    testMode,
  });

  return { success: false, error: result.error.description };
}

// Keep backward-compatible alias
export const sendSms = send;

/**
 * Send a notification using a template. Resolves language, recipient type,
 * and dispatches to send() for customer and/or admin.
 */
export async function sendNotification(params: {
  shop: string;
  eventType: string;
  phone: string;
  locale?: string;
  templateData: TemplateData;
}): Promise<SendResult> {
  const { shop, eventType, phone, locale, templateData } = params;

  // Check if this event type is enabled
  const eventKey = `notify_${eventType}`;
  const eventEnabled = await getSetting(shop, eventKey);
  if (eventEnabled === "false") {
    return { success: false, error: `Notification type ${eventType} disabled` };
  }

  // Load template
  const template = await getTemplate(shop, eventType);
  if (!template) {
    return { success: false, error: `No template found for ${eventType}` };
  }

  // Resolve language
  const defaultLanguage = (await getSetting(shop, "default_language")) || "en";
  const language = locale?.startsWith("ar") ? "ar" : locale ? "en" : defaultLanguage;
  const templateText = language === "ar" ? template.templateAr : template.templateEn;
  const message = renderTemplate(templateText, templateData);

  const recipientType = template.recipientType ?? "customer";
  const results: SendResult[] = [];

  // Send to customer
  if (recipientType === "customer" || recipientType === "both") {
    results.push(await send({ shop, phone, message, eventType, recipientType: "customer" }));
  }

  // Send to admin
  if (recipientType === "admin" || recipientType === "both") {
    const adminPhone = await getSetting(shop, "admin_phone");
    if (adminPhone) {
      results.push(await send({ shop, phone: adminPhone, message, eventType, recipientType: "admin" }));
    }
  }

  const failed = results.find((r) => !r.success);
  if (failed) return failed;
  return results[results.length - 1] ?? { success: false, error: "No recipients configured" };
}
