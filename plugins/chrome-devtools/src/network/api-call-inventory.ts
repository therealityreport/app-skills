import { fingerprintError } from "../core/error-fingerprint.js";
import { redactHeaders, redactUrl, summarizeBody } from "../core/redaction-policy.js";
import type { ApiCall } from "../core/types.js";

export type RawApiCall = {
  id: string;
  pageUrl: string;
  method: string;
  url: string;
  resourceType?: ApiCall["resourceType"];
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBodySummary?: string;
  initiatorUrl?: string;
};

export function normalizeApiCall(raw: RawApiCall): ApiCall {
  const safeUrl = redactUrl(raw.url);
  const fingerprint = fingerprintError({
    kind: "api",
    method: raw.method,
    url: safeUrl,
    status: raw.status,
    initiator: raw.initiatorUrl
  });

  return {
    id: raw.id,
    pageUrl: redactUrl(raw.pageUrl),
    method: raw.method.toUpperCase(),
    url: safeUrl,
    resourceType: raw.resourceType ?? "fetch",
    status: raw.status,
    statusText: raw.statusText,
    requestHeadersRedacted: redactHeaders(raw.requestHeaders),
    responseHeadersRedacted: redactHeaders(raw.responseHeaders),
    requestBodySummary: summarizeBody(raw.requestBody),
    responseBodySummary: raw.responseBodySummary ?? "metadata-only",
    responseBodyCaptured: "metadata-only",
    initiator: raw.initiatorUrl
      ? { type: "script", stackFrames: [{ url: raw.initiatorUrl }] }
      : undefined,
    timing: { startedAt: new Date("2026-06-05T12:00:00.000Z").toISOString(), durationMs: 42 },
    fingerprint,
    likelyApiRole: classifyApi(raw.method, raw.url),
    redactionStatus: "redacted"
  };
}

export function sampleApiCalls(): ApiCall[] {
  return [
    normalizeApiCall({
      id: "api-call-1",
      pageUrl: "http://localhost:3000/dashboard",
      method: "GET",
      url: "http://localhost:3000/api/users?token=secret-token&limit=25",
      status: 200,
      requestHeaders: {
        Authorization: "Bearer live-token",
        "Content-Type": "application/json"
      },
      responseHeaders: { "Content-Type": "application/json" },
      responseBodySummary: "{\"users\":[{\"id\":\"string(3)\"}]}",
      initiatorUrl: "http://localhost:3000/src/routes/dashboard.tsx"
    }),
    normalizeApiCall({
      id: "api-call-2",
      pageUrl: "http://localhost:3000/dashboard",
      method: "POST",
      url: "http://localhost:3000/api/orders",
      status: 500,
      requestHeaders: {
        Cookie: "session=live-cookie",
        "X-CSRF-Token": "csrf-secret"
      },
      requestBody: { orderId: 123, csrfToken: "csrf-secret" },
      responseHeaders: { "Content-Type": "application/json" },
      responseBodySummary: "{\"error\":\"string(21)\"}",
      initiatorUrl: "http://localhost:3000/src/lib/orders.ts"
    })
  ];
}

function classifyApi(method: string, url: string): ApiCall["likelyApiRole"] {
  if (/auth|login|session/i.test(url)) return "auth";
  if (/analytics|telemetry/i.test(url)) return "analytics";
  if (!["GET", "HEAD"].includes(method.toUpperCase())) return "mutation";
  return "data";
}
