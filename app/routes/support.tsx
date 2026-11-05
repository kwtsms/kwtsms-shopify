/*
 * FILE:      app/routes/support.tsx
 * CREATED:   2026-11-06 00:35 +03
 * TASK:      shp-fix-submit
 * AUTHOR:    M Alhassoun
 * WHAT:      Public support page at https://notify.kwtsms.com/support: how to get help with the app, what to include,
 *            response hours and an FAQ of common app questions.
 * WHY:       Shopify review (rule 1.2.1, Boss 00:33): the app's support link must not lead to www.kwtsms.com pages
 *            whose menus show prices. No prices, buy, recharge or top-up wording on this page.
 * USAGE:     Served by flatRoutes as /support; linked from the app's Help and public page footers and the listing.
 * DEPENDS:   app/components/PublicShell.tsx
 * UPDATED:   2026-11-06 00:44 +03: FAQ no longer mentions credits or balance (Shopify 1.2.1, Boss 00:39), shp-fix-submit
 */
import { PublicShell, SUPPORT_EMAIL } from "../components/PublicShell";

export default function Support() {
  return (
    <PublicShell title="Support" updated="November 6, 2026">
      <p>
        Need help with kwtSMS for Shopify? Our support team answers questions
        about installing the app, connecting your kwtSMS account, Sender IDs,
        templates and SMS logs.
      </p>

      <h2>Contact us</h2>
      <p>
        E-mail <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We work
        Sunday to Thursday, during business hours, Kuwait time (GMT+3), and
        usually reply within one business day.
      </p>

      <h2>What to include in your request</h2>
      <ul>
        <li>Your store address (your-store.myshopify.com).</li>
        <li>Your kwtSMS username. Never send your password.</li>
        <li>What you expected to happen and what happened instead.</li>
        <li>
          For an SMS that was not sent: the date and time, the notification
          event (for example Order Created) and the status or error shown on
          the app&apos;s Logs page.
        </li>
        <li>A screenshot of the app page, if it helps.</li>
      </ul>

      <h2>Frequently asked questions</h2>

      <h3>How do I connect the app to my kwtSMS account?</h3>
      <p>
        If you do not have a kwtSMS account yet,{" "}
        <a
          href="https://www.kwtsms.com/signup"
          target="_blank"
          rel="noopener noreferrer"
        >
          create a kwtSMS account
        </a>
        . Find your API username and password in your kwtSMS account, open the
        app&apos;s Gateway page, enter them and click Login. The app then loads
        your balance, your Sender IDs and the countries you can send to.
      </p>

      <h3>Which Sender ID will my customers see?</h3>
      <p>
        The Sender ID you choose under Sender Settings on the Gateway page. New
        accounts can send with the default Sender ID; you can request your own
        company Sender ID. See <a href="/sender-id">Sender ID</a>.
      </p>

      <h3>What is test mode?</h3>
      <p>
        Turn on &quot;Test mode&quot; on the app&apos;s Settings page to try
        your setup without reaching any phone. kwtSMS accepts the messages but
        does not deliver them. Turn test mode off before you go live.
      </p>

      <h3>Why was an SMS not sent?</h3>
      <p>
        Open the app&apos;s Logs page and check the status and error of that
        message. The most common reasons:
      </p>
      <ul>
        <li>
          SMS notifications or that event are turned off on the Settings page.
        </li>
        <li>The gateway is not connected on the Gateway page.</li>
        <li>
          The order or customer has no phone number, or the number is not
          valid. Check the default country code on the Settings page.
        </li>
        <li>
          The destination country is not active on your kwtSMS account (see
          Coverage on the Gateway page).
        </li>
        <li>Your kwtSMS account cannot send right now (check it in your kwtSMS account).</li>
        <li>Test mode is on, so the message was not delivered.</li>
      </ul>

      <h3>Can I send messages in Arabic?</h3>
      <p>
        Yes. Every notification has an English and an Arabic template, and the
        app picks the language from the customer&apos;s language in Shopify,
        falling back to the language set on the Settings page. One Arabic SMS
        holds up to 70 characters (67 per part in longer messages), compared
        with 160 (153) for English, so long Arabic messages are sent in more
        parts.
      </p>

      <h3>Who receives the messages?</h3>
      <p>
        For each event you choose the customer, the store admin or both on the
        Templates page. The admin phone number is set on the Settings page.
      </p>

      <h3>What happens to my data when I uninstall the app?</h3>
      <p>
        Your kwtSMS credentials are deleted at once. Your settings, templates
        and SMS logs are deleted when Shopify sends the shop data erasure
        request, 48 hours after you uninstall. While the app is installed, SMS
        logs are deleted automatically after 90 days, and you can delete them
        at any time from the Logs page. See the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </PublicShell>
  );
}
