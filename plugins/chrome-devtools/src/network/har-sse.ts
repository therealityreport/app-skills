import { fingerprintError } from "../core/error-fingerprint.js";
import { REDACTED, redactHeaders, redactUrl, summarizeBody } from "../core/redaction-policy.js";
import type { ApiCall } from "../core/types.js";

export type HarImportOptions = {
  pageUrl?: string;
  idPrefix?: string;
  includeAssets?: boolean;
};

export type HarSkippedEntry = {
  index: number;
  reason: "not-api" | "missing-request-url";
  url?: string;
};

export type HarImportResult = {
  source: "har-fixture";
  calls: ApiCall[];
  skipped: HarSkippedEntry[];
  redactionStatus: "redacted";
};

export type SseEventSummary = {
  index: number;
  eventType: string;
  hasId: boolean;
  retryMs?: number;
  dataSummary: string;
  dataByteLength: number;
  dataLineCount: number;
  fingerprint: string;
  redactionStatus: "redacted";
};

export type SseStreamSummary = {
  source: "sse-fixture";
  eventCount: number;
  eventTypes: Record<string, number>;
  commentCount: number;
  totalDataBytes: number;
  events: SseEventSummary[];
  redactionStatus: "redacted";
};

type JsonRecord = Record<string, unknown>;

export function importHarApiCalls(har: unknown, options: HarImportOptions = {}): HarImportResult {
  const root = asRecord(har);
  const log = asRecord(root.log);
  const entriesValue = log.entries;
  if (!Array.isArray(entriesValue)) {
    throw new Error("Invalid HAR: log.entries[] is required");
  }

  const pageUrls = collectHarPageUrls(log);
  const calls: ApiCall[] = [];
  const skipped: HarSkippedEntry[] = [];

  entriesValue.forEach((entryValue, index) => {
    const entry = asRecord(entryValue);
    const request = asRecord(entry.request);
    const url = stringField(request.url);
    if (!url) {
      skipped.push({ index, reason: "missing-request-url" });
      return;
    }
    if (!options.includeAssets && !isLikelyApiEntry(entry)) {
      skipped.push({ index, reason: "not-api", url: redactUrl(url) });
      return;
    }
    calls.push(harEntryToApiCall(entry, index, pageUrls, options));
  });

  return { source: "har-fixture", calls, skipped, redactionStatus: "redacted" };
}

export function parseSseEvents(input: string): SseEventSummary[] {
  return parseSseFixture(input).events;
}

export function summarizeSseStream(input: string): SseStreamSummary {
  const parsed = parseSseFixture(input);
  const eventTypes: Record<string, number> = {};
  let totalDataBytes = 0;
  for (const event of parsed.events) {
    eventTypes[event.eventType] = (eventTypes[event.eventType] ?? 0) + 1;
    totalDataBytes += event.dataByteLength;
  }
  return {
    source: "sse-fixture",
    eventCount: parsed.events.length,
    eventTypes,
    commentCount: parsed.commentCount,
    totalDataBytes,
    events: parsed.events,
    redactionStatus: "redacted"
  };
}

function harEntryToApiCall(
  entry: JsonRecord,
  index: number,
  pageUrls: Map<string, string>,
  options: HarImportOptions
): ApiCall {
  const request = asRecord(entry.request);
  const response = asRecord(entry.response);
  const method = (stringField(request.method) ?? "GET").toUpperCase();
  const url = stringField(request.url) ?? "about:blank";
  const safeUrl = redactUrl(url);
  const status = numberField(response.status);
  const initiatorUrl = extractHarInitiatorUrl(entry);

  return {
    id: `${options.idPrefix ?? "har"}-${index + 1}`,
    pageUrl: redactUrl(resolveHarPageUrl(entry, pageUrls, options.pageUrl, url)),
    method,
    url: safeUrl,
    resourceType: classifyHarResourceType(entry),
    status,
    statusText: stringField(response.statusText),
    requestHeadersRedacted: redactHarHeaders(headersArrayToRecord(request.headers)),
    responseHeadersRedacted: redactHarHeaders(headersArrayToRecord(response.headers)),
    requestBodySummary: summarizeHarPostData(request.postData),
    responseBodySummary: summarizeHarContent(response.content),
    responseBodyCaptured: "metadata-only",
    initiator: initiatorUrl ? { type: "script", stackFrames: [{ url: redactUrl(initiatorUrl) }] } : undefined,
    timing: {
      startedAt: stringField(entry.startedDateTime) ?? new Date("2026-06-05T12:00:00.000Z").toISOString(),
      durationMs: nonNegativeNumber(entry.time),
      transferSizeBytes: summarizeTransferBytes(response)
    },
    fingerprint: fingerprintError({
      kind: "api",
      method,
      url: safeUrl,
      status,
      initiator: initiatorUrl ? redactUrl(initiatorUrl) : undefined
    }),
    likelyApiRole: classifyApiRole(method, url),
    redactionStatus: "redacted"
  };
}

function isLikelyApiEntry(entry: JsonRecord): boolean {
  const request = asRecord(entry.request);
  const response = asRecord(entry.response);
  const method = (stringField(request.method) ?? "GET").toUpperCase();
  const url = stringField(request.url) ?? "";
  const resourceType = stringField(entry._resourceType)?.toLowerCase();
  if (resourceType === "xhr" || resourceType === "fetch") return true;
  if (hasApiPath(url)) return true;

  const requestHeaders = headersArrayToRecord(request.headers);
  const responseHeaders = headersArrayToRecord(response.headers);
  const requestType = headerValue(requestHeaders, "content-type") ?? headerValue(requestHeaders, "accept") ?? "";
  const responseType =
    headerValue(responseHeaders, "content-type") ?? stringField(asRecord(response.content).mimeType) ?? "";
  if (isApiMime(requestType) || isApiMime(responseType)) return true;
  if (!["GET", "HEAD"].includes(method) && !isStaticUrl(url)) return true;
  return false;
}

function classifyHarResourceType(entry: JsonRecord): ApiCall["resourceType"] {
  const explicit = stringField(entry._resourceType)?.toLowerCase();
  if (explicit === "xhr" || explicit === "fetch" || explicit === "document" || explicit === "script") {
    return explicit;
  }
  const request = asRecord(entry.request);
  const response = asRecord(entry.response);
  const requestHeaders = headersArrayToRecord(request.headers);
  const responseHeaders = headersArrayToRecord(response.headers);
  const mime = headerValue(responseHeaders, "content-type") ?? stringField(asRecord(response.content).mimeType) ?? "";
  const accept = headerValue(requestHeaders, "accept") ?? "";
  const url = stringField(request.url) ?? "";
  if (hasApiPath(url) || isApiMime(mime) || isApiMime(accept)) return "fetch";
  if (/javascript|ecmascript/i.test(mime)) return "script";
  if (/html/i.test(mime)) return "document";
  return "other";
}

function classifyApiRole(method: string, url: string): ApiCall["likelyApiRole"] {
  if (/auth|login|session/i.test(url)) return "auth";
  if (/analytics|telemetry/i.test(url)) return "analytics";
  if (isStaticUrl(url)) return "asset";
  if (!["GET", "HEAD"].includes(method.toUpperCase())) return "mutation";
  if (hasApiPath(url)) return "data";
  return "unknown";
}

function parseSseFixture(input: string): { events: SseEventSummary[]; commentCount: number } {
  const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const events: SseEventSummary[] = [];
  let commentCount = 0;
  let eventType = "message";
  let hasId = false;
  let retryMs: number | undefined;
  let dataLines: string[] = [];

  const flush = (): void => {
    if (dataLines.length === 0) {
      eventType = "message";
      hasId = false;
      retryMs = undefined;
      return;
    }
    const data = dataLines.join("\n");
    const dataSummary = summarizeSseData(data);
    const safeEventType = normalizeSseEventType(eventType);
    events.push({
      index: events.length,
      eventType: safeEventType,
      hasId,
      retryMs,
      dataSummary,
      dataByteLength: Buffer.byteLength(data),
      dataLineCount: dataLines.length,
      fingerprint: fingerprintError({ kind: "network", message: `${safeEventType}:${dataSummary}` }),
      redactionStatus: "redacted"
    });
    eventType = "message";
    hasId = false;
    retryMs = undefined;
    dataLines = [];
  };

  for (const rawLine of lines) {
    if (rawLine === "") {
      flush();
      continue;
    }
    if (rawLine.startsWith(":")) {
      commentCount += 1;
      continue;
    }

    const colonIndex = rawLine.indexOf(":");
    const field = colonIndex === -1 ? rawLine : rawLine.slice(0, colonIndex);
    let value = colonIndex === -1 ? "" : rawLine.slice(colonIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") eventType = value || "message";
    if (field === "data") dataLines.push(value);
    if (field === "id") hasId = value.length > 0;
    if (field === "retry") {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed >= 0) retryMs = parsed;
    }
  }
  flush();

  return { events, commentCount };
}

function summarizeSseData(data: string): string {
  if (data === "") return "empty";
  const parsed = tryParseJson(data);
  if (parsed !== undefined) return summarizeBody(parsed);
  if (/^\s*[\[{]/.test(data)) return `json-fragment(${data.length} chars)`;
  return `text(${data.length} chars)`;
}

function summarizeHarPostData(postDataValue: unknown): string {
  const postData = asRecord(postDataValue);
  const text = stringField(postData.text);
  if (text != null) {
    return summarizePayloadText(text, stringField(postData.mimeType));
  }
  const params = postData.params;
  if (Array.isArray(params) && params.length > 0) {
    const shape: JsonRecord = {};
    for (const paramValue of params) {
      const param = asRecord(paramValue);
      const name = stringField(param.name);
      if (!name) continue;
      shape[name] = stringField(param.value) ?? "present";
    }
    return summarizeBody(shape);
  }
  return "empty";
}

function summarizePayloadText(text: string, mimeType?: string): string {
  if (text === "") return "empty";
  const parsed = tryParseJson(text);
  if (parsed !== undefined) return summarizeBody(parsed);
  if (isFormMime(mimeType) || looksUrlEncoded(text)) {
    const params = new URLSearchParams(text);
    const shape: JsonRecord = {};
    for (const [key, value] of params.entries()) {
      shape[key] = value;
    }
    if (Object.keys(shape).length > 0) return summarizeBody(shape);
  }
  const mimeSuffix = mimeType ? `; mime=${safeMime(mimeType)}` : "";
  return `text(${text.length} chars${mimeSuffix})`;
}

function summarizeHarContent(contentValue: unknown): string {
  const content = asRecord(contentValue);
  const text = stringField(content.text);
  const size = nonNegativeNumber(content.size) ?? (text == null ? undefined : Buffer.byteLength(text));
  const mimeType = stringField(content.mimeType);
  const details = [size == null ? undefined : `${size} bytes`, mimeType ? `mime=${safeMime(mimeType)}` : undefined].filter(
    Boolean
  );
  return details.length > 0 ? `metadata-only (${details.join(", ")})` : "metadata-only";
}

function redactHarHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted = redactHeaders(headers);
  for (const [key, value] of Object.entries(headers)) {
    if (/^set-cookie2?$/i.test(key)) {
      redacted[key] = REDACTED;
      continue;
    }
    if (redacted[key] !== REDACTED && looksAbsoluteUrl(value)) {
      redacted[key] = redactUrl(value);
    }
  }
  return redacted;
}

function headersArrayToRecord(headersValue: unknown): Record<string, string> {
  if (!Array.isArray(headersValue)) return {};
  const headers: Record<string, string> = {};
  for (const headerValue of headersValue) {
    const header = asRecord(headerValue);
    const name = stringField(header.name);
    const value = stringField(header.value);
    if (!name || value == null) continue;
    headers[name] = headers[name] == null ? value : `${headers[name]}, ${value}`;
  }
  return headers;
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match?.[1];
}

function collectHarPageUrls(log: JsonRecord): Map<string, string> {
  const pages = new Map<string, string>();
  if (!Array.isArray(log.pages)) return pages;
  for (const pageValue of log.pages) {
    const page = asRecord(pageValue);
    const id = stringField(page.id);
    const title = stringField(page.title);
    if (id && title && looksAbsoluteUrl(title)) {
      pages.set(id, title);
    }
  }
  return pages;
}

function resolveHarPageUrl(entry: JsonRecord, pageUrls: Map<string, string>, pageUrlOption: string | undefined, requestUrl: string): string {
  if (pageUrlOption) return pageUrlOption;
  const pageRef = stringField(entry.pageref);
  if (pageRef && pageUrls.has(pageRef)) return pageUrls.get(pageRef) as string;
  try {
    return new URL(requestUrl).origin;
  } catch {
    return "about:blank";
  }
}

function extractHarInitiatorUrl(entry: JsonRecord): string | undefined {
  const initiator = asRecord(entry._initiator);
  const stack = asRecord(initiator.stack);
  const callFrames = stack.callFrames;
  if (!Array.isArray(callFrames)) return undefined;
  for (const frameValue of callFrames) {
    const frame = asRecord(frameValue);
    const url = stringField(frame.url);
    if (url) return url;
  }
  return undefined;
}

function summarizeTransferBytes(response: JsonRecord): number | undefined {
  const bodySize = nonNegativeNumber(response.bodySize);
  const headersSize = nonNegativeNumber(response.headersSize);
  if (bodySize == null && headersSize == null) return undefined;
  return (bodySize ?? 0) + (headersSize ?? 0);
}

function isApiMime(value: string): boolean {
  return /(application\/json|application\/graphql|application\/x-ndjson|text\/event-stream)/i.test(value);
}

function isFormMime(value: string | undefined): boolean {
  return value != null && /application\/x-www-form-urlencoded|multipart\/form-data/i.test(value);
}

function hasApiPath(input: string): boolean {
  try {
    const url = new URL(input);
    return /(^|\/)(api|graphql|rpc|trpc)(\/|$)/i.test(url.pathname);
  } catch {
    return /(^|\/)(api|graphql|rpc|trpc)(\/|$)/i.test(input);
  }
}

function isStaticUrl(input: string): boolean {
  try {
    return /\.(avif|css|gif|ico|jpg|jpeg|js|map|png|svg|ttf|webp|woff2?)$/i.test(new URL(input).pathname);
  } catch {
    return /\.(avif|css|gif|ico|jpg|jpeg|js|map|png|svg|ttf|webp|woff2?)$/i.test(input);
  }
}

function looksUrlEncoded(text: string): boolean {
  return /^[^=&\s]+=[^&]*(?:&[^=&\s]+=[^&]*)*$/.test(text);
}

function looksAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeSseEventType(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z0-9][a-z0-9_.:-]{0,63}$/i.test(trimmed)) return trimmed;
  return trimmed === "" ? "message" : "custom";
}

function safeMime(value: string): string {
  const [mime] = value.split(";");
  const trimmed = mime.trim().toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(trimmed) ? trimmed : "unknown";
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const number = numberField(value);
  return number != null && number >= 0 ? number : undefined;
}

function asRecord(value: unknown): JsonRecord {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}
