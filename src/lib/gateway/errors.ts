const MAX_MESSAGE_LENGTH = 300;
const SAFE_TYPES = new Set(["invalid_request_error", "authentication_error", "rate_limit_error"]);

export function internalErrorMessage(status: 500 | 502): string {
  return status === 500 ? "Internal server error" : "Upstream service error";
}

export function safeUpstreamMessage(status: number, value: unknown): string | null {
  if (status < 400 || status >= 500 || !value || typeof value !== "object") return null;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const { type, message } = error as { type?: unknown; message?: unknown };
  if (typeof type !== "string" || !SAFE_TYPES.has(type) || typeof message !== "string") return null;
  const cleaned = message.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned && cleaned.length <= MAX_MESSAGE_LENGTH ? cleaned : null;
}
