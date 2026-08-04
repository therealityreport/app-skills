#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(process.env.APP_SKILLS_SOURCE_ROOT || "/Users/thomashulihan/Projects/PLUGINS/plugins");
const repository = "https://github.com/therealityreport/app-skills";

const families = [
  { name: "modal", displayName: "Modal", category: "Coding", skills: ["modal-platform", "modal-decodo", "modal-browser-runtime", "modal-release-operations"], roots: ["skills", "assets"] },
  { name: "supabase-fullstack", displayName: "Supabase Fullstack", category: "Productivity", skills: ["supabase-command-surface", "supabase-fullstack-review", "supabase-postgres-performance", "supabase-security-governance"], roots: ["skills", "assets", "docs", ".app.json"] },
  { name: "context7", displayName: "Context7", category: "Coding", skills: ["context7", "context7-app-integration", "context7-cli", "context7-docs", "context7-mcp-setup", "context7-skills-registry", "context7-troubleshooting"], roots: ["skills", "assets", "agents", "scripts", "tools", ".mcp.json", "PRIVACY.md", "TERMS.md"] },
  { name: "chrome-devtools", displayName: "Chrome DevTools", category: "Coding", skills: ["chrome-devtools-accessibility", "chrome-devtools-evidence", "chrome-devtools-extension-health", "chrome-devtools-intake", "chrome-devtools-memory", "chrome-devtools-network", "chrome-devtools-performance", "chrome-devtools-repair-loop", "chrome-devtools-runtime"], roots: ["skills", "agents", "docs", "schemas", "src", "tools", "bin", "scripts", "package.json", "package-lock.json", "tsconfig.json"] },
  { name: "decodo", displayName: "Decodo", category: "Productivity", skills: ["decodo-agent-workflows", "decodo-browser-scrapy", "decodo-mcp-scraping", "decodo-proxy-ops", "decodo-reddit-news-visual", "decodo-sdk-api", "decodo-serp-rank-tracking", "decodo-setup", "decodo-troubleshooting"], roots: ["skills", "agents", "references", "scripts"] },
  { name: "envato-r2", displayName: "Envato to R2", category: "Coding", skills: ["envato-r2"], roots: ["skills", "assets", "references", "src", "scripts", "tests", "package.json", "package-lock.json", ".env.example", "PRIVACY.md", "TERMS.md"] },
  { name: "vintone-studio", displayName: "VINTONE Studio", category: "Productivity", skills: ["vintone-studio"], roots: ["skills", "assets", "knowledge", "src", "scripts", "tests", "uxp-companion", "package.json", "PRIVACY.md", "TERMS.md"] }
];

const excludedNames = new Set(["node_modules", "dist", "build", "coverage", ".git", ".DS_Store", ".plan-work"]);
const excludedFiles = new Set([
  "modal/scripts/start-mcp.sh",
  "modal/.mcp.json",
  "modal/skills/modal-platform/tests/modal-github-lanes.test.js",
  "decodo/scripts/doctor-trr-social-backfill.mjs",
  "decodo/references/workflows/trr-social-backfill.md",
  "context7/scripts/repair-context7-mcp.mjs",
  "context7/scripts/refresh-upstream.sh"
]);

function safeReset(relative) {
  const target = path.join(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`unsafe generated target: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function copyEntry(source, destination, family) {
  const relative = path.relative(sourceRoot, source).split(path.sep).join("/");
  const base = path.basename(source);
  if (excludedNames.has(base) || /\.disabled-|\.bak|~$/.test(base) || excludedFiles.has(relative)) return;
  if (relative.includes("/skills/modal-trr-operations/") || relative.includes("/skills/decodo-trr-social-backfill/")) return;
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source).sort()) copyEntry(path.join(source, child), path.join(destination, child), family);
    return;
  }
  if (!stat.isFile()) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  if (isTextFile(destination)) sanitizeTextFile(destination, family);
}

function isTextFile(file) {
  return !/\.(png|jpg|jpeg|gif|webp|woff2?|ttf|pdf|zip)$/i.test(file);
}

function sanitizeTextFile(file, family) {
  let text = fs.readFileSync(file, "utf8");
  text = text
    .replaceAll(`/Users/thomashulihan/Projects/PLUGINS/plugins/${family}`, ".")
    .replaceAll(`/Users/thomashulihan/Projects/PLUGINS/${family}`, ".")
    .replaceAll(`/Users/thomashulihan/.codex/plugins/${family}/`, "./")
    .replaceAll("friendly profile name such as `Codex`, `TRR`, `THB`, or `openai-agent`", "a friendly, non-account profile name")
    .replaceAll("friendly profile names such as `Codex`, `TRR`, `THB`, or `openai-agent`", "friendly, non-account profile names")
    .replaceAll("friendly profile name such as THB, Codex, or TRR", "friendly, non-account Chrome profile name")
    .replaceAll('if (lower === "trr") return "TRR";', 'return value.trim();')
    .replaceAll('profileLabel: "TRR"', 'profileLabel: "Codex"');
  text = text.replace(/^user-invocable:\s*.*\n/gm, "");

  if (family === "supabase-fullstack") {
    text = text.replace(/Add curated behavior for TRR, ShadGPT, THB, adultsy, and similar projects here\./g, "Keep repository-specific conventions in that repository's instructions, outside this public package.");
  }
  if (family === "context7") {
    text = text.replace(/User\/global config and TRR docs-researcher config must point to `~\/\.codex\/plugins\/context7\/scripts\/start-context7-mcp\.sh`/g, "Codex plugin configuration should point to the packaged `scripts/start-context7-mcp.sh`");
  }
  if (family === "modal") {
    text = removeHeadingSections(text, /TRR|THB-BBL|private adapter/i);
    text = text.replace(/^- Use `\$modal-trr-operations`[^\n]*\n(?:  [^\n]*\n)*/gm, "");
  }
  fs.writeFileSync(file, text);
}

function removeHeadingSections(text, pattern) {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length;) {
    const match = /^(#{1,6})\s+(.+)$/.exec(lines[i]);
    if (!match || !pattern.test(match[2])) { out.push(lines[i++]); continue; }
    const depth = match[1].length;
    i++;
    while (i < lines.length) {
      const next = /^(#{1,6})\s+/.exec(lines[i]);
      if (next && next[1].length <= depth) break;
      i++;
    }
  }
  return out.join("\n");
}

function createManifest(family, sourceManifest) {
  const manifest = structuredClone(sourceManifest);
  manifest.name = family.name;
  manifest.version = normalizeVersion(manifest.version);
  manifest.author = { name: "The Reality Report" };
  manifest.homepage = `${repository}/tree/main/plugins/${family.name}`;
  manifest.repository = repository;
  manifest.license = "MIT";
  manifest.skills = "./skills/";
  delete manifest.agents;
  delete manifest.hooks;
  delete manifest.upstream;
  if (family.name === "modal" || family.name === "decodo" || family.name === "envato-r2" || family.name === "vintone-studio") delete manifest.mcpServers;
  manifest.interface ||= {};
  manifest.interface.displayName = family.displayName;
  manifest.interface.developerName = "The Reality Report";
  manifest.interface.category = family.category;
  manifest.interface.websiteURL = `${repository}/tree/main/plugins/${family.name}`;
  manifest.interface.privacyPolicyURL = `${repository}/blob/main/PRIVACY.md`;
  manifest.interface.termsOfServiceURL = `${repository}/blob/main/TERMS.md`;
  manifest.interface.defaultPrompt = (manifest.interface.defaultPrompt || []).slice(0, 3).map((value) => value.slice(0, 128));
  delete manifest.interface.includes;
  delete manifest.interface.screenshots;
  return manifest;
}

function normalizeVersion(version) {
  const match = String(version || "1.0.0").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`invalid source version: ${version}`);
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function filesUnder(directory) {
  const result = [];
  function visit(current) {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) visit(full);
      else if (stat.isFile()) result.push(full);
    }
  }
  visit(directory);
  return result;
}

safeReset("plugins");
safeReset("skills");

for (const family of families) {
  const sourceDir = path.join(sourceRoot, family.name);
  const destination = path.join(root, "plugins", family.name);
  if (!fs.existsSync(sourceDir)) throw new Error(`missing source plugin: ${sourceDir}`);
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of family.roots) {
    const source = path.join(sourceDir, entry);
    if (fs.existsSync(source)) copyEntry(source, path.join(destination, entry), family.name);
  }
  for (const name of fs.readdirSync(path.join(destination, "skills"))) {
    if (!family.skills.includes(name)) fs.rmSync(path.join(destination, "skills", name), { recursive: true, force: true });
  }
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(sourceDir, ".codex-plugin", "plugin.json"), "utf8"));
  writeJson(path.join(destination, ".codex-plugin", "plugin.json"), createManifest(family, sourceManifest));
  if (family.name === "supabase-fullstack") {
    const appFile = path.join(destination, ".app.json");
    const appManifest = JSON.parse(fs.readFileSync(appFile, "utf8"));
    for (const app of Object.values(appManifest.apps || {})) delete app.required;
    writeJson(appFile, appManifest);
  }
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(destination, "LICENSE"));

  for (const skillName of family.skills) {
    const standalone = path.join(root, "skills", skillName);
    copyEntry(path.join(destination, "skills", skillName), standalone, family.name);
    if (family.name === "envato-r2" && skillName === "envato-r2") {
      const reference = path.join(destination, "references", "r2-s3-compatibility.md");
      copyEntry(reference, path.join(standalone, "references", "r2-s3-compatibility.md"), family.name);
      const skillFile = path.join(standalone, "SKILL.md");
      fs.writeFileSync(skillFile, fs.readFileSync(skillFile, "utf8").replaceAll("../../references/", "references/"));
    }
  }
}

const marketplace = {
  name: "app-skills",
  interface: { displayName: "App Skills" },
  plugins: families.map((family) => ({
    name: family.name,
    source: { source: "local", path: `./plugins/${family.name}` },
    description: JSON.parse(fs.readFileSync(path.join(root, "plugins", family.name, ".codex-plugin", "plugin.json"), "utf8")).description,
    version: JSON.parse(fs.readFileSync(path.join(root, "plugins", family.name, ".codex-plugin", "plugin.json"), "utf8")).version,
    category: family.category,
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }
  }))
};
writeJson(path.join(root, ".agents", "plugins", "marketplace.json"), marketplace);

const catalog = {
  marketplace: "app-skills",
  pluginCount: families.length,
  skillCount: families.reduce((sum, family) => sum + family.skills.length, 0),
  plugins: families.map(({ name, displayName, skills }) => ({ name, displayName, skills }))
};
writeJson(path.join(root, "catalog.json"), catalog);

let sourceCommit = "unknown";
let sourceDirty = true;
try {
  sourceCommit = execFileSync("git", ["-C", path.dirname(sourceRoot), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  sourceDirty = Boolean(execFileSync("git", ["-C", path.dirname(sourceRoot), "status", "--porcelain", "--", ...families.map((family) => `plugins/${family.name}`)], { encoding: "utf8" }).trim());
} catch {}
const releaseFiles = [...filesUnder(path.join(root, "plugins")), ...filesUnder(path.join(root, "skills"))];
writeJson(path.join(root, "source-receipt.json"), {
  schemaVersion: 1,
  canonicalSource: "PLUGINS/plugins",
  sourceCommit,
  sourceDirty,
  generatedAt: "deterministic",
  files: releaseFiles.map((file) => ({ path: path.relative(root, file).split(path.sep).join("/"), sha256: hashFile(file) }))
});

console.log(`Generated ${families.length} plugins and ${catalog.skillCount} standalone skills from ${sourceRoot}`);
