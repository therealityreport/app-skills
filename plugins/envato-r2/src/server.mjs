#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  captureLogin,
  checkStoredSession,
  checkSetup,
  discoverEnvatoApiCalls,
  downloadAssetToR2,
  searchAssets,
  searchDownloadToR2
} from "./envato-r2.mjs";

const server = new Server(
  {
    name: "envato-r2",
    version: "0.1.1"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "envato_r2_check_setup",
      description: "Check whether Envato login state, Chrome, and Cloudflare R2 credentials are configured.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_check_session",
      description: "Opt-in local-only diagnostic for saved Playwright Envato state. Reports active Envato-cookie presence plus cookie and storage-key counts; never names, values, tokens, authentication proof, or network validation.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_capture_login",
      description: "Open a headed browser so the user can log into Envato, then save the browser storage state locally.",
      inputSchema: {
        type: "object",
        properties: {
          timeoutMs: {
            type: "number",
            description: "How long to keep the browser open while waiting for login."
          }
        },
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_search",
      description: "Search app.envato.com with the saved Envato browser session and return structured asset names, preview URLs, metadata, and result URLs.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          itemType: {
            type: "string",
            description: "Envato item type such as photos, graphics, stock-video, video-templates, music, sound-effects, fonts, add-ons, or web-templates."
          },
          sort: { type: "string", default: "relevance" },
          limit: { type: "number", default: 10 },
          searchUrl: {
            type: "string",
            description: "Optional exact app.envato.com search URL when the UI has a specific route."
          },
          headless: { type: "boolean" },
          timeoutMs: { type: "number" }
        },
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_discover_api",
      description: "Explain and optionally observe the Envato React Router data calls used for search results, previews, load-more, font previews, related items, and license downloads.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          itemType: { type: "string", default: "fonts" },
          sort: { type: "string", default: "popular" },
          searchUrl: { type: "string" },
          live: {
            type: "boolean",
            description: "Set false for static bundle-derived API notes only. Default true observes live calls when login state exists."
          },
          headless: { type: "boolean" },
          timeoutMs: { type: "number" }
        },
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_download",
      description: "Download a single Envato asset through the normal UI and upload it plus metadata to Cloudflare R2.",
      inputSchema: {
        type: "object",
        required: ["itemUrl", "projectName"],
        properties: {
          itemUrl: { type: "string" },
          projectName: {
            type: "string",
            description: "Envato project/license name. Required for license traceability."
          },
          r2KeyPrefix: { type: "string" },
          downloadLicenseCertificate: { type: "boolean", default: true },
          headless: { type: "boolean" },
          timeoutMs: { type: "number" }
        },
        additionalProperties: false
      }
    },
    {
      name: "envato_r2_search_download",
      description: "Search Envato, download the first matching asset or first few assets, and upload them to Cloudflare R2.",
      inputSchema: {
        type: "object",
        required: ["query", "projectName"],
        properties: {
          query: { type: "string" },
          projectName: { type: "string" },
          itemType: { type: "string", default: "photos" },
          sort: { type: "string", default: "relevance" },
          limit: { type: "number", default: 10 },
          downloadLimit: { type: "number", default: 1 },
          r2KeyPrefix: { type: "string" },
          downloadLicenseCertificate: { type: "boolean", default: true },
          headless: { type: "boolean" },
          timeoutMs: { type: "number" }
        },
        additionalProperties: false
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    if (name === "envato_r2_check_setup") {
      return jsonResult(await checkSetup());
    }
    if (name === "envato_r2_check_session") {
      return jsonResult(await checkStoredSession());
    }
    if (name === "envato_r2_capture_login") {
      return jsonResult(await captureLogin(args));
    }
    if (name === "envato_r2_search") {
      return jsonResult(await searchAssets(args));
    }
    if (name === "envato_r2_discover_api") {
      return jsonResult(await discoverEnvatoApiCalls(args));
    }
    if (name === "envato_r2_download") {
      return jsonResult(await downloadAssetToR2(args));
    }
    if (name === "envato_r2_search_download") {
      return jsonResult(await searchDownloadToR2(args));
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: false,
              error: error.message,
              stack: process.env.ENVATO_R2_DEBUG === "1" ? error.stack : undefined
            },
            null,
            2
          )
        }
      ]
    };
  }
});

function jsonResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

const transport = new StdioServerTransport();
await server.connect(transport);
