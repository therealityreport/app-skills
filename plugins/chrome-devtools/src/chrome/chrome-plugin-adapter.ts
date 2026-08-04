import type { TargetRef } from "../core/types.js";

export function chromeBridgeHealth(): { available: boolean; mode: "mock"; notes: string[] } {
  return {
    available: false,
    mode: "mock",
    notes: [
      "Direct @Chrome tab attachment is handled by the Chrome plugin.",
      "Use this plugin's upstream Chrome DevTools MCP route for live DevTools evidence after route-token gates pass."
    ]
  };
}

export function mockChromeTargets(): TargetRef[] {
  return [
    {
      source: "chrome-plugin",
      scopeStatus: "candidate",
      profileName: "Codex",
      title: "Local app",
      url: "http://localhost:3000/dashboard?token=hidden",
      lastSeenAt: new Date("2026-06-05T12:00:00.000Z").toISOString(),
      matchReason: "localhost visible tab"
    }
  ];
}
