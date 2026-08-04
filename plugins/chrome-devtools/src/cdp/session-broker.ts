export type SessionLedgerEntry = {
  at: string;
  action: "attach" | "detach" | "blocked";
  target: string;
  reason?: string;
};

export function blockedLiveAttachLedger(target: string): SessionLedgerEntry {
  return {
    at: new Date().toISOString(),
    action: "blocked",
    target,
    reason: "Live attach is deferred in the first slice"
  };
}
