/*
 * FILE:      app/routes/sender-id.tsx
 * CREATED:   2026-11-06 00:35 +03
 * TASK:      shp-fix-submit
 * AUTHOR:    M Alhassoun
 * WHAT:      Public Sender ID page at https://notify.kwtsms.com/sender-id: what a Sender ID is, the default sender,
 *            how to request a company Sender ID through the kwtSMS account and where it shows in the app.
 * WHY:       Shopify review (rule 1.2.1, Boss 00:33): replaces links to www.kwtsms.com Sender ID pages that show
 *            prices and buy buttons. Neutral wording, no prices or fees.
 * USAGE:     Served by flatRoutes as /sender-id; linked from the app's Gateway and Help pages and the public footers.
 * DEPENDS:   app/components/PublicShell.tsx
 */
import { PublicShell, SUPPORT_EMAIL } from "../components/PublicShell";

export default function SenderId() {
  return (
    <PublicShell title="Sender ID" updated="November 6, 2026">
      <h2>What is a Sender ID?</h2>
      <p>
        The Sender ID is the name your customers see as the sender of your SMS,
        in place of a phone number. It can be up to 11 letters or digits, for
        example your store or company name.
      </p>

      <h2>The default Sender ID</h2>
      <p>
        New kwtSMS accounts can send right away with the default Sender ID,
        KWT-SMS. It is meant for testing. For messages to your customers, use
        your own company Sender ID so they recognise your store.
      </p>

      <h2>How to request a company Sender ID</h2>
      <ol>
        <li>
          <a
            href="https://www.kwtsms.com/login"
            target="_blank"
            rel="noopener noreferrer"
          >
            Log in to kwtSMS
          </a>{" "}
          with your kwtSMS account.
        </li>
        <li>
          Open the Sender ID section of your account and submit a request for
          the name you want. For order and shipping notifications, ask for a
          Transactional Sender ID.
        </li>
        <li>
          kwtSMS reviews the request and adds the Sender ID to your account
          once it is approved.
        </li>
      </ol>
      <p>
        Questions about your request? E-mail{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>Where it appears in the app</h2>
      <ol>
        <li>Open the app in your Shopify admin and go to the Gateway page.</li>
        <li>
          Click Reload to load the latest Sender IDs from your kwtSMS account.
        </li>
        <li>
          Under Sender Settings, choose the Sender ID from the list and click
          Save Settings.
        </li>
      </ol>
      <p>
        Every SMS the app sends from then on uses that Sender ID. You can check
        it on the Logs page and in the status bar at the top of the app.
      </p>
    </PublicShell>
  );
}
