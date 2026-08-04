#!/usr/bin/env node
import { access } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installStdioLifecycle } from "./stdio-lifecycle.mjs";

export const TOOL_DEFINITIONS = [
  {
    name: "vintone_check_setup",
    description: "Check VINTONE asset paths and live-work facts without destructively failing when paths are missing.",
    inputSchema: {
      type: "object",
      properties: {
        assetPath: { type: "string" },
        blankStarterPath: { type: "string" },
        photoshopVersion: { type: "string" },
        printerRules: { type: "string" },
        computerUseAvailable: { type: "boolean" }
      },
      additionalProperties: false
    }
  },
  {
    name: "vintone_create_design_plan",
    description: "Create a practical VINTONE design plan from a user idea or edit intent.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        sourceFilePath: { type: "string" },
        workingCopyPath: { type: "string" },
        outputGoal: { type: "string" },
        styleNotes: { type: "string" }
      },
      additionalProperties: false
    }
  },
  {
    name: "vintone_create_edit_packet",
    description: "Create a copy-first edit packet with scope, stop conditions, proof, and rollback notes.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        sourceFilePath: { type: "string" },
        workingCopyPath: { type: "string" },
        actions: {
          type: "array",
          items: { type: "string" }
        },
        designPlan: { type: "object" }
      },
      additionalProperties: false
    }
  },
  {
    name: "vintone_create_computer_runbook",
    description: "Create a visible Photoshop runbook for Computer Use handoff on a confirmed working copy.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string" },
        sourceFilePath: { type: "string" },
        workingCopyPath: { type: "string" },
        editPacket: { type: "object" },
        computerUseAvailable: { type: "boolean" }
      },
      additionalProperties: false
    }
  },
  {
    name: "vintone_export_checklist",
    description: "Create a preview or printer handoff checklist for a VINTONE working copy.",
    inputSchema: {
      type: "object",
      properties: {
        workingCopyPath: { type: "string" },
        exportDirectory: { type: "string" },
        format: { type: "string" },
        printerRules: { type: "string" }
      },
      additionalProperties: false
    }
  }
];

const FALLBACK_VERSION = "0.1.0";

export async function dispatchTool(name, args = {}) {
  if (name === "vintone_check_setup") {
    const mod = await optionalImport("./config.mjs");
    if (mod && typeof mod.checkSetup === "function") {
      return mod.checkSetup(toSetupOptions(args));
    }
    return fallbackCheckSetup(args);
  }
  if (name === "vintone_create_design_plan") {
    return callOptional("./knowledge.mjs", "createDesignPlan", args, fallbackCreateDesignPlan);
  }
  if (name === "vintone_create_edit_packet") {
    const mod = await optionalImport("./edit-packet.mjs");
    if (mod && typeof mod.createEditPacket === "function") {
      return mod.createEditPacket(toEditPacketInput(args));
    }
    return fallbackCreateEditPacket(args);
  }
  if (name === "vintone_create_computer_runbook") {
    const mod = await optionalImport("./computer-runbook.mjs");
    if (mod && typeof mod.createComputerRunbook === "function") {
      const { editPacket, options } = toRunbookInput(args);
      return mod.createComputerRunbook(editPacket, options);
    }
    return fallbackCreateComputerRunbook(args);
  }
  if (name === "vintone_export_checklist") {
    return callOptional("./computer-runbook.mjs", "createExportChecklist", args, fallbackCreateExportChecklist);
  }
  throw new Error(`Unknown tool: ${name}`);
}

function toSetupOptions(args = {}) {
  const env = { ...process.env };
  if (args.assetDir) env.VINTONE_ASSET_DIR = args.assetDir;
  if (args.assetPath || args.sourceFilePath || args.sourcePath) {
    env.VINTONE_SAMPLE_PATH = args.assetPath || args.sourceFilePath || args.sourcePath;
  }
  if (args.blankStarterPath || args.templatePath) {
    env.VINTONE_TEMPLATE_PATH = args.blankStarterPath || args.templatePath;
  }
  if (args.patternsPath) env.VINTONE_PATTERNS_PATH = args.patternsPath;
  if (args.outputDir || args.exportDirectory) {
    env.VINTONE_OUTPUT_DIR = args.outputDir || args.exportDirectory;
  }

  return {
    env,
    runtime: {
      computerUseAvailable: args.computerUseAvailable === true || args.computerUse === true
    }
  };
}

function toEditPacketInput(args = {}) {
  return {
    ...args,
    targetFilePath: args.targetFilePath || args.sourceFilePath || args.sourcePath || null,
    workingCopyPath: args.workingCopyPath || args.workingCopy || null,
    actions: normalizeActionInputs(args.actions)
  };
}

function toRunbookInput(args = {}) {
  const setupFacts = {
    ...(args.setupFacts || {}),
    sourceFilePath: args.sourceFilePath || args.sourcePath || args.targetFilePath || args.setupFacts?.sourceFilePath,
    workingCopyPath: args.workingCopyPath || args.workingCopy || args.setupFacts?.workingCopyPath,
    computerUseAvailable: args.computerUseAvailable === true || args.computerUse === true || args.setupFacts?.computerUseAvailable === true,
    photoshopVersion: args.photoshopVersion || args.setupFacts?.photoshopVersion,
    os: args.os || args.setupFacts?.os,
    firstReversibleSmokeEdit: args.firstReversibleSmokeEdit || args.task || args.setupFacts?.firstReversibleSmokeEdit
  };
  const editPacket = args.editPacket || {
    title: args.task || args.intent || "VINTONE Computer Use runbook",
    summary: args.task || args.intent || null,
    target: {
      sourceFilePath: setupFacts.sourceFilePath,
      workingCopyPath: setupFacts.workingCopyPath,
      confirmedWorkingCopy: args.confirmedWorkingCopy === true || args.workingCopyConfirmed === true
    },
    setupFacts,
    actions: normalizeActionInputs(args.actions || args.task || args.intent)
  };

  return {
    editPacket,
    options: {
      live: args.live === true || args.liveRun === true,
      setupFacts
    }
  };
}

function normalizeActionInputs(actions) {
  if (!actions) return undefined;
  if (Array.isArray(actions)) {
    return actions.map((action, index) => normalizeActionInput(action, index));
  }
  if (typeof actions === "string") {
    return actions.split(",").map((action, index) => normalizeActionInput(action.trim(), index)).filter(Boolean);
  }
  return [normalizeActionInput(actions, 0)].filter(Boolean);
}

function normalizeActionInput(action, index) {
  if (!action) return null;
  if (typeof action === "object") return action;
  return {
    id: `action-${String(index + 1).padStart(2, "0")}`,
    type: "manual_instruction",
    label: action,
    notes: [action]
  };
}

export async function fallbackCheckSetup(args = {}) {
  const pathChecks = await Promise.all([
    checkPath("assetPath", args.assetPath),
    checkPath("blankStarterPath", args.blankStarterPath)
  ]);
  const missingFacts = [];
  if (!args.assetPath) missingFacts.push("licensed VINTONE sample path");
  if (!args.blankStarterPath) missingFacts.push("licensed blank starter path, if create-mode is needed");
  if (!args.photoshopVersion) missingFacts.push("Photoshop version");
  if (!args.printerRules) missingFacts.push("printer handoff naming/export rules");
  if (args.computerUseAvailable !== true) missingFacts.push("confirmation that Computer Use is available in this Codex session");

  return {
    ok: true,
    readyForShellWork: true,
    readyForLivePhotoshop: missingFacts.length === 0 && pathChecks.every((item) => item.exists || !item.path),
    copyFirstRequired: true,
    paidAssetsBundled: false,
    pathChecks,
    missingFacts,
    notes: [
      "Paid VINTONE assets must stay outside the plugin tree.",
      "Live edits must happen on a confirmed working copy, never the original source file."
    ]
  };
}

export async function fallbackCreateDesignPlan(args = {}) {
  const intent = args.intent || "VINTONE design update";
  return {
    ok: true,
    type: "vintone_design_plan",
    intent,
    copyFirstRequired: true,
    sourceFilePath: args.sourceFilePath || null,
    workingCopyPath: args.workingCopyPath || null,
    outputGoal: args.outputGoal || "preview-ready VINTONE composition",
    styleNotes: args.styleNotes || null,
    plan: [
      "Confirm the licensed source file and create a named working copy before editing.",
      "Identify the VINTONE sections that are safe to alter for this request.",
      "Limit the first pass to reversible visual changes such as texture visibility, color masks, or preview exports.",
      "Capture before and after proof from the working copy."
    ],
    blockers: missingCopyFacts(args)
  };
}

export async function fallbackCreateEditPacket(args = {}) {
  const actions = Array.isArray(args.actions) && args.actions.length > 0
    ? args.actions
    : [args.intent || "Apply the requested VINTONE edit on the working copy."];

  return {
    ok: true,
    type: "vintone_edit_packet",
    copyFirst: true,
    sourceFilePath: args.sourceFilePath || null,
    workingCopyPath: args.workingCopyPath || null,
    allowedActions: actions,
    blockedActions: [
      "Do not edit the original paid source file.",
      "Do not overwrite, delete, upload, or destructively save without explicit user approval.",
      "Do not continue through unclear Photoshop prompts."
    ],
    stopConditions: [
      "Working copy cannot be confirmed.",
      "Visible layer structure does not match the intended operation.",
      "Photoshop asks to overwrite or save over the original.",
      "The next action affects a paid source asset instead of the copy."
    ],
    expectedProof: [
      "Working copy path is named and visible.",
      "Before and after state is described or captured.",
      "Final export target is listed before export."
    ],
    rollback: [
      "Close the working copy without saving if the edit is wrong.",
      "Reopen the original source only for inspection.",
      "Create a fresh copy before retrying."
    ],
    blockers: missingCopyFacts(args)
  };
}

export async function fallbackCreateComputerRunbook(args = {}) {
  const missingFacts = missingCopyFacts(args);
  if (args.computerUseAvailable !== true) {
    missingFacts.push("Computer Use availability was not confirmed");
  }

  return {
    ok: true,
    type: "vintone_computer_runbook",
    readyForLiveRun: missingFacts.length === 0,
    copyFirstRequired: true,
    task: args.task || "Perform the requested VINTONE edit on a working copy.",
    sourceFilePath: args.sourceFilePath || null,
    workingCopyPath: args.workingCopyPath || null,
    startState: "Photoshop is open or ready to open; the user has identified a licensed VINTONE source file and a working-copy destination.",
    visibleGoal: "Only the confirmed working copy is opened and edited.",
    steps: [
      "Confirm the source file path and working-copy path before touching Photoshop.",
      "Open the source document in Photoshop only long enough to save or confirm the working copy.",
      "Save the document as the working copy and confirm the visible filename points to the copy.",
      "Perform the requested reversible edit on the copy.",
      "Capture visible proof of the changed state.",
      "Export only after the export path and format are confirmed."
    ],
    stopConditions: [
      "The visible filename is the original instead of the working copy.",
      "Photoshop prompts for overwrite, deletion, upload, relink, or destructive save.",
      "The layer or mask target is ambiguous.",
      "The expected proof cannot be captured."
    ],
    proof: [
      "Visible filename or save dialog confirms the working copy.",
      "Before and after state is captured or summarized.",
      "Export checklist is complete before output."
    ],
    rollback: [
      "Undo the latest Photoshop action if safe.",
      "Close the working copy without saving if the state is uncertain.",
      "Return to the original only for read-only inspection."
    ],
    missingFacts
  };
}

export async function fallbackCreateExportChecklist(args = {}) {
  const checklist = [
    "Confirm the active Photoshop document is the working copy.",
    "Confirm paid source assets remain outside the plugin folder.",
    "Confirm the requested output format and destination.",
    "Check visible art bounds, color intent, texture state, and text legibility.",
    "Record filename, export directory, and any printer-specific naming rules."
  ];

  if (args.printerRules) {
    checklist.push(`Apply printer rule: ${args.printerRules}`);
  }

  return {
    ok: true,
    type: "vintone_export_checklist",
    copyFirstRequired: true,
    workingCopyPath: args.workingCopyPath || null,
    exportDirectory: args.exportDirectory || null,
    format: args.format || "preview image",
    checklist,
    blockers: args.workingCopyPath ? [] : ["working copy path"]
  };
}

async function callOptional(modulePath, exportName, args, fallback) {
  const mod = await optionalImport(modulePath);
  if (mod && typeof mod[exportName] === "function") {
    return mod[exportName](args);
  }
  return fallback(args);
}

async function optionalImport(modulePath) {
  try {
    return await import(new URL(modulePath, import.meta.url));
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && String(error.message).includes(modulePath.replace("./", ""))) {
      return null;
    }
    throw error;
  }
}

async function checkPath(label, path) {
  if (!path) {
    return { label, path: null, exists: false, requiredForLivePhotoshop: true };
  }
  try {
    await access(path);
    return { label, path, exists: true, requiredForLivePhotoshop: true };
  } catch {
    return { label, path, exists: false, requiredForLivePhotoshop: true };
  }
}

function missingCopyFacts(args = {}) {
  const missing = [];
  if (!args.sourceFilePath && !args.sourcePath) missing.push("licensed source file path");
  if (!args.workingCopyPath && !args.workingCopy) missing.push("working copy path");
  return missing;
}

function toolResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function toolError(error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ok: false,
            error: error.message,
            stack: process.env.VINTONE_DEBUG === "1" ? error.stack : undefined
          },
          null,
          2
        )
      }
    ]
  };
}

async function handleJsonRpc(message) {
  if (message.method === "initialize") {
    return {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "vintone-studio", version: FALLBACK_VERSION }
    };
  }
  if (message.method === "tools/list") {
    return { tools: TOOL_DEFINITIONS };
  }
  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params || {};
    try {
      return toolResult(await dispatchTool(name, args));
    } catch (error) {
      return toolError(error);
    }
  }
  if (message.method === "ping") {
    return {};
  }
  throw new Error(`Unsupported method: ${message.method}`);
}

async function runMcpServer() {
  let buffer = Buffer.alloc(0);
  process.stdin.on("data", async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const parsed = readFrame(buffer);
      if (!parsed) break;
      buffer = parsed.rest;
      await respondToFrame(parsed.body);
    }
  });
  // Same missing-EOF shape context7 leaked from. Harmless today because nothing
  // is spawned here, but the handler costs nothing and removes the trap.
  installStdioLifecycle();
}

function readFrame(buffer) {
  const headerEnd = buffer.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;
  const header = buffer.slice(0, headerEnd).toString("utf8");
  const lengthLine = header.split("\r\n").find((line) => line.toLowerCase().startsWith("content-length:"));
  if (!lengthLine) throw new Error("Missing Content-Length header");
  const length = Number(lengthLine.split(":")[1].trim());
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + length;
  if (buffer.length < bodyEnd) return null;
  return {
    body: buffer.slice(bodyStart, bodyEnd).toString("utf8"),
    rest: buffer.slice(bodyEnd)
  };
}

async function respondToFrame(body) {
  const message = JSON.parse(body);
  if (!Object.prototype.hasOwnProperty.call(message, "id")) {
    return;
  }

  try {
    const result = await handleJsonRpc(message);
    writeFrame({ jsonrpc: "2.0", id: message.id, result });
  } catch (error) {
    writeFrame({
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
}

function writeFrame(payload) {
  const body = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

async function runOneShot(argv) {
  const [toolName, rawArgs] = argv;
  if (!toolName || toolName === "--list-tools") {
    console.log(JSON.stringify({ tools: TOOL_DEFINITIONS }, null, 2));
    return;
  }
  const args = rawArgs ? JSON.parse(rawArgs) : {};
  console.log(JSON.stringify(await dispatchTool(toolName, args), null, 2));
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  if (process.argv.length > 2) {
    await runOneShot(process.argv.slice(2));
  } else {
    await runMcpServer();
  }
}
