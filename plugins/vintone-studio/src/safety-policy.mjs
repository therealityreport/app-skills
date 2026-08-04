export const SAFETY_POLICY_VERSION = "vintone-safety-policy/v1";

export const MUTATING_ACTION_TYPES = new Set([
  "open_and_save_copy",
  "place_artwork",
  "change_dither_pattern",
  "recolor_slot",
  "rename_layer",
  "reorder_color",
  "toggle_texture",
  "paint_mask",
  "export_preview",
  "export_separations",
  "uxp_mutation"
]);

export const RISKY_ACTION_TYPES = new Set([
  "overwrite_original",
  "delete_file",
  "upload_file",
  "replace_source_asset",
  "save_over_original",
  "destructive_flatten",
  "external_share"
]);

export const DEFAULT_STOP_CONDITIONS = Object.freeze([
  "Stop if the active document is not confirmed to be a copied working file.",
  "Stop if Photoshop prompts to overwrite, delete, upload, or replace any source asset.",
  "Stop if the visible layer structure does not expose the VINTONE root, COLORS, CHOOSE DITHER PATTERN, and ARTWORK COMPOSITE anchors.",
  "Stop if the requested layer is red, locked, missing, ambiguous, or inside the PROCESSING group.",
  "Stop if the result cannot be visually confirmed before saving."
]);

export const DEFAULT_PROOF_EXPECTATIONS = Object.freeze([
  "Record the original target path and the working-copy path before mutation.",
  "Capture visible proof that the working copy is active before edits begin.",
  "Capture before and after proof for each major visual change.",
  "Report the exact layer, group, or output file changed.",
  "Confirm the original licensed VINTONE file remains untouched."
]);

export const DEFAULT_ROLLBACK = Object.freeze([
  "Close the working copy without saving if the first unsafe or ambiguous state appears.",
  "Reopen the original only for inspection, then save a new copy before retrying.",
  "If a copied file was saved with a bad edit, create a fresh working copy from the original and discard the bad copy."
]);

export function isMutatingAction(action) {
  if (!action || typeof action !== "object") return false;
  if (action.mutates === true) return true;
  if (action.readOnly === true) return false;
  return MUTATING_ACTION_TYPES.has(action.type);
}

export function requiresRiskConfirmation(action) {
  if (!action || typeof action !== "object") return false;
  if (action.risky === true) return true;
  return RISKY_ACTION_TYPES.has(action.type);
}

export function hasMutatingActions(actions = []) {
  return actions.some(isMutatingAction);
}

export function buildRiskyActionConfirmationNotes(actions = []) {
  const riskyActions = actions.filter(requiresRiskConfirmation);

  if (riskyActions.length === 0) {
    return [
      "If overwrite, deletion, upload, external sharing, source replacement, or destructive flattening becomes the next visible action, stop and ask for explicit confirmation."
    ];
  }

  return riskyActions.map((action) => {
    const label = action.label || action.type || "risky action";
    return `Explicit confirmation required before ${label}.`;
  });
}

export function buildSafetyMetadata({
  targetFilePath = null,
  workingCopyPath = null,
  actions = [],
  copyFirst = true,
  stopConditions = [],
  proofExpectations = [],
  rollback = []
} = {}) {
  return {
    policyVersion: SAFETY_POLICY_VERSION,
    copyFirst: copyFirst !== false,
    targetFilePath,
    workingCopyPath,
    stopConditions: [...DEFAULT_STOP_CONDITIONS, ...stopConditions],
    proofExpectations: [...DEFAULT_PROOF_EXPECTATIONS, ...proofExpectations],
    rollback: [...DEFAULT_ROLLBACK, ...rollback],
    riskyActionConfirmationNotes: buildRiskyActionConfirmationNotes(actions)
  };
}

export function applySafetyPolicy(packet) {
  const actions = Array.isArray(packet.actions) ? packet.actions : [];
  const mutating = packet.mutating ?? hasMutatingActions(actions);
  const safety = buildSafetyMetadata({
    targetFilePath: packet.targetFilePath ?? packet.target?.filePath ?? null,
    workingCopyPath: packet.workingCopyPath ?? packet.target?.workingCopyPath ?? null,
    actions,
    copyFirst: packet.copyFirst,
    stopConditions: packet.stopConditions,
    proofExpectations: packet.proofExpectations,
    rollback: packet.rollback
  });

  return {
    ...packet,
    mutating,
    targetFilePath: safety.targetFilePath,
    workingCopyPath: safety.workingCopyPath,
    safety
  };
}

export function validateSafetyMetadata(packet) {
  const errors = [];
  const warnings = [];
  const actions = Array.isArray(packet.actions) ? packet.actions : [];
  const mutating = packet.mutating ?? hasMutatingActions(actions);

  if (!mutating) {
    return { ok: true, mutating, errors, warnings };
  }

  if (!packet.safety || typeof packet.safety !== "object") {
    errors.push("Mutating packets must include safety metadata.");
    return { ok: false, mutating, errors, warnings };
  }

  if (packet.safety.policyVersion !== SAFETY_POLICY_VERSION) {
    errors.push("Safety metadata must include the current safety policy version.");
  }

  if (packet.safety.copyFirst !== true) {
    errors.push("Mutating packets must require copyFirst: true.");
  }

  if (!Object.hasOwn(packet.safety, "targetFilePath")) {
    errors.push("Safety metadata must include targetFilePath.");
  }

  if (!Object.hasOwn(packet.safety, "workingCopyPath")) {
    errors.push("Safety metadata must include workingCopyPath.");
  }

  if (!Array.isArray(packet.safety.stopConditions) || packet.safety.stopConditions.length === 0) {
    errors.push("Safety metadata must include stop conditions.");
  }

  if (
    !Array.isArray(packet.safety.proofExpectations) ||
    packet.safety.proofExpectations.length === 0
  ) {
    errors.push("Safety metadata must include proof expectations.");
  }

  if (!Array.isArray(packet.safety.rollback) || packet.safety.rollback.length === 0) {
    errors.push("Safety metadata must include rollback instructions.");
  }

  if (
    !Array.isArray(packet.safety.riskyActionConfirmationNotes) ||
    packet.safety.riskyActionConfirmationNotes.length === 0
  ) {
    errors.push("Safety metadata must include risky-action confirmation notes.");
  }

  if (!packet.safety.targetFilePath) {
    warnings.push("targetFilePath is not set; live runbooks must collect it before mutation.");
  }

  if (!packet.safety.workingCopyPath) {
    warnings.push("workingCopyPath is not set; live runbooks must save a copy before mutation.");
  }

  return {
    ok: errors.length === 0,
    mutating,
    errors,
    warnings
  };
}
