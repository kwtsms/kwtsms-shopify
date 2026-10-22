import type { KwtSmsError } from "./types";

const ERROR_MAP: Record<string, KwtSmsError> = {
  ERR001: { code: "ERR001", description: "API disabled on account", action: "Contact kwtSMS to enable API access" },
  ERR002: { code: "ERR002", description: "Missing required parameter", action: "Check request body has all required fields" },
  ERR003: { code: "ERR003", description: "Wrong username or password", action: "Verify API credentials (not account login)" },
  ERR004: { code: "ERR004", description: "Account has no API access", action: "Request API access from kwtSMS" },
  ERR005: { code: "ERR005", description: "Account blocked", action: "Contact kwtSMS support" },
  ERR006: { code: "ERR006", description: "No valid numbers submitted", action: "Check phone number format (digits only, international)" },
  ERR007: { code: "ERR007", description: "More than 200 numbers", action: "Split into batches of 200 or fewer" },
  ERR008: { code: "ERR008", description: "Sender ID is banned", action: "Use a different sender ID or contact kwtSMS" },
  ERR009: { code: "ERR009", description: "Empty message", action: "Provide message content" },
  ERR010: { code: "ERR010", description: "Zero balance", action: "Top up your kwtSMS account" },
  ERR011: { code: "ERR011", description: "Insufficient balance", action: "Top up your kwtSMS account" },
  ERR012: { code: "ERR012", description: "Message too long (>6 pages)", action: "Shorten message to 6 pages or fewer" },
  ERR013: { code: "ERR013", description: "Send queue full (1000 msgs)", action: "Retry with exponential backoff (30s, 60s, 120s)" },
  ERR019: { code: "ERR019", description: "No DLR reports found", action: "Wait 5+ minutes before checking DLR" },
  ERR020: { code: "ERR020", description: "Message does not exist", action: "Verify msg-id is correct" },
  ERR021: { code: "ERR021", description: "No delivery report for this message", action: "DLR only available for international numbers" },
  ERR022: { code: "ERR022", description: "Reports not ready", action: "Check again after 24 hours" },
  ERR023: { code: "ERR023", description: "Unknown DLR error", action: "Contact kwtSMS support" },
  ERR024: { code: "ERR024", description: "IP not in API lockdown whitelist", action: "Add your server IP to the whitelist in kwtSMS settings" },
  ERR025: { code: "ERR025", description: "Invalid number format", action: "Strip +, 00, spaces from phone number" },
  ERR026: { code: "ERR026", description: "No route for country", action: "Contact kwtSMS to activate international sending" },
  ERR027: { code: "ERR027", description: "HTML tags in message", action: "Strip HTML tags from message" },
  // 2026-10-22 15:36 +03: ERR028 is opt-in duplicate SMS protection with a per-account window (10 s default), never a fixed 15 s.
  ERR028: { code: "ERR028", description: "Sent to the same number too soon.", action: "Duplicate SMS protection is on for this account. Wait for the account's window (10 seconds by default) before resending" },
  ERR029: { code: "ERR029", description: "Message does not exist or wrong msgid", action: "Verify msg-id is correct" },
  ERR030: { code: "ERR030", description: "Message stuck in queue with error", action: "Delete from queue to recover credits" },
  ERR031: { code: "ERR031", description: "Bad language detected", action: "Review message content" },
  ERR032: { code: "ERR032", description: "Spam detected", action: "Review message content and sending patterns" },
  ERR033: { code: "ERR033", description: "No active coverage", action: "Contact kwtSMS to activate coverage" },
};

export function mapError(code: string): KwtSmsError {
  return ERROR_MAP[code] ?? {
    code,
    description: `Unknown error: ${code}`,
    action: "Contact kwtSMS support",
  };
}

export function getAllErrors(): Record<string, KwtSmsError> {
  return { ...ERROR_MAP };
}
