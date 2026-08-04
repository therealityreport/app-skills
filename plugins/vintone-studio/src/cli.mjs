#!/usr/bin/env node
import {
  TOOL_DEFINITIONS,
  dispatchTool
} from "./server.mjs";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
  } else if (command === "tools") {
    printJson({ tools: TOOL_DEFINITIONS });
  } else if (command === "check") {
    printJson(await dispatchTool("vintone_check_setup", setupArgs(args)));
  } else if (command === "plan") {
    printJson(await dispatchTool("vintone_create_design_plan", designArgs(args)));
  } else if (command === "packet") {
    printJson(await dispatchTool("vintone_create_edit_packet", editArgs(args)));
  } else if (command === "runbook") {
    printJson(await dispatchTool("vintone_create_computer_runbook", runbookArgs(args)));
  } else if (command === "export-checklist") {
    printJson(await dispatchTool("vintone_export_checklist", exportArgs(args)));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  if (process.env.VINTONE_DEBUG === "1") {
    console.error(error.stack);
  }
  process.exitCode = 1;
}

function setupArgs(args) {
  return {
    assetPath: args.assetPath || args.asset || args.source,
    blankStarterPath: args.blankStarterPath || args.blankStarter,
    photoshopVersion: args.photoshopVersion || args.photoshop,
    printerRules: args.printerRules || args.printer,
    computerUseAvailable: args.computerUseAvailable || args.computerUse || false
  };
}

function designArgs(args) {
  return {
    intent: args.intent || args._[0],
    sourceFilePath: args.sourceFilePath || args.source,
    workingCopyPath: args.workingCopyPath || args.workingCopy || args.copy,
    outputGoal: args.outputGoal || args.output,
    styleNotes: args.styleNotes || args.style
  };
}

function editArgs(args) {
  const actions = collectList(args.action || args.actions);
  return {
    intent: args.intent || args._[0],
    sourceFilePath: args.sourceFilePath || args.source,
    workingCopyPath: args.workingCopyPath || args.workingCopy || args.copy,
    actions: actions.length > 0 ? actions : undefined
  };
}

function runbookArgs(args) {
  return {
    task: args.task || args.intent || args._[0],
    sourceFilePath: args.sourceFilePath || args.source,
    workingCopyPath: args.workingCopyPath || args.workingCopy || args.copy,
    computerUseAvailable: args.computerUseAvailable || args.computerUse || false,
    photoshopVersion: args.photoshopVersion || args.photoshop,
    os: args.os,
    firstReversibleSmokeEdit: args.firstReversibleSmokeEdit || args.smokeEdit,
    live: args.live || args.liveRun || false,
    confirmedWorkingCopy: args.confirmedWorkingCopy || args.workingCopyConfirmed || false
  };
}

function exportArgs(args) {
  return {
    workingCopyPath: args.workingCopyPath || args.workingCopy || args.copy,
    exportDirectory: args.exportDirectory || args.exportDir || args.outputDir,
    format: args.format,
    printerRules: args.printerRules || args.printer
  };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }

    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = parseValue(next);
    index += 1;
  }
  return out;
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function collectList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function printHelp() {
  console.log(`VINTONE Studio

Commands:
  node ./src/cli.mjs check --source /path/to/VINTONE.psb --computer-use true
  node ./src/cli.mjs plan --intent "retro pizza shop tee"
  node ./src/cli.mjs packet --intent "toggle one texture" --source /path/to/original.psb --working-copy /path/to/copy.psb
  node ./src/cli.mjs runbook --task "toggle one texture" --working-copy /path/to/copy.psb --computer-use true
  node ./src/cli.mjs export-checklist --working-copy /path/to/copy.psb --format png
  node ./src/cli.mjs tools

Rules:
  Paid VINTONE assets are never bundled.
  Live Photoshop edits are copy-first and must target a confirmed working copy.
`);
}
