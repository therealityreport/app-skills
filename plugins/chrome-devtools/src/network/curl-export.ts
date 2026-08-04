import { assertNoKnownSecrets, redactUrl, REDACTED } from "../core/redaction-policy.js";
import type { ApiCall } from "../core/types.js";

export function apiCallToCurl(call: ApiCall): string {
  const parts = ["curl", "-X", shellQuote(call.method), shellQuote(redactUrl(call.url))];
  for (const [key, value] of Object.entries(call.requestHeadersRedacted)) {
    if (value === REDACTED) continue;
    parts.push("-H", shellQuote(`${key}: ${value}`));
  }
  if (call.requestBodySummary && call.requestBodySummary !== "empty") {
    parts.push("--data-raw", shellQuote(call.requestBodySummary));
  }
  return parts.join(" ");
}

export function assertCurlIsSafe(curl: string): void {
  const findings = assertNoKnownSecrets(curl);
  if (findings.length > 0) {
    throw new Error(`Unsafe cURL export: ${findings.join(", ")}`);
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
