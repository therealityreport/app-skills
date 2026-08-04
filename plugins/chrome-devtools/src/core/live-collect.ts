import { join } from "node:path";
import { writeDebugRun, writeJson, writeNdjson } from "./evidence-store.js";
import type { ApiCall, DebugRun, EvidenceItem, TimelineEvent } from "./types.js";

export const LIVE_COLLECT_EVIDENCE_KINDS = [
  "network",
  "console",
  "snapshot",
  "screenshot",
  "lighthouse",
  "performance"
] as const;

export type LiveCollectEvidenceKind = (typeof LIVE_COLLECT_EVIDENCE_KINDS)[number];

export type LiveCollectPlanInput = {
  routeToken: string;
  outputRoot?: string;
  evidenceKinds?: LiveCollectEvidenceKind[];
  now?: () => Date;
  dryRun?: boolean;
  symptom?: string;
};

export type LiveCollectPlannedArtifact = {
  kind: LiveCollectEvidenceKind | "run" | "target" | "timeline" | "api-summary";
  path: string;
  redaction: "metadata-only" | "redacted" | "not-applicable";
};

export type LiveCollectPlan = {
  mode: "dry-run" | "live";
  routeToken: string;
  outputRoot: string;
  evidenceKinds: LiveCollectEvidenceKind[];
  artifacts: LiveCollectPlannedArtifact[];
  safety: string[];
};

const DEFAULT_EVIDENCE_KINDS: LiveCollectEvidenceKind[] = ["network", "console", "snapshot", "screenshot"];

export function createLiveCollectPlan(input: LiveCollectPlanInput): LiveCollectPlan {
  const routeToken = assertRouteToken(input.routeToken);
  const outputRoot = input.outputRoot?.trim() || ".chrome-devtools-runs/live-collect";
  const evidenceKinds = normalizeEvidenceKinds(input.evidenceKinds);
  const artifacts = baseArtifacts(outputRoot);

  for (const kind of evidenceKinds) {
    artifacts.push(artifactForKind(outputRoot, kind));
  }

  return {
    mode: input.dryRun === false ? "live" : "dry-run",
    routeToken,
    outputRoot,
    evidenceKinds,
    artifacts,
    safety: [
      "route-token-required",
      "redaction-first",
      "metadata-first-responses",
      "bounded-artifacts",
      "no-browser-attach-in-dry-run"
    ]
  };
}

export function writeLiveCollectDryRunBundle(plan: LiveCollectPlan, now = new Date()): void {
  if (plan.mode !== "dry-run") {
    throw new Error("writeLiveCollectDryRunBundle only writes dry-run bundles.");
  }

  const createdAt = now.toISOString();
  const evidence = plan.evidenceKinds.map((kind, index): EvidenceItem => {
    const artifact = artifactForKind(plan.outputRoot, kind);
    return {
      id: `evidence-${index + 1}`,
      kind: mapEvidenceKind(kind),
      source: "upstream-chrome-devtools-mcp",
      route: "mcp",
      capabilityGroup: kind === "performance" ? "performance" : kind === "network" ? "network" : "evidence",
      capturedAt: createdAt,
      path: artifact.path,
      summary: `Planned ${kind} evidence via gated upstream Chrome DevTools MCP.`,
      redactionStatus: kind === "network" || kind === "console" ? "redacted" : "not-needed"
    };
  });

  const timeline: TimelineEvent[] = [
    {
      id: "timeline-1",
      at: createdAt,
      kind: "tool",
      summary: "Created dry-run live collect plan.",
      metadata: {
        routeToken: plan.routeToken,
        evidenceKinds: plan.evidenceKinds
      }
    }
  ];

  const run: DebugRun = {
    id: `live-collect-${createdAt.replace(/[:.]/g, "-")}`,
    createdAt,
    mode: "local",
    target: {
      source: "manual",
      scopeStatus: "selected",
      matchReason: "route-token"
    },
    symptom: "Dry-run live evidence collection",
    evidence,
    hypotheses: [],
    actions: [
      {
        id: "action-1",
        kind: "collect",
        description: "Plan gated upstream Chrome DevTools MCP evidence collection.",
        result: "success"
      }
    ],
    result: {
      status: "open",
      summary: "Dry-run bundle only; no browser was attached."
    }
  };

  writeDebugRun(plan.outputRoot, run, sampleApiCallsForPlan(plan, createdAt), timeline);
  writeJson(join(plan.outputRoot, "live-collect-plan.json"), plan);
  writeNdjson(
    join(plan.outputRoot, "console.ndjson"),
    plan.evidenceKinds.includes("console")
      ? [
          {
            level: "info",
            text: "Dry-run console placeholder. Live console messages require delegated upstream execution.",
            redactionStatus: "redacted"
          }
        ]
      : []
  );
  writeJson(join(plan.outputRoot, "dom-snapshot.json"), {
    mode: "dry-run",
    message: "Live DOM snapshot requires delegated upstream execution."
  });
  writeJson(join(plan.outputRoot, "screenshot.json"), {
    mode: "dry-run",
    message: "Live screenshot requires delegated upstream execution."
  });
}

function normalizeEvidenceKinds(kinds: LiveCollectEvidenceKind[] = DEFAULT_EVIDENCE_KINDS): LiveCollectEvidenceKind[] {
  const unique = new Set<LiveCollectEvidenceKind>();
  for (const kind of kinds) {
    if (!LIVE_COLLECT_EVIDENCE_KINDS.includes(kind)) throw new Error(`Unsupported live evidence kind: ${kind}`);
    unique.add(kind);
  }
  return [...unique];
}

function baseArtifacts(outputRoot: string): LiveCollectPlannedArtifact[] {
  return [
    artifact(outputRoot, "run", "run.json", "not-applicable"),
    artifact(outputRoot, "target", "target.json", "not-applicable"),
    artifact(outputRoot, "timeline", "timeline.ndjson", "not-applicable"),
    artifact(outputRoot, "api-summary", "api-summary.json", "redacted")
  ];
}

function artifactForKind(outputRoot: string, kind: LiveCollectEvidenceKind): LiveCollectPlannedArtifact {
  if (kind === "network") return artifact(outputRoot, kind, "api-calls.ndjson", "redacted");
  if (kind === "console") return artifact(outputRoot, kind, "console.ndjson", "redacted");
  if (kind === "snapshot") return artifact(outputRoot, kind, "dom-snapshot.json", "metadata-only");
  if (kind === "screenshot") return artifact(outputRoot, kind, "screenshot.json", "metadata-only");
  if (kind === "lighthouse") return artifact(outputRoot, kind, "lighthouse-summary.json", "metadata-only");
  return artifact(outputRoot, kind, "performance-summary.json", "metadata-only");
}

function artifact(
  outputRoot: string,
  kind: LiveCollectPlannedArtifact["kind"],
  file: string,
  redaction: LiveCollectPlannedArtifact["redaction"]
): LiveCollectPlannedArtifact {
  return { kind, path: join(outputRoot, file), redaction };
}

function mapEvidenceKind(kind: LiveCollectEvidenceKind): EvidenceItem["kind"] {
  if (kind === "snapshot") return "dom";
  if (kind === "lighthouse" || kind === "performance") return "trace";
  return kind;
}

function sampleApiCallsForPlan(plan: LiveCollectPlan, startedAt: string): ApiCall[] {
  if (!plan.evidenceKinds.includes("network")) return [];
  return [
    {
      id: "planned-network-request",
      pageUrl: "about:blank",
      method: "GET",
      url: "https://example.invalid/redacted",
      resourceType: "fetch",
      requestHeadersRedacted: {},
      responseBodyCaptured: "metadata-only",
      timing: { startedAt },
      fingerprint: "planned-network-request",
      likelyApiRole: "unknown",
      redactionStatus: "redacted"
    }
  ];
}

function assertRouteToken(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error("routeToken is required for live collection.");
  return trimmed;
}
