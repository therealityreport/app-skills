export function createUxpHandoff(editPacket = {}, options = {}) {
  return {
    executor: "uxp-handoff",
    status: "handoff-only",
    applied: false,
    mutates: false,
    mutationAllowed: false,
    message:
      "Prepared a packet handoff for an optional later UXP companion. No UXP file or Photoshop document was changed.",
    handoff: {
      packetType: "vintone-uxp-readonly-companion-handoff",
      version: 1,
      editPacketId: editPacket?.id ?? editPacket?.packetId ?? null,
      requestedCompanionScope: options?.scope ?? "read-only binder",
      allowedBehavior: [
        "recognize VINTONE-like document structure",
        "report bound, not-VINTONE, or missing-anchor states",
        "surface packet metadata for a human operator",
      ],
      prohibitedBehavior: [
        "mutating layers",
        "saving files",
        "exporting files",
        "running batchPlay mutation commands",
      ],
      packet: {
        title: editPacket?.title ?? null,
        summary: editPacket?.summary ?? null,
        target: editPacket?.target ?? null,
        actions: editPacket?.actions ?? editPacket?.operations ?? [],
        safety: editPacket?.safety ?? null,
      },
    },
  };
}

export const executeUxpHandoff = createUxpHandoff;

export default createUxpHandoff;
