const SECRET_HEADER_RE = /^(cookie|authorization|proxy-authorization|x-api-key|api-key|csrf-token|x-csrf-token|x-xsrf-token|session|x-session|access-token|refresh-token)$/i;
const SECRET_PARAM_RE = /(token|secret|key|password|passwd|pwd|session|auth|csrf|xsrf|signature|sig)/i;
const SECRET_VALUE_RE = /(bearer\s+[a-z0-9._~+/=-]+|sk-[a-z0-9_-]+|ghp_[a-z0-9_]+|eyj[a-z0-9_-]+\.[a-z0-9_-]+)/i;

export const REDACTED = "[REDACTED]";

export function redactHeaders(headers: Record<string, string | undefined> = {}): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    output[key] = SECRET_HEADER_RE.test(key) || SECRET_VALUE_RE.test(value) ? REDACTED : value;
  }
  return output;
}

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      const value = url.searchParams.get(key) ?? "";
      if (SECRET_PARAM_RE.test(key) || SECRET_VALUE_RE.test(value)) {
        url.searchParams.set(key, REDACTED);
      }
    }
    return url.toString();
  } catch {
    return input.replace(SECRET_VALUE_RE, REDACTED);
  }
}

export function summarizeBody(body: unknown): string {
  if (body == null || body === "") return "empty";
  const parsed = typeof body === "string" ? tryJson(body) : body;
  if (parsed === undefined) {
    const text = String(body);
    return text.length > 120 ? `text(${text.length} chars)` : redactFreeText(text);
  }
  return JSON.stringify(shapeOf(parsed));
}

export function redactJsonValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return SECRET_VALUE_RE.test(value) ? REDACTED : primitiveLabel(value);
  if (typeof value === "number" || typeof value === "boolean") return primitiveLabel(value);
  if (Array.isArray(value)) return value.slice(0, 5).map(redactJsonValue);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_PARAM_RE.test(key) ? REDACTED : redactJsonValue(child);
    }
    return result;
  }
  return typeof value;
}

export function assertNoKnownSecrets(text: string): string[] {
  const findings: string[] = [];
  if (/cookie\s*[:=]/i.test(text)) findings.push("cookie");
  if (/authorization\s*[:=]/i.test(text)) findings.push("authorization");
  if (/bearer\s+(?!\[REDACTED\])/i.test(text)) findings.push("bearer token");
  if (/x-api-key\s*[:=]/i.test(text)) findings.push("api key header");
  if (/(token|secret|key|password|session|auth|csrf|xsrf)=((?!%5BREDACTED%5D|\[REDACTED\])[^&\s]+)/i.test(text)) findings.push("secret query parameter");
  if (/csrf|xsrf/i.test(text) && !text.includes(REDACTED)) findings.push("csrf token");
  if (SECRET_VALUE_RE.test(text.replaceAll(REDACTED, ""))) findings.push("secret-looking value");
  return [...new Set(findings)];
}

function tryJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function shapeOf(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.length === 0 ? [] : [`array(${value.length})`, shapeOf(value[0])];
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_PARAM_RE.test(key) ? REDACTED : shapeOf(child);
    }
    return result;
  }
  return primitiveLabel(value);
}

function primitiveLabel(value: unknown): string {
  if (typeof value === "string") return `string(${value.length})`;
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return typeof value;
}

function redactFreeText(text: string): string {
  return text.replace(SECRET_VALUE_RE, REDACTED);
}
