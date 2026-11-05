import type {
  KwtSmsConfig,
  SendResponse,
  BalanceResponse,
  SenderIdResponse,
  ValidateResponse,
  CoverageResponse,
  Result,
} from "./types";
import { mapError } from "./errors";
import { normalize } from "./phone";
import { cleanMessage } from "./message";
// 2026-11-05 14:59 +03: app version for the User-Agent, read from package.json (one source), #939
import { version as APP_VERSION } from "../../../package.json";

const API_BASE = "https://www.kwtsms.com/API";
// 2026-11-05 14:59 +03: sent on every API call so kwtSMS can count accounts per integration
// (name and version only, no personal data), #939
export const USER_AGENT = `kwtsms-shopify/${APP_VERSION}`;
const TIMEOUT_MS = 10_000;
const BATCH_SIZE = 200;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class KwtSmsClient {
  private username: string;
  private password: string;
  private senderId: string;
  private testMode: boolean;

  constructor(config: KwtSmsConfig) {
    this.username = config.username;
    this.password = config.password;
    this.senderId = config.senderId ?? "KWT-SMS";
    this.testMode = config.testMode ?? true;
  }

  /**
   * Send SMS to one or more numbers.
   * Accepts a single number string or an array of numbers.
   * If more than 200 numbers, automatically chunks into batches of 200
   * with 500ms delay between requests.
   */
  async send(
    mobile: string | string[],
    message: string,
    options?: { senderId?: string; test?: boolean },
  ): Promise<Result<SendResponse>> {
    const mobiles = Array.isArray(mobile) ? mobile : [mobile];

    // Normalize all phone numbers
    const normalized: string[] = [];
    for (const m of mobiles) {
      const result = normalize(m);
      if (result.valid) {
        normalized.push(result.normalized);
      }
    }

    if (normalized.length === 0) {
      return {
        ok: false,
        error: {
          code: "PHONE_INVALID",
          description: mobiles.length === 1
            ? (normalize(mobiles[0]).error ?? "Invalid phone number")
            : "No valid phone numbers provided",
          action: "Check phone number format",
        },
      };
    }

    // Clean message text
    const cleanedMessage = cleanMessage(message);
    if (cleanedMessage.length === 0) {
      return {
        ok: false,
        error: {
          code: "MSG_EMPTY",
          description: "Message is empty after cleaning",
          action: "Provide message content",
        },
      };
    }

    const testFlag = options?.test ?? this.testMode;
    const sender = options?.senderId ?? this.senderId;

    // Single batch (200 or fewer): one API call
    if (normalized.length <= BATCH_SIZE) {
      return this._sendOnce(normalized, cleanedMessage, sender, testFlag);
    }

    // Multiple batches: chunk and delay
    return this._sendBulk(normalized, cleanedMessage, sender, testFlag);
  }

  private async _sendOnce(
    phones: string[],
    message: string,
    sender: string,
    test: boolean,
  ): Promise<Result<SendResponse>> {
    return this._post<SendResponse>("/send/", {
      sender,
      mobile: phones.join(","),
      message,
      test: test ? "1" : "0",
    });
  }

  private async _sendBulk(
    phones: string[],
    message: string,
    sender: string,
    test: boolean,
  ): Promise<Result<SendResponse>> {
    const chunks: string[][] = [];
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      chunks.push(phones.slice(i, i + BATCH_SIZE));
    }

    let totalNumbers = 0;
    let totalPoints = 0;
    let lastMsgId = "";
    let lastBalance = 0;

    for (let i = 0; i < chunks.length; i++) {
      const result = await this._sendOnce(chunks[i], message, sender, test);
      if (!result.ok) {
        return result;
      }
      totalNumbers += result.data.numbers;
      totalPoints += result.data["points-charged"];
      lastMsgId = result.data["msg-id"];
      lastBalance = result.data["balance-after"];

      if (i < chunks.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return {
      ok: true,
      data: {
        "msg-id": lastMsgId,
        numbers: totalNumbers,
        "points-charged": totalPoints,
        "balance-after": lastBalance,
        "unix-timestamp": Math.floor(Date.now() / 1000),
      },
    };
  }

  async balance(): Promise<Result<BalanceResponse>> {
    return this._post<BalanceResponse>("/balance/", {});
  }

  async senderIds(): Promise<Result<SenderIdResponse>> {
    return this._post<SenderIdResponse>("/senderid/", {});
  }

  async validate(mobile: string): Promise<Result<ValidateResponse>> {
    const phoneResult = normalize(mobile);
    return this._post<ValidateResponse>("/validate/", {
      mobile: phoneResult.valid ? phoneResult.normalized : mobile,
    });
  }

  async coverage(): Promise<Result<CoverageResponse>> {
    return this._post<CoverageResponse>("/coverage/", {});
  }

  private async _post<T>(endpoint: string, body: Record<string, unknown>): Promise<Result<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": USER_AGENT, // 2026-11-05 14:59 +03: identify the integration, #939
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          ...body,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (data.result === "OK") {
        return { ok: true, data: data as T };
      }

      if (data.result === "ERROR" && data.code) {
        return { ok: false, error: mapError(data.code) };
      }

      return {
        ok: false,
        error: {
          code: "UNKNOWN",
          description: data.description ?? "Unknown API response",
          action: "Check API response format",
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          ok: false,
          error: {
            code: "TIMEOUT",
            description: "API request timed out after 10 seconds",
            action: "Check network connectivity and retry",
          },
        };
      }

      return {
        ok: false,
        error: {
          code: "NETWORK",
          description: err instanceof Error ? err.message : "Network error",
          action: "Check network connectivity",
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
