import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ApiCall, DebugRun, TimelineEvent } from "./types.js";

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeNdjson(path: string, rows: unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
}

export function readNdjson<T>(path: string): T[] {
  const text = readFileSync(path, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line) as T);
}

export function writeDebugRun(root: string, run: DebugRun, apiCalls: ApiCall[], timeline: TimelineEvent[]): void {
  mkdirSync(root, { recursive: true });
  writeJson(join(root, "run.json"), run);
  writeJson(join(root, "target.json"), run.target);
  writeNdjson(join(root, "api-calls.ndjson"), apiCalls);
  writeNdjson(join(root, "timeline.ndjson"), timeline);
  writeJson(join(root, "api-summary.json"), {
    count: apiCalls.length,
    failures: apiCalls.filter((call) => call.status && call.status >= 400).length
  });
}

export function readApiCalls(runRoot: string): ApiCall[] {
  return readNdjson<ApiCall>(join(runRoot, "api-calls.ndjson"));
}
