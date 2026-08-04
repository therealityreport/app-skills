import { createComputerRunbook } from "../computer-runbook.mjs";

export function executeComputerUse(editPacket = {}, options = {}) {
  const runbook = createComputerRunbook(editPacket, {
    ...options,
    live: options?.live ?? editPacket?.live ?? false,
  });

  return {
    executor: "computer-use",
    status: runbook.status,
    applied: false,
    automatedPhotoshop: false,
    message:
      runbook.status === "blocked"
        ? "Computer Use runbook is blocked until setup facts and working-copy confirmation are complete."
        : "Computer Use executor prepared a runbook for the main Codex session. It did not automate Photoshop directly.",
    runtimeCapabilityRequirements: runbook.runtimeCapabilityRequirements,
    proofRequirements: runbook.finalProofPacket.requiredEvidence,
    runbook,
  };
}

export default executeComputerUse;
