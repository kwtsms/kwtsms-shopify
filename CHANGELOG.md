# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Requests to kwtSMS carry the integration name and version (no personal data) so kwtSMS can see which integrations are in use.

### Changed
- Docs and examples use the placeholder 965XXXXXXXX instead of a sample mobile number.
- The app and its landing page no longer show prices or recharge links; they point to your kwtSMS account.

### Docs
- Test mode: test messages are queued but not delivered. Their credits are held until you delete them from the Sending Queue in your kwtsms.com account.
- ERR028: opt-in Duplicate SMS protection with a per-account window (10 seconds by default), not a fixed 15 seconds.

### Added
- Initial project scaffolding from Shopify React Router template
- Prisma database schema (GatewayCredentials, Settings, SmsTemplate, SmsLog)
- kwtSMS API client with full error code mapping (ERR001-ERR033)
- Phone normalization (Arabic/Hindi digits, stripping, country code prepending)
- Message cleaning (emoji strip, HTML strip, control char removal, Arabic preserved)
- SMS send orchestration via `sendSms()` with balance and coverage guards
- Gateway settings page (login, logout, reload, sender ID, coverage, test SMS)
- Settings page (SMS toggle, test mode, notification events, defaults, debug logging)
- Templates page with vertical tabs layout (6 event types, EN/AR, recipient type)
- Logs page with status/event filters and pagination
- Help page (setup guide, FAQ, troubleshooting, error codes, useful links)
- Integrations page (stub for future integrations)
- Global status bar (SMS status, gateway, mode, balance, sender, today sent, dashboard link)
- 13 webhook handlers (orders, fulfillments, customers, privacy)
- Notification handlers for order, fulfillment, customer, and privacy events
- Default template seeding on install (individual missing template seeding)
- Daily sync job (lazy, triggered on page load if >24h stale)
- Debug logging to server console (toggled from settings)
- Country names map (~180 countries) for coverage and settings display
- Auto-set first sender ID on gateway login
- New Customer (Welcome SMS) notification event and template
- Test SMS with timestamp appended to message
- Manual test plan documentation
- Competitive analysis
- Marketplace submission guide
- Product Requirements Document (PRD)
- 18-task implementation plan with Phase 2-4 roadmap

### Removed
- fulfillment_created template (redundant with order_shipped/order_partially_fulfilled)
- Dead settings (test_mode, notify_low_stock from settings table)
