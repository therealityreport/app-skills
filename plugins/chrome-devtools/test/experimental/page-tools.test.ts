import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertNoKnownSecrets } from "../../src/core/redaction-policy.js";
import {
  listThirdPartyPageTools,
  listWebMcpTools,
  type PageToolDiscoveryResult,
  type RawPageToolRegistry
} from "../../src/experimental/page-tools.js";

test("lists WebMCP page tools as untrusted list-only discovery results", async () => {
  const fixture = await readFixture("webmcp-tools.json");
  const result = listWebMcpTools(fixture, { generatedAt: "2026-06-08T12:00:00.000Z" });

  assert.equal(result.schemaVersion, "page-tools.discovery.v1");
  assert.equal(result.source, "webmcp");
  assert.equal(result.listOnly, true);
  assert.equal(result.availability.chromeMinimumVersion, 149);
  assert.equal(result.availability.runtimeStatus, "eligible");
  assert.equal(result.availability.flagsAvailable, true);
  assert.equal(result.tools.length, 1);

  const [tool] = result.tools;
  assert.equal(tool?.source, "webmcp");
  assert.equal(tool?.trust, "untrusted");
  assert.equal(tool?.status, "listed");
  assert.equal(tool?.listOnly, true);
  assert.equal(tool?.provider?.origin, "https://app.example.test");
  assert.equal(tool?.inputSchemaSummary?.properties?.city.type, "string");
});

test("lists third-party page tools as untrusted list-only discovery results", async () => {
  const fixture = await readFixture("third-party-tools.json");
  const result = listThirdPartyPageTools(fixture, { generatedAt: "2026-06-08T12:00:00.000Z" });

  assert.equal(result.source, "third-party");
  assert.equal(result.availability.discoveryStatus, "listed-only");
  assert.equal(result.availability.runtimeStatus, "unknown");
  assert.deepEqual(result.availability.requiredFlags, []);
  assert.equal(result.tools.length, 1);

  const [tool] = result.tools;
  assert.equal(tool?.source, "third-party");
  assert.equal(tool?.trust, "untrusted");
  assert.equal(tool?.provider?.origin, "chrome-extension://fmkadmapgofadopljbjfkapdkoienihi");
  assert.equal(tool?.inputSchemaSummary?.properties?.componentId.valueHints?.default, "string(12)");
});

test("page tool execution is disabled by default and requires future experimental enablement", async () => {
  const webmcp = listWebMcpTools(await readFixture("webmcp-tools.json"));
  const thirdParty = listThirdPartyPageTools(await readFixture("third-party-tools.json"));

  for (const result of [webmcp, thirdParty]) {
    assertExecutionDisabled(result);
    for (const tool of result.tools) {
      assertExecutionDisabled(tool);
      assert.match(tool.warnings.join(" "), /discovery-only/i);
    }
  }
});

test("schema summaries redact sensitive defaults and examples", async () => {
  const webmcp = listWebMcpTools(await readFixture("webmcp-tools.json"));
  const thirdParty = listThirdPartyPageTools(await readFixture("third-party-tools.json"));
  const safeJson = JSON.stringify([webmcp, thirdParty]);

  assert.match(safeJson, /\[REDACTED\]/);
  assert.doesNotMatch(safeJson, /sk-live-webmcp-secret/);
  assert.doesNotMatch(safeJson, /Bearer sensitive-live-token/);
  assert.doesNotMatch(safeJson, /session=abc123/);
  assert.doesNotMatch(safeJson, /secret-token/);
  assert.deepEqual(assertNoKnownSecrets(safeJson), []);
  assert.equal(webmcp.tools[0]?.redactionStatus, "redacted");
  assert.equal(thirdParty.tools[0]?.redactionStatus, "redacted");
  assert.equal(webmcp.tools[0]?.inputSchemaSummary?.properties?.apiKey.valueHints?.default, "[REDACTED]");
  assert.deepEqual(thirdParty.tools[0]?.inputSchemaSummary?.properties?.authToken.valueHints?.examples, ["[REDACTED]"]);
});

async function readFixture(name: string): Promise<RawPageToolRegistry> {
  const fixturePath = join(process.cwd(), "test", "fixtures", "experimental", name);
  return JSON.parse(await readFile(fixturePath, "utf8")) as RawPageToolRegistry;
}

function assertExecutionDisabled(value: Pick<PageToolDiscoveryResult, "execution">): void {
  assert.equal(value.execution.status, "disabled");
  assert.equal(value.execution.enabled, false);
  assert.equal(value.execution.disabledByDefault, true);
  assert.equal(value.execution.requiresExplicitExperimentalEnablement, true);
  assert.equal(value.execution.experimentalEnablementStatus, "not-implemented");
}
