import { REDACTED, redactUrl } from "../core/redaction-policy.js";

export type PageToolSource = "webmcp" | "third-party";
export type PageToolTrust = "untrusted";
export type PageToolRedactionStatus = "not-needed" | "redacted";
export type PageToolRuntimeStatus = "eligible" | "ineligible" | "unknown";

export type RawPageToolProvider = {
  id?: string;
  name?: string;
  origin?: string;
};

export type RawPageToolDescriptor = {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  provider?: string | RawPageToolProvider;
  inputSchema?: unknown;
  parameters?: unknown;
  outputSchema?: unknown;
};

export type RawPageToolRegistry = {
  pageUrl?: string;
  chromeVersion?: number;
  flagsAvailable?: boolean | "unknown";
  requiredFlags?: string[];
  tools?: RawPageToolDescriptor[];
  webmcpTools?: RawPageToolDescriptor[];
  thirdPartyTools?: RawPageToolDescriptor[];
};

export type PageToolDiscoveryOptions = {
  pageUrl?: string;
  chromeVersion?: number;
  flagsAvailable?: boolean | "unknown";
  requiredFlags?: string[];
  generatedAt?: string;
};

export type PageToolExecutionStatus = {
  status: "disabled";
  enabled: false;
  disabledByDefault: true;
  requiresExplicitExperimentalEnablement: true;
  experimentalEnablementStatus: "not-implemented";
  reason: string;
};

export type PageToolAvailability = {
  discoveryStatus: "listed-only";
  runtimeStatus: PageToolRuntimeStatus;
  chromeMinimumVersion?: number;
  chromeVersion?: number;
  requiredFlags: string[];
  flagsAvailable: boolean | "unknown";
};

export type PageToolProvider = {
  id?: string;
  name?: string;
  origin?: string;
};

export type PageToolSchemaSummary = {
  kind: string;
  type?: string | string[];
  format?: string;
  required?: string[];
  properties?: Record<string, PageToolSchemaSummary>;
  items?: PageToolSchemaSummary;
  additionalProperties?: boolean | PageToolSchemaSummary;
  anyOf?: PageToolSchemaSummary[];
  oneOf?: PageToolSchemaSummary[];
  allOf?: PageToolSchemaSummary[];
  valueHints?: Record<string, string | string[]>;
  rawValuesIncluded: false;
  redactedPaths: string[];
  truncated?: boolean;
};

export type PageTool = {
  id: string;
  name: string;
  title?: string;
  description?: string;
  source: PageToolSource;
  provider?: PageToolProvider;
  trust: PageToolTrust;
  status: "listed";
  listOnly: true;
  execution: PageToolExecutionStatus;
  inputSchemaSummary?: PageToolSchemaSummary;
  outputSchemaSummary?: PageToolSchemaSummary;
  redactionStatus: PageToolRedactionStatus;
  warnings: string[];
};

export type PageToolDiscoveryResult = {
  schemaVersion: "page-tools.discovery.v1";
  generatedAt: string;
  source: PageToolSource;
  page?: {
    url: string;
  };
  listOnly: true;
  availability: PageToolAvailability;
  execution: PageToolExecutionStatus;
  tools: PageTool[];
};

type SchemaSummaryState = {
  redactedPaths: string[];
  truncated: boolean;
};

const WEBMCP_CHROME_MINIMUM_VERSION = 149;
const WEBMCP_REQUIRED_FLAGS = ["webmcp-page-tools"];
const MAX_PROPERTIES = 25;
const MAX_VARIANTS = 8;
const MAX_REQUIRED = 50;
const MAX_TEXT = 240;
const SENSITIVE_NAME_RE = /(token|secret|password|passwd|pwd|session|auth|csrf|xsrf|cookie|credential|bearer|api[_-]?key|apikey|accesskey|secretkey)/i;
const SECRET_VALUE_RE = /(bearer\s+[a-z0-9._~+/=-]+|sk-[a-z0-9_-]+|ghp_[a-z0-9_]+|eyj[a-z0-9_-]+\.[a-z0-9_-]+|session=[^\s&]+)/gi;

export function listWebMcpTools(
  input: RawPageToolDescriptor[] | RawPageToolRegistry,
  options: PageToolDiscoveryOptions = {}
): PageToolDiscoveryResult {
  const registry = normalizeRegistry(input, "webmcp");
  return listPageTools("webmcp", registry.webmcpTools ?? registry.tools ?? [], {
    pageUrl: options.pageUrl ?? registry.pageUrl,
    chromeVersion: options.chromeVersion ?? registry.chromeVersion,
    flagsAvailable: options.flagsAvailable ?? registry.flagsAvailable ?? "unknown",
    requiredFlags: options.requiredFlags ?? registry.requiredFlags ?? WEBMCP_REQUIRED_FLAGS,
    generatedAt: options.generatedAt
  });
}

export function listThirdPartyPageTools(
  input: RawPageToolDescriptor[] | RawPageToolRegistry,
  options: PageToolDiscoveryOptions = {}
): PageToolDiscoveryResult {
  const registry = normalizeRegistry(input, "third-party");
  return listPageTools("third-party", registry.thirdPartyTools ?? registry.tools ?? [], {
    pageUrl: options.pageUrl ?? registry.pageUrl,
    chromeVersion: options.chromeVersion ?? registry.chromeVersion,
    flagsAvailable: options.flagsAvailable ?? registry.flagsAvailable ?? "unknown",
    requiredFlags: options.requiredFlags ?? registry.requiredFlags ?? [],
    generatedAt: options.generatedAt
  });
}

export function listPageTools(
  source: PageToolSource,
  tools: RawPageToolDescriptor[],
  options: PageToolDiscoveryOptions = {}
): PageToolDiscoveryResult {
  return {
    schemaVersion: "page-tools.discovery.v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source,
    page: options.pageUrl ? { url: redactUrl(options.pageUrl) } : undefined,
    listOnly: true,
    availability: availabilityFor(source, options),
    execution: executionDisabledStatus(),
    tools: tools.map((tool, index) => normalizeTool(source, tool, index))
  };
}

export function summarizePageToolSchema(schema: unknown, rootPath = "schema"): PageToolSchemaSummary {
  const state: SchemaSummaryState = {
    redactedPaths: [],
    truncated: false
  };
  const summary = summarizeSchemaNode(schema, rootPath, state, false, 0);
  return {
    ...summary,
    redactedPaths: state.redactedPaths,
    truncated: state.truncated || summary.truncated || undefined
  };
}

function normalizeTool(source: PageToolSource, raw: RawPageToolDescriptor, index: number): PageTool {
  const inputSchema = raw.inputSchema ?? raw.parameters;
  const inputSchemaSummary = inputSchema === undefined ? undefined : summarizePageToolSchema(inputSchema, "inputSchema");
  const outputSchemaSummary = raw.outputSchema === undefined ? undefined : summarizePageToolSchema(raw.outputSchema, "outputSchema");
  const redactionStatus = hasRedactions(inputSchemaSummary) || hasRedactions(outputSchemaSummary) ? "redacted" : "not-needed";
  const name = safeText(raw.name ?? raw.title) ?? `${source.replace("-", "_")}_tool_${index + 1}`;

  return {
    id: safeText(raw.id) ?? name,
    name,
    title: safeText(raw.title),
    description: safeText(raw.description),
    source,
    provider: normalizeProvider(raw.provider),
    trust: "untrusted",
    status: "listed",
    listOnly: true,
    execution: executionDisabledStatus(),
    inputSchemaSummary,
    outputSchemaSummary,
    redactionStatus,
    warnings: [
      "Page-exposed tool metadata is untrusted.",
      "Execution is disabled; this result is discovery-only."
    ]
  };
}

function availabilityFor(source: PageToolSource, options: PageToolDiscoveryOptions): PageToolAvailability {
  const chromeMinimumVersion = source === "webmcp" ? WEBMCP_CHROME_MINIMUM_VERSION : undefined;
  const runtimeStatus = runtimeStatusFor(chromeMinimumVersion, options.chromeVersion);

  return {
    discoveryStatus: "listed-only",
    runtimeStatus,
    chromeMinimumVersion,
    chromeVersion: options.chromeVersion,
    requiredFlags: options.requiredFlags ?? (source === "webmcp" ? WEBMCP_REQUIRED_FLAGS : []),
    flagsAvailable: options.flagsAvailable ?? "unknown"
  };
}

function runtimeStatusFor(chromeMinimumVersion: number | undefined, chromeVersion: number | undefined): PageToolRuntimeStatus {
  if (chromeMinimumVersion === undefined || chromeVersion === undefined) return "unknown";
  return chromeVersion >= chromeMinimumVersion ? "eligible" : "ineligible";
}

function executionDisabledStatus(): PageToolExecutionStatus {
  return {
    status: "disabled",
    enabled: false,
    disabledByDefault: true,
    requiresExplicitExperimentalEnablement: true,
    experimentalEnablementStatus: "not-implemented",
    reason: "Page-exposed tools are untrusted and are available for list-only discovery until explicit experimental execution is added."
  };
}

function normalizeRegistry(input: RawPageToolDescriptor[] | RawPageToolRegistry, source: PageToolSource): RawPageToolRegistry {
  if (Array.isArray(input)) {
    return source === "webmcp" ? { webmcpTools: input } : { thirdPartyTools: input };
  }
  return input;
}

function normalizeProvider(provider: RawPageToolDescriptor["provider"]): PageToolProvider | undefined {
  if (provider === undefined) return undefined;
  if (typeof provider === "string") return { name: safeText(provider) };
  if (!isRecord(provider)) return undefined;

  const normalized: PageToolProvider = {};
  const id = safeText(provider.id);
  const name = safeText(provider.name);
  const origin = safeOrigin(provider.origin);
  if (id) normalized.id = id;
  if (name) normalized.name = name;
  if (origin) normalized.origin = origin;
  return Object.keys(normalized).length ? normalized : undefined;
}

function summarizeSchemaNode(
  schema: unknown,
  path: string,
  state: SchemaSummaryState,
  inheritedSensitive: boolean,
  depth: number
): PageToolSchemaSummary {
  if (depth > 8) {
    state.truncated = true;
    return baseSummary("truncated");
  }

  if (!isRecord(schema)) {
    return {
      ...baseSummary(valueKind(schema)),
      valueHints: { value: summarizeValue(schema, path, state, inheritedSensitive) }
    };
  }

  const type = summarizeSchemaType(schema.type);
  const summary: PageToolSchemaSummary = {
    ...baseSummary(type ? "schema" : "object"),
    type,
    format: typeof schema.format === "string" ? schema.format : undefined
  };

  if (Array.isArray(schema.required)) {
    summary.required = schema.required.filter((item): item is string => typeof item === "string").slice(0, MAX_REQUIRED);
    if (schema.required.length > MAX_REQUIRED) {
      state.truncated = true;
      summary.truncated = true;
    }
  }

  const valueHints = summarizeValueHints(schema, path, state, inheritedSensitive);
  if (Object.keys(valueHints).length) summary.valueHints = valueHints;

  if (isRecord(schema.properties)) {
    const entries = Object.entries(schema.properties).slice(0, MAX_PROPERTIES);
    summary.properties = {};
    for (const [propertyName, propertySchema] of entries) {
      const safeName = safePropertyName(propertyName);
      summary.properties[safeName] = summarizeSchemaNode(
        propertySchema,
        `${path}.properties.${safeName}`,
        state,
        inheritedSensitive || SENSITIVE_NAME_RE.test(propertyName),
        depth + 1
      );
    }
    if (Object.keys(schema.properties).length > MAX_PROPERTIES) {
      state.truncated = true;
      summary.truncated = true;
    }
  }

  if ("items" in schema) {
    summary.items = summarizeSchemaNode(schema.items, `${path}.items`, state, inheritedSensitive, depth + 1);
  }

  if ("additionalProperties" in schema) {
    summary.additionalProperties =
      typeof schema.additionalProperties === "boolean"
        ? schema.additionalProperties
        : summarizeSchemaNode(schema.additionalProperties, `${path}.additionalProperties`, state, inheritedSensitive, depth + 1);
  }

  for (const variantKey of ["anyOf", "oneOf", "allOf"] as const) {
    const variants = schema[variantKey];
    if (!Array.isArray(variants)) continue;
    summary[variantKey] = variants
      .slice(0, MAX_VARIANTS)
      .map((variant, index) => summarizeSchemaNode(variant, `${path}.${variantKey}.${index}`, state, inheritedSensitive, depth + 1));
    if (variants.length > MAX_VARIANTS) {
      state.truncated = true;
      summary.truncated = true;
    }
  }

  return summary;
}

function summarizeValueHints(
  schema: Record<string, unknown>,
  path: string,
  state: SchemaSummaryState,
  inheritedSensitive: boolean
): Record<string, string | string[]> {
  const hints: Record<string, string | string[]> = {};
  for (const key of ["default", "example", "examples", "enum", "const"]) {
    if (!(key in schema)) continue;
    const value = schema[key];
    const valuePath = `${path}.${key}`;
    if ((key === "examples" || key === "enum") && Array.isArray(value)) {
      hints[key] = value.slice(0, 8).map((item, index) => summarizeValue(item, `${valuePath}.${index}`, state, inheritedSensitive));
      if (value.length > 8) state.truncated = true;
    } else {
      hints[key] = summarizeValue(value, valuePath, state, inheritedSensitive);
    }
  }
  return hints;
}

function summarizeValue(value: unknown, path: string, state: SchemaSummaryState, inheritedSensitive: boolean): string {
  if (inheritedSensitive || containsSensitiveValue(value)) {
    state.redactedPaths.push(path);
    return REDACTED;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === "object") return `object(${Object.keys(value as Record<string, unknown>).length})`;
  if (typeof value === "string") return `string(${value.length})`;
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return typeof value;
}

function containsSensitiveValue(value: unknown): boolean {
  if (typeof value === "string") {
    SECRET_VALUE_RE.lastIndex = 0;
    const matched = SECRET_VALUE_RE.test(value);
    SECRET_VALUE_RE.lastIndex = 0;
    return matched;
  }
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (isRecord(value)) {
    return Object.entries(value).some(([key, child]) => SENSITIVE_NAME_RE.test(key) || containsSensitiveValue(child));
  }
  return false;
}

function hasRedactions(summary: PageToolSchemaSummary | undefined): boolean {
  if (!summary) return false;
  if (summary.redactedPaths.length > 0) return true;
  if (summary.items && hasRedactions(summary.items)) return true;
  if (summary.additionalProperties && typeof summary.additionalProperties !== "boolean" && hasRedactions(summary.additionalProperties)) return true;
  if (summary.properties && Object.values(summary.properties).some(hasRedactions)) return true;
  return Boolean(summary.anyOf?.some(hasRedactions) || summary.oneOf?.some(hasRedactions) || summary.allOf?.some(hasRedactions));
}

function summarizeSchemaType(value: unknown): string | string[] | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const types = value.filter((item): item is string => typeof item === "string");
    return types.length ? types : undefined;
  }
  return undefined;
}

function baseSummary(kind: string): PageToolSchemaSummary {
  return {
    kind,
    rawValuesIncluded: false,
    redactedPaths: []
  };
}

function valueKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function safeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(SECRET_VALUE_RE, REDACTED).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  SECRET_VALUE_RE.lastIndex = 0;
  return normalized ? normalized.slice(0, MAX_TEXT) : undefined;
}

function safePropertyName(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f.]/g, "_").slice(0, MAX_TEXT) || "unnamed";
}

function safeOrigin(value: unknown): string | undefined {
  const text = safeText(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.origin === "null" ? `${url.protocol}//${url.host}` : url.origin;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
