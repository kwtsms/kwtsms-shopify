# kwtSMS for Shopify

[![CI](https://github.com/kwtsms/kwtsms-shopify/actions/workflows/ci.yml/badge.svg)](https://github.com/kwtsms/kwtsms-shopify/actions/workflows/ci.yml)
[![Shopify](https://img.shields.io/badge/Shopify-App-96bf48?logo=shopify&logoColor=white)](https://www.kwtsms.com/integrations.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![kwtSMS](https://img.shields.io/badge/kwtSMS-Gateway-ff6b00)](https://www.kwtsms.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)
[![Kuwait](https://img.shields.io/badge/Made_in-Kuwait_🇰🇼-007a3d)](https://www.kwtsms.com)

Automated SMS notifications for Shopify stores via the [kwtSMS](https://www.kwtsms.com) gateway. Send order confirmations, shipping updates, and more directly to your customers' phones. Full Arabic and English support.

> Don't have a kwtSMS account? [Sign up free at kwtsms.com](https://www.kwtsms.com/signup) - no credit card, no contracts, setup in under 1 minute.

---

## About kwtSMS

kwtSMS is a Kuwaiti SMS gateway trusted by 2,700+ businesses to deliver messages to 220+ countries, with private Sender ID, free API testing, non-expiring credits, and competitive flat-rate pricing. Secure, simple to integrate, built to last. 99.8% delivery rate, 18 years in operation since 2007. [Get started](https://www.kwtsms.com/signup/)

---

## Features

- **Order Notifications**: SMS on order created, paid, shipped, partially fulfilled, cancelled
- **Fulfillment Tracking**: Automatic SMS with tracking number and URL
- **Customer Welcome**: Welcome SMS when new customers register
- **Bilingual Templates**: Customizable EN/AR templates per event type
- **Auto Language Detection**: Uses customer locale, falls back to store default
- **Recipient Control**: Send to customer, admin, or both per event type
- **Private Sender ID**: Customers see your brand name, not a random number
- **Global Status Bar**: Live SMS status, balance, mode, and sender ID on every page
- **Gateway Login/Logout**: Connect and disconnect kwtSMS credentials
- **Test Mode**: Send test SMS without consuming credits
- **Phone Normalization**: Handles local numbers, Arabic digits, auto country code prefixing
- **Daily Sync**: Background sync of balance, sender IDs, and coverage
- **SMS Logs**: Full audit trail with filtering by status and event type

## Requirements

- Shopify store (any plan)
- kwtSMS account with API access ([register here](https://www.kwtsms.com/signup))
- Approved Sender ID (for production use)

## Installation

Install from the [Shopify App Store](#) (link available after marketplace approval).

## Configuration

1. Install the app on your Shopify store
2. Go to **Gateway** page, enter your kwtSMS API credentials, click **Login**
3. Select your Sender ID and save settings
4. Configure notification events on the **Settings** page
5. Customize SMS templates on the **Templates** page
6. Send a test SMS from the **Gateway** page to verify

## API Credentials

Your kwtSMS API credentials are separate from your account login:

1. Log in to [kwtsms.com](https://www.kwtsms.com)
2. Navigate to Account > API
3. Request API access (activated same day)
4. Use the API username and password provided

## Coverage

Currently supports: Kuwait (+965), Saudi Arabia (+966), UAE (+971), Bahrain (+973), Qatar (+974), and 220+ countries worldwide. Contact kwtSMS to activate additional countries.

## Development

```bash
# Prerequisites: Node.js 20.10+, Shopify CLI
npm install -g @shopify/cli@latest

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
shopify app dev

# TypeScript check
npx tsc --noEmit
```

See [docs/PLAN.md](docs/PLAN.md) for the implementation plan and [docs/manual-test-plan.md](docs/manual-test-plan.md) for the testing guide.

## Tech Stack

- React Router v7 (Remix) with Vite
- Shopify Polaris web components + App Bridge
- TypeScript
- Prisma ORM (SQLite dev, MySQL/PostgreSQL prod)
- kwtSMS REST/JSON API

## License

Proprietary. All rights reserved.

## Support

- kwtSMS Support: [kwtsms.com](https://www.kwtsms.com/#contact)
- Issues: [GitHub Issues](https://github.com/kwtsms/kwtsms-shopify/issues)
