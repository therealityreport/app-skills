#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedPlugins = ["modal", "supabase-fullstack", "context7", "chrome-devtools", "decodo", "envato-r2", "vintone-studio"];
const expectedSkillCount = 35;
const errors = [];
const strictVersion = /^\d+\.\d+\.\d+$/;
const forbiddenNames = new Set(["node_modules", "dist", "build", "coverage", ".DS_Store", ".plan-work"]);
const forbiddenText = [/\/Users\//, /modal-trr-operations/i, /decodo-trr-social-backfill/i, /admin-\d+/i, /trr-backend-jobs/i, /ShadGPT/i, /THB-BBL/i, /adultsy/i, /AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];

function fail(message) { errors.push(message); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail(`${path.relative(root, file)}: invalid JSON: ${error.message}`); return {}; } }
function listDirs(directory) { return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); }
function walk(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`${path.relative(root, full)}: symlinks are not allowed`);
    else if (entry.isDirectory()) { if (forbiddenNames.has(entry.name)) fail(`${path.relative(root, full)}: forbidden generated directory`); result.push(...walk(full)); }
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
function textFile(file) { return !/\.(png|jpg|jpeg|gif|webp|woff2?|ttf|pdf|zip)$/i.test(file); }
function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

const pluginDirs = listDirs(path.join(root, "plugins"));
if (JSON.stringify(pluginDirs) !== JSON.stringify([...expectedPlugins].sort())) fail(`expected exactly seven plugin directories; got ${pluginDirs.join(", ")}`);
const skillDirs = listDirs(path.join(root, "skills"));
if (skillDirs.length !== expectedSkillCount) fail(`expected ${expectedSkillCount} standalone skills; got ${skillDirs.length}`);

const marketplace = readJson(path.join(root, ".agents", "plugins", "marketplace.json"));
if (marketplace.name !== "app-skills" || marketplace.interface?.displayName !== "App Skills") fail("marketplace name/displayName mismatch");
if (JSON.stringify((marketplace.plugins || []).map((entry) => entry.name)) !== JSON.stringify(expectedPlugins)) fail("marketplace plugin order mismatch");
for (const entry of marketplace.plugins || []) {
  if (entry.source?.source !== "local" || entry.source?.path !== `./plugins/${entry.name}`) fail(`${entry.name}: invalid marketplace source`);
  if (entry.policy?.installation !== "AVAILABLE" || entry.policy?.authentication !== "ON_INSTALL") fail(`${entry.name}: invalid marketplace policy`);
}

for (const plugin of expectedPlugins) {
  const pluginRoot = path.join(root, "plugins", plugin);
  const manifest = readJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"));
  if (manifest.name !== plugin) fail(`${plugin}: manifest name mismatch`);
  if (!strictVersion.test(manifest.version || "")) fail(`${plugin}: version must be strict semver`);
  for (const key of ["hooks", "agents", "upstream"]) if (key in manifest) fail(`${plugin}: unsupported manifest field ${key}`);
  if (manifest.interface?.includes) fail(`${plugin}: interface.includes is unsupported`);
  for (const key of ["skills", "mcpServers", "apps"]) {
    if (!manifest[key]) continue;
    const target = path.resolve(pluginRoot, manifest[key]);
    if (!target.startsWith(`${pluginRoot}${path.sep}`) || !fs.existsSync(target)) fail(`${plugin}: invalid ${key} path ${manifest[key]}`);
  }
  for (const key of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) if (!/^https:\/\//.test(manifest.interface?.[key] || "")) fail(`${plugin}: ${key} must be an HTTPS URL`);
  for (const prompt of manifest.interface?.defaultPrompt || []) if (prompt.length > 128) fail(`${plugin}: default prompt exceeds 128 characters`);
}

for (const skill of skillDirs) {
  const file = path.join(root, "skills", skill, "SKILL.md");
  if (!fs.existsSync(file)) { fail(`${skill}: missing SKILL.md`); continue; }
  const text = fs.readFileSync(file, "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] || "";
  if (!new RegExp(`^name:\\s*["']?${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*$`, "m").test(frontmatter)) fail(`${skill}: frontmatter name mismatch`);
  if (!/^description:\s*\S/m.test(frontmatter)) fail(`${skill}: missing frontmatter description`);
}

const releaseFiles = [...walk(path.join(root, "plugins")), ...walk(path.join(root, "skills"))];
for (const file of releaseFiles) {
  if (forbiddenNames.has(path.basename(file))) fail(`${path.relative(root, file)}: forbidden file`);
  if (!textFile(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenText) if (pattern.test(text)) fail(`${path.relative(root, file)}: forbidden private or secret-like content (${pattern})`);
  if (/\.md$/i.test(file)) {
    for (const match of text.matchAll(/\[[^\]]*\]\((?!https?:|mailto:|#)([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (target && !fs.existsSync(path.resolve(path.dirname(file), target))) fail(`${path.relative(root, file)}: broken relative link ${match[1]}`);
    }
  }
}

const catalog = readJson(path.join(root, "catalog.json"));
if (catalog.pluginCount !== 7 || catalog.skillCount !== expectedSkillCount) fail("catalog counts mismatch");
const catalogSkills = new Set((catalog.plugins || []).flatMap((entry) => entry.skills || []));
if (catalogSkills.size !== expectedSkillCount || skillDirs.some((skill) => !catalogSkills.has(skill))) fail("catalog skill inventory mismatch");

const receipt = readJson(path.join(root, "source-receipt.json"));
const receiptMap = new Map((receipt.files || []).map((entry) => [entry.path, entry.sha256]));
for (const file of releaseFiles) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (receiptMap.get(relative) !== sha(file)) fail(`${relative}: source receipt hash mismatch`);
}
if (receiptMap.size !== releaseFiles.length) fail("source receipt has unexpected or missing files");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`Validated ${expectedPlugins.length} plugins, ${skillDirs.length} standalone skills, and ${releaseFiles.length} release files.`);
