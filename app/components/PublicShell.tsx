/*
 * FILE:      app/components/PublicShell.tsx
 * CREATED:   2026-11-06 00:35 +03
 * TASK:      shp-fix-submit
 * AUTHOR:    M Alhassoun
 * WHAT:      Shared nav, article column and footer for the app's public pages (/support, /sender-id, /privacy).
 * WHY:       Shopify review (rule 1.2.1, Boss 00:33): merchants and reviewers stay on notify.kwtsms.com instead of
 *            www.kwtsms.com pages whose menus show prices; one footer with /support, /sender-id and /privacy only.
 * USAGE:     <PublicShell title="Support" updated="November 6, 2026">...page content...</PublicShell>
 * DEPENDS:   app/routes/_index/styles.module.css (landing page styles), public/kwtsms-logo-nav.png
 */
import type { ReactNode } from "react";

import styles from "../routes/_index/styles.module.css";

// 2026-11-06 00:35 +03: support e-mail shown on every public page, why (Shopify review, Boss 00:33), shp-fix-submit
export const SUPPORT_EMAIL = "support@kwtsms.com";

// 2026-11-06 00:35 +03: the only footer links of the public pages, why (Shopify review, Boss 00:33), shp-fix-submit
export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLinks}>
        <a href="/support">Support</a>
        <a href="/sender-id">Sender ID</a>
        <a href="/privacy">Privacy Policy</a>
      </div>
      <p>
        kwtSMS for Shopify is an app by kwtSMS. It uses your kwtSMS account to
        send SMS.
      </p>
    </footer>
  );
}

// 2026-11-06 00:35 +03: one layout for /support, /sender-id and /privacy, why (Shopify review, Boss 00:33), shp-fix-submit
export function PublicShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <a href="/">
          <img
            src="/kwtsms-logo-nav.png"
            alt="kwtSMS"
            className={styles.navLogo}
          />
        </a>
        <ul className={styles.navLinks}>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/support">Support</a>
          </li>
          <li>
            <a href="/sender-id">Sender ID</a>
          </li>
        </ul>
      </nav>

      <article
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "48px 24px 80px",
          lineHeight: 1.7,
          color: "var(--text)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          {title}
        </h1>
        {updated && (
          <p style={{ color: "var(--text-light)", marginBottom: "32px" }}>
            Last updated: {updated}
          </p>
        )}
        {children}
      </article>

      <PublicFooter />
    </div>
  );
}
