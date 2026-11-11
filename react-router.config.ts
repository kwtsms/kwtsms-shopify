/*
FILE:      react-router.config.ts
CREATED:   2026-11-11 19:57 +03
TASK:      shopify-login-crash (#1235)
AUTHOR:    M Alhassoun
WHAT:      React Router build config: the host names allowed to submit forms (actions).
WHY:       React Router 7.14+ refuses a form POST whose Origin header differs from the request URL. Behind the
           Apache proxy the app sees http://localhost:3000 while the browser sends https://notify.kwtsms.com, so every
           form in the app returned 400 after the 7.18 update.
USAGE:     Read by react-router build / dev. Add a host here if the app is served from another domain.
DEPENDS:   @react-router/dev 7.18+.
*/
import type { Config } from "@react-router/dev/config";

export default {
  // 2026-11-11 19:57 +03: the production host; *.trycloudflare.com is the Shopify CLI dev tunnel, task shopify-login-crash
  allowedActionOrigins: ["notify.kwtsms.com", "*.trycloudflare.com"],
} satisfies Config;
