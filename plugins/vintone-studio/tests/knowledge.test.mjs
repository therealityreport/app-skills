import test from "node:test";
import assert from "node:assert/strict";
import {
  assertKnowledgePackShape,
  createDesignPlan,
  getSignatureAnchors,
  listRequiredAssetPaths,
  loadKnowledgePack,
  summarizeWorkflow
} from "../src/knowledge.mjs";

test("loads a complete facts-only knowledge pack", async () => {
  const pack = await loadKnowledgePack();
  const result = assertKnowledgePackShape(pack);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(pack.version, "vintone-knowledge/v1");
  assert.equal(pack.assets.policy.storesOnlyReferences, true);
  assert.equal(pack.assets.policy.bundledBinaryAssetsAllowed, false);
  assert.equal(pack.playlist.videos.length, 7);
});

test("creates design plans grounded in the VINTONE knowledge pack", async () => {
  const plan = await createDesignPlan({
    intent: "recolor the palette, change the dither pattern, and export separations",
    sourceFilePath: "/licensed/VINTONE SAMPLE FILE.psb",
    workingCopyPath: "/work/VINTONE-copy.psb"
  });

  assert.equal(plan.version, "vintone-design-plan/v2");
  assert.deepEqual(plan.focus, ["dither", "color", "output"]);
  assert.ok(plan.requiredAnchors.some((anchor) => anchor.id === "dither_smart_object"));
  assert.ok(plan.recommendedTechniques.some((technique) => technique.id === "pattern-choice"));
  assert.ok(plan.recommendedTechniques.some((technique) => technique.id === "coloring"));
  assert.ok(plan.outputRecipes.some((recipe) => recipe.id === "separations"));
  assert.deepEqual(plan.blockers, []);
});

test("exposes required local asset path placeholders", async () => {
  const pack = await loadKnowledgePack();
  const requiredPaths = listRequiredAssetPaths(pack.assets);

  assert.ok(requiredPaths.length >= 4);
  assert.ok(requiredPaths.every((entry) => entry.placeholder));
  assert.ok(requiredPaths.every((entry) => entry.envVar?.startsWith("VINTONE_")));
});

test("captures VINTONE signature anchors and workflow summary", async () => {
  const pack = await loadKnowledgePack();
  const anchors = getSignatureAnchors(pack.layerContract);
  const summary = summarizeWorkflow(pack);

  assert.ok(anchors.some((anchor) => anchor.id === "dither_smart_object"));
  assert.ok(anchors.some((anchor) => anchor.id === "processing_group" && anchor.required));
  assert.deepEqual(
    summary.workflow.map((step) => step.id),
    ["composite", "dither", "color"]
  );
  assert.equal(summary.techniqueCount, 16);
  assert.equal(summary.playlistVideoCount, 7);
});
