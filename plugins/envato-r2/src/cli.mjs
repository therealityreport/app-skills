#!/usr/bin/env node
import {
  captureLogin,
  checkStoredSession,
  checkSetup,
  discoverEnvatoApiCalls,
  downloadAssetToR2,
  searchAssets,
  searchDownloadToR2
} from "./envato-r2.mjs";

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

try {
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
  } else if (command === "check") {
    printJson(await checkSetup());
  } else if (command === "check-session") {
    printJson(await checkStoredSession());
  } else if (command === "login") {
    printJson(await captureLogin(args));
  } else if (command === "search") {
    printJson(await searchAssets(args));
  } else if (command === "discover-api") {
    printJson(await discoverEnvatoApiCalls(args));
  } else if (command === "download") {
    printJson(
      await downloadAssetToR2({
        itemUrl: args.itemUrl || args.url,
        projectName: args.projectName || args.project,
        ...args
      })
    );
  } else if (command === "search-download") {
    printJson(
      await searchDownloadToR2({
        projectName: args.projectName || args.project,
        ...args
      })
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  if (process.env.ENVATO_R2_DEBUG === "1") {
    console.error(error.stack);
  }
  process.exitCode = 1;
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
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
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function printHelp() {
  console.log(`Envato to R2

Commands:
  npm run login
  npm run check-setup
  node ./src/cli.mjs check-session
  npm run search -- --query "cinematic food" --item-type photos --limit 10
  node ./src/cli.mjs discover-api --item-type fonts --live false
  npm run download -- --url https://app.envato.com/photos/... --project "Client Website"
  node ./src/cli.mjs search-download --query "logo mockup" --item-type graphics --project "Brand Refresh"

Required environment:
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET

Optional environment:
  R2_PREFIX, R2_PUBLIC_BASE_URL, ENVATO_STORAGE_STATE, ENVATO_PROFILE_DIR,
  ENVATO_DOWNLOAD_DIR, ENVATO_DEFAULT_PROJECT, CHROME_EXECUTABLE_PATH
`);
}
