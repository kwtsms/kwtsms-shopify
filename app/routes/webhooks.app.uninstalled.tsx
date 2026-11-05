import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // 2026-11-06 00:20 +03: delete the shop's stored kwtSMS credentials at once (privacy page promise), rest waits for shop/redact, why (Shopify review 1.1.4), shp-fix-submit
  try {
    await db.gatewayCredentials.deleteMany({ where: { shop } });
  } catch (err) {
    console.error(`[webhook] ${topic} credentials delete failed for ${shop}:`, err);
  }

  return new Response();
};
