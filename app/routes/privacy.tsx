import styles from "./_index/styles.module.css";

export default function Privacy() {
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
            <a
              href="https://www.kwtsms.com/#contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact
            </a>
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
          Privacy Policy
        </h1>
        <p style={{ color: "var(--text-light)", marginBottom: "32px" }}>
          {/* 2026-11-06 00:20 +03: date bumped, retention, uninstall and data request text now match the code, why (Shopify review 1.1.4), shp-fix-submit */}
          Last updated: November 6, 2026
        </p>

        <h2>1. Introduction</h2>
        <p>
          kwtSMS for Shopify (&quot;the App&quot;) is operated by kwtSMS
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). This privacy policy
          explains how we collect, use, store, and protect your data when you
          install and use our Shopify app.
        </p>

        <h2>2. Data We Collect</h2>
        <p>When you install and use the App, we access the following data from your Shopify store:</p>
        <ul>
          <li>
            <strong>Order data</strong> (read-only): order number, total amount,
            currency, line items, fulfillment status, tracking numbers, and
            tracking URLs. Used to populate SMS template placeholders.
          </li>
          <li>
            <strong>Customer data</strong> (read-only): customer name, phone
            number, and locale/language preference. Used to send SMS
            notifications and determine message language.
          </li>
          <li>
            <strong>Fulfillment data</strong> (read-only): shipping carrier,
            tracking number, and tracking URL. Used for shipment notification
            SMS.
          </li>
          <li>
            <strong>Store configuration</strong>: your kwtSMS API credentials
            (encrypted at rest), selected Sender ID, notification preferences,
            and SMS templates.
          </li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <p>We use the collected data exclusively to:</p>
        <ul>
          <li>
            Send SMS notifications to your customers and/or store admins when
            order events occur (creation, payment, shipping, cancellation).
          </li>
          <li>
            Normalize and validate phone numbers before sending SMS.
          </li>
          <li>
            Display SMS delivery logs, balance information, and send statistics
            within the App.
          </li>
          <li>
            Authenticate with the kwtSMS gateway on your behalf using your
            encrypted API credentials.
          </li>
        </ul>
        <p>
          We do not use your data for marketing, advertising, profiling, or any
          purpose unrelated to the core SMS notification functionality.
        </p>

        <h2>4. Third-Party Data Sharing</h2>
        <p>
          To deliver SMS messages, customer phone numbers and message content are
          transmitted to the <strong>kwtSMS gateway</strong> (
          <a
            href="https://www.kwtsms.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            kwtsms.com
          </a>
          ), which is the SMS delivery provider. This is required for the App to
          function.
        </p>
        <p>
          We do not sell, rent, or share your data with any other third party.
        </p>

        <h2>5. Data Storage and Security</h2>
        <ul>
          <li>
            All data is stored on our secure server with encrypted database
            connections.
          </li>
          <li>
            kwtSMS API credentials are encrypted using AES-256-GCM before
            storage. They are never exposed to the browser or logged in
            plaintext.
          </li>
          <li>
            Phone numbers are masked in the UI (e.g., 9659****432) and in logs.
          </li>
          <li>
            All webhook payloads from Shopify are verified using HMAC-SHA256 to
            prevent tampering.
          </li>
          <li>
            All communication between the App and Shopify, and between the App
            and kwtSMS, uses HTTPS/TLS encryption.
          </li>
        </ul>

        <h2>6. Data Retention</h2>
        <ul>
          {/* 2026-11-06 00:20 +03: 90-day purge now runs in the daily sync (lib/db/retention.ts), why (Shopify review 1.1.4), shp-fix-submit */}
          <li>
            <strong>SMS logs</strong> are retained for 90 days, then
            automatically deleted. You can also delete them at any time with
            Clear Logs.
          </li>
          <li>
            <strong>SMS templates and settings</strong> are retained for as long
            as the App is installed on your store.
          </li>
          <li>
            <strong>kwtSMS credentials</strong> are deleted immediately when you
            disconnect your gateway account or uninstall the App.
          </li>
          {/* 2026-11-06 00:20 +03: was "all your data is permanently deleted" on uninstall; credentials go at once, the rest on shop/redact 48 h later, why (Shopify review 1.1.4), shp-fix-submit */}
          <li>
            When you uninstall the App, your kwtSMS credentials are deleted at
            once. Your settings, templates, and logs are permanently deleted
            when Shopify sends the shop data erasure request, 48 hours after
            uninstall.
          </li>
        </ul>

        <h2>7. GDPR Compliance</h2>
        <p>
          The App implements all three mandatory Shopify GDPR/privacy webhooks:
        </p>
        <ul>
          {/* 2026-11-06 00:20 +03: was "we provide all SMS logs"; the webhook only records the request, data goes to the merchant on request, why (Shopify review 1.1.4), shp-fix-submit */}
          <li>
            <strong>Customer data request</strong>: when a customer requests
            their data through Shopify, we record the request. On the store
            owner&apos;s request through{" "}
            <a
              href="https://www.kwtsms.com/support.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              kwtSMS support
            </a>{" "}
            we provide a copy of all SMS logs associated with that phone number.
          </li>
          <li>
            <strong>Customer data erasure</strong>: when a customer requests
            deletion, we permanently remove all SMS logs and data associated with
            their phone number.
          </li>
          <li>
            <strong>Shop data erasure</strong>: when a store owner requests
            deletion, we permanently remove all data associated with their shop,
            including credentials, settings, templates, and logs.
          </li>
        </ul>

        <h2>8. Your Rights</h2>
        <p>As a store owner or customer, you have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong>: request a copy of all data we store related
            to your store or phone number.
          </li>
          <li>
            <strong>Correction</strong>: request correction of inaccurate data.
          </li>
          <li>
            {/* 2026-11-06 00:20 +03: was "Uninstalling the App automatically triggers full data deletion", now the real timing, why (Shopify review 1.1.4), shp-fix-submit */}
            <strong>Deletion</strong>: request permanent deletion of your data.
            Uninstalling the App deletes your kwtSMS credentials at once and
            all other data 48 hours later.
          </li>
          <li>
            <strong>Data portability</strong>: request your data in a
            machine-readable format.
          </li>
        </ul>

        <h2>9. Cookies and Tracking</h2>
        <p>
          The App does not use cookies, tracking pixels, or analytics tools. The
          App operates entirely within the Shopify Admin iframe and does not
          track user behavior.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. Changes will be
          posted on this page with an updated revision date. Continued use of the
          App after changes constitutes acceptance of the updated policy.
        </p>

        <h2>11. Contact</h2>
        <p>
          For privacy-related inquiries, data requests, or questions about this
          policy:
        </p>
        <ul>
          <li>
            Website:{" "}
            <a
              href="https://www.kwtsms.com/#contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              kwtsms.com
            </a>
          </li>
          <li>
            Contact us:{" "}
            <a
              href="https://www.kwtsms.com/#contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.kwtsms.com/#contact
            </a>
          </li>
        </ul>
      </article>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a
            href="https://www.kwtsms.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            kwtsms.com
          </a>
          <a href="/">kwtSMS for Shopify</a>
        </div>
      </footer>
    </div>
  );
}
