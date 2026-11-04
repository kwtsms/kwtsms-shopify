import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function HelpPage() {

  return (
    <s-page heading="Help and Documentation">
      <div style={{ marginTop: "16px" }} />

      {/* Setup Guide */}
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Setup Guide</h2>
        <s-box padding="base">
          <s-ordered-list>
            <s-list-item>
              <strong>Create a kwtSMS account.</strong>{" "}
              Visit{" "}
              <s-link href="https://www.kwtsms.com/signup" target="_blank">
                kwtsms.com
              </s-link>{" "}
              and register for an account if you do not have one yet.
            </s-list-item>
            <s-list-item>
              <strong>Get your API credentials.</strong> Log
              in to your kwtSMS dashboard and navigate to the API settings
              page to find your username and password.
            </s-list-item>
            <s-list-item>
              <strong>Enter credentials in Gateway Settings.</strong>{" "}
              Go to the{" "}
              <s-link href="/app/gateway">Gateway Settings</s-link> page in
              this app and enter your kwtSMS API username and password.
            </s-list-item>
            <s-list-item>
              <strong>Register a Sender ID.</strong> In your
              kwtSMS dashboard, register a Sender ID (up to 11 characters).
              This is the name recipients will see when they receive your SMS.
              See the{" "}
              <s-link href="https://www.kwtsms.com/sender-id-help.html" target="_blank">
                Sender ID help page
              </s-link>{" "}
              for details.
            </s-list-item>
            <s-list-item>
              <strong>Customize your templates.</strong>{" "}
              Visit the{" "}
              <s-link href="/app/templates">Templates</s-link> page to
              customize the SMS content for each notification event (order
              confirmation, shipping update, etc.).
            </s-list-item>
            <s-list-item>
              <strong>Enable notifications.</strong> Go to{" "}
              <s-link href="/app">Settings</s-link> and enable the
              notification events you want to send SMS for.
            </s-list-item>
          </s-ordered-list>
        </s-box>
      </s-section>

      {/* FAQ */}
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Frequently Asked Questions</h2>
        <s-box padding="base">
          <s-paragraph>
            <strong>
              Q: How much does each SMS cost?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: SMS pricing depends on your kwtSMS account plan and the
            destination country. Check your kwtSMS dashboard for current
            rates. Each SMS uses &quot;points&quot; (credits) from your balance.
          </s-paragraph>
          <s-divider />

          <s-paragraph>
            <strong>
              Q: Can I send SMS to international numbers?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: Yes, kwtSMS supports international delivery. Make sure your
            account has international sending enabled and that the destination
            country is covered. Contact kwtSMS support to activate coverage
            for specific countries.
          </s-paragraph>
          <s-divider />

          <s-paragraph>
            <strong>
              Q: What is Test Mode?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: Test Mode lets you simulate sending SMS without actually
            delivering messages or using credits. It is useful for verifying
            your templates and integration before going live.
          </s-paragraph>
          <s-divider />

          <s-paragraph>
            <strong>
              Q: How do I check my SMS balance?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: Once your API credentials are configured, your current balance
            is displayed in the top status bar on every page.
            You can also check your balance directly in the kwtSMS dashboard.
          </s-paragraph>
          <s-divider />

          <s-paragraph>
            <strong>
              Q: Can I use Arabic text in my messages?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: Yes, kwtSMS fully supports Arabic (Unicode) messages. Note
            that Unicode messages have a shorter character limit per page (70
            characters for the first page, 67 for subsequent pages) compared
            to English (160/153).
          </s-paragraph>
          <s-divider />

          <s-paragraph>
            <strong>
              Q: What template variables can I use?
            </strong>
          </s-paragraph>
          <s-paragraph>
            A: Templates support variables like {"{"}order_number{"}"},{" "}
            {"{"}customer_name{"}"}, {"{"}total_price{"}"},{" "}
            {"{"}tracking_number{"}"}, {"{"}shop_name{"}"}, and more. See the
            Templates page for the full list of available variables for each
            event type.
          </s-paragraph>
        </s-box>
      </s-section>

      {/* Troubleshooting */}
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Troubleshooting</h2>
        <s-box padding="base">
          <s-paragraph>
            <strong>
              Message not received by customer
            </strong>
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              Verify the phone number is correct and includes the country
              code (e.g., 965 for Kuwait).
            </s-list-item>
            <s-list-item>
              Check the SMS Logs page for error details on the specific
              message.
            </s-list-item>
            <s-list-item>
              Ensure your kwtSMS account has sufficient balance.
            </s-list-item>
            <s-list-item>
              Confirm that your Sender ID is approved and not blocked.
            </s-list-item>
            <s-list-item>
              Verify that the destination country is covered by your
              account.
            </s-list-item>
          </s-unordered-list>
          <s-divider />

          <s-paragraph>
            <strong>Arabic text appears garbled</strong>
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              Ensure the message template contains only Arabic or mixed
              Arabic/English text without special encoding characters.
            </s-list-item>
            <s-list-item>
              The app automatically handles UTF-8 encoding for Arabic
              messages.
            </s-list-item>
            <s-list-item>
              Avoid copying text from PDFs or scanned documents, as they
              may contain hidden characters.
            </s-list-item>
          </s-unordered-list>
          <s-divider />

          <s-paragraph>
            <strong>Balance shows zero</strong>
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              Verify your API credentials are correct in the Gateway
              Settings page.
            </s-list-item>
            <s-list-item>
              Log in to your kwtSMS dashboard directly to confirm your
              actual balance.
            </s-list-item>
            <s-list-item>
              If credentials are correct but balance still shows zero,
              your account may need to be topped up.
            </s-list-item>
            <s-list-item>
              Contact kwtSMS support if the balance shown in the app does
              not match your actual account balance.
            </s-list-item>
          </s-unordered-list>
        </s-box>
      </s-section>

      {/* Useful Links */}
      <s-section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px 0" }}>Useful Links</h2>
        <s-box padding="base">
          <s-unordered-list>
            <s-list-item>
              <s-link href="https://www.kwtsms.com" target="_blank">
                kwtSMS Website
              </s-link>{" "}
              - Main website and account management.
            </s-list-item>
            <s-list-item>
              <s-link href="https://www.kwtsms.com/faq/" target="_blank">
                FAQ
              </s-link>{" "}
              - Frequently asked questions about kwtSMS services.
            </s-list-item>
            <s-list-item>
              <s-link href="https://www.kwtsms.com/support.html" target="_blank">
                Support Center
              </s-link>{" "}
              - Get help from the kwtSMS support team.
            </s-list-item>
            <s-list-item>
              <s-link href="https://www.kwtsms.com/sender-id-help.html" target="_blank">
                Sender ID Help
              </s-link>{" "}
              - How to register and manage your Sender IDs.
            </s-list-item>
            <s-list-item>
              <s-link href="https://www.kwtsms.com/articles/sms-api-implementation-best-practices.html" target="_blank">
                SMS Best Practices
              </s-link>{" "}
              - Implementation best practices for SMS APIs.
            </s-list-item>
            <s-list-item>
              <s-link href="https://github.com/kwtsms/kwtsms-shopify/issues" target="_blank">
                GitHub Issues
              </s-link>{" "}
              - Report bugs or request features for this Shopify plugin.
            </s-list-item>
          </s-unordered-list>
        </s-box>
      </s-section>

    </s-page>
  );
}
