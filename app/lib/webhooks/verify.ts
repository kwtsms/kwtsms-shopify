/*
 * FILE:      app/lib/webhooks/verify.ts
 * CREATED:   2026-11-18 10:37 +03
 * TASK:      #1504 (Shopify review: 500 on app/uninstalled and shop/redact)
 * AUTHOR:    kwtSMS integration
 * WHAT:      authenticateWebhookNoRefresh(): runs authenticate.webhook; if it throws the library's bare 500 Response
 *            (offline token expired and the refresh failed, which always happens after an uninstall), it checks the
 *            webhook HMAC itself and returns shop, topic and payload without a session.
 * WHY:       With future.expiringOfflineAccessTokens the offline token lives about 1 hour. A shop that uninstalls
 *            later gets app/uninstalled, shop/redact and customers/* answered with 500 before our handler runs
 *            (shopify-app-react-router refresh-token.mjs), so Shopify retries for hours and the session is never
 *            deleted. Privacy webhooks must answer 200.
 * USAGE:     const { shop, topic, payload, session } = await authenticateWebhookNoRefresh(request, authenticate.webhook,
 *              process.env.SHOPIFY_API_SECRET); use only in webhooks that do not need the Admin API.
 * DEPENDS:   node:crypto only.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface PlainWebhook {
  shop: string;
  topic: string;
  payload: Record<string, unknown>;
  session?: unknown;
}

/** True when the base64 HMAC-SHA256 of rawBody with secret equals the header value (timing safe). */
export function validHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const want = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let got: Buffer;
  try {
    got = Buffer.from(header, "base64");
  } catch {
    return false;
  }
  return got.length === want.length && timingSafeEqual(got, want);
}

/** "APP_UNINSTALLED" style topic from the "app/uninstalled" header, as authenticate.webhook returns it. */
function topicFromHeader(h: string): string {
  return h.replace(/[/.]/g, "_").toUpperCase();
}

export async function authenticateWebhookNoRefresh(
  request: Request,
  authenticateWebhook: (r: Request) => Promise<PlainWebhook>,
  secret: string,
): Promise<PlainWebhook> {
  const copy = request.clone();
  try {
    return await authenticateWebhook(request);
  } catch (err) {
    // 2026-11-18 10:40 +03: falls through on the library's bare 500 (failed token refresh) and on thrown Errors
    // (refresh refused as InvalidJwtError / invalid_subject_token, session storage down); its 401/400/405 are
    // rethrown, task #1504
    if (err instanceof Response && err.status < 500) throw err;
    const rawBody = await copy.text();
    if (!validHmac(rawBody, copy.headers.get("x-shopify-hmac-sha256"), secret)) {
      throw new Response(undefined, { status: 401, statusText: "Unauthorized" });
    }
    const shop = copy.headers.get("x-shopify-shop-domain") || "";
    const topic = topicFromHeader(copy.headers.get("x-shopify-topic") || "");
    console.warn(`[webhook] ${topic} for ${shop}: authenticate.webhook failed (${err instanceof Response ? err.status : String(err)}), HMAC checked locally`);
    return { shop, topic, payload: JSON.parse(rawBody || "{}") as Record<string, unknown>, session: undefined };
  }
}
