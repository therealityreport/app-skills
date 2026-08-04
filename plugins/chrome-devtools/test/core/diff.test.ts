import test from "node:test";
import assert from "node:assert/strict";
import { diffApiCalls } from "../../src/core/debug-run-diff.js";
import type { ApiCall } from "../../src/core/types.js";

test("debug run diff reports API status changes", () => {
  const base = {
    id: "a",
    pageUrl: "http://localhost",
    method: "GET",
    url: "http://localhost/api",
    resourceType: "fetch",
    requestHeadersRedacted: {},
    responseBodyCaptured: "metadata-only",
    fingerprint: "same",
    redactionStatus: "redacted"
  } satisfies ApiCall;
  const diff = diffApiCalls([{ ...base, status: 500 }], [{ ...base, status: 200 }]);
  assert.deepEqual(diff.statusChanged, [{ id: "same", before: 500, after: 200 }]);
});
