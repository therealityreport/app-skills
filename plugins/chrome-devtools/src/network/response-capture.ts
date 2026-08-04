import { redactJsonValue } from "../core/redaction-policy.js";

export type ResponseCaptureOptions = {
  includeBody?: boolean;
  maxBytes?: number;
  mimeType?: string;
};

export type ResponseCaptureResult = {
  captured: "metadata-only" | "bounded-redacted" | "blocked";
  summary: string;
  body?: unknown;
};

const ALLOWED_MIME_RE = /^(application\/json|text\/plain)/i;

export function captureResponseBody(body: string, options: ResponseCaptureOptions = {}): ResponseCaptureResult {
  if (!options.includeBody) {
    return { captured: "metadata-only", summary: `metadata-only (${body.length} bytes available)` };
  }
  const maxBytes = options.maxBytes ?? 65536;
  if (body.length > maxBytes) {
    return { captured: "blocked", summary: `blocked: response body ${body.length} bytes exceeds ${maxBytes}` };
  }
  if (options.mimeType && !ALLOWED_MIME_RE.test(options.mimeType)) {
    return { captured: "blocked", summary: `blocked: unsupported MIME ${options.mimeType}` };
  }
  try {
    return {
      captured: "bounded-redacted",
      summary: `bounded-redacted (${body.length} bytes)`,
      body: redactJsonValue(JSON.parse(body))
    };
  } catch {
    return {
      captured: "bounded-redacted",
      summary: `bounded-redacted text(${body.length})`,
      body: "text"
    };
  }
}
