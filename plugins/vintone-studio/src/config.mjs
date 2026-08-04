import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const EXECUTION_MODES = Object.freeze([
  "manual",
  "computer-use",
  "uxp",
  "hybrid"
]);

const DEFAULT_ASSET_DIR = "/Volumes/HardDrive/DORON SUPPLY/VINTONE";
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "Pictures", "VINTONE Outputs");
const DEFAULT_TEMPLATE_NAMES = Object.freeze([
  "VINTONE.psb",
  "VINTONE.psd",
  "VINTONE BLANK.psb",
  "VINTONE BLANK TEMPLATE.psb",
  "VINTONE TEMPLATE.psb",
  "VINTONE STARTER.psb"
]);
const DEFAULT_SAMPLE_NAMES = Object.freeze([
  "VINTONE SAMPLE FILE.psb",
  "VINTONE SAMPLE.psb",
  "VINTONE EXAMPLE.psb",
  "VINTONE FINISHED SAMPLE.psb"
]);
const DEFAULT_PATTERNS_NAMES = Object.freeze([
  "VINTONE_PATTERNS.pat",
  "VINTONE PATTERNS.pat",
  "VINTONE_PATTERN.pat"
]);

const TRUE_VALUES = new Set(["1", "true", "yes", "on", "available", "enabled"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off", "unavailable", "disabled"]);

function envFlag(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

export function expandHome(filePath, homeDir = os.homedir()) {
  if (!filePath) return filePath;
  if (filePath === "~") return homeDir;
  if (filePath.startsWith("~/")) return path.join(homeDir, filePath.slice(2));
  return filePath;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findFirstExisting(baseDir, names) {
  const candidates = names.map((name) => path.join(baseDir, name));
  return {
    path: candidates.find((candidate) => fs.existsSync(candidate)) || null,
    candidates
  };
}

function listCandidateNames(baseDir, predicate) {
  try {
    return fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(predicate);
  } catch {
    return [];
  }
}

export function resolveVintoneAssetPaths(options = {}) {
  const env = options.env || process.env;
  const assetDir = expandHome(
    options.assetDir || env.VINTONE_ASSET_DIR || DEFAULT_ASSET_DIR
  );
  const templateNames = unique([
    ...(options.templateNames || []),
    ...DEFAULT_TEMPLATE_NAMES,
    ...listCandidateNames(assetDir, (name) =>
      /^vintone\b/i.test(name) &&
      /\.(psb|psd)$/i.test(name) &&
      !/sample|example|finished/i.test(name)
    )
  ]);
  const sampleNames = unique([
    ...(options.sampleNames || []),
    ...DEFAULT_SAMPLE_NAMES,
    ...listCandidateNames(assetDir, (name) =>
      /vintone/i.test(name) &&
      /sample|example|finished/i.test(name) &&
      /\.(psb|psd)$/i.test(name)
    )
  ]);
  const patternsNames = unique([
    ...(options.patternsNames || []),
    ...DEFAULT_PATTERNS_NAMES,
    ...listCandidateNames(assetDir, (name) =>
      /vintone/i.test(name) && /pattern/i.test(name) && /\.pat$/i.test(name)
    )
  ]);

  const template = options.templatePath || env.VINTONE_TEMPLATE_PATH
    ? {
        path: expandHome(options.templatePath || env.VINTONE_TEMPLATE_PATH),
        candidates: [expandHome(options.templatePath || env.VINTONE_TEMPLATE_PATH)]
      }
    : findFirstExisting(assetDir, templateNames);
  const sample = options.samplePath || env.VINTONE_SAMPLE_PATH
    ? {
        path: expandHome(options.samplePath || env.VINTONE_SAMPLE_PATH),
        candidates: [expandHome(options.samplePath || env.VINTONE_SAMPLE_PATH)]
      }
    : findFirstExisting(assetDir, sampleNames);
  const patterns = options.patternsPath || env.VINTONE_PATTERNS_PATH
    ? {
        path: expandHome(options.patternsPath || env.VINTONE_PATTERNS_PATH),
        candidates: [expandHome(options.patternsPath || env.VINTONE_PATTERNS_PATH)]
      }
    : findFirstExisting(assetDir, patternsNames);

  return {
    assetDir,
    templatePath: template.path || path.join(assetDir, DEFAULT_TEMPLATE_NAMES[0]),
    samplePath: sample.path || path.join(assetDir, DEFAULT_SAMPLE_NAMES[0]),
    patternsPath: patterns.path || path.join(assetDir, DEFAULT_PATTERNS_NAMES[0]),
    candidates: {
      template: template.candidates,
      sample: sample.candidates,
      patterns: patterns.candidates
    }
  };
}

export function detectComputerUseAvailability(env = process.env, runtime = {}) {
  if (runtime.computerUse === true || runtime.computerUseAvailable === true) {
    return true;
  }

  if (
    envFlag(env.VINTONE_DISABLE_COMPUTER_USE) === true ||
    envFlag(env.CODEX_DISABLE_COMPUTER_USE) === true
  ) {
    return false;
  }

  const explicitFlags = [
    env.VINTONE_COMPUTER_USE_AVAILABLE,
    env.CODEX_COMPUTER_USE_AVAILABLE,
    env.COMPUTER_USE_AVAILABLE
  ];

  for (const flag of explicitFlags) {
    const parsed = envFlag(flag);
    if (parsed !== undefined) return parsed;
  }

  return false;
}

export function resolveExecutionMode(env = process.env, runtime = {}) {
  const warnings = [];
  const requestedMode = env.VINTONE_EXECUTION_MODE?.trim();
  const computerUseAvailable = detectComputerUseAvailability(env, runtime);

  if (requestedMode) {
    if (!EXECUTION_MODES.includes(requestedMode)) {
      return {
        mode: "manual",
        requestedMode,
        computerUseAvailable,
        warnings: [
          `Unsupported VINTONE_EXECUTION_MODE "${requestedMode}"; using manual mode.`
        ]
      };
    }

    if (
      (requestedMode === "computer-use" || requestedMode === "hybrid") &&
      !computerUseAvailable
    ) {
      warnings.push(
        `${requestedMode} requested, but Computer Use is not available; using manual mode.`
      );
      return {
        mode: "manual",
        requestedMode,
        computerUseAvailable,
        warnings
      };
    }

    return {
      mode: requestedMode,
      requestedMode,
      computerUseAvailable,
      warnings
    };
  }

  return {
    mode: computerUseAvailable ? "computer-use" : "manual",
    requestedMode: undefined,
    computerUseAvailable,
    warnings
  };
}

function hasDirectSetupArgs(options) {
  return Boolean(
    options.assetPath ||
      options.assetDir ||
      options.blankStarterPath ||
      options.templatePath ||
      options.sourceFilePath ||
      options.samplePath ||
      options.patternsPath ||
      options.outputDir ||
      Object.hasOwn(options, "computerUseAvailable")
  );
}

function directArgsToEnvironment(options) {
  const env = { ...process.env };
  if (options.assetPath || options.assetDir) {
    env.VINTONE_ASSET_DIR = options.assetPath || options.assetDir;
  }
  if (options.blankStarterPath || options.templatePath) {
    env.VINTONE_TEMPLATE_PATH = options.blankStarterPath || options.templatePath;
  }
  if (options.sourceFilePath || options.samplePath) {
    env.VINTONE_SAMPLE_PATH = options.sourceFilePath || options.samplePath;
  }
  if (options.patternsPath) {
    env.VINTONE_PATTERNS_PATH = options.patternsPath;
  }
  if (options.outputDir || options.exportDirectory) {
    env.VINTONE_OUTPUT_DIR = options.outputDir || options.exportDirectory;
  }
  if (options.executionMode) {
    env.VINTONE_EXECUTION_MODE = options.executionMode;
  }
  if (Object.hasOwn(options, "copyFirst")) {
    env.VINTONE_COPY_FIRST = String(options.copyFirst);
  }
  if (Object.hasOwn(options, "computerUseAvailable")) {
    env.VINTONE_COMPUTER_USE_AVAILABLE = String(options.computerUseAvailable);
  }
  return env;
}

function normalizeConfigOptions(options = {}) {
  if (options.env || options.runtime || !hasDirectSetupArgs(options)) {
    return {
      env: options.env || process.env,
      runtime: options.runtime || {}
    };
  }

  return {
    env: directArgsToEnvironment(options),
    runtime: {
      computerUse: options.computerUseAvailable === true,
      ...(options.runtime || {})
    }
  };
}

export function createConfig(options = {}) {
  const { env, runtime } = normalizeConfigOptions(options);
  const resolvedPaths = resolveVintoneAssetPaths({ env });
  const assetDir = resolvedPaths.assetDir;
  const templatePath = resolvedPaths.templatePath;
  const samplePath = resolvedPaths.samplePath;
  const patternsPath = resolvedPaths.patternsPath;
  const outputDir = expandHome(env.VINTONE_OUTPUT_DIR || DEFAULT_OUTPUT_DIR);
  const execution = resolveExecutionMode(env, runtime);
  const copyFirst = envFlag(env.VINTONE_COPY_FIRST) ?? true;

  return {
    assetDir,
    templatePath,
    samplePath,
    patternsPath,
    outputDir,
    resolvedPathCandidates: resolvedPaths.candidates,
    executionMode: execution.mode,
    requestedExecutionMode: execution.requestedMode,
    computerUseAvailable: execution.computerUseAvailable,
    copyFirst,
    warnings: execution.warnings
  };
}

function pathStatus(kind, label, filePath) {
  const exists = Boolean(filePath && fs.existsSync(filePath));
  return {
    kind,
    label,
    path: filePath,
    exists,
    requiredForLiveWork: kind !== "outputDir"
  };
}

export function checkSetup(options = {}) {
  const config = options.config || createConfig(options);
  const paths = [
    pathStatus("assetDir", "Licensed VINTONE asset folder", config.assetDir),
    pathStatus("template", "Licensed blank VINTONE template", config.templatePath),
    pathStatus("sample", "Licensed VINTONE sample file", config.samplePath),
    pathStatus("patterns", "Licensed VINTONE patterns file", config.patternsPath),
    pathStatus("outputDir", "Preferred VINTONE output folder", config.outputDir)
  ];
  const missingPaths = paths.filter((entry) => !entry.exists);
  const blockingMissingPaths = missingPaths.filter((entry) => entry.requiredForLiveWork);

  return {
    ok: blockingMissingPaths.length === 0,
    nonDestructive: true,
    message:
      blockingMissingPaths.length === 0
        ? "Setup paths are present for live VINTONE work."
        : "Some local VINTONE paths are missing. No files were created, copied, or deleted.",
    executionMode: config.executionMode,
    requestedExecutionMode: config.requestedExecutionMode,
    computerUseAvailable: config.computerUseAvailable,
    copyFirst: config.copyFirst,
    paths,
    missingPaths,
    resolvedPathCandidates: config.resolvedPathCandidates,
    warnings: [...config.warnings]
  };
}
