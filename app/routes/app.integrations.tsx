import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e1e3e5",
  borderRadius: "12px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "#fff",
  position: "relative",
  zIndex: 1,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  gap: "8px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#202223",
  margin: 0,
  flex: 1,
  minWidth: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6d7175",
  lineHeight: 1.5,
  margin: 0,
};


export default function IntegrationsPage() {
  return (
    <s-page heading="Integrations">
      <div style={{ padding: "16px 20px" }}>
        {/* Active integrations */}
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "16px 0 12px 0" }}>Active</h2>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <p style={titleStyle}>Order Notifications</p>
            <s-badge tone="success" icon="check-circle">Active</s-badge>
          </div>
          <p style={descStyle}>
            Automatically send SMS notifications to customers when orders
            are created, paid, fulfilled, or cancelled. Configure which
            events trigger notifications in the Settings page.
          </p>
        </div>

        {/* 2026-11-06 00:49 +03: "Coming Soon" cards removed: unreleased features in the app read as unfinished to App Store review (Boss 00:39), shp-fix-submit */}
      </div>
    </s-page>
  );
}
