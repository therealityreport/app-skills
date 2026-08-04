import test from "node:test";
import assert from "node:assert/strict";
import { sampleApiCalls } from "../../src/network/api-call-inventory.js";
import { apiCallToCurl, assertCurlIsSafe } from "../../src/network/curl-export.js";
import { captureResponseBody } from "../../src/network/response-capture.js";

test("API inventory produces redacted cURL without credential headers", () => {
  for (const call of sampleApiCalls()) {
    const curl = apiCallToCurl(call);
    assertCurlIsSafe(curl);
    assert.doesNotMatch(curl, /Authorization|Cookie|Bearer live-token|session=live-cookie|csrf-secret/i);
  }
});

test("response body capture is metadata-only by default and bounded when enabled", () => {
  assert.equal(captureResponseBody("{\"token\":\"secret\"}").captured, "metadata-only");
  const captured = captureResponseBody("{\"token\":\"secret\",\"ok\":true}", {
    includeBody: true,
    maxBytes: 100,
    mimeType: "application/json"
  });
  assert.equal(captured.captured, "bounded-redacted");
  assert.doesNotMatch(JSON.stringify(captured.body), /secret/);
  assert.equal(captureResponseBody("x".repeat(10), { includeBody: true, maxBytes: 2, mimeType: "text/plain" }).captured, "blocked");
});
