# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

- Email: support@kwtsms.com
- Do NOT open a public GitHub issue for security vulnerabilities

## Security Practices

### Credentials

- API credentials are stored in the app database, never in source code
- Credentials are transmitted only over HTTPS POST requests
- Credentials are never logged, cached in browser storage, or exposed to the frontend
- OAuth tokens are managed by Shopify's session management

### Input Validation

- All phone numbers are normalized and validated before processing
- SMS message content is sanitized (HTML stripped, emojis removed, control characters cleaned)
- All user inputs are sanitized to prevent XSS and SQL injection
- Webhook payloads are verified via HMAC-SHA256 before processing

### Data Protection

- Phone numbers in logs are masked (e.g., 9659****432)
- SMS content in logs is truncated for privacy
- Customer data is handled in compliance with Shopify's data protection requirements
- GDPR data request and redaction webhooks are implemented

### Rate Limiting

- API calls are paced at 2 requests/second or less, under the kwtSMS limit of 10 requests/second
- Balance and coverage checks run before every send attempt

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Dependencies

This project uses automated dependency scanning. Security patches are applied promptly.
