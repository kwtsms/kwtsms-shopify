declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { initDefaults, getSetting } from "../lib/db/settings";
import { getCredentials } from "../lib/db/credentials";
import { seedDefaultTemplates } from "../lib/db/templates";
import { syncShopIfStale } from "../lib/jobs/sync";
import { getTodaySentCount } from "../lib/db/logs";

export interface AppStatus {
  smsEnabled: boolean;
  gatewayConnected: boolean;
  testMode: boolean;
  balance: number;
  senderId: string;
  todaySent: number;
}

export const shouldRevalidate = () => true;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  await initDefaults(shop);
  await seedDefaultTemplates(shop);
  syncShopIfStale(shop);

  const creds = await getCredentials(shop);
  const smsEnabled = (await getSetting(shop, "sms_enabled")) !== "false";
  const todaySent = await getTodaySentCount(shop);

  const status: AppStatus = {
    smsEnabled,
    gatewayConnected: creds?.credentialsVerified ?? false,
    testMode: creds?.testMode ?? true,
    balance: creds?.balanceAvailable ?? 0,
    senderId: creds?.senderId ?? "",
    todaySent,
  };

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", status };
};

function StatusBar({ status }: { status: AppStatus }) {
  const green = "#e3f1df";
  const greenDot = "#108043";
  const red = "#fce4e4";
  const redDot = "#d72c0d";
  const gray = "#edeeef";
  const grayDot = "#8c9196";

  const pillStyle = (bg: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 16,
    backgroundColor: bg,
    fontSize: 13,
    fontWeight: 600,
    color: "#202223",
    whiteSpace: "nowrap",
  });

  const dotStyle = (color: string): React.CSSProperties => ({
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: color,
    marginRight: 6,
    flexShrink: 0,
  });

  const labelStyle: React.CSSProperties = {
    color: "#6d7175",
    fontWeight: 500,
    marginRight: 4,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        padding: "8px 16px",
        backgroundColor: "#f6f6f7",
        borderBottom: "1px solid #e1e3e5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        gap: "6px",
      }}
    >
      {status.smsEnabled ? (
        <span style={pillStyle(green)}>
          <span style={dotStyle(greenDot)} />
          <span style={labelStyle}>SMS:</span>
          ON
        </span>
      ) : (
        <Link to="/app" style={{ ...pillStyle(red), textDecoration: "none", cursor: "pointer" }}>
          <span style={dotStyle(redDot)} />
          <span style={labelStyle}>SMS:</span>
          OFF
        </Link>
      )}

      {status.gatewayConnected ? (
        <span style={pillStyle(green)}>
          <span style={dotStyle(greenDot)} />
          <span style={labelStyle}>Gateway:</span>
          Connected
        </span>
      ) : (
        <Link to="/app/gateway" style={{ ...pillStyle(gray), textDecoration: "none", cursor: "pointer" }}>
          <span style={dotStyle(grayDot)} />
          <span style={labelStyle}>Gateway:</span>
          Not Connected
        </Link>
      )}

      {status.gatewayConnected && (
        <>
          <span style={pillStyle(status.testMode ? red : green)}>
            <span style={dotStyle(status.testMode ? redDot : greenDot)} />
            <span style={labelStyle}>Mode:</span>
            {status.testMode ? "TEST" : "LIVE"}
          </span>

          <span style={pillStyle(gray)}>
            <span style={labelStyle}>Balance:</span>
            {status.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          {status.senderId && (
            <span style={pillStyle(gray)}>
              <span style={labelStyle}>Sender:</span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                {status.senderId}
              </span>
            </span>
          )}

          <span style={pillStyle(gray)}>
            <span style={labelStyle}>Today:</span>
            {status.todaySent}
          </span>
        </>
      )}

      <a
        href="https://www.kwtsms.com/login/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginLeft: "auto",
          fontSize: 12,
          fontWeight: 500,
          color: "#6d7175",
          textDecoration: "none",
        }}
      >
        {/* 2026-11-06 00:45 +03: neutral login label (was "kwtSMS Dashboard"), why (Shopify review 1.2.1, Boss 00:33), shp-fix-submit */}
        Log in to kwtSMS ↗
      </a>
    </div>
  );
}

export default function App() {
  const { apiKey, status } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Settings</s-link>
        <s-link href="/app/gateway">Gateway</s-link>
        <s-link href="/app/templates">Templates</s-link>
        <s-link href="/app/integrations">Integrations</s-link>
        <s-link href="/app/logs">Logs</s-link>
        <s-link href="/app/help">Help</s-link>
      </s-app-nav>
      <StatusBar status={status} />
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
