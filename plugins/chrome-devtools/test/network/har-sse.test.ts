import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNoKnownSecrets } from "../../src/core/redaction-policy.js";
import { importHarApiCalls, parseSseEvents, summarizeSseStream } from "../../src/network/har-sse.js";

const HAR_FIXTURE = "test/fixtures/network/api-workbench.har.json";
const SSE_FIXTURE = "test/fixtures/network/events.sse";

test("HAR fixture import extracts redacted API call summaries", () => {
  const har = JSON.parse(readFileSync(HAR_FIXTURE, "utf8")) as unknown;
  const result = importHarApiCalls(har, { idPrefix: "fixture" });

  assert.equal(result.source, "har-fixture");
  assert.equal(result.calls.length, 2);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(
    result.calls.map((call) => call.method),
    ["GET", "POST"]
  );
  assert.deepEqual(
    result.calls.map((call) => call.status),
    [200, 201]
  );

  const getCall = result.calls[0];
  assert.match(getCall.url, /access_token=%5BREDACTED%5D/);
  assert.equal(getCall.requestHeadersRedacted.Authorization, "[REDACTED]");
  assert.equal(getCall.responseHeadersRedacted?.["Set-Cookie"], "[REDACTED]");
  assert.equal(getCall.responseBodyCaptured, "metadata-only");
  assert.match(getCall.responseBodySummary ?? "", /metadata-only/);

  const postCall = result.calls[1];
  assert.match(postCall.requestBodySummary ?? "", /customerEmail/);
  assert.match(postCall.requestBodySummary ?? "", /token/);
  assert.doesNotMatch(postCall.requestBodySummary ?? "", /ada@example.com|sk-live-har-secret/);

  const serialized = JSON.stringify(result);
  assert.deepEqual(assertNoKnownSecrets(serialized), []);
  assert.doesNotMatch(serialized, /Bearer live-har-token|session=live-har-cookie|sk-live-har-secret|ada@example.com|image-bytes/);
});

test("SSE fixture parser summarizes events without payload values", () => {
  const fixture = readFileSync(SSE_FIXTURE, "utf8");
  const events = parseSseEvents(fixture);
  const stream = summarizeSseStream(fixture);

  assert.equal(events.length, 3);
  assert.equal(stream.eventCount, 3);
  assert.equal(stream.commentCount, 1);
  assert.deepEqual(stream.eventTypes, {
    "auth-refresh": 1,
    "inventory-update": 1,
    message: 1
  });

  assert.equal(events[0].hasId, true);
  assert.equal(events[0].retryMs, 5000);
  assert.match(events[0].dataSummary, /token/);
  assert.match(events[0].dataSummary, /\[REDACTED\]/);

  assert.equal(events[1].dataLineCount, 2);
  assert.match(events[1].dataSummary, /items/);

  const serialized = JSON.stringify(stream);
  assert.deepEqual(assertNoKnownSecrets(serialized), []);
  assert.doesNotMatch(serialized, /sk-live-sse-secret|ada@example.com|super-sensitive-event-id|Ada Lovelace|blue-widget/);
});
