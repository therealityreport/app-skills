export type DebugMode = "chrome-plugin" | "direct-cdp" | "devtools-extension" | "local";

export type TargetSource = "chrome-plugin" | "cdp-http" | "devtools-extension" | "manual";

export type ScopeStatus = "selected" | "candidate" | "ignored" | "unrelated";

export type EvidenceKind =
  | "screenshot"
  | "dom"
  | "accessibility"
  | "api-call"
  | "console"
  | "network"
  | "runtime-exception"
  | "trace"
  | "source"
  | "log";

export type CapabilityGroup = "core" | "evidence" | "network" | "performance" | "cdp" | "extension";

export type RedactionStatus = "not-needed" | "redacted" | "blocked" | "unresolved";

export type TargetRef = {
  source: TargetSource;
  scopeStatus: ScopeStatus;
  profileName?: string;
  title?: string;
  url?: string;
  tabId?: number;
  targetId?: string;
  sessionId?: string;
  lastSeenAt?: string;
  matchReason?: string;
};

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  source: string;
  route: "chrome-plugin" | "cli" | "mcp" | "cdp" | "extension" | "local";
  capabilityGroup: CapabilityGroup;
  capturedAt: string;
  path?: string;
  summary: string;
  byteSize?: number;
  contentHash?: string;
  redactionStatus: RedactionStatus;
};

export type ApiCall = {
  id: string;
  requestId?: string;
  pageUrl: string;
  method: string;
  url: string;
  resourceType: "xhr" | "fetch" | "document" | "script" | "other";
  status?: number;
  statusText?: string;
  requestHeadersRedacted: Record<string, string>;
  responseHeadersRedacted?: Record<string, string>;
  requestBodySummary?: string;
  responseBodyPath?: string;
  responseBodySummary?: string;
  responseBodyCaptured: "none" | "metadata-only" | "bounded-redacted" | "blocked";
  redactedCurlPath?: string;
  initiator?: {
    type?: string;
    stackFrames?: Array<{ url?: string; functionName?: string; lineNumber?: number; columnNumber?: number }>;
  };
  timing?: {
    startedAt: string;
    durationMs?: number;
    transferSizeBytes?: number;
  };
  fingerprint: string;
  likelyApiRole?: "auth" | "data" | "mutation" | "analytics" | "asset" | "unknown";
  localSourceCandidates?: string[];
  redactionStatus: RedactionStatus;
};

export type Hypothesis = {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
  nextAction?: string;
};

export type DebugAction = {
  id: string;
  kind: "read" | "collect" | "edit" | "run-command" | "browser-action";
  description: string;
  command?: string;
  files?: string[];
  result: "pending" | "success" | "failed" | "skipped";
};

export type DebugRun = {
  id: string;
  createdAt: string;
  mode: DebugMode;
  target: TargetRef;
  symptom: string;
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  actions: DebugAction[];
  result?: {
    status: "open" | "fixed" | "blocked" | "inconclusive";
    summary: string;
  };
};

export type TimelineEvent = {
  id: string;
  at: string;
  kind: "browser" | "tool" | "cli" | "edit" | "test" | "reload" | "verify" | "attach" | "detach";
  summary: string;
  metadata?: Record<string, unknown>;
};
