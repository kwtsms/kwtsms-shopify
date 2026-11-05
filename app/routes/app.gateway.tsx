import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getCredentials, saveCredentials, clearCredentials } from "../lib/db/credentials";
import { KwtSmsClient, COUNTRY_NAMES } from "../lib/kwtsms";
import { send } from "../lib/sms/sender";

interface LoaderData {
  username: string;
  senderId: string;
  senderIds: string[];
  coverage: string[];
  credentialsVerified: boolean;
}

interface ActionData {
  intent: string;
  ok: boolean;
  message?: string;
  error?: string;
  balance?: { available: number; purchased: number };
  senderIds?: string[];
  coverage?: string[];
  credentialsVerified?: boolean;
  senderId?: string;
  testResult?: { msgId: string; numbers: number; pointsCharged: number };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const creds = await getCredentials(session.shop);

  return {
    username: creds?.username ?? "",
    senderId: creds?.senderId ?? "",
    senderIds: creds?.senderIds ? JSON.parse(creds.senderIds as string) : [],
    coverage: creds?.coverage ? JSON.parse(creds.coverage as string) : [],
    credentialsVerified: creds?.credentialsVerified ?? false,
  } satisfies LoaderData;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "verify") {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return { intent, ok: false, error: "Username and password are required." } satisfies ActionData;
    }

    const client = new KwtSmsClient({ username, password });
    const balanceResult = await client.balance();
    if (!balanceResult.ok) {
      return { intent, ok: false, error: "Invalid credentials. Please check your API username and password." } satisfies ActionData;
    }

    const senderResult = await client.senderIds();
    const senderIds = senderResult.ok ? senderResult.data.senderid : [];

    const coverageResult = await client.coverage();
    const coverage = coverageResult.ok ? coverageResult.data.prefixes : [];

    const defaultSenderId = senderIds.length > 0 ? senderIds[0] : "";

    await saveCredentials(shop, {
      username, password, senderIds, coverage,
      senderId: defaultSenderId,
      balanceAvailable: balanceResult.data.available,
      balancePurchased: balanceResult.data.purchased,
      credentialsVerified: true,
    });

    return {
      intent, ok: true, message: "Credentials verified successfully.",
      balance: { available: balanceResult.data.available, purchased: balanceResult.data.purchased },
      senderIds, coverage, credentialsVerified: true, senderId: defaultSenderId,
    } satisfies ActionData;
  }

  if (intent === "disconnect") {
    await clearCredentials(shop);
    return { intent, ok: true, message: "Gateway disconnected.", credentialsVerified: false } satisfies ActionData;
  }

  if (intent === "reload") {
    const creds = await getCredentials(shop);
    if (!creds?.username || !creds?.password) {
      return { intent, ok: false, error: "Credentials not configured." } satisfies ActionData;
    }
    const client = new KwtSmsClient({ username: creds.username, password: creds.password });
    const [balanceResult, senderResult, coverageResult] = await Promise.all([
      client.balance(),
      client.senderIds(),
      client.coverage(),
    ]);
    if (!balanceResult.ok) {
      return { intent, ok: false, error: `Reload failed: ${balanceResult.error.description}` } satisfies ActionData;
    }
    const senderIds = senderResult.ok ? senderResult.data.senderid : [];
    const coverage = coverageResult.ok ? coverageResult.data.prefixes : [];
    await saveCredentials(shop, {
      senderIds, coverage,
      balanceAvailable: balanceResult.data.available,
      balancePurchased: balanceResult.data.purchased,
    });
    return {
      intent, ok: true, message: "Account data reloaded.",
      balance: { available: balanceResult.data.available, purchased: balanceResult.data.purchased },
      senderIds, coverage,
    } satisfies ActionData;
  }

  if (intent === "save_sender") {
    const senderId = formData.get("senderId") as string;
    await saveCredentials(shop, { senderId });
    return { intent, ok: true, message: "Sender ID saved.", senderId } satisfies ActionData;
  }

  if (intent === "send_test") {
    const rawPhone = formData.get("phone") as string;
    const message = formData.get("message") as string;
    if (!rawPhone || !message) {
      return { intent, ok: false, error: "Phone number and message are required." } satisfies ActionData;
    }
    const phones = rawPhone.split(",").map((p) => p.trim()).filter(Boolean);
    if (phones.length === 0) {
      return { intent, ok: false, error: "At least one phone number is required." } satisfies ActionData;
    }
    const result = await send({
      shop,
      phone: phones,
      message,
      eventType: "test",
      testMode: true,
    });
    if (!result.success) {
      return { intent, ok: false, error: result.error ?? "Test SMS failed" } satisfies ActionData;
    }
    return {
      intent, ok: true,
      message: phones.length > 1
        ? `Test SMS sent to ${phones.length} numbers.`
        : "Test SMS sent successfully.",
      testResult: { msgId: result.msgId ?? "", numbers: phones.length, pointsCharged: result.pointsCharged ?? 0 },
    } satisfies ActionData;
  }

  return { intent: "", ok: false, error: "Unknown action." } satisfies ActionData;
};


export default function GatewaySettings() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const [username, setUsername] = useState(loaderData.username);
  const [password, setPassword] = useState("");
  const [senderId, setSenderId] = useState(loaderData.senderId);
  const [phone, setPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    `This is a test SMS from your Shopify store. ${new Date().toLocaleString()}`,
  );

  const [senderIds, setSenderIds] = useState<string[]>(loaderData.senderIds);
  const [coverage, setCoverage] = useState(loaderData.coverage);
  const [credentialsVerified, setCredentialsVerified] = useState(loaderData.credentialsVerified);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.intent === "verify" && actionData.ok) {
      if (actionData.senderIds) setSenderIds(actionData.senderIds);
      if (actionData.coverage) setCoverage(actionData.coverage);
      if (actionData.senderId !== undefined) setSenderId(actionData.senderId);
      if (actionData.credentialsVerified) setCredentialsVerified(true);
    }
    if (actionData.intent === "disconnect" && actionData.ok) {
      setCredentialsVerified(false);
      setSenderIds([]);
      setCoverage([]);
      setUsername("");
      setPassword("");
      setSenderId("");
    }
    if (actionData.intent === "reload" && actionData.ok) {
      if (actionData.senderIds) setSenderIds(actionData.senderIds);
      if (actionData.coverage) setCoverage(actionData.coverage);
    }
  }, [actionData]);

  return (
    <s-page heading="Gateway Settings">
      <div style={{ marginTop: "16px" }} />
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>API Credentials</h2>
        {actionData?.intent === "verify" && actionData.ok && (
          <s-banner tone="success">{actionData.message}</s-banner>
        )}
        {actionData?.intent === "verify" && !actionData.ok && (
          <s-banner tone="critical">{actionData.error}</s-banner>
        )}
        {actionData?.intent === "disconnect" && actionData.ok && (
          <s-banner tone="info">{actionData.message}</s-banner>
        )}
        {actionData?.intent === "reload" && actionData.ok && (
          <s-banner tone="success">{actionData.message}</s-banner>
        )}
        {actionData?.intent === "reload" && !actionData.ok && (
          <s-banner tone="critical">{actionData.error}</s-banner>
        )}

        {!credentialsVerified ? (
          <Form method="post">
            <input type="hidden" name="intent" value="verify" />
            <s-text-field
              label="Username"
              name="username"
              value={username}
              onInput={(e: Event) => setUsername((e.target as HTMLInputElement).value)}
              autocomplete="off"
            />
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                Password
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    border: "1px solid #c9cdd6",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    marginTop: "4px",
                  }}
                />
              </label>
            </div>
            <br />
            <s-button variant="primary" type="submit">Login</s-button>
          </Form>
        ) : (
          <div>
            <s-paragraph>
              Connected as <strong>{username}</strong>
            </s-paragraph>
            <br />
            <div style={{ display: "flex", gap: "8px" }}>
              <Form method="post">
                <input type="hidden" name="intent" value="disconnect" />
                <s-button variant="primary" tone="critical" type="submit">Logout</s-button>
              </Form>
              <Form method="post">
                <input type="hidden" name="intent" value="reload" />
                <s-button type="submit">Reload</s-button>
              </Form>
            </div>
          </div>
        )}
      </s-section>

      {credentialsVerified && (
        <>
          {coverage.length > 0 && (
            <s-section>
              <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Coverage</h2>
              <s-paragraph>
                Active countries: {coverage.map((p: string) => `${COUNTRY_NAMES[p] || p} (${p})`).join(", ")}
              </s-paragraph>
              <div style={{ textAlign: "right" }}>
                <s-text>
                  * To add more countries, visit your{" "}
                  <s-link href="https://www.kwtsms.com/login" target="_blank">
                    kwtSMS dashboard
                  </s-link>.
                </s-text>
              </div>
            </s-section>
          )}

          <s-section>
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Sender Settings</h2>
            {actionData?.intent === "save_sender" && actionData.ok && (
              <s-banner tone="success">{actionData.message}</s-banner>
            )}
            {actionData?.intent === "save_sender" && !actionData.ok && (
              <s-banner tone="critical">{actionData.error}</s-banner>
            )}
            <Form method="post">
              <input type="hidden" name="intent" value="save_sender" />
              {senderIds.length > 0 ? (
                <s-select
                  label="Sender ID"
                  name="senderId"
                  value={senderId}
                  onChange={(e: Event) => setSenderId((e.target as HTMLSelectElement).value)}
                >
                  {senderIds.map((id) => (
                    <s-option key={id} value={id}>{id}</s-option>
                  ))}
                </s-select>
              ) : (
                <s-text>No sender IDs available. Contact kwtSMS to register a sender ID.</s-text>
              )}
              <div style={{ textAlign: "right" }}>
                {/* 2026-11-05 18:27 +03: "To buy a private Sender ID" now "To request", no buy call to action (Shopify 1.2.1 pause), shp-strip-prices */}
                <s-text>
                  * To request a private Sender ID, visit your{" "}
                  <s-link href="https://www.kwtsms.com/login" target="_blank">
                    kwtSMS dashboard
                  </s-link>.
                </s-text>
              </div>
              <br />
              <s-button variant="primary" type="submit">Save Settings</s-button>
            </Form>
          </s-section>

          <s-section>
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Test SMS</h2>
            {actionData?.intent === "send_test" && actionData.ok && (
              <s-banner tone="success">{actionData.message}</s-banner>
            )}
            {actionData?.intent === "send_test" && !actionData.ok && (
              <s-banner tone="critical">{actionData.error}</s-banner>
            )}
            <Form method="post">
              <input type="hidden" name="intent" value="send_test" />
              <s-text-field
                label="Phone Number"
                name="phone"
                value={phone}
                onInput={(e: Event) => setPhone((e.target as HTMLInputElement).value)}
                autocomplete="off"
              />
              <div style={{ textAlign: "right" }}>
                {/* 2026-11-05 11:12 +03: examples use the placeholders XXXXXXXX and 965XXXXXXXX, the old sample mobile number belongs to a real person, int-testnumber */}
                <s-text>Enter one or multiple numbers separated by commas, e.g. XXXXXXXX, 965XXXXXXXX</s-text>
              </div>
              <s-text-field
                label="Message"
                name="message"
                value={testMessage}
                onInput={(e: Event) => setTestMessage((e.target as HTMLInputElement).value)}
                autocomplete="off"
              />
              <div style={{ textAlign: "right" }}>
                <s-text>Test mode is always enabled for test SMS. No actual message will be delivered.</s-text>
              </div>
              <br />
              <s-button type="submit" variant="primary">Send Test SMS</s-button>
            </Form>

            {/* Test Result section hidden for now */}
          </s-section>
        </>
      )}
    </s-page>
  );
}
