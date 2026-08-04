import { spawnSync } from "node:child_process";

export const CHROME_DEVTOOLS_MCP_PACKAGE = "chrome-devtools-mcp";
export const SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION = "1.6.0";
export const CHROME_DEVTOOLS_MCP_PACKAGE_SPEC = `${CHROME_DEVTOOLS_MCP_PACKAGE}@${SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION}`;

export const EXPECTED_UPSTREAM_CATEGORIES = [
  "input",
  "navigation",
  "emulation",
  "performance",
  "network",
  "debugging",
  "memory",
  "extensions",
  "third-party",
  "webmcp"
] as const;

export const REQUIRED_SAFETY_FLAGS = [
  "--redactNetworkHeaders",
  "--allowedUrlPattern",
  "--blockedUrlPattern",
  "--no-usage-statistics",
  "--no-performance-crux"
] as const;

export const SUPPORTED_CONNECTION_FLAGS = [
  "--isolated",
  "--autoConnect",
  "--browserUrl",
  "--wsEndpoint",
  "--experimentalPageIdRouting"
] as const;

export const UPSTREAM_CONNECTION_MODES = ["isolated", "autoConnect", "browserUrl", "wsEndpoint"] as const;

export type UpstreamConnectionMode = (typeof UPSTREAM_CONNECTION_MODES)[number];

export type UpstreamMcpRuntimeConfig = {
  connectionMode?: UpstreamConnectionMode;
  routeToken?: string;
  browserUrl?: string;
  wsEndpoint?: string;
  allowedUrlPatterns?: string[];
  blockedUrlPatterns?: string[];
  redactNetworkHeaders?: boolean;
  usageStatistics?: boolean;
  performanceCrux?: boolean;
  experimentalPageIdRouting?: boolean;
  categoryExperimentalWebmcp?: boolean;
  categoryExperimentalThirdParty?: boolean;
  strict?: boolean;
};

export type UpstreamDoctorCheck = {
  status: "pass" | "warn" | "fail";
  name: string;
  detail: string;
};

export type UpstreamMcpDoctorResult = {
  status: "pass" | "warn" | "fail";
  package: string;
  supportedVersion: string;
  latestVersion?: string;
  connectionMode: UpstreamConnectionMode;
  command: {
    command: "npx";
    args: string[];
  };
  checks: UpstreamDoctorCheck[];
};

export function runUpstreamMcpDoctor(
  latestVersion = readLatestPackageVersion(),
  config: UpstreamMcpRuntimeConfig = {}
): UpstreamMcpDoctorResult {
  const checks: UpstreamDoctorCheck[] = [];
  const normalizedConfig = normalizeUpstreamConfig(config);
  const commandArgs = buildUpstreamMcpArgs(normalizedConfig);

  if (latestVersion) {
    const versionStatus = compareSemver(latestVersion, SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION) <= 0 ? "pass" : "warn";
    checks.push({
      status: versionStatus,
      name: "package version",
      detail:
        versionStatus === "pass"
          ? `${CHROME_DEVTOOLS_MCP_PACKAGE} latest is ${latestVersion}; local compatibility target is ${SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION}`
          : `${CHROME_DEVTOOLS_MCP_PACKAGE} latest is ${latestVersion}; local compatibility target is ${SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION}, so review aliases before live delegation`
    });
  } else {
    checks.push({
      status: "warn",
      name: "package version",
      detail: `Could not resolve ${CHROME_DEVTOOLS_MCP_PACKAGE} from npm; live delegation remains disabled`
    });
  }

  checks.push({
    status: "pass",
    name: "tool categories",
    detail: `tracked categories: ${EXPECTED_UPSTREAM_CATEGORIES.join(", ")}`
  });

  checks.push({
    status: "pass",
    name: "connection modes",
    detail: `tracked flags: ${SUPPORTED_CONNECTION_FLAGS.join(", ")}`
  });

  checks.push({
    status: "pass",
    name: "safety flags",
    detail: `default bounded invocation uses: ${REQUIRED_SAFETY_FLAGS.join(", ")}`
  });

  checks.push(...evaluateLiveDelegationChecks(normalizedConfig));

  const status = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";

  return {
    status,
    package: CHROME_DEVTOOLS_MCP_PACKAGE,
    supportedVersion: SUPPORTED_CHROME_DEVTOOLS_MCP_VERSION,
    latestVersion: latestVersion || undefined,
    connectionMode: normalizedConfig.connectionMode,
    command: {
      command: "npx",
      args: commandArgs
    },
    checks
  };
}

export function buildUpstreamMcpArgs(config: UpstreamMcpRuntimeConfig = {}): string[] {
  const normalizedConfig = normalizeUpstreamConfig(config);
  const args = ["-y", CHROME_DEVTOOLS_MCP_PACKAGE_SPEC];

  if (normalizedConfig.connectionMode === "isolated") {
    args.push("--isolated");
  } else if (normalizedConfig.connectionMode === "autoConnect") {
    args.push("--autoConnect");
  } else if (normalizedConfig.connectionMode === "browserUrl") {
    args.push("--browserUrl", assertNonEmpty("browserUrl", normalizedConfig.browserUrl));
  } else if (normalizedConfig.connectionMode === "wsEndpoint") {
    args.push("--wsEndpoint", assertNonEmpty("wsEndpoint", normalizedConfig.wsEndpoint));
  }

  if (normalizedConfig.experimentalPageIdRouting) args.push("--experimentalPageIdRouting");
  if (normalizedConfig.redactNetworkHeaders) args.push("--redactNetworkHeaders");
  if (!normalizedConfig.usageStatistics) args.push("--no-usage-statistics");
  if (!normalizedConfig.performanceCrux) args.push("--no-performance-crux");
  if (normalizedConfig.categoryExperimentalWebmcp) args.push("--categoryExperimentalWebmcp");
  if (normalizedConfig.categoryExperimentalThirdParty) args.push("--categoryExperimentalThirdParty");

  for (const pattern of normalizedConfig.allowedUrlPatterns) {
    args.push("--allowedUrlPattern", pattern);
  }
  for (const pattern of normalizedConfig.blockedUrlPatterns) {
    args.push("--blockedUrlPattern", pattern);
  }

  return args;
}

/**
 * Memory analysis is deliberately opt-in per spawned child.  Do not add this
 * flag to the global/runtime configuration: raw upstream memory tools can
 * surface heap strings and must only be reached through local bounded aliases.
 */
export function buildMemoryAnalysisMcpArgs(config: UpstreamMcpRuntimeConfig = {}): string[] {
  return [...buildUpstreamMcpArgs(config), "--memoryDebugging"];
}

function evaluateLiveDelegationChecks(config: Required<UpstreamMcpRuntimeConfig>): UpstreamDoctorCheck[] {
  const checks: UpstreamDoctorCheck[] = [];
  const profileConnected = config.connectionMode !== "isolated";
  const hasUrlPolicy = config.allowedUrlPatterns.length > 0 || config.blockedUrlPatterns.length > 0;

  checks.push({
    status: "pass",
    name: "connection source",
    detail:
      config.connectionMode === "isolated"
        ? "default live delegation launches an isolated temporary Chrome profile"
        : `live delegation may connect through ${config.connectionMode} after route-token ownership is validated`
  });

  checks.push({
    status: !profileConnected || config.routeToken ? "pass" : "fail",
    name: "route token",
    detail:
      !profileConnected || config.routeToken
        ? "route-token gate is satisfied for the selected connection mode"
        : "profile-connected modes require an explicit route token before live delegation"
  });

  checks.push({
    status: hasUrlPolicy || !profileConnected ? "pass" : config.strict ? "fail" : "warn",
    name: "URL policy",
    detail: hasUrlPolicy
      ? "URL allow/block policy is configured for live delegation"
      : profileConnected
        ? "profile-connected live delegation should provide URL allow/block policy; pass --strict to require it"
        : "isolated live delegation can run without a profile URL policy"
  });

  checks.push({
    status: config.redactNetworkHeaders ? "pass" : "fail",
    name: "network header redaction",
    detail: config.redactNetworkHeaders
      ? "sensitive network headers are redacted before returning upstream network evidence"
      : "live delegation requires --redactNetworkHeaders"
  });

  checks.push({
    status: !config.usageStatistics ? "pass" : config.strict ? "fail" : "warn",
    name: "usage statistics",
    detail: !config.usageStatistics
      ? "usage statistics are disabled for the default upstream invocation"
      : "usage statistics are enabled; pass --strict to block this mode"
  });

  checks.push({
    status: !config.performanceCrux ? "pass" : config.strict ? "fail" : "warn",
    name: "performance CrUX",
    detail: !config.performanceCrux
      ? "performance trace URLs will not be sent to the CrUX API by default"
      : "performance CrUX integration is enabled; pass --strict to block this mode"
  });

  checks.push({
    status: "pass",
    name: "live delegation",
    detail: "upstream Chrome DevTools MCP is the live backend; delegated tools are usable after the selected gates pass"
  });

  return checks;
}

function normalizeUpstreamConfig(config: UpstreamMcpRuntimeConfig): Required<UpstreamMcpRuntimeConfig> {
  return {
    connectionMode: parseConnectionMode(config.connectionMode ?? "isolated"),
    routeToken: config.routeToken?.trim() ?? "",
    browserUrl: config.browserUrl?.trim() ?? "",
    wsEndpoint: config.wsEndpoint?.trim() ?? "",
    allowedUrlPatterns: compactList(config.allowedUrlPatterns),
    blockedUrlPatterns: compactList(config.blockedUrlPatterns),
    redactNetworkHeaders: config.redactNetworkHeaders ?? true,
    usageStatistics: config.usageStatistics ?? false,
    performanceCrux: config.performanceCrux ?? false,
    experimentalPageIdRouting: config.experimentalPageIdRouting ?? true,
    categoryExperimentalWebmcp: config.categoryExperimentalWebmcp ?? false,
    categoryExperimentalThirdParty: config.categoryExperimentalThirdParty ?? false,
    strict: config.strict ?? false
  };
}

function readLatestPackageVersion(): string | undefined {
  const result = spawnSync("npm", ["view", CHROME_DEVTOOLS_MCP_PACKAGE, "version", "--silent"], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" }
  });
  if (result.status !== 0) return undefined;
  return result.stdout.trim() || undefined;
}

function compareSemver(a: string, b: string): number {
  const left = parseSemver(a);
  const right = parseSemver(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function parseSemver(version: string): [number, number, number] {
  const [major = "0", minor = "0", patch = "0"] = version.split(/[.-]/, 3);
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

function parseConnectionMode(value: string): UpstreamConnectionMode {
  if ((UPSTREAM_CONNECTION_MODES as readonly string[]).includes(value)) return value as UpstreamConnectionMode;
  throw new Error(`Unsupported upstream connection mode: ${value}`);
}

function compactList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function assertNonEmpty(name: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required for the selected upstream connection mode`);
  return trimmed;
}
