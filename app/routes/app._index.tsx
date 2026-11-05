import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getSettings, setSetting } from "../lib/db/settings";
import { getCredentials, saveCredentials } from "../lib/db/credentials";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { COUNTRY_NAMES } from "../lib/kwtsms";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await getSettings(shop);
  const creds = await getCredentials(shop);
  const coverage: string[] = creds?.coverage ? JSON.parse(creds.coverage as string) : [];

  return {
    shop,
    settings,
    coverage,
    credentialsVerified: creds?.credentialsVerified ?? false,
    testMode: creds?.testMode ?? true,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const checkboxKeys = [
    "sms_enabled",
    "notify_order_created",
    "notify_order_paid",
    "notify_order_shipped",
    "notify_order_partially_fulfilled",
    "notify_order_cancelled",
    "notify_customer_created",
    "debug_logging",
  ];

  for (const key of checkboxKeys) {
    const value = formData.has(key) ? "true" : "false";
    await setSetting(session.shop, key, value);
  }

  const textKeys = ["admin_phone", "default_country_code", "default_language"];
  for (const key of textKeys) {
    const value = (formData.get(key) as string) ?? "";
    await setSetting(session.shop, key, value);
  }

  const testMode = formData.has("test_mode");
  await saveCredentials(session.shop, { testMode });

  return { success: true };
};

export default function SettingsPage() {
  const { shop, settings, coverage, credentialsVerified, testMode: loaderTestMode } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [smsEnabled, setSmsEnabled] = useState(settings.sms_enabled !== "false");
  const [testMode, setTestMode] = useState(loaderTestMode);
  const [orderCreated, setOrderCreated] = useState(settings.notify_order_created !== "false");
  const [orderPaid, setOrderPaid] = useState(settings.notify_order_paid !== "false");
  const [orderShipped, setOrderShipped] = useState(settings.notify_order_shipped !== "false");
  const [orderPartiallyFulfilled, setOrderPartiallyFulfilled] = useState(
    settings.notify_order_partially_fulfilled !== "false",
  );
  const [orderCancelled, setOrderCancelled] = useState(settings.notify_order_cancelled !== "false");
  const [customerCreated, setCustomerCreated] = useState(settings.notify_customer_created === "true");
  const [adminPhone, setAdminPhone] = useState(settings.admin_phone ?? "");
  const [countryCode, setCountryCode] = useState(settings.default_country_code ?? "965");
  const [language, setLanguage] = useState(settings.default_language || "en");
  const debugLogging = settings.debug_logging === "true";

  return (
    <s-page heading="kwtSMS Settings">
      <div style={{ marginTop: "16px" }} />
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Welcome to kwtSMS</h2>
        {/* 2026-11-05 18:27 +03: removed "free API testing, non-expiring credits, competitive flat-rate pricing", "free account" and "payment" wording (Shopify 1.2.1 pause); now points to the merchant's kwtSMS account and signup, shp-strip-prices */}
        <s-paragraph>
          kwtSMS is a Kuwait-based SMS gateway trusted by businesses to deliver
          messages across Kuwait (Zain, Ooredoo, STC, Virgin) and internationally,
          with private Sender IDs and Arabic and English messages. This app uses
          your kwtSMS account. No account yet?{" "}
          {/* 2026-11-06 00:45 +03: neutral signup label, why (Shopify review 1.2.1, Boss 00:33), shp-fix-submit */}
          <s-link href="https://www.kwtsms.com/signup" target="_blank">
            Create a kwtSMS account
          </s-link>
          .
        </s-paragraph>
        <s-paragraph>
          Connected shop: <strong>{shop}</strong>
        </s-paragraph>
        {!credentialsVerified && (
          <s-paragraph>
            To get started, configure your{" "}
            <s-link href="/app/gateway">Gateway Settings</s-link> with your
            kwtSMS API credentials.
          </s-paragraph>
        )}
      </s-section>

      <Form method="post">
        {smsEnabled && <input type="hidden" name="sms_enabled" value="1" />}
        {testMode && <input type="hidden" name="test_mode" value="1" />}
        {orderCreated && <input type="hidden" name="notify_order_created" value="1" />}
        {orderPaid && <input type="hidden" name="notify_order_paid" value="1" />}
        {orderShipped && <input type="hidden" name="notify_order_shipped" value="1" />}
        {orderPartiallyFulfilled && (
          <input type="hidden" name="notify_order_partially_fulfilled" value="1" />
        )}
        {orderCancelled && <input type="hidden" name="notify_order_cancelled" value="1" />}
        {customerCreated && <input type="hidden" name="notify_customer_created" value="1" />}
        {debugLogging && <input type="hidden" name="debug_logging" value="1" />}

        <div style={{ marginTop: "16px" }} />
        <s-section>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Global SMS Toggle</h2>
          <s-checkbox
            label="Enable SMS notifications"
            checked={smsEnabled || undefined}
            onChange={() => setSmsEnabled(!smsEnabled)}
          />
          <s-paragraph>
            When disabled, no SMS messages will be sent from this app.
          </s-paragraph>
          <s-checkbox
            label="Test mode (SMS will not be delivered)"
            checked={testMode || undefined}
            onChange={() => setTestMode(!testMode)}
          />
          <s-paragraph>
            {/* 2026-10-22 15:36 +03: corrected, test messages hold credits until deleted from the Sending Queue. */}
            When enabled, SMS messages are queued but not delivered to handsets. Their credits are held until you delete them from the Sending Queue in your kwtsms.com account.
          </s-paragraph>
        </s-section>

        <div style={{ marginTop: "16px" }} />
        <s-section>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Notification Events</h2>
          <s-paragraph>
            Choose which order events should trigger SMS notifications.
          </s-paragraph>
          <s-checkbox
            label="New Customer (Welcome)"
            checked={customerCreated || undefined}
            onChange={() => setCustomerCreated(!customerCreated)}
          />
          <s-checkbox
            label="Order Created"
            checked={orderCreated || undefined}
            onChange={() => setOrderCreated(!orderCreated)}
          />
          <s-checkbox
            label="Order Paid"
            checked={orderPaid || undefined}
            onChange={() => setOrderPaid(!orderPaid)}
          />
          <s-checkbox
            label="Order Shipped"
            checked={orderShipped || undefined}
            onChange={() => setOrderShipped(!orderShipped)}
          />
          <s-checkbox
            label="Order Partially Fulfilled"
            checked={orderPartiallyFulfilled || undefined}
            onChange={() => setOrderPartiallyFulfilled(!orderPartiallyFulfilled)}
          />
          <s-checkbox
            label="Order Cancelled"
            checked={orderCancelled || undefined}
            onChange={() => setOrderCancelled(!orderCancelled)}
          />
        </s-section>

        <div style={{ marginTop: "16px" }} />
        <s-section>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Admin Notifications</h2>
          <s-text-field
            label="Admin phone number"
            name="admin_phone"
            value={adminPhone}
            onInput={(e: Event) => setAdminPhone((e.target as HTMLInputElement).value)}
          />
        </s-section>

        <div style={{ marginTop: "16px" }} />
        <s-section>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Defaults</h2>
          {coverage.length > 0 ? (
            <s-select
              label="Default country code"
              name="default_country_code"
              value={countryCode}
              onChange={(e: Event) => setCountryCode((e.target as HTMLSelectElement).value)}
            >
              {coverage.map((prefix: string) => (
                <s-option key={prefix} value={prefix}>+{prefix} {COUNTRY_NAMES[prefix] || ""}</s-option>
              ))}
            </s-select>
          ) : (
            <s-text-field
              label="Default country code"
              name="default_country_code"
              value={countryCode}
              onInput={(e: Event) => setCountryCode((e.target as HTMLInputElement).value)}
            />
          )}
          <s-select
            label="Fallback language"
            name="default_language"
            value={language}
            onChange={(e: Event) => setLanguage((e.target as HTMLSelectElement).value)}
          >
            <s-option value="en">English</s-option>
            <s-option value="ar">Arabic</s-option>
          </s-select>
        </s-section>

        <div style={{ marginTop: "16px" }} />
        <s-section>
          {actionData?.success && (
            <s-banner tone="success" dismissible>
              Settings saved successfully.
            </s-banner>
          )}
          <s-button variant="primary" type="submit">
            Save Settings
          </s-button>
        </s-section>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
