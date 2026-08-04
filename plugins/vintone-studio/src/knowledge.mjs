import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const KNOWLEDGE_DIR = path.resolve(MODULE_DIR, "..", "knowledge");

export const KNOWLEDGE_FILES = Object.freeze({
  assets: "vintone-assets.json",
  layerContract: "vintone-layer-contract.json",
  playlist: "vintone-playlist.json",
  techniques: "vintone-techniques.json",
  output: "vintone-output.json"
});

export async function readJson(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents);
}

export async function loadKnowledgePack({ knowledgeDir = KNOWLEDGE_DIR } = {}) {
  const entries = await Promise.all(
    Object.entries(KNOWLEDGE_FILES).map(async ([key, fileName]) => {
      const filePath = path.join(knowledgeDir, fileName);
      return [key, await readJson(filePath)];
    })
  );
  const pack = Object.fromEntries(entries);

  return {
    version: "vintone-knowledge/v1",
    loadedFrom: knowledgeDir,
    ...pack
  };
}

export function listRequiredAssetPaths(assetsKnowledge) {
  return assetsKnowledge.assets
    .filter((asset) => asset.requiredForLiveWork)
    .map((asset) => ({
      id: asset.id,
      label: asset.label,
      envVar: asset.envVar,
      placeholder: asset.placeholder
    }));
}

export function getSignatureAnchors(layerContract) {
  return layerContract.signatureAnchors.map((anchor) => ({
    id: anchor.id,
    path: anchor.path,
    match: anchor.match,
    required: anchor.required
  }));
}

export function summarizeWorkflow(knowledgePack) {
  return {
    workflow: knowledgePack.layerContract.workflow,
    defaultColorSlots: knowledgePack.layerContract.document.defaultColorSlots,
    outputRecipes: knowledgePack.output.recipes.map((recipe) => recipe.id),
    techniqueCount: knowledgePack.techniques.techniques.length,
    playlistVideoCount: knowledgePack.playlist.videos.length
  };
}

function matchesIntent(intent, words) {
  const text = intent.toLowerCase();
  return words.some((word) => text.includes(word));
}

function selectIntentFocus(intent, pack) {
  const focus = [];
  const add = (id) => {
    if (!focus.includes(id)) focus.push(id);
  };

  if (matchesIntent(intent, ["art", "place", "composite", "layout", "image"])) add("composite");
  if (matchesIntent(intent, ["dither", "pattern", "halftone", "dot"])) add("dither");
  if (matchesIntent(intent, ["color", "recolor", "swatch", "ink", "palette"])) add("color");
  if (matchesIntent(intent, ["texture", "plastisol", "distress", "worn"])) add("textures");
  if (matchesIntent(intent, ["export", "separation", "mockup", "print", "printer"])) add("output");

  if (focus.length === 0) {
    for (const step of pack.layerContract.workflow) add(step.id);
  }

  return focus;
}

function techniqueFor(pack, id) {
  return pack.techniques.techniques.find((technique) => technique.id === id);
}

export async function createDesignPlan(args = {}) {
  const pack = await loadKnowledgePack();
  const intent = args.intent || "VINTONE design update";
  const focus = selectIntentFocus(intent, pack);
  const anchors = getSignatureAnchors(pack.layerContract);
  const workflowSummary = summarizeWorkflow(pack);
  const relevantTechniques = pack.techniques.techniques.filter((technique) => {
    if (focus.includes("composite") && ["live-dithering", "background-toggle"].includes(technique.id)) return true;
    if (focus.includes("dither") && ["pattern-choice", "pattern-tuning"].includes(technique.id)) return true;
    if (focus.includes("color") && ["coloring", "lighter-shade", "stacking", "neutral-base"].includes(technique.id)) return true;
    if (focus.includes("textures") && technique.id === "textures") return true;
    if (focus.includes("output") && ["separations", "misregistration", "mockup"].includes(technique.id)) return true;
    return false;
  });
  const outputRecipes = pack.output.recipes.filter((recipe) => {
    if (focus.includes("output")) return true;
    return recipe.id === "preview-export";
  });

  return {
    ok: true,
    type: "vintone_design_plan",
    version: "vintone-design-plan/v2",
    intent,
    sourceFilePath: args.sourceFilePath || null,
    workingCopyPath: args.workingCopyPath || null,
    outputGoal: args.outputGoal || "preview-ready VINTONE composition",
    styleNotes: args.styleNotes || null,
    copyFirstRequired: true,
    focus,
    requiredAnchors: anchors.filter((anchor) => anchor.required),
    safeEditableSurfaces: [
      "COMPOSITE artwork drop target",
      "CHOOSE DITHER PATTERN smart object after visible confirmation",
      "COLOR COMPOSITION color slots and PAINT IN MASK layers",
      "TEXTURES visibility or opacity when present",
      "working-copy export output"
    ],
    readOnlySurfaces: [
      "PROCESSING group",
      "locked or red layers",
      "original licensed source files"
    ],
    workflowSummary,
    recommendedTechniques: relevantTechniques.map((technique) => ({
      id: technique.id,
      name: technique.name,
      mechanism: technique.mechanism,
      pluginSurface: technique.pluginSurface
    })),
    outputRecipes: outputRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      writesFiles: recipe.writesFiles,
      copyFirstRequired: recipe.copyFirstRequired,
      proof: recipe.proof || []
    })),
    steps: [
      "Confirm the licensed source and create a working copy before Photoshop edits.",
      "Bind the visible document to required VINTONE anchors before changing anything.",
      ...focus.map((section) => `Apply the ${section} workflow only on the working copy.`),
      "Capture before and after proof for every visible change.",
      "Export only to an approved destination and record the output path."
    ],
    blockers: [
      ...(args.sourceFilePath ? [] : ["licensed VINTONE source path is missing"]),
      ...(args.workingCopyPath ? [] : ["working-copy path is missing"])
    ],
    references: {
      defaultColorSlots: pack.layerContract.document.defaultColorSlots,
      techniqueCount: pack.techniques.techniques.length,
      playlistVideoCount: pack.playlist.videos.length,
      usefulTechniqueIds: [
        techniqueFor(pack, "pattern-choice")?.id,
        techniqueFor(pack, "coloring")?.id,
        techniqueFor(pack, "separations")?.id
      ].filter(Boolean)
    }
  };
}

export function assertKnowledgePackShape(pack) {
  const errors = [];

  for (const key of Object.keys(KNOWLEDGE_FILES)) {
    if (!pack[key] || typeof pack[key] !== "object") {
      errors.push(`Missing knowledge section: ${key}`);
    }
  }

  if (pack.assets && !Array.isArray(pack.assets.assets)) {
    errors.push("assets.assets must be an array");
  }

  if (pack.layerContract && !Array.isArray(pack.layerContract.signatureAnchors)) {
    errors.push("layerContract.signatureAnchors must be an array");
  }

  if (pack.playlist && pack.playlist.videos?.length !== 7) {
    errors.push("playlist must contain seven tutorial records");
  }

  if (pack.techniques && !Array.isArray(pack.techniques.techniques)) {
    errors.push("techniques.techniques must be an array");
  }

  if (pack.output && !Array.isArray(pack.output.recipes)) {
    errors.push("output.recipes must be an array");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
