import type { ApiCall } from "./types.js";

export type DebugRunDiff = {
  api: {
    added: string[];
    removed: string[];
    statusChanged: Array<{ id: string; before?: number; after?: number }>;
  };
  console: {
    beforeCount: number;
    afterCount: number;
  };
};

export function diffApiCalls(before: ApiCall[], after: ApiCall[]): DebugRunDiff["api"] {
  const beforeMap = new Map(before.map((call) => [call.fingerprint, call]));
  const afterMap = new Map(after.map((call) => [call.fingerprint, call]));
  const added = [...afterMap.keys()].filter((key) => !beforeMap.has(key));
  const removed = [...beforeMap.keys()].filter((key) => !afterMap.has(key));
  const statusChanged = [...afterMap.entries()]
    .filter(([key, call]) => beforeMap.has(key) && beforeMap.get(key)?.status !== call.status)
    .map(([key, call]) => ({ id: key, before: beforeMap.get(key)?.status, after: call.status }));
  return { added, removed, statusChanged };
}

export function diffRuns(before: { apiCalls: ApiCall[]; consoleCount: number }, after: { apiCalls: ApiCall[]; consoleCount: number }): DebugRunDiff {
  return {
    api: diffApiCalls(before.apiCalls, after.apiCalls),
    console: {
      beforeCount: before.consoleCount,
      afterCount: after.consoleCount
    }
  };
}
