import type { TargetRef } from "./types.js";

export type TargetPreview = {
  source: TargetRef["source"];
  scopeStatus: TargetRef["scopeStatus"];
  profileName?: string;
  title?: string;
  safeUrl?: string;
  lastSeenAt?: string;
  matchReason?: string;
};

export function previewTarget(target: TargetRef): TargetPreview {
  return {
    source: target.source,
    scopeStatus: target.scopeStatus,
    profileName: target.profileName,
    title: target.title,
    safeUrl: safeUrl(target.url),
    lastSeenAt: target.lastSeenAt,
    matchReason: target.matchReason
  };
}

export function requireUnambiguousTarget(candidates: TargetRef[]): TargetRef {
  const selected = candidates.filter((target) => target.scopeStatus === "selected");
  if (selected.length === 1) return selected[0]!;
  const scoped = candidates.filter((target) => target.scopeStatus === "candidate");
  if (scoped.length === 1 && selected.length === 0) return scoped[0]!;
  throw new Error(`Ambiguous target selection: ${selected.length} selected, ${scoped.length} candidates`);
}

export function safeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0];
  }
}
