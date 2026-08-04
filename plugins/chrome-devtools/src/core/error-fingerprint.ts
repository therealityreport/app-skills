import { createHash } from "node:crypto";

export type FingerprintInput = {
  kind: "console" | "runtime" | "network" | "api";
  message?: string;
  stack?: string;
  method?: string;
  url?: string;
  status?: number;
  initiator?: string;
};

export function fingerprintError(input: FingerprintInput): string {
  const normalized = [
    input.kind,
    normalize(input.message),
    normalizeStack(input.stack),
    input.method?.toUpperCase() ?? "",
    normalizeUrl(input.url),
    input.status == null ? "" : Math.floor(input.status / 100) + "xx",
    normalize(input.initiator)
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function dedupeByFingerprint<T extends { fingerprint: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.fingerprint)) return false;
    seen.add(item.fingerprint);
    return true;
  });
}

function normalize(value = ""): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/\d+/g, "N").trim();
}

function normalizeStack(stack = ""): string {
  return stack
    .split("\n")
    .slice(0, 5)
    .map((line) => line.replace(/:\d+:\d+/g, ":N:N").trim())
    .join("|")
    .toLowerCase();
}

function normalizeUrl(value = ""): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\d+/g, "N")}`;
  } catch {
    return normalize(value);
  }
}
