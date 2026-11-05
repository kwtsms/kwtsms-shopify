import db from "../../db.server";

interface DataRequestPayload {
  customer?: {
    id?: number;
    email?: string;
    phone?: string;
  };
  orders_requested?: number[];
}

interface RedactPayload {
  customer?: {
    id?: number;
    email?: string;
    phone?: string;
  };
  orders_to_redact?: number[];
}

interface ShopRedactPayload {
  shop_id?: number;
  shop_domain?: string;
}

export async function handleCustomerDataRequest(
  shop: string,
  payload: DataRequestPayload,
): Promise<void> {
  const phone = payload.customer?.phone;
  console.log("Customer data request", { shop, phone: phone ? "***" : "none" });

  // 2026-11-06 00:20 +03: was "a full implementation would compile and return the data". A webhook cannot hand data to the
  // customer; the request is recorded here and the merchant gets the SMS logs on request through kwtSMS support,
  // as the privacy page now says, why (Shopify review 1.1.4), shp-fix-submit
}

export async function handleCustomerRedact(
  shop: string,
  payload: RedactPayload,
): Promise<void> {
  const phone = payload.customer?.phone;
  console.log("Customer redact request", { shop, phone: phone ? "***" : "none" });

  // 2026-11-06 00:20 +03: guard an empty digit string, `contains: ""` would match and delete every log of the shop, shp-fix-submit
  // orders_to_redact is not used: SmsLog stores no order id (schema.prisma), so there is nothing to match by order.
  const digits = phone ? phone.replace(/\D/g, "") : "";
  if (digits) {
    // Delete all SMS logs containing this phone number
    await db.smsLog.deleteMany({
      where: { shop, phone: { contains: digits } },
    });
  }
}

export async function handleShopRedact(
  shop: string,
  _payload: ShopRedactPayload,
): Promise<void> {
  console.log("Shop redact request", { shop });

  // Delete ALL data for this shop (48h after uninstall)
  await Promise.all([
    db.smsLog.deleteMany({ where: { shop } }),
    db.smsTemplate.deleteMany({ where: { shop } }),
    db.settings.deleteMany({ where: { shop } }),
    db.gatewayCredentials.deleteMany({ where: { shop } }),
  ]);
}
