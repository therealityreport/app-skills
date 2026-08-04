export function executeManual(editPacket = {}, options = {}) {
  const source = editPacket?.target?.sourceFilePath ?? editPacket?.sourceFilePath ?? "licensed VINTONE source file";
  const workingCopy =
    editPacket?.target?.workingCopyPath ?? editPacket?.workingCopyPath ?? "a new confirmed working copy";

  return {
    executor: "manual",
    status: "instructions-only",
    applied: false,
    mutates: false,
    message: "Manual mode returns operator instructions only. No Photoshop action was performed.",
    instructions: [
      `Open ${source} in Photoshop.`,
      `Save or duplicate it as ${workingCopy} before any edit.`,
      "Use the edit packet as a checklist and stop before overwrite, delete, flatten, upload, relink, or any unclear Photoshop prompt.",
      "Capture before and after proof if a human operator later performs the work.",
    ],
    proofRequirements: [
      "working-copy path",
      "before screenshot",
      "after screenshot",
      "changed layer or setting",
      "operator notes",
    ],
    editPacketId: editPacket?.id ?? editPacket?.packetId ?? null,
    optionsUsed: {
      instructionsOnly: options?.instructionsOnly ?? true,
    },
  };
}

export default executeManual;
