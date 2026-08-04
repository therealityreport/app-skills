import test from "node:test";
import assert from "node:assert/strict";
import { assertNoKnownSecrets, redactHeaders, redactUrl, summarizeBody } from "../../src/core/redaction-policy.js";

test("redacts secret headers and query parameters", () => {
  const headers = redactHeaders({
    Authorization: "Bearer live-token",
    Cookie: "session=live-cookie",
    "Content-Type": "application/json"
  });
  assert.equal(headers.Authorization, "[REDACTED]");
  assert.equal(headers.Cookie, "[REDACTED]");
  assert.equal(headers["Content-Type"], "application/json");

  const url = redactUrl("http://localhost:3000/api/users?token=secret&limit=25");
  assert.match(url, /token=%5BREDACTED%5D/);
  assert.deepEqual(assertNoKnownSecrets(url), []);
});

test("summarizes body shape without leaking values", () => {
  const summary = summarizeBody({ apiKey: "sk-secret", count: 2, nested: { ok: true } });
  assert.match(summary, /apiKey/);
  assert.doesNotMatch(summary, /sk-secret/);
});
