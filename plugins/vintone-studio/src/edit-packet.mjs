import { applySafetyPolicy, hasMutatingActions, validateSafetyMetadata } from "./safety-policy.mjs";

export const EDIT_PACKET_VERSION = "vintone-edit-packet/v1";
export const TYPED_ACTION_SCHEMAS = Object.freeze({
  open_and_save_copy: {
    category: "setup",
    targetAnchor: null,
    mutates: true,
    parameters: ["sourceFilePath", "workingCopyPath"],
    proof: ["source path", "working-copy path"],
    runbookHint: "Open the licensed file only long enough to create or confirm a working copy."
  },
  place_artwork: {
    category: "composite",
    targetAnchor: "composite_drop_target",
    mutates: true,
    parameters: ["sourceArtworkPath", "placement", "scalePercent"],
    proof: ["placed artwork is visible", "COMPOSITE target remains editable"],
    runbookHint: "Place or paste artwork into COMPOSITE on the working copy."
  },
  change_dither_pattern: {
    category: "dither",
    targetAnchor: "dither_smart_object",
    mutates: true,
    parameters: ["patternName", "scalePercent", "angleDegrees", "blendMode", "opacityPercent"],
    proof: ["dither smart object was opened", "selected pattern is visible after save"],
    runbookHint: "Open CHOOSE DITHER PATTERN, toggle or tune the selected pattern, save, and close."
  },
  recolor_slot: {
    category: "color",
    targetAnchor: "colors_group",
    mutates: true,
    parameters: ["slotName", "inkName", "hexColor", "order"],
    proof: ["color slot name", "visible swatch or overlay color"],
    runbookHint: "Select the color slot and update its overlay or mask target on the working copy."
  },
  toggle_texture: {
    category: "texture",
    targetAnchor: "textures_group",
    mutates: true,
    parameters: ["textureName", "visible", "opacityPercent"],
    proof: ["texture layer name", "visible before/after texture change"],
    runbookHint: "Toggle or adjust the texture layer only after the working copy is active."
  },
  export_preview: {
    category: "output",
    targetAnchor: "working_copy_output",
    mutates: true,
    writesFiles: true,
    parameters: ["format", "exportDirectory", "fileName"],
    proof: ["preview path", "visible final composite before export"],
    runbookHint: "Export a flattened preview from the working copy to an approved destination."
  },
  export_separations: {
    category: "output",
    targetAnchor: "working_copy_output",
    mutates: true,
    writesFiles: true,
    parameters: ["format", "exportDirectory", "printerNaming"],
    proof: ["layered output path", "named separation layers"],
    runbookHint: "Create separations only on a duplicate or stamped working copy."
  },
  create_mockup: {
    category: "output",
    targetAnchor: "working_copy_output",
    mutates: true,
    writesFiles: true,
    parameters: ["mockupPath", "garmentColor", "exportDirectory"],
    proof: ["mockup path", "placed design visibility"],
    runbookHint: "Place the flattened preview into the approved garment mockup file."
  },
  manual_instruction: {
    category: "manual",
    targetAnchor: null,
    mutates: false,
    parameters: ["instruction"],
    proof: ["operator note"],
    runbookHint: "Return written instructions only."
  }
});

function normalizeActions(actions = []) {
  return actions.map((action, index) => {
    if (typeof action === "string") {
      return {
        id: `action-${String(index + 1).padStart(2, "0")}`,
        type: "manual_instruction",
        label: action,
        readOnly: false,
        target: null,
        parameters: {},
        notes: []
      };
    }

    return {
      id: action.id || `action-${String(index + 1).padStart(2, "0")}`,
      type: action.type || "manual_instruction",
      label: action.label || action.summary || action.type || "Manual instruction",
      category: action.category || TYPED_ACTION_SCHEMAS[action.type]?.category || "manual",
      targetAnchor: action.targetAnchor || TYPED_ACTION_SCHEMAS[action.type]?.targetAnchor || null,
      mutates: action.mutates ?? TYPED_ACTION_SCHEMAS[action.type]?.mutates,
      readOnly: action.readOnly,
      risky: action.risky,
      writesFiles: action.writesFiles ?? TYPED_ACTION_SCHEMAS[action.type]?.writesFiles ?? false,
      target: action.target || null,
      parameters: action.parameters || {},
      requiredParameters: action.requiredParameters || TYPED_ACTION_SCHEMAS[action.type]?.parameters || [],
      proof: action.proof || TYPED_ACTION_SCHEMAS[action.type]?.proof || [],
      runbookHint: action.runbookHint || TYPED_ACTION_SCHEMAS[action.type]?.runbookHint || null,
      notes: action.notes || []
    };
  });
}

function inferActionsFromIntent(intent = "") {
  const text = intent.toLowerCase();
  const actions = [
    {
      type: "open_and_save_copy",
      label: "Open the source file and save a working copy",
      mutates: true,
      notes: ["Required before any live Photoshop edit."]
    }
  ];

  if (matchesAny(text, ["art", "artwork", "place", "composite", "image", "photo", "logo"])) {
    actions.push({
      type: "place_artwork",
      label: "Place artwork into COMPOSITE",
      mutates: true,
      target: "ARTWORK COMPOSITE > ARTWORK > COMPOSITE",
      notes: ["Use the clean drop target and preserve the locked processing chain."]
    });
  }

  if (text.includes("dither") || text.includes("pattern") || text.includes("halftone")) {
    actions.push({
      type: "change_dither_pattern",
      label: "Change the CHOOSE DITHER PATTERN smart object",
      mutates: true,
      target: "CHOOSE DITHER PATTERN",
      notes: ["Open, adjust, save, and close the smart object only on the working copy."]
    });
  }

  if (text.includes("color") || text.includes("recolor") || text.includes("swatch")) {
    actions.push({
      type: "recolor_slot",
      label: "Update a VINTONE color slot",
      mutates: true,
      target: "COLORS > COLOR COMPOSITION > COLOR slot",
      notes: ["Use the color-overlay style on the color group, not the locked processing chain."]
    });
  }

  if (text.includes("texture") || text.includes("plastisol") || text.includes("distress")) {
    actions.push({
      type: "toggle_texture",
      label: "Adjust VINTONE texture visibility or strength",
      mutates: true,
      target: "ARTWORK COMPOSITE > ARTWORK > TEXTURES",
      notes: ["Turn textures off when the white background is active unless the user approves otherwise."]
    });
  }

  if (text.includes("export") || text.includes("preview")) {
    actions.push({
      type: "export_preview",
      label: "Create preview output",
      mutates: true,
      target: "working copy output",
      notes: ["Write only to the configured output folder or a user-approved destination."]
    });
  }

  if (text.includes("separation") || text.includes("print")) {
    actions.push({
      type: "export_separations",
      label: "Create separation output",
      mutates: true,
      target: "working copy output",
      notes: ["Write only to the configured output folder or a user-approved destination."]
    });
  }

  if (text.includes("mockup")) {
    actions.push({
      type: "create_mockup",
      label: "Create garment mockup",
      mutates: true,
      target: "working copy output",
      notes: ["Write only to the configured output folder or a user-approved destination."]
    });
  }

  if (actions.length === 1) {
    actions.push({
      type: "manual_instruction",
      label: "Map the request to VINTONE Composite, Dither, Color, Texture, or Output steps",
      readOnly: true,
      notes: ["No specific mutation inferred from the request text."]
    });
  }

  return actions;
}

function matchesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function createEditPacket({
  intent = "",
  sourceFilePath = null,
  targetFilePath = null,
  workingCopyPath = null,
  mode = "manual",
  actions,
  metadata = {},
  copyFirst = true
} = {}) {
  const normalizedActions = normalizeActions(actions || inferActionsFromIntent(intent));
  const resolvedTargetFilePath = targetFilePath || sourceFilePath;
  const packet = {
    ok: true,
    type: "vintone_edit_packet",
    version: EDIT_PACKET_VERSION,
    createdAt: new Date().toISOString(),
    mode,
    intent,
    sourceFilePath: resolvedTargetFilePath,
    targetFilePath: resolvedTargetFilePath,
    workingCopyPath,
    copyFirst,
    actions: normalizedActions,
    mutating: hasMutatingActions(normalizedActions),
    metadata: {
      source: "vintone-studio",
      ...metadata
    }
  };

  return applySafetyPolicy(packet);
}

export function validateEditPacket(packet) {
  const errors = [];

  if (!packet || typeof packet !== "object") {
    return {
      ok: false,
      errors: ["Packet must be an object."],
      safety: { ok: false, errors: ["Packet must be an object."], warnings: [] }
    };
  }

  if (packet.version !== EDIT_PACKET_VERSION) {
    errors.push(`Packet version must be ${EDIT_PACKET_VERSION}.`);
  }

  if (!Array.isArray(packet.actions)) {
    errors.push("Packet actions must be an array.");
  }

  const safety = validateSafetyMetadata(packet);

  return {
    ok: errors.length === 0 && safety.ok,
    errors: [...errors, ...safety.errors],
    warnings: safety.warnings,
    safety
  };
}
