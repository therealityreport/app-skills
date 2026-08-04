export const REQUIRED_LIVE_SETUP_FACTS = [
  {
    key: "computerUseAvailable",
    label: "Computer Use is available in the active Codex session",
  },
  {
    key: "photoshopVersion",
    label: "Photoshop version is known",
  },
  {
    key: "os",
    label: "Operating system is known",
  },
  {
    key: "sourceFilePath",
    label: "licensed VINTONE source file path is known",
  },
  {
    key: "workingCopyPath",
    label: "working-copy path is known",
  },
  {
    key: "firstReversibleSmokeEdit",
    label: "first reversible smoke edit is defined",
  },
];

const BASE_STOP_CONDITIONS = [
  "Stop if Photoshop asks to overwrite, delete, flatten, upload, relink missing assets, or make another destructive change that is not already approved.",
  "Stop if the visible document path cannot be confirmed as the working copy.",
  "Stop if the layer structure does not look like a VINTONE template or expected anchors are missing.",
  "Stop if the requested operation would touch the original licensed source file.",
];

const RUNTIME_CAPABILITY_REQUIREMENTS = [
  "Computer Use must be available in the active Codex runtime.",
  "Photoshop must be installed and visible to the operator.",
  "The operator must be able to capture before and after screenshots.",
  "The run must use a confirmed working copy, never the original licensed source file.",
];

function compact(value) {
  return value === undefined || value === null || value === "" ? undefined : value;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value ? [value] : [];
}

function firstDefined(...values) {
  return values.find((value) => compact(value) !== undefined);
}

function mergeSetupFacts(editPacket, options) {
  const safety = editPacket?.safety ?? {};
  const target = editPacket?.target ?? {};
  const setup = {
    ...(editPacket?.setupFacts ?? {}),
    ...(options?.setupFacts ?? {}),
  };

  const sourceFilePath = firstDefined(
    setup.sourceFilePath,
    setup.licensedSamplePath,
    target.sourceFilePath,
    target.filePath,
    editPacket?.sourceFilePath,
    editPacket?.targetFilePath
  );

  const workingCopyPath = firstDefined(
    setup.workingCopyPath,
    target.workingCopyPath,
    safety.workingCopyPath,
    editPacket?.workingCopyPath
  );

  return {
    ...setup,
    sourceFilePath,
    workingCopyPath,
    confirmedWorkingCopy: Boolean(
      firstDefined(
        setup.confirmedWorkingCopy,
        target.confirmedWorkingCopy,
        safety.workingCopyConfirmed,
        editPacket?.confirmedWorkingCopy
      )
    ),
    computerUseAvailable: Boolean(setup.computerUseAvailable),
    photoshopVersion: firstDefined(setup.photoshopVersion, editPacket?.photoshopVersion),
    os: firstDefined(setup.os, editPacket?.os),
    firstReversibleSmokeEdit: firstDefined(
      setup.firstReversibleSmokeEdit,
      editPacket?.firstReversibleSmokeEdit,
      safety.firstReversibleSmokeEdit
    ),
  };
}

function wantsLiveRunbook(editPacket, options) {
  return Boolean(
    options?.live === true ||
      options?.liveRun === true ||
      editPacket?.live === true ||
      editPacket?.executionMode === "live" ||
      editPacket?.mode === "live"
  );
}

function getMissingLiveFacts(setupFacts) {
  return REQUIRED_LIVE_SETUP_FACTS.filter((fact) => {
    if (fact.key === "computerUseAvailable") {
      return setupFacts[fact.key] !== true;
    }
    return compact(setupFacts[fact.key]) === undefined;
  });
}

function getWorkingCopyBlockers(setupFacts) {
  const blockers = [];
  const source = compact(setupFacts.sourceFilePath);
  const workingCopy = compact(setupFacts.workingCopyPath);

  if (!setupFacts.confirmedWorkingCopy) {
    blockers.push("Working copy has not been confirmed.");
  }

  if (source && workingCopy && source === workingCopy) {
    blockers.push("Working copy path matches the licensed source file path.");
  }

  return blockers;
}

function describeAction(editPacket, fallback) {
  const actions = asArray(editPacket?.actions ?? editPacket?.operations);
  const action = actions.find((item) => {
    const text = JSON.stringify(item).toLowerCase();
    return text.includes(fallback.match);
  });

  if (!action) {
    return fallback.description;
  }

  if (typeof action === "string") {
    return action;
  }

  return action.description ?? action.title ?? action.name ?? fallback.description;
}

function makeStep(order, title, visibleUiGoal, uiActions, proof, extra = {}) {
  return {
    order,
    title,
    visibleUiGoal,
    uiActions: uiActions.map((action, index) => `${index + 1}. ${action}`),
    stopAndAsk: [...BASE_STOP_CONDITIONS, ...asArray(extra.stopAndAsk)],
    expectedVisibleProof: proof,
    ...extra,
  };
}

function buildSteps(editPacket, setupFacts, liveRequested) {
  const source = setupFacts.sourceFilePath ?? "licensed VINTONE source file";
  const workingCopy = setupFacts.workingCopyPath ?? "new working-copy path";
  const smokeEdit = setupFacts.firstReversibleSmokeEdit ?? "the approved reversible smoke edit";
  const textureAction = describeAction(editPacket, {
    match: "texture",
    description: "toggle one texture layer or texture visibility setting",
  });
  const maskAction = describeAction(editPacket, {
    match: "mask",
    description: "select one color mask and arm the brush without painting yet",
  });
  const exportAction = describeAction(editPacket, {
    match: "export",
    description: "export a preview or complete the export checklist",
  });

  const steps = [
    makeStep(
      1,
      "Open selected file",
      "Photoshop shows the licensed VINTONE source document and its file name is visible.",
      [
        "Open Photoshop.",
        `Open ${source}.`,
        "Confirm the visible document name and path before making any edit.",
      ],
      [
        "Photoshop window is visible.",
        "The selected VINTONE document name is visible.",
        "No edit has been made yet.",
      ],
      {
        phase: "start",
        mutatesDocument: false,
      }
    ),
    makeStep(
      2,
      "Save working copy",
      "Photoshop shows a saved copy, not the original licensed source document.",
      [
        "Use Save As or Duplicate to create a copy.",
        `Save the copy at ${workingCopy}.`,
        "Confirm the active document path points to the working copy before continuing.",
      ],
      [
        "The active Photoshop document path is the working copy.",
        "The source file remains untouched.",
      ],
      {
        phase: "copy-first",
        mutatesDocument: false,
        requiredBeforeLiveMutation: true,
      }
    ),
    makeStep(
      3,
      "Visually bind likely VINTONE sections",
      "The Layers panel is open and likely VINTONE groups are identified without changing them.",
      [
        "Open the Layers panel.",
        "Expand only the groups needed to identify editable VINTONE sections.",
        "Record likely texture, color, mask, and output sections from visible layer names.",
      ],
      [
        "Layers panel is visible.",
        "Likely VINTONE sections are named in the proof notes.",
        "No layer contents have been changed.",
      ],
      {
        phase: "bind",
        mutatesDocument: false,
        stopAndAsk: "Stop if expected VINTONE section names cannot be found after a reasonable visual scan.",
      }
    ),
    makeStep(
      4,
      "Toggle one texture",
      `Apply the reversible smoke edit: ${smokeEdit}.`,
      [
        "Capture a before screenshot of the working copy.",
        textureAction,
        "Confirm the change is visible and reversible.",
      ],
      [
        "Before screenshot is captured.",
        "One texture-related visible change is present on the working copy.",
        "The layer or setting that changed is named in the proof notes.",
      ],
      {
        phase: "smoke-edit",
        mutatesDocument: true,
        requiresConfirmedWorkingCopy: true,
      }
    ),
    makeStep(
      5,
      "Select one color mask and arm brush",
      "A color mask is selected and the brush is ready, but no unapproved painting occurs.",
      [
        maskAction,
        "Select the brush tool with safe visible settings.",
        "Do not paint unless the edit packet explicitly approves the stroke.",
      ],
      [
        "The mask thumbnail or target layer is visibly selected.",
        "Brush tool is active.",
        "No unapproved paint stroke has been made.",
      ],
      {
        phase: "mask-ready",
        mutatesDocument: false,
        stopAndAsk: "Stop before painting if brush size, color, opacity, or target mask is ambiguous.",
      }
    ),
    makeStep(
      6,
      "Export preview checklist",
      "A preview/export checklist is completed without overwriting the source document.",
      [
        exportAction,
        "Capture an after screenshot of the working copy.",
        "Record export path, visible warnings, and any prompts that were skipped.",
      ],
      [
        "After screenshot is captured.",
        "Preview/export path or checklist status is recorded.",
        "No destructive prompt was accepted.",
      ],
      {
        phase: "proof",
        mutatesDocument: false,
      }
    ),
  ];

  if (!liveRequested) {
    return steps;
  }

  return steps.map((step) => ({
    ...step,
    liveStepStatus: step.mutatesDocument ? "requires-live-gates" : "ready-after-operator-confirmation",
  }));
}

function makeRollback(setupFacts) {
  return {
    safestPath: "Close the working copy without saving if a bad or ambiguous edit occurs before export.",
    fallbackPath: "Reopen the original licensed source file and create a fresh working copy.",
    neverDo: [
      "Do not save destructive changes into the licensed source file.",
      "Do not accept overwrite, delete, flatten, upload, or relink prompts unless a new approved runbook explicitly permits it.",
    ],
    restoreTargets: {
      sourceFilePath: setupFacts.sourceFilePath ?? null,
      workingCopyPath: setupFacts.workingCopyPath ?? null,
    },
  };
}

function makeFinalProofPacket(editPacket, setupFacts) {
  return {
    packetType: "vintone-computer-use-final-proof",
    editPacketId: editPacket?.id ?? editPacket?.packetId ?? null,
    requiredEvidence: [
      "source file path",
      "working-copy path",
      "before screenshot",
      "after screenshot",
      "visible layer or setting changed",
      "stop prompts encountered or confirmation that none appeared",
      "export preview path or export checklist status",
    ],
    sourceFilePath: setupFacts.sourceFilePath ?? null,
    workingCopyPath: setupFacts.workingCopyPath ?? null,
    originalUntouchedRequired: true,
    reportFields: {
      visibleBeforeProof: null,
      visibleAfterProof: null,
      changedLayerOrSetting: null,
      exportPreviewPath: null,
      operatorNotes: null,
    },
  };
}

export function createComputerRunbook(editPacket = {}, options = {}) {
  const setupFacts = mergeSetupFacts(editPacket, options);
  const liveRequested = wantsLiveRunbook(editPacket, options);
  const missingFacts = getMissingLiveFacts(setupFacts);
  const workingCopyBlockers = getWorkingCopyBlockers(setupFacts);
  const blockedReasons = liveRequested
    ? [
        ...missingFacts.map((fact) => `Missing setup fact: ${fact.label}.`),
        ...workingCopyBlockers,
      ]
    : [];
  const blocked = blockedReasons.length > 0;
  const title = editPacket?.title ?? editPacket?.summary ?? "VINTONE Computer Use runbook";

  return {
    kind: "vintone-computer-use-runbook",
    version: 1,
    status: blocked ? "blocked" : "ready",
    liveRequested,
    liveAllowed: liveRequested && !blocked,
    applied: false,
    title,
    source: {
      editPacketId: editPacket?.id ?? editPacket?.packetId ?? null,
      editPacketSummary: editPacket?.summary ?? null,
    },
    setupFacts,
    missingSetupFacts: missingFacts.map((fact) => fact.key),
    blockedReasons,
    runtimeCapabilityRequirements: [...RUNTIME_CAPABILITY_REQUIREMENTS],
    startState: {
      application: "Adobe Photoshop",
      documentState: "licensed source exists, then a confirmed working copy becomes active before mutation",
      activeDocumentMustBe: setupFacts.workingCopyPath ?? "confirmed working copy",
      sourceFilePath: setupFacts.sourceFilePath ?? null,
      workingCopyPath: setupFacts.workingCopyPath ?? null,
      originalMustRemainUntouched: true,
    },
    visibleUiGoal:
      "Use visible Photoshop UI to open VINTONE, save a working copy, identify editable sections, perform one reversible proof edit, and collect proof.",
    steps: buildSteps(editPacket, setupFacts, liveRequested),
    stopAndAsk: blocked ? [...blockedReasons, ...BASE_STOP_CONDITIONS] : [...BASE_STOP_CONDITIONS],
    expectedVisibleProof: [
      "Photoshop is visible.",
      "The active document path is a confirmed working copy.",
      "Before and after screenshots show the reversible edit.",
      "The proof notes identify the layer or setting that changed.",
    ],
    rollback: makeRollback(setupFacts),
    finalProofPacket: makeFinalProofPacket(editPacket, setupFacts),
  };
}

export const buildComputerRunbook = createComputerRunbook;

export default createComputerRunbook;
