#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoGroups = {
  modalP0: [
    "modal-labs/modal-client",
    "modal-labs/modal-examples",
    "modal-labs/credential-injection",
    "modal-labs/networking-demos",
    "modal-labs/ci-on-modal",
    "modal-labs/search-california",
  ],
  modalP1: [
    "modal-labs/modal-vibe",
    "modal-labs/vprox",
    "modal-labs/synchronicity",
    "modal-labs/asgiproxy",
    "modal-labs/open-batch-transcription",
  ],
  modalP2: [
    "modal-labs/browserman",
    "modal-labs/devlooper",
    "modal-labs/openai-agents-python-example",
    "modal-labs/awesome-modal",
    "modal-labs/stopwatch",
    "modal-labs/multinode-training-guide",
  ],
  adjacent: [
    "microsoft/playwright",
    "microsoft/playwright-python",
    "microsoft/playwright-mcp",
    "browser-use/browser-use",
    "scrapy/scrapy",
    "apify/crawlee-python",
    "modelcontextprotocol/python-sdk",
    "modelcontextprotocol/servers",
    "openai/openai-agents-python",
    "pydantic/pydantic-ai",
    "fastapi/fastapi",
    "encode/httpx",
    "PrefectHQ/prefect",
    "astral-sh/uv",
    "Unstructured-IO/unstructured",
  ],
};

const outputDir = path.resolve(process.cwd(), ".plan-work/modal-platform-refresh");

function viewRepo(repo) {
  const result = spawnSync(
    "gh",
    [
      "repo",
      "view",
      repo,
      "--json",
      "nameWithOwner,description,stargazerCount,updatedAt,url,primaryLanguage,repositoryTopics",
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    return {
      nameWithOwner: repo,
      error: result.stderr.trim() || result.stdout.trim() || `gh exited ${result.status}`,
    };
  }

  return JSON.parse(result.stdout);
}

const inventory = {};
for (const [group, repos] of Object.entries(repoGroups)) {
  inventory[group] = repos.map(viewRepo);
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "modal-github-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);

const lines = ["# Modal GitHub Inventory", "", `Generated: ${new Date().toISOString()}`, ""];
for (const [group, repos] of Object.entries(inventory)) {
  lines.push(`## ${group}`, "", "| Repo | Language | Stars | Updated | Notes |", "|---|---|---:|---|---|");
  for (const repo of repos) {
    const language = repo.primaryLanguage?.name ?? "";
    const stars = repo.stargazerCount ?? "";
    const updated = repo.updatedAt ?? "";
    const notes = repo.error ? `ERROR: ${repo.error.replaceAll("|", "\\|")}` : (repo.description ?? "").replaceAll("|", "\\|");
    const url = repo.url ?? `https://github.com/${repo.nameWithOwner}`;
    lines.push(`| [${repo.nameWithOwner}](${url}) | ${language} | ${stars} | ${updated} | ${notes} |`);
  }
  lines.push("");
}

await writeFile(path.join(outputDir, "modal-github-inventory.md"), `${lines.join("\n")}\n`);
console.log(`Wrote ${path.join(outputDir, "modal-github-inventory.json")}`);
console.log(`Wrote ${path.join(outputDir, "modal-github-inventory.md")}`);
