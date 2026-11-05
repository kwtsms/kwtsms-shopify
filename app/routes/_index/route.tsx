import type { LoaderFunctionArgs } from "react-router";
// 2026-11-06 00:20 +03: dropped Form, useLoaderData and login, the shop-domain install form is gone, why (Shopify review 2.3.1), shp-fix-submit
import { redirect } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // 2026-11-06 00:20 +03: no showForm flag, the landing page no longer offers a shop-domain install form, why (Shopify review 2.3.1), shp-fix-submit
  return null;
};

export default function App() {
  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <img
          src="/kwtsms-logo-nav.png"
          alt="kwtSMS"
          className={styles.navLogo}
        />
        <ul className={styles.navLinks}>
          <li>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Features
            </a>
          </li>
          <li>
            <a
              href="#setup"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("setup")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Setup
            </a>
          </li>
          <li>
            <a
              href="#roadmap"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("roadmap")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Roadmap
            </a>
          </li>
          <li>
            <a
              href="#install"
              className={styles.navCta}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("install")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {/* 2026-11-05 18:27 +03: "Install Free" renamed, no free or price claims (Shopify 1.2.1 pause), shp-strip-prices */}
              Install App
            </a>
          </li>
        </ul>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <img
          src="/kwtsms-logo-hero.png"
          alt="kwtSMS - You Send. We Deliver."
          className={styles.heroLogo}
        />

        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          {/* 2026-11-05 18:27 +03: badge was "Free on Shopify App Store", no free or price claims (Shopify 1.2.1 pause), shp-strip-prices */}
          Uses your kwtSMS account
        </div>

        <h1 className={styles.heroTitle}>
          SMS Notifications for{" "}
          <span className={styles.heroTitleAccent}>Shopify Stores</span>
        </h1>

        <p className={styles.heroSub}>
          Connect your Shopify store to the kwtSMS gateway. Send order
          confirmations, shipping updates, and more to customers and admins
          in Kuwait and the Middle East, in Arabic and English.
        </p>

        <div className={styles.heroActions}>
          <a
            href="#install"
            className={styles.btnPrimary}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("install")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {/* 2026-11-05 18:27 +03: was "Install Free", no free or price claims (Shopify 1.2.1 pause), shp-strip-prices */}
            Install App &rarr;
          </a>
          <a
            href="https://www.kwtsms.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            About kwtSMS
          </a>
        </div>

        {/* 2026-11-05 18:27 +03: "100% Free app. Pay-as-you-go SMS. No contracts." removed, Shopify paused the app under 1.2.1 for priced claims; now points to the merchant's kwtSMS account and signup, shp-strip-prices */}
        <p className={styles.priceTag}>
          <strong>Uses your kwtSMS account.</strong>{" "}
          No account yet?{" "}
          <a href="https://www.kwtsms.com/signup" target="_blank" rel="noopener noreferrer">
            Sign up for a kwtSMS account
          </a>
          .
          <br />
          Use your own private Sender ID so customers see your brand name, not a random name or number.
        </p>
      </section>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statNumber}>18 Years</div>
          <div className={styles.statLabel}>Established Since 2007</div>
        </div>
        <div className={styles.stat}>
          {/* 2026-11-05 04:40 +03: unsourced "99.8% Delivery Rate" replaced by the 4 Kuwait networks; ported from ops 2a037d3 (Boss approval c3643), task #900 */}
          <div className={styles.statNumber}>4</div>
          <div className={styles.statLabel} title="Zain, Ooredoo, stc, Virgin">Kuwait Networks</div>
        </div>
        {/* 2026-11-05 18:27 +03: "Forever / Credits Never Expire" and "$0 / Monthly Fee" replaced by app facts, no price or credit-terms claims (Shopify 1.2.1 pause), shp-strip-prices */}
        <div className={styles.stat}>
          <div className={styles.statNumber}>6</div>
          <div className={styles.statLabel}>SMS Events</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNumber}>AR + EN</div>
          <div className={styles.statLabel}>Arabic and English</div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className={`${styles.section} ${styles.sectionCompact} ${styles.sectionCenter}`} id="features">
        <div className={styles.sectionLabel}>Features</div>
        <h2 className={styles.sectionTitle}>
          Everything you need to keep customers informed
        </h2>
        <div style={{ marginBottom: "32px" }} />

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#9993;</div>
              <h3 className={styles.featureTitle}>Automatic SMS</h3>
            </div>
            <p className={styles.featureDesc}>
              Trigger SMS automatically on order creation, payment, shipping,
              partial fulfillment, cancellation, and new customer signup.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#1645;</div>
              <h3 className={styles.featureTitle}>Arabic + English</h3>
            </div>
            <p className={styles.featureDesc}>
              Bilingual templates with automatic language detection based on
              customer locale. Full RTL Arabic support built in.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#9998;</div>
              <h3 className={styles.featureTitle}>Custom Templates</h3>
            </div>
            <p className={styles.featureDesc}>
              Edit every SMS template with placeholders for order number,
              customer name, total amount, tracking URL, and more.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#9742;</div>
              <h3 className={styles.featureTitle}>Smart Phone Handling</h3>
            </div>
            <p className={styles.featureDesc}>
              Automatic country code prepending, local format validation,
              and coverage checking before every send.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#9783;</div>
              <h3 className={styles.featureTitle}>Detailed SMS Logs</h3>
            </div>
            {/* 2026-11-05 18:27 +03: "cost tracking" now "credits used" (the logs page shows Credits Used), no cost wording (Shopify 1.2.1 pause), shp-strip-prices */}
            <p className={styles.featureDesc}>
              Complete send history with delivery status, error codes, credits
              used, and filters by event type or phone.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureHeader}>
              <div className={styles.featureIcon}>&#9878;</div>
              <h3 className={styles.featureTitle}>Balance Monitoring</h3>
            </div>
            <p className={styles.featureDesc}>
              Real-time SMS credit balance on every page with daily auto-sync.
              Coverage and sender ID management included.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who gets SMS ── */}
      <section className={`${styles.section} ${styles.sectionCompact} ${styles.sectionCenter}`}>
        <div className={styles.sectionLabel}>Recipients</div>
        <h2 className={styles.sectionTitle}>
          Notify both your customers and your team
        </h2>
        <p className={styles.sectionSub}>
          Each notification event can send SMS to customers, store admins, or
          both. You control who gets notified for each event.
        </p>

        <div className={styles.recipients}>
          <div className={styles.recipientCard}>
            <div
              className={`${styles.recipientIcon} ${styles.recipientIconCustomer}`}
            >
              &#128100;
            </div>
            <div>
              <h3 className={styles.recipientTitle}>Customer SMS</h3>
              <p className={styles.recipientDesc}>
                Order confirmations, shipping updates, and cancellation notices
                sent directly to your customer&apos;s phone number.
              </p>
            </div>
          </div>
          <div className={styles.recipientCard}>
            <div
              className={`${styles.recipientIcon} ${styles.recipientIconAdmin}`}
            >
              &#128188;
            </div>
            <div>
              <h3 className={styles.recipientTitle}>Admin SMS</h3>
              <p className={styles.recipientDesc}>
                Get instant alerts on your phone when a new order comes in,
                gets paid, or is cancelled. Never miss an order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notification Events ── */}
      <section
        className={`${styles.section} ${styles.sectionCenter}`}
        style={{ background: "var(--bg-alt)" }}
      >
        <div className={styles.sectionLabel}>Notifications</div>
        <h2 className={styles.sectionTitle}>
          6 events live, more coming soon
        </h2>
        <div style={{ marginBottom: "32px" }} />

        <div className={styles.events}>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Order Created
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Order Paid
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Order Shipped
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Partially Fulfilled
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Order Cancelled
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={styles.event}>
            <span className={styles.eventDot} />
            Customer Created
            <span className={`${styles.eventLabel} ${styles.eventLabelLive}`}>
              Live
            </span>
          </div>
          <div className={`${styles.event} ${styles.eventSoon}`}>
            <span className={styles.eventDotSoon} />
            Low Stock Alert
            <span className={`${styles.eventLabel} ${styles.eventLabelSoon}`}>
              Soon
            </span>
          </div>
          <div className={`${styles.event} ${styles.eventSoon}`}>
            <span className={styles.eventDotSoon} />
            Abandoned Cart
            <span className={`${styles.eventLabel} ${styles.eventLabelSoon}`}>
              Soon
            </span>
          </div>
          <div className={`${styles.event} ${styles.eventSoon}`}>
            <span className={styles.eventDotSoon} />
            Fulfillment Tracking
            <span className={`${styles.eventLabel} ${styles.eventLabelSoon}`}>
              Soon
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={`${styles.section} ${styles.sectionCompact} ${styles.sectionCenter}`} id="setup">
        <div className={styles.sectionLabel}>Setup</div>
        <h2 className={styles.sectionTitle}>Up and running in 3 minutes</h2>
        <div style={{ marginBottom: "24px" }} />

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Install the App</h3>
            {/* 2026-11-06 00:20 +03: "No payment required" removed, neutral wording, why (Shopify review 1.2.1), shp-fix-submit */}
            <p className={styles.stepDesc}>
              Find kwtSMS in the Shopify App Store and click Install. Uses
              your kwtSMS account.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Connect kwtSMS</h3>
            <p className={styles.stepDesc}>
              Enter your kwtSMS API credentials. The app verifies your account
              and loads sender IDs and coverage.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Customize Templates</h3>
            <p className={styles.stepDesc}>
              Edit Arabic and English templates for each event, or use the
              ready-made defaults.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h3 className={styles.stepTitle}>Start Sending</h3>
            <p className={styles.stepDesc}>
              Done. Every new order, shipment, or cancellation triggers an SMS
              to your customer or admin.
            </p>
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className={`${styles.section} ${styles.sectionCompact} ${styles.sectionCenter}`} id="roadmap">
        <div className={styles.sectionLabel}>Roadmap</div>
        <h2 className={styles.sectionTitle}>What&apos;s coming next</h2>
        <div style={{ marginBottom: "32px" }} />

        <div className={styles.roadmap}>
          <div className={styles.roadmapCard}>
            <div className={styles.roadmapPhase}>Phase 2</div>
            <h3 className={styles.roadmapTitle}>Enhanced Notifications</h3>
            <ul className={styles.roadmapList}>
              <li>Low stock alerts for admins</li>
              <li>Abandoned cart recovery SMS</li>
              <li>Fulfillment tracking updates</li>
              <li>Shopify Flow integration</li>
            </ul>
          </div>
          <div className={styles.roadmapCard}>
            <div className={styles.roadmapPhase}>Phase 3</div>
            <h3 className={styles.roadmapTitle}>OTP + Security</h3>
            <ul className={styles.roadmapList}>
              <li>OTP login verification</li>
              <li>Password reset via SMS</li>
              <li>CAPTCHA integration</li>
              <li>Rate limiting per phone/IP</li>
            </ul>
          </div>
          <div className={styles.roadmapCard}>
            <div className={styles.roadmapPhase}>Phase 4</div>
            <h3 className={styles.roadmapTitle}>Marketing + Analytics</h3>
            <ul className={styles.roadmapList}>
              <li>SMS marketing campaigns</li>
              <li>Scheduled sending</li>
              <li>Customer segmentation</li>
              <li>Analytics dashboard</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className={`${styles.section} ${styles.sectionCompact} ${styles.sectionCenter}`}>
        <div className={styles.sectionLabel}>App Preview</div>
        <h2 className={styles.sectionTitle}>See it in action</h2>
        <div style={{ marginBottom: "32px" }} />

        <div className={styles.screenshots}>
          <div className={styles.screenshotCard}>
            <div className={styles.screenshotLabel}>Settings: notification events, admin phone, country code</div>
            <img src="/screenshot-settings.png" alt="kwtSMS Settings page" />
          </div>
          <div className={styles.screenshotCard}>
            <div className={styles.screenshotLabel}>Gateway: credentials, balance, sender ID, coverage, test SMS</div>
            <img src="/screenshot-gateway.png" alt="kwtSMS Gateway page" />
          </div>
          <div className={styles.screenshotCard}>
            <div className={styles.screenshotLabel}>Templates: bilingual Arabic and English with placeholders</div>
            <img src="/screenshot-templates.png" alt="kwtSMS Templates page" />
          </div>
          <div className={styles.screenshotCard}>
            <div className={styles.screenshotLabel}>Logs: delivery status, sender ID, recipient type, error details</div>
            <img src="/screenshot-logs.png" alt="kwtSMS Logs page" />
          </div>
        </div>
      </section>

      {/* ── Install CTA ── */}
      <section className={styles.install} id="install">
        <h2 className={styles.installTitle}>Ready to connect your store?</h2>
        {/* 2026-11-05 18:27 +03: "It's free." removed, the app sends through the merchant's kwtSMS account (Shopify 1.2.1 pause), shp-strip-prices */}
        {/* 2026-11-06 00:20 +03: shop-domain install form removed, installs start from the Shopify App Store only, why (Shopify review 2.3.1), shp-fix-submit */}
        <p className={styles.installSub}>
          Install kwtSMS from the Shopify App Store. It uses your kwtSMS
          account to send SMS.
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a
            href="https://www.kwtsms.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            kwtsms.com
          </a>
          <a
            href="https://www.kwtsms.com/#contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support
          </a>
          <a href="/privacy">Privacy Policy</a>
        </div>
        {/* 2026-11-05 18:27 +03: "a free app ... You only pay for SMS credits" removed, the Shopify reviewer quoted it under 1.2.1, shp-strip-prices */}
        <p>
          kwtSMS for Shopify is an app by kwtSMS. It uses your kwtSMS account
          to send SMS.
        </p>
      </footer>
    </div>
  );
}
